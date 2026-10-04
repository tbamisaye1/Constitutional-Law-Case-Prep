/**
 * Bridge between the OneNote notebook (localStorage) and workspace sync.
 *
 * Editors write here. The case-library sync loop pushes the snapshot to
 * Postgres as library_records kind=notebook id=main, and pulls it back onto
 * other devices / after a site-data wipe (when the workspace key still exists
 * or is pinned via VITE_WORKSPACE_ID).
 */

import { NOTEBOOK_STORAGE_KEY } from './articleTakeaways'
import { writeJson, readJson } from './persist'
import { SEED_PAGES, SEED_TREE } from '../data/notebookSeed'

export const NOTEBOOK_ROW_ID = 'main'
export const NOTEBOOK_HYDRATE_EVENT = 'case-prep-notebook-hydrated'

/** @type {null | ((tree: object[], pagesBySection: object) => void)} */
let syncPublisher = null

/**
 * Called once from useCaseLibrary so notebook edits can mark the sync row dirty.
 */
export function registerNotebookSyncPublisher(fn) {
  syncPublisher = fn
}

export function readNotebookLocal() {
  const saved = readJson(NOTEBOOK_STORAGE_KEY, null)
  if (saved?.tree && saved?.pagesBySection) return saved
  return { tree: structuredClone(SEED_TREE), pagesBySection: structuredClone(SEED_PAGES) }
}

/**
 * Library boot: prefer the dedicated editor key, then the library mirror, then seed.
 * Editors always write the dedicated key first, so that copy wins when both exist.
 */
export function notebookRowsForLibraryLoad(libraryNotebook) {
  const saved = readJson(NOTEBOOK_STORAGE_KEY, null)
  if (saved?.tree && saved?.pagesBySection) {
    return [
      {
        id: NOTEBOOK_ROW_ID,
        tree: saved.tree,
        pagesBySection: saved.pagesBySection,
      },
    ]
  }
  if (Array.isArray(libraryNotebook) && libraryNotebook[0]?.tree) {
    return libraryNotebook
  }
  return notebookRowsFromLocal()
}

/**
 * Persist locally and queue a workspace sync push when the publisher is live.
 */
export function saveNotebookSnapshot(tree, pagesBySection) {
  const payload = { tree, pagesBySection }
  writeJson(NOTEBOOK_STORAGE_KEY, payload)
  if (typeof syncPublisher === 'function') {
    syncPublisher(tree, pagesBySection)
  }
}

/**
 * True when two notebook snapshots carry the same tree and pages.
 */
export function notebookSnapshotsEqual(a, b) {
  if (!a?.tree || !a?.pagesBySection || !b?.tree || !b?.pagesBySection) return false
  return (
    JSON.stringify(a.tree) === JSON.stringify(b.tree) &&
    JSON.stringify(a.pagesBySection) === JSON.stringify(b.pagesBySection)
  )
}

/**
 * Apply a server (or other-device) notebook onto this browser and notify editors.
 *
 * Callers must only pass a row that applyChanges accepted as newer than local
 * sync meta. Unconditional hydrate after every sync used to rewrite the
 * dedicated notes key with a stale library-mirror copy and wipe new sections.
 */
export function hydrateNotebookFromRemote(row) {
  if (!row?.tree || !row?.pagesBySection) return false
  const current = readJson(NOTEBOOK_STORAGE_KEY, null)
  if (notebookSnapshotsEqual(current, row)) return false
  writeJson(NOTEBOOK_STORAGE_KEY, {
    tree: row.tree,
    pagesBySection: row.pagesBySection,
  })
  try {
    window.dispatchEvent(
      new CustomEvent(NOTEBOOK_HYDRATE_EVENT, {
        detail: { tree: row.tree, pagesBySection: row.pagesBySection },
      })
    )
  } catch {
    /* SSR / tests */
  }
  return true
}

export function notebookRowsFromLocal() {
  const snap = readNotebookLocal()
  return [
    {
      id: NOTEBOOK_ROW_ID,
      tree: snap.tree,
      pagesBySection: snap.pagesBySection,
    },
  ]
}
