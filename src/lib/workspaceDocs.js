/**
 * Snapshot docs that live in localStorage and also sync through
 * library_records (Postgres) so phone / laptop share one prep.
 *
 * UI chrome (expand toggles, shelf open) stays local on purpose.
 * View state like active PDF page stays local so two devices do not fight.
 */

import { readJson, writeJson } from './persist'
import { SEED_FACTS } from '../data/factsSeed'
import {
  normalizeArgumentsBoard,
  preferLocalArgumentDeletions,
  removedOutlineIdsByDraft,
} from './argumentsBoard'
import { snapshotDocRevision } from './docRevisions'

export const DOC_ROW_ID = 'main'

/**
 * True when localStorage holds a real arguments save, not "missing key".
 * normalizeArgumentsBoard(null) builds a seeded board, so emptiness must be
 * checked on the raw JSON before normalization.
 */
export function hasPersistedArgumentsSave(raw) {
  if (!raw || typeof raw !== 'object') return false
  if (Array.isArray(raw.draftsBySide?.petitioner)) return true
  if (raw.outlines && typeof raw.outlines === 'object') return true
  return false
}

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
  petitioner: '',
  respondent: '',
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
      return normalizeArgumentsBoard(readJson(this.storageKey, null))
    },
    toRow(data) {
      const board = normalizeArgumentsBoard(data)
      return {
        id: DOC_ROW_ID,
        draftsBySide: board.draftsBySide,
        activeDraftBySide: board.activeDraftBySide,
        removedOutlineIdsByDraft: removedOutlineIdsByDraft(board.draftsBySide),
        // activeSectionBySide / activeFocusBySide stay browser-local. Syncing
        // them made devices fight over which prong was open (jumping back to
        // 3.2 while you clicked elsewhere).
        // Keep legacy mirrors so older clients / Ask AI still see Main.
        outlines: {
          petitioner: board.draftsBySide.petitioner?.[0]?.sections || [],
          respondent: board.draftsBySide.respondent?.[0]?.sections || [],
        },
        notes: {
          petitioner: board.draftsBySide.petitioner?.[0]?.notes || DEFAULT_ARG_NOTES.petitioner,
          respondent: board.draftsBySide.respondent?.[0]?.notes || DEFAULT_ARG_NOTES.respondent,
        },
      }
    },
    fromRow(row) {
      if (!row) return null
      if (!row.draftsBySide && !row.outlines) return null
      const rawLocal = readJson(this.storageKey, null)
      // Cleared cookies / first visit: localStorage is empty, but
      // normalizeArgumentsBoard(null) invents a full seed board. Merging that
      // "local" seed with Postgres used to overwrite real notes on hydrate and
      // then push the hybrid back. Trust the database when there is no save.
      if (!hasPersistedArgumentsSave(rawLocal)) {
        const remoteOnly = normalizeArgumentsBoard(row)
        return {
          ...remoteOnly,
          activeSectionBySide: {},
          activeFocusBySide: {},
        }
      }
      const remote = normalizeArgumentsBoard(row)
      const local = normalizeArgumentsBoard(rawLocal)
      // Prefer local outline shape when this browser already deleted seed prongs
      // that a stale remote sync still carries (same draft id, fewer prongs).
      const draftsBySide = preferLocalArgumentDeletions(
        remote.draftsBySide,
        local.draftsBySide
      )
      return {
        ...remote,
        draftsBySide,
        activeSectionBySide: local.activeSectionBySide,
        activeFocusBySide: local.activeFocusBySide,
      }
    },
    same(a, b) {
      // Ignore which section/prong is open when comparing sync payloads.
      const strip = (board) => {
        const n = normalizeArgumentsBoard(board)
        return {
          draftsBySide: n.draftsBySide,
          activeDraftBySide: n.activeDraftBySide,
        }
      }
      return jsonSame(strip(a), strip(b))
    },
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

/** Quiet period so typing does not stringify + write localStorage on every key. */
const SAVE_DEBOUNCE_MS = 400

/** @type {Record<string, object>} */
const pendingSaves = {}
/** @type {Record<string, number>} */
const saveTimers = {}

export function registerWorkspaceDocPublisher(kind, fn) {
  publishers[kind] = fn
}

