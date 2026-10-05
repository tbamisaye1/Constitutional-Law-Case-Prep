/**
 * Snapshot docs that live in localStorage and also sync through
 * library_records (Postgres) so phone / laptop share one prep.
 *
 * UI chrome (expand toggles, shelf open) stays local on purpose.
 * View state like active PDF page stays local so two devices do not fight.
 */

import { readJson, writeJson } from './persist'
import { SEED_FACTS } from '../data/factsSeed'

export const DOC_ROW_ID = 'main'

/**
 * @typedef {{
 *   collection: string,
 *   kind: string,
 *   storageKey: string,
 *   event: string,
 *   loadLocal: () => object,
 *   toRow: (data: object) => object,
 *   fromRow: (row: object) => object | null,
 *   same: (a: object, b: object) => boolean,
 * }} WorkspaceDocSpec
 */

const DEFAULT_ARG_NOTES = {
  petitioner: '<h2>Petitioner working notes</h2><p>Quips, corrections, language.</p>',
  respondent: '<h2>Respondent working notes</h2><p>Structure and rebuttal scratch.</p>',
}

const DEFAULT_ARG_OUTLINES = {
  petitioner: [
    { id: 'p1', title: 'Opening theme', prongs: [] },
    { id: 'p2', title: 'Q1 roadmap — search', prongs: [] },
    { id: 'p3', title: 'Q2 roadmap — Youngstown', prongs: [] },
    { id: 'p4', title: 'Hinge + close', prongs: [] },
  ],
  respondent: [
    { id: 'r1', title: 'Opening theme', prongs: [] },
    { id: 'r2', title: 'No search / Tuggle line', prongs: [] },
    { id: 'r3', title: 'Category 1 authority', prongs: [] },
    { id: 'r4', title: 'Rebuttal points', prongs: [] },
  ],
}

const OPENINGS_SEED = {
  petitioner:
    '<h2>Petitioner opening</h2><p>May it please the Court. Counsel for Bobby Bronner…</p><h2>OA notes</h2><ul><li>Cold facts</li><li>Hardest question from the government</li><li>One-sentence hinge on Q1 / Q2</li></ul>',
  respondent:
    '<h2>Respondent opening</h2><p>May it please the Court. Counsel for the United States…</p><h2>OA notes</h2><ul><li>Cold facts</li><li>Hardest question from Bronner</li><li>One-sentence hinge on Q1 / Q2</li></ul>',
}

