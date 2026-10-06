/**
 * Rolling local backups of workspace docs (arguments, notebook mirrors, etc.).
 *
 * Sync and seed bumps can still replace the live row. These snapshots stay in
 * localStorage so a wiped Arguments prong can be recovered without Neon PITR.
 */

import { readJson, writeJson } from './persist'

export const DOC_REVISIONS_KEY = 'case-prep-doc-revisions-v1'
export const DOC_REVISIONS_KEEP = 20

/**
 * Typing used to snapshot the full Arguments board on every keystroke (large
 * HTML notes × rolling history). Keep recovery snapshots, but not mid-burst.
 */
export const DOC_REVISION_SAVE_THROTTLE_MS = 15_000

/** @type {Record<string, number>} */
const lastSaveSnapshotAt = {}

/** Test helper: clear save-throttle clocks between cases. */
export function resetDocRevisionSaveThrottleForTests() {
  for (const key of Object.keys(lastSaveSnapshotAt)) delete lastSaveSnapshotAt[key]
}

function emptyStore() {
  return { byKind: {} }
}

export function listDocRevisions(kind) {
  const store = readJson(DOC_REVISIONS_KEY, emptyStore()) || emptyStore()
  const list = store.byKind?.[kind]
  return Array.isArray(list) ? list : []
}

/**
 * Save a snapshot of `data` for `kind` when it differs from the latest revision.
 *
 * @param {string} kind Workspace doc kind (e.g. 'arguments').
 * @param {object} data Plain JSON-serialisable payload about to be overwritten.
 * @param {string} [reason] Why we are snapshotting (save, hydrate, seed_merge).
 */
export function snapshotDocRevision(kind, data, reason = 'save') {
  if (!kind || data == null || typeof data !== 'object') return false
  const why = String(reason || 'save')
  // Hydrate / seed paths always snapshot (those are the wipe risks).
  // Ordinary editor saves are throttled so typing stays on the main thread.
  if (why === 'save') {
    const now = Date.now()
    const prevAt = lastSaveSnapshotAt[kind] || 0
    if (now - prevAt < DOC_REVISION_SAVE_THROTTLE_MS) return false
  }

  let serialized
  try {
    serialized = JSON.stringify(data)
  } catch {
    return false
  }
  if (!serialized || serialized === '{}' || serialized === 'null') return false

  const store = readJson(DOC_REVISIONS_KEY, emptyStore()) || emptyStore()
  const byKind = { ...(store.byKind || {}) }
  const prev = Array.isArray(byKind[kind]) ? byKind[kind] : []
  if (prev[0]?.serialized === serialized) return false

  const entry = {
    at: Date.now(),
    reason: why,
    serialized,
  }
  byKind[kind] = [entry, ...prev].slice(0, DOC_REVISIONS_KEEP)
  writeJson(DOC_REVISIONS_KEY, { byKind })
  if (why === 'save') lastSaveSnapshotAt[kind] = entry.at
  return true
}

/**
 * Return the most recent revision whose serialized payload matches `test`.
 * Useful for recovery scripts (e.g. find a prong that contains a phrase).
 */
export function findDocRevision(kind, test) {
  const list = listDocRevisions(kind)
  for (const entry of list) {
    try {
      const data = JSON.parse(entry.serialized)
      if (test(data, entry)) return { data, entry }
    } catch {
      /* skip corrupt */
    }
  }
  return null
}