function payloadForKind(kind, data) {
  if (kind === 'guide_edits') return data.edits
  if (kind === 'facts') return data.facts
  return data
}

function writeWorkspaceDocLocal(kind, data) {
  const spec = WORKSPACE_DOCS[kind]
  if (!spec) return
  const payload = payloadForKind(kind, data)
  snapshotDocRevision(kind, spec.loadLocal(), 'save')
  writeJson(spec.storageKey, payload)
}

function writeWorkspaceDocNow(kind, data) {
  writeWorkspaceDocLocal(kind, data)
  if (typeof publishers[kind] === 'function') publishers[kind](data)
}

/**
 * Write the dedicated localStorage key and hold the pull lock without notifying
 * React sync subscribers. Call this inside a setState updater (trash a section)
 * so a nested library setState cannot drop the Postgres push.
 */
export function stageWorkspaceDocLocal(kind, data) {
  if (!WORKSPACE_DOCS[kind]) return
  pendingSaves[kind] = data
  globalThis.clearTimeout(saveTimers[kind])
  writeWorkspaceDocLocal(kind, data)
}

/**
 * Persist a workspace doc. Debounced by default so outline titles and TipTap
 * notes stay smooth; pass `{ immediate: true }` on pagehide / Backup now.
 */
export function saveWorkspaceDoc(kind, data, { immediate = false } = {}) {
  if (!WORKSPACE_DOCS[kind]) return
  pendingSaves[kind] = data
  globalThis.clearTimeout(saveTimers[kind])
  if (immediate) {
    delete pendingSaves[kind]
    writeWorkspaceDocNow(kind, data)
    return
  }
  saveTimers[kind] = globalThis.setTimeout(() => {
    const next = pendingSaves[kind]
    delete pendingSaves[kind]
    if (next !== undefined) writeWorkspaceDocNow(kind, next)
  }, SAVE_DEBOUNCE_MS)
}

/** Flush any debounced editor saves (tab hide / tests). */
export function flushWorkspaceDocSaves() {
  for (const kind of Object.keys(pendingSaves)) {
    globalThis.clearTimeout(saveTimers[kind])
    const next = pendingSaves[kind]
    delete pendingSaves[kind]
    if (next !== undefined) writeWorkspaceDocNow(kind, next)
  }
}

export function hydrateWorkspaceDocFromRemote(kind, row) {
  const spec = WORKSPACE_DOCS[kind]
  if (!spec) return false
  // A pull that lands while Arguments still has a debounced save would write
  // the older remote board over a prong the user just added or moved.
  if (kind === 'arguments' && pendingSaves.arguments !== undefined) {
    if (typeof publishers[kind] === 'function') publishers[kind](pendingSaves.arguments)
    return false
  }
  const data = spec.fromRow(row)
  if (!data) return false
  const local = spec.loadLocal()
  if (kind === 'arguments' && typeof publishers[kind] === 'function') {
    const remoteBoard = normalizeArgumentsBoard(row)
    if (!spec.same(data, remoteBoard) || remoteStillHasRemovedIds(remoteBoard, data)) {
      publishers[kind](data)
    }
  }
  if (spec.same(local, data)) return false
  snapshotDocRevision(kind, local, 'hydrate')
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

function remoteStillHasRemovedIds(remoteBoard, localBoard) {
  for (const side of ['petitioner', 'respondent']) {
    const remoteById = Object.fromEntries(
      (remoteBoard?.draftsBySide?.[side] || []).map((d) => [d.id, d])
    )
    for (const local of localBoard?.draftsBySide?.[side] || []) {
      const removed = new Set(local.removedOutlineIds || [])
      if (!removed.size) continue
      const remote = remoteById[local.id]
      if (!remote) continue
      for (const section of remote.sections || []) {
        if (removed.has(section.id)) return true
        for (const prong of section.prongs || []) {
          if (removed.has(prong.id)) return true
        }
      }
    }
  }
  return false
}

export function workspaceDocRowsFromLocal(kind) {
  const spec = WORKSPACE_DOCS[kind]
  if (!spec) return []
  return [spec.toRow(spec.loadLocal())]
}

export function allWorkspaceDocKinds() {
  return Object.keys(WORKSPACE_DOCS)
}
