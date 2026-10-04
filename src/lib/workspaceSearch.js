/**
 * ⌘K search across the whole prep workspace: OneNote notebook, case-library
 * note tabs, and precedent fact cards. Notebook-only search used to miss
 * Hamdi "Enemy Combatant" tabs and similar case notes.
 */

import { CASE_NOTE_LAYERS, NOTE_TAB_TEMPLATES } from '../data/casesSeed'
import {
  loadNotebookSnapshot,
  scorePage,
  searchNotebook,
  snippetAround,
  stripHtmlToText,
  tokenize,
} from './notebookSearch'

/**
 * @typedef {{
 *   id: string,
 *   kind: 'notebook' | 'case_note' | 'case_fact' | 'case',
 *   title: string,
 *   sectionName: string,
 *   text: string,
 *   path: string,
 *   score: number,
 *   snippet: string,
 * }} WorkspaceSearchHit
 */

function caseNameById(cases) {
  /** @type {Map<string, string>} */
  const map = new Map()
  for (const c of cases || []) {
    if (c?.id) map.set(c.id, c.name || c.id)
  }
  return map
}

/** Tab id to open in CaseNotesHub for a notesByCase layer key. */
function tabIdForLayer(caseId, layerId, noteTabs) {
  const custom = (noteTabs || []).find(
    (t) => t.caseId === caseId && (t.id === layerId || t.layerId === layerId)
  )
  if (custom) return custom.id

  const template = NOTE_TAB_TEMPLATES.find((t) => t.layerId === layerId)
  if (template) return template.id

  if (layerId === 'petitioner' || layerId === 'respondent') return 'use'
  return layerId
}

function labelForLayer(caseId, layerId, noteTabs) {
  const custom = (noteTabs || []).find(
    (t) => t.caseId === caseId && (t.id === layerId || t.layerId === layerId)
  )
  if (custom?.label) return custom.label

  const template = NOTE_TAB_TEMPLATES.find((t) => t.layerId === layerId)
  if (template) return template.label

  const layer = CASE_NOTE_LAYERS.find((l) => l.id === layerId)
  if (layer) return layer.label

  return layerId
}

/**
 * Flatten case-library text notes (built-in layers + custom tabs).
 */
export function flattenCaseLibraryNotes({ notesByCase = {}, noteTabs = [], cases = [] } = {}) {
  const names = caseNameById(cases)
  /** @type {Array<{ id: string, title: string, sectionName: string, text: string, path: string }>} */
  const rows = []

  for (const [caseId, layers] of Object.entries(notesByCase || {})) {
    const caseName = names.get(caseId) || caseId
    for (const [layerId, html] of Object.entries(layers || {})) {
      const text = stripHtmlToText(html)
      const label = labelForLayer(caseId, layerId, noteTabs)
      // Skip empty seed-only slots so ⌘K stays dense.
      if (!text || text.length < 8) continue
      const tabId = tabIdForLayer(caseId, layerId, noteTabs)
      rows.push({
        id: `case-note:${caseId}:${layerId}`,
        title: label,
        sectionName: `Case library · ${caseName}`,
        text,
        path: `/library?case=${encodeURIComponent(caseId)}&tab=${encodeURIComponent(tabId)}`,
      })
    }
  }
  return rows
}

/**
 * Flatten precedent fact cards (Case library Facts tab / research cards).
 */
export function flattenCaseFacts({ caseFacts = [], cases = [] } = {}) {
  const names = caseNameById(cases)
  return (caseFacts || [])
    .map((fact) => {
      const text = [fact.text, fact.note].filter(Boolean).join(' ')
      const plain = stripHtmlToText(text)
      if (!plain || plain.length < 8) return null
      const caseName = names.get(fact.caseId) || fact.caseId || 'Case'
      return {
        id: `case-fact:${fact.id}`,
        title: plain.slice(0, 72) + (plain.length > 72 ? '…' : ''),
        sectionName: `Case facts · ${caseName}`,
        text: plain,
        path: `/library?case=${encodeURIComponent(fact.caseId || '')}&tab=facts`,
      }
    })
    .filter(Boolean)
}

function rankRows(rows, query, limit) {
  const q = String(query || '').trim()
  if (q.length < 2) {
    return rows.slice(0, Math.min(limit || 8, 8)).map((row) => ({
      ...row,
      kind: row.kind || 'notebook',
      score: 1,
      snippet: (row.text || '').slice(0, 90),
    }))
  }

  const tokens = tokenize(q)
  return rows
    .map((row) => {
      const score = scorePage(row, q, tokens)
      if (score <= 0) return null
      return {
        ...row,
        kind: row.kind || 'notebook',
        score,
        snippet: snippetAround(row.text || row.title, q),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
}

/**
 * Search OneNote notebook + case-library notes + fact cards.
 *
 * @param {string} query
 * @param {{
 *   limit?: number,
 *   notebook?: object | null,
 *   notesByCase?: object,
 *   noteTabs?: object[],
 *   caseFacts?: object[],
 *   cases?: object[],
 * }} [options]
 * @returns {WorkspaceSearchHit[]}
 */
export function searchWorkspace(query, options = {}) {
  const limit = options.limit ?? 12
  const notebook = options.notebook ?? loadNotebookSnapshot()

  const notebookHits = searchNotebook(query, { limit: limit * 2, notebook }).map((hit) => ({
    id: `notebook:${hit.pageId}`,
    kind: 'notebook',
    title: hit.title,
    sectionName: `Notes · ${hit.sectionName}`,
    text: hit.text,
    path: hit.path,
    score: hit.score,
    snippet: hit.snippet,
  }))

  const caseNoteRows = flattenCaseLibraryNotes({
    notesByCase: options.notesByCase,
    noteTabs: options.noteTabs,
    cases: options.cases,
  }).map((row) => ({ ...row, kind: 'case_note' }))

  const factRows = flattenCaseFacts({
    caseFacts: options.caseFacts,
    cases: options.cases,
  }).map((row) => ({ ...row, kind: 'case_fact' }))

  const q = String(query || '').trim()
  if (q.length < 2) {
    return [...notebookHits, ...rankRows(caseNoteRows, '', 4), ...rankRows(factRows, '', 2)].slice(
      0,
      limit
    )
  }

  const caseHits = rankRows(caseNoteRows, q, limit * 2)
  const factHits = rankRows(factRows, q, limit)
  return [...notebookHits, ...caseHits, ...factHits]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
}

/**
 * Cases whose name/cite/holding match the query (includes user-added cases).
 */
export function searchCases(query, cases = [], { limit = 8 } = {}) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return (cases || []).slice(0, limit)
  const tokens = tokenize(q)
  return (cases || [])
    .map((c) => {
      const hay = [c.name, c.cite, c.holding, c.rule, c.headlineNote, c.usePetitioner, c.useRespondent]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      let score = 0
      if ((c.name || '').toLowerCase().includes(q)) score += 80
      if (hay.includes(q)) score += 40
      for (const t of tokens) {
        if (hay.includes(t)) score += 8
      }
      if (score <= 0) return null
      return { ...c, score }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)))
    .slice(0, limit)
}
