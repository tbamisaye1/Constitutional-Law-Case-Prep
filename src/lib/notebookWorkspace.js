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
import { mergeNotebookSnapshots } from './notebookMerge'
import { snapshotDocRevision } from './docRevisions'

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

const NOTEBOOK_SAVE_DEBOUNCE_MS = 400
let notebookSaveTimer = 0
/** @type {{ tree: object[], pagesBySection: object } | null} */
let pendingNotebookSave = null

function writeNotebookSnapshotNow(tree, pagesBySection) {
  const payload = { tree, pagesBySection }
  writeJson(NOTEBOOK_STORAGE_KEY, payload)
  if (typeof syncPublisher === 'function') {
    syncPublisher(tree, pagesBySection)
  }
}

/**
 * Persist locally and queue a workspace sync push when the publisher is live.
 * Debounced by default so Notes typing stays smooth; pass `{ immediate: true }`
 * on pagehide / recovery writes.
 */
export function saveNotebookSnapshot(tree, pagesBySection, { immediate = false } = {}) {
  pendingNotebookSave = { tree, pagesBySection }
  globalThis.clearTimeout(notebookSaveTimer)
  if (immediate) {
    pendingNotebookSave = null
    writeNotebookSnapshotNow(tree, pagesBySection)
    return
  }
  notebookSaveTimer = globalThis.setTimeout(() => {
    const next = pendingNotebookSave
    pendingNotebookSave = null
    if (next) writeNotebookSnapshotNow(next.tree, next.pagesBySection)
  }, NOTEBOOK_SAVE_DEBOUNCE_MS)
}

/** Flush a debounced notebook save (tab hide / tests). */
export function flushNotebookSnapshotSave() {
  globalThis.clearTimeout(notebookSaveTimer)
  const next = pendingNotebookSave
  pendingNotebookSave = null
  if (next) writeNotebookSnapshotNow(next.tree, next.pagesBySection)
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
 * sync meta. We merge with the dedicated local key so a smaller remote notebook
 * cannot erase sections that still have pages here (the Background wipe).
 */
/** Drop a debounced notebook save without writing it (Reload from database). */
export function discardNotebookSnapshotSave() {
  globalThis.clearTimeout(notebookSaveTimer)
  pendingNotebookSave = null
}

export function hydrateNotebookFromRemote(row, { forceRemote = false } = {}) {
  if (!row?.tree || !row?.pagesBySection) return false
  const current = readJson(NOTEBOOK_STORAGE_KEY, null)
  if (notebookSnapshotsEqual(current, row)) return false

  const remote = { tree: row.tree, pagesBySection: row.pagesBySection }
  const merged =
    !forceRemote && current?.tree && current?.pagesBySection
      ? mergeNotebookSnapshots(remote, current)
      : remote

  const localChanged = !notebookSnapshotsEqual(current, merged)
  const remoteMissingLocal = !notebookSnapshotsEqual(merged, remote)

  if (localChanged) {
    if (current?.tree) snapshotDocRevision('notebook', current, 'hydrate')
    writeJson(NOTEBOOK_STORAGE_KEY, {
      tree: merged.tree,
      pagesBySection: merged.pagesBySection,
    })
    try {
      window.dispatchEvent(
        new CustomEvent(NOTEBOOK_HYDRATE_EVENT, {
          detail: { tree: merged.tree, pagesBySection: merged.pagesBySection },
        })
      )
    } catch {
      /* SSR / tests */
    }
  }

  // Always push when the union is richer than remote so Postgres is not left
  // on a smaller wipe (even if this browser already had the full local tree).
  if (typeof syncPublisher === 'function' && remoteMissingLocal) {
    syncPublisher(merged.tree, merged.pagesBySection)
  }

  return localChanged || remoteMissingLocal
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
