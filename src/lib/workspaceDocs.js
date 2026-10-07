/**
 * Snapshot docs that live in localStorage and also sync through
 * library_records (Postgres) so phone / laptop share one prep.
 *
 * UI chrome (expand toggles, shelf open) stays local on purpose.
 * View state like active PDF page stays local so two devices do not fight.
 */

import { readJson, writeJson } from './persist'
import { SEED_FACTS } from '../data/factsSeed'
import { normalizeArgumentsBoard, removedOutlineIdsByDraft } from './argumentsBoard'
import { boardContent, mergeArgumentsBoards } from './argumentsMerge'
import { snapshotDocRevision } from './docRevisions'
import { getWorkspaceId } from './workspace'

/** When a workspace key exists, Postgres is the source of truth. Never invent seed. */
function serverOwnedWorkspace() {
  return Boolean(getWorkspaceId())
}

export const DOC_ROW_ID = 'main'

/**
 * Last Arguments board this browser knows the server had: set on every pull
 * that lands and on every acknowledged push. It is the "base" of the three-way
 * merge, which is what lets a pull tell "this tab edited prong 1.2" apart from
 * "this tab is holding an old copy of prong 1.2".
 */
export const ARGUMENTS_BASE_KEY = 'case-prep-arguments-base-v1'

export function rememberArgumentsBase(row) {
  if (!row || (!row.draftsBySide && !row.outlines)) return
  writeJson(ARGUMENTS_BASE_KEY, boardContent(normalizeArgumentsBoard(row)))
}

export function readArgumentsBase() {
  const raw = readJson(ARGUMENTS_BASE_KEY, null)
  if (!raw || !raw.draftsBySide) return null
  return normalizeArgumentsBoard(raw)
}

export function forgetArgumentsBase() {
  try {
    localStorage.removeItem(ARGUMENTS_BASE_KEY)
  } catch {
    /* ignore */
  }
}

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
      const raw = readJson(this.storageKey, null)
      if (!hasPersistedArgumentsSave(raw)) {
        // Blank Main only for the in-memory editor. Do not treat this as a
        // persisted row to upload (see workspaceDocRowsFromLocal).
        return normalizeArgumentsBoard(null)
      }
      return normalizeArgumentsBoard(raw)
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
    fromRow(row, { forceRemote = false } = {}) {
      if (!row) return null
      if (!row.draftsBySide && !row.outlines) return null
      const rawLocal = readJson(this.storageKey, null)
      const remoteOnly = normalizeArgumentsBoard(row)
      // Boot (forceRemote) or empty local cache: Postgres wins entirely.
      // Keep only which section is open in this browser.
      if (forceRemote || !hasPersistedArgumentsSave(rawLocal)) {
        const localChrome = hasPersistedArgumentsSave(rawLocal)
          ? normalizeArgumentsBoard(rawLocal)
          : null
        return {
          ...remoteOnly,
          activeSectionBySide: localChrome?.activeSectionBySide || {},
          activeFocusBySide: localChrome?.activeFocusBySide || {},
        }
      }
      const remote = remoteOnly
      const local = normalizeArgumentsBoard(rawLocal)
      // Three-way merge against the last server board this browser saw. With
      // no base (first run after this change, cleared storage) the server wins:
      // never guess by note length, that is what pushed stale text back.
      const base = readArgumentsBase()
      const { board: merged } = mergeArgumentsBoards(base, local, remote)
      return {
        ...remote,
        draftsBySide: merged.draftsBySide,
        activeDraftBySide: merged.activeDraftBySide,
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
      if (Array.isArray(saved)) return { facts: saved }
      // Synced workspace: wait for Postgres. Local-only demo may use seed.
      return { facts: serverOwnedWorkspace() ? [] : structuredClone(SEED_FACTS) }
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
            typeof saved.petitioner === 'string'
              ? saved.petitioner
              : serverOwnedWorkspace()
                ? ''
                : OPENINGS_SEED.petitioner,
          respondent:
            typeof saved.respondent === 'string'
              ? saved.respondent
              : serverOwnedWorkspace()
                ? ''
                : OPENINGS_SEED.respondent,
        }
      }
      return serverOwnedWorkspace()
        ? { petitioner: '', respondent: '' }
        : { ...OPENINGS_SEED }
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

function writeWorkspaceDocNow(kind, data, { sync = true } = {}) {
  writeWorkspaceDocLocal(kind, data)
  if (!sync) return
  if (typeof publishers[kind] === 'function') publishers[kind](data)
}

/**
 * Write the dedicated localStorage key and hold the pull lock without notifying
 * React sync subscribers. Call this inside a setState updater (trash a section)
 * so a nested library setState cannot drop the Postgres push.
 */
export function stageWorkspaceDocLocal(kind, data) {
  if (!WORKSPACE_DOCS[kind]) return
  pendingSaves[kind] = { data, sync: true }
  globalThis.clearTimeout(saveTimers[kind])
  writeWorkspaceDocLocal(kind, data)
}

