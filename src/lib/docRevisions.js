/**
 * Rolling local backups of workspace docs (arguments, notebook mirrors, etc.).
 *
 * Sync and seed bumps can still replace the live row. These snapshots stay in
 * localStorage so a wiped Arguments prong can be recovered without Neon PITR.
 */

import { readJson, writeJson } from './persist'

export const DOC_REVISIONS_KEY = 'case-prep-doc-revisions-v1'
export const DOC_REVISIONS_KEEP = 20

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
    reason: String(reason || 'save'),
    serialized,
  }
  byKind[kind] = [entry, ...prev].slice(0, DOC_REVISIONS_KEEP)
  writeJson(DOC_REVISIONS_KEY, { byKind })
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
