/**
 * Search PDF annotations (highlights + page/general notes) for Ask AI.
 * Same opt-in path as notebook notes: matched in the browser, then sent as
 * client_notes on /chat. Nothing is uploaded unless Ask AI is invoked.
 */

import { isGeneralAnnotation } from '../components/library/AnnotationPanel'
import {
  notebookChunksForAskAi,
  notesSearchQuery,
  scorePage,
  snippetAround,
  tokenize,
} from './notebookSearch'
import { flattenCaseLibraryNotes } from './workspaceSearch'

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   sectionName: string,
 *   text: string,
 *   path: string,
 *   page: number | null,
 *   score: number,
 *   snippet: string,
 * }} AnnotationSearchHit
 */

function caseNameById(cases) {
  const map = new Map()
  for (const c of cases || []) {
    if (c?.id) map.set(c.id, c.name || c.id)
  }
  return map
}

function fileNameById(filesMeta) {
  const map = new Map()
  for (const f of filesMeta || []) {
    if (f?.id) map.set(f.id, f.name || f.id)
  }
  return map
}

function annotationKindLabel(annotation) {
  if (isGeneralAnnotation(annotation)) return 'General note'
  if (annotation?.kind === 'highlight' || annotation?.quote) return 'Highlight'
  return 'Page note'
}

/**
 * Flatten library annotations into searchable rows (quote + your note text).
 */
export function flattenAnnotations({
  annotations = [],
  cases = [],
  filesMeta = [],
} = {}) {
  const caseNames = caseNameById(cases)
  const fileNames = fileNameById(filesMeta)
  /** @type {Array<{ id: string, title: string, sectionName: string, text: string, path: string, page: number | null }>} */
  const rows = []

  for (const a of annotations || []) {
    if (!a?.id) continue
    const quote = String(a.quote || '').trim()
    const note = String(a.text || '').trim()
    if (!quote && note.length < 2) continue

    const caseId = a.caseId || ''
    const caseName = caseNames.get(caseId) || caseId || 'Case'
    const fileId = a.fileId || ''
    const fileName = fileNames.get(fileId) || ''
    const general = isGeneralAnnotation(a)
    const pageNum = general ? null : Number(a.page) > 0 ? Number(a.page) : null
    const kind = annotationKindLabel(a)

    const titleParts = [kind]
    if (pageNum) titleParts.push(`p.${pageNum}`)
    const title = titleParts.join(' · ')

    const bodyParts = []
    if (quote) bodyParts.push(`Quote: “${quote}”`)
    if (note) bodyParts.push(note)
    const text = bodyParts.join('\n')

    const params = new URLSearchParams()
    if (caseId) params.set('case', caseId)
    if (fileId) params.set('file', fileId)
    if (pageNum) params.set('page', String(pageNum))
    // Articles shelf uses the same annotation store; library deep-link is enough.
    const path = `/library?${params.toString()}`

    rows.push({
      id: `anno:${a.id}`,
      title,
      sectionName: fileName ? `${caseName} · ${fileName}` : caseName,
      text,
      path,
      page: pageNum,
    })
  }
  return rows
}

export function searchAnnotations(
  query,
  { annotations = [], cases = [], filesMeta = [], limit = 8 } = {}
) {
  const rows = flattenAnnotations({ annotations, cases, filesMeta })
  const q = String(query || '').trim()
  if (q.length < 2) return []

  const tokens = tokenize(q)
  return rows
    .map((row) => {
      const score = scorePage(row, q, tokens)
      if (score <= 0) return null
      return {
        ...row,
        score,
        snippet: snippetAround(row.text || row.title, q),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
}

/**
 * Annotation chunks for Ask AI (same shape as notebookChunksForAskAi).
 */
export function annotationChunksForAskAi(
  query,
  { annotations = [], cases = [], filesMeta = [], limit = 5, chunkSize = 900 } = {}
) {
  const q = notesSearchQuery(query)
  if (q.length < 2) return []
  const matched = searchAnnotations(q, { annotations, cases, filesMeta, limit: 8 })
  if (!matched.length) return []

  /** @type {Array<object>} */
  const chunks = []
  for (const hit of matched) {
    if (chunks.length >= limit) break
    let text = hit.text || hit.title
    if (!text) continue
    if (text.length > chunkSize) {
      const lower = text.toLowerCase()
      const ql = q.toLowerCase()
      let start = Math.max(0, lower.indexOf(ql) - Math.floor(chunkSize / 3))
      if (lower.indexOf(ql) < 0) start = 0
      text = `${start > 0 ? '…' : ''}${text.slice(start, start + chunkSize)}${
        start + chunkSize < hit.text.length ? '…' : ''
      }`
    }
    chunks.push({
      id: hit.id,
      title: hit.title,
      text,
      section_name: hit.sectionName,
      page_id: hit.id,
      notes_path: hit.path,
      page: hit.page,
      source_type: 'annotation',
    })
  }
  return chunks.slice(0, limit)
}

/**
 * Case-library text tabs (Understand, custom Enemy Combatant, etc.) for Ask AI.
 */
export function caseLibraryNoteChunksForAskAi(
  query,
  { notesByCase = {}, noteTabs = [], cases = [], limit = 4, chunkSize = 900 } = {}
) {
  const q = notesSearchQuery(query)
  if (q.length < 2) return []
  const rows = flattenCaseLibraryNotes({ notesByCase, noteTabs, cases })
  const tokens = tokenize(q)
  const matched = rows
    .map((row) => {
      const score = scorePage(row, q, tokens)
      if (score <= 0) return null
      return { ...row, score }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return matched.map((hit, i) => {
    let text = hit.text
    if (text.length > chunkSize) {
      text = text.slice(0, chunkSize) + '…'
    }
    return {
      id: hit.id || `case-note-${i}`,
      title: hit.title,
      text,
      section_name: hit.sectionName,
      page_id: hit.id,
      notes_path: hit.path,
      source_type: 'notebook',
    }
  })
}

/**
 * Notebook + PDF annotations + case-library note tabs for one Ask AI turn.
 * Cap total chunks so /chat stays small.
 */
export function prepNotesForAskAi(
  query,
  {
    notebookLimit = 4,
    annotationLimit = 4,
    caseNoteLimit = 3,
    totalLimit = 8,
    annotations = [],
    cases = [],
    filesMeta = [],
    notesByCase = {},
    noteTabs = [],
  } = {}
) {
  const notebook = notebookChunksForAskAi(query, { limit: notebookLimit })
  const annos = annotationChunksForAskAi(query, {
    annotations,
    cases,
    filesMeta,
    limit: annotationLimit,
  })
  const caseNotes = caseLibraryNoteChunksForAskAi(query, {
    notesByCase,
    noteTabs,
    cases,
    limit: caseNoteLimit,
  })

  // Interleave so PDF annotations and case tabs are not drowned by notebook hits.
  const queues = [annos.slice(), caseNotes.slice(), notebook.slice()]
  const merged = []
  while (merged.length < totalLimit) {
    let added = false
    for (const queue of queues) {
      if (queue.length && merged.length < totalLimit) {
        merged.push(queue.shift())
        added = true
      }
    }
    if (!added) break
  }
  return merged
}