function jsonSame(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** @type {Record<string, WorkspaceDocSpec>} */
export const WORKSPACE_DOCS = {
  arguments: {
    collection: 'argumentsBoard',
    kind: 'arguments',
    storageKey: 'case-prep-arguments-v1',
    event: 'case-prep-arguments-hydrated',
    loadLocal() {
      const saved = readJson(this.storageKey, null)
      if (saved && typeof saved === 'object') {
        return {
          outlines: {
            petitioner: Array.isArray(saved.outlines?.petitioner)
              ? saved.outlines.petitioner
              : DEFAULT_ARG_OUTLINES.petitioner.map((s) => ({ ...s, prongs: [] })),
            respondent: Array.isArray(saved.outlines?.respondent)
              ? saved.outlines.respondent
              : DEFAULT_ARG_OUTLINES.respondent.map((s) => ({ ...s, prongs: [] })),
          },
          notes: {
            petitioner:
              typeof saved.notes?.petitioner === 'string'
                ? saved.notes.petitioner
                : DEFAULT_ARG_NOTES.petitioner,
            respondent:
              typeof saved.notes?.respondent === 'string'
                ? saved.notes.respondent
                : DEFAULT_ARG_NOTES.respondent,
          },
          activeSectionBySide: {
            petitioner: saved.activeSectionBySide?.petitioner || null,
            respondent: saved.activeSectionBySide?.respondent || null,
          },
          activeFocusBySide: {
            petitioner: saved.activeFocusBySide?.petitioner || { type: 'side' },
            respondent: saved.activeFocusBySide?.respondent || { type: 'side' },
          },
        }
      }
      return {
        outlines: {
          petitioner: DEFAULT_ARG_OUTLINES.petitioner.map((s) => ({ ...s, prongs: [] })),
          respondent: DEFAULT_ARG_OUTLINES.respondent.map((s) => ({ ...s, prongs: [] })),
        },
        notes: { ...DEFAULT_ARG_NOTES },
        activeSectionBySide: { petitioner: null, respondent: null },
        activeFocusBySide: {
          petitioner: { type: 'side' },
          respondent: { type: 'side' },
        },
      }
    },
    toRow(data) {
      return {
        id: DOC_ROW_ID,
        outlines: data.outlines,
        notes: data.notes,
        activeSectionBySide: data.activeSectionBySide,
        activeFocusBySide: data.activeFocusBySide,
      }
    },
    fromRow(row) {
      if (!row?.outlines || !row?.notes) return null
      return {
        outlines: row.outlines,
        notes: row.notes,
        activeSectionBySide: row.activeSectionBySide || {
          petitioner: null,
          respondent: null,
        },
        activeFocusBySide: row.activeFocusBySide || {
          petitioner: { type: 'side' },
          respondent: { type: 'side' },
        },
      }
    },
    same: jsonSame,
  },

  guide_edits: {
    collection: 'guideEdits',
    kind: 'guide_edits',
    storageKey: 'case-prep-guide-edits-v2',
    event: 'case-prep-guide-hydrated',
    loadLocal() {
      const current = readJson(this.storageKey, null)
      if (current && typeof current === 'object') return { edits: current }
      const legacy = readJson('case-prep-guide-edits-v1', null)
      if (legacy && typeof legacy === 'object') return { edits: legacy }
      return { edits: {} }
    },
    toRow(data) {
      return { id: DOC_ROW_ID, edits: data.edits || {} }
    },
    fromRow(row) {
      if (!row || typeof row.edits !== 'object') return null
      return { edits: row.edits || {} }
    },
    same: jsonSame,
  },

  facts: {
    collection: 'factsBoard',
    kind: 'facts',
    storageKey: 'case-prep-facts-v3',
    event: 'case-prep-facts-hydrated',
    loadLocal() {
      const saved = readJson(this.storageKey, null)
      return { facts: Array.isArray(saved) ? saved : structuredClone(SEED_FACTS) }
    },
    toRow(data) {
      return { id: DOC_ROW_ID, facts: data.facts || [] }
    },
    fromRow(row) {
      if (!Array.isArray(row?.facts)) return null
      return { facts: row.facts }
    },
    same: jsonSame,
  },

  openings: {
    collection: 'openings',
    kind: 'openings',
    storageKey: 'case-prep-openings-v1',
    event: 'case-prep-openings-hydrated',
    loadLocal() {
      const saved = readJson(this.storageKey, null)
      if (saved && typeof saved === 'object') {
        return {
          petitioner:
            typeof saved.petitioner === 'string' ? saved.petitioner : OPENINGS_SEED.petitioner,
          respondent:
            typeof saved.respondent === 'string' ? saved.respondent : OPENINGS_SEED.respondent,
        }
      }
      return { ...OPENINGS_SEED }
    },
    toRow(data) {
      return {
        id: DOC_ROW_ID,
        petitioner: data.petitioner,
        respondent: data.respondent,
      }
    },
    fromRow(row) {
      if (typeof row?.petitioner !== 'string' || typeof row?.respondent !== 'string') return null
      return { petitioner: row.petitioner, respondent: row.respondent }
    },
    same: jsonSame,
  },
}

/** @type {Record<string, (data: object) => void>} */
const publishers = {}

export function registerWorkspaceDocPublisher(kind, fn) {
  publishers[kind] = fn
}

export function saveWorkspaceDoc(kind, data) {
  const spec = WORKSPACE_DOCS[kind]
  if (!spec) return
  const payload =
    kind === 'guide_edits'
      ? data.edits
      : kind === 'facts'
        ? data.facts
        : data
  writeJson(spec.storageKey, payload)
  if (typeof publishers[kind] === 'function') publishers[kind](data)
}

export function hydrateWorkspaceDocFromRemote(kind, row) {
  const spec = WORKSPACE_DOCS[kind]
  if (!spec) return false
  const data = spec.fromRow(row)
  if (!data) return false
  const local = spec.loadLocal()
  if (spec.same(local, data)) return false
  const payload =
    kind === 'guide_edits' ? data.edits : kind === 'facts' ? data.facts : data
  writeJson(spec.storageKey, payload)
  try {
    window.dispatchEvent(new CustomEvent(spec.event, { detail: data }))
  } catch {
    /* tests */
  }
  return true
}

export function workspaceDocRowsFromLocal(kind) {
  const spec = WORKSPACE_DOCS[kind]
  if (!spec) return []
  return [spec.toRow(spec.loadLocal())]
}

export function allWorkspaceDocKinds() {
  return Object.keys(WORKSPACE_DOCS)
}