/**
 * Persist a workspace doc. Debounced by default so outline titles and TipTap
 * notes stay smooth; pass `{ immediate: true }` on pagehide / Backup now.
 *
 * Pass `{ sync: false }` for browser-local chrome (which prong is open) so the
 * tab does not re-push the whole Arguments board and bump Postgres updated_at.
 */
export function saveWorkspaceDoc(kind, data, { immediate = false, sync = true } = {}) {
  if (!WORKSPACE_DOCS[kind]) return
  const prevPending = pendingSaves[kind]
  // A chrome-only save must not cancel a pending content push.
  if (prevPending && !sync && prevPending.sync) {
    writeWorkspaceDocLocal(kind, data)
    return
  }
  pendingSaves[kind] = { data, sync: Boolean(sync) }
  globalThis.clearTimeout(saveTimers[kind])
  if (immediate) {
    const pending = pendingSaves[kind]
    delete pendingSaves[kind]
    writeWorkspaceDocNow(kind, pending.data, { sync: pending.sync })
    return
  }
  saveTimers[kind] = globalThis.setTimeout(() => {
    const pending = pendingSaves[kind]
    delete pendingSaves[kind]
    if (pending !== undefined) {
      writeWorkspaceDocNow(kind, pending.data, { sync: pending.sync })
    }
  }, SAVE_DEBOUNCE_MS)
}

/** Drop debounced editor saves without writing them (Reload from database). */
export function discardWorkspaceDocSaves() {
  for (const kind of Object.keys(pendingSaves)) {
    globalThis.clearTimeout(saveTimers[kind])
    delete pendingSaves[kind]
  }
}

/** Flush any debounced editor saves (tab hide / tests). */
export function flushWorkspaceDocSaves() {
  for (const kind of Object.keys(pendingSaves)) {
    globalThis.clearTimeout(saveTimers[kind])
    const pending = pendingSaves[kind]
    delete pendingSaves[kind]
    if (pending !== undefined) {
      writeWorkspaceDocNow(kind, pending.data, { sync: pending.sync })
    }
  }
}

export function hydrateWorkspaceDocFromRemote(kind, row, { forceRemote = false } = {}) {
  const spec = WORKSPACE_DOCS[kind]
  if (!spec) return false
  // A pull that lands while Arguments still has a debounced save would write
  // the older remote board over a prong the user just added or moved.
  // Boot forceRemote still wins so a seed cache cannot block Postgres.
  //
  // Settle the debounced save into localStorage first (without publishing it)
  // and fall through to the three-way merge below. Publishing the raw pending
  // board here, as before, sent it with the NEW server base and silently
  // overwrote whatever the other tab / MCP had just written.
  if (kind === 'arguments' && pendingSaves.arguments !== undefined) {
    const pending = pendingSaves.arguments
    globalThis.clearTimeout(saveTimers.arguments)
    delete pendingSaves.arguments
    if (!forceRemote) writeWorkspaceDocLocal(kind, pending.data)
  }
  const data =
    kind === 'arguments' ? spec.fromRow(row, { forceRemote }) : spec.fromRow(row)
  if (!data) return false
  // The pulled row is now the newest server state this browser has seen.
  if (kind === 'arguments') rememberArgumentsBase(row)
  const local = spec.loadLocal()
  if (kind === 'arguments' && typeof publishers[kind] === 'function') {
    const remoteBoard = normalizeArgumentsBoard(row)
    if (
      forceRemote ||
      !spec.same(data, remoteBoard) ||
      remoteStillHasRemovedIds(remoteBoard, data)
    ) {
      publishers[kind](data)
    }
  }
  // localStorage is shared by every tab in this browser, so it often already
  // holds this board because another tab wrote it. That says nothing about
  // this tab's editor, which may still show the older board. Skip the write
  // but always notify: a silent tab later saved its stale board with a fresh
  // sync base, and the server accepted it, reverting the other tab's edit.
  if (forceRemote || !spec.same(local, data)) {
    snapshotDocRevision(kind, local, 'hydrate')
    const payload =
      kind === 'guide_edits' ? data.edits : kind === 'facts' ? data.facts : data
    writeJson(spec.storageKey, payload)
  }
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
  // Do not invent library_records rows from seed / blank defaults. An empty
  // browser must pull Postgres first; only a real local save may upload.
  if (kind === 'arguments') {
    if (!hasPersistedArgumentsSave(readJson(spec.storageKey, null))) return []
  } else if (kind === 'facts') {
    if (!Array.isArray(readJson(spec.storageKey, null))) return []
  } else if (kind === 'openings') {
    const saved = readJson(spec.storageKey, null)
    if (!saved || typeof saved !== 'object') return []
  } else if (kind === 'guide_edits') {
    const current = readJson(spec.storageKey, null)
    const legacy = readJson('case-prep-guide-edits-v1', null)
    if (!current && !legacy) return []
  }
  return [spec.toRow(spec.loadLocal())]
}

export function allWorkspaceDocKinds() {
  return Object.keys(WORKSPACE_DOCS)
}
