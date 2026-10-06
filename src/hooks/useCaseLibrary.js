import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { emptyLayerNotes, LIBRARY_CASES } from '../data/casesSeed'
import { CASE_AT_BAR_ID, CASE_AT_BAR_LABEL } from '../data/caseAtBar'
import {
  SEED_CASE_FACTS,
  SEED_CITES,
  SEED_DOCTRINE_TIMELINE,
  SEED_OPINIONS,
  SEED_PROCEDURAL_TIMELINE,
  SEED_RECORD_TIMELINE,
} from '../data/caseResearchSeed'
import {
  deleteDocument,
  downloadDocument,
  ingestPdf,
  listIngestSources,
  removeIngestSource,
  syncChanges,
  uploadDocument,
  uploadDocumentDirect,
} from '../api/client'
import { idbDeleteFile, idbGetFile, idbPutFile } from '../lib/fileStore'
import { onPageHide, readJson, writeJson } from '../lib/persist'
import {
  applyChanges,
  clearAccepted,
  collectChanges,
  emptySyncMeta,
  markDirty,
  markSeedRowsDirty,
  metaKey,
  pendingCount,
} from '../lib/sync'
import { getWorkspaceId } from '../lib/workspace'
import {
  hydrateNotebookFromRemote,
  notebookRowsForLibraryLoad,
  notebookRowsFromLocal,
  notebookSnapshotsEqual,
  NOTEBOOK_ROW_ID,
  flushNotebookSnapshotSave,
  registerNotebookSyncPublisher,
} from '../lib/notebookWorkspace'
import {
  allWorkspaceDocKinds,
  DOC_ROW_ID,
  flushWorkspaceDocSaves,
  hydrateWorkspaceDocFromRemote,
  registerWorkspaceDocPublisher,
  WORKSPACE_DOCS,
  workspaceDocRowsFromLocal,
} from '../lib/workspaceDocs'

const KEY = 'case-prep-library-v5'

/** Quiet period before a burst of edits turns into one push. */
const SYNC_DEBOUNCE_MS = 400

/**
 * Workspace docs (arguments / notebook / facts) wait for a short quiet period
 * so every keystroke does not start a Postgres round-trip. pagehide / Backup
 * now still flush immediately via their own paths.
 */
const WORKSPACE_DOC_SYNC_MS = 900

/** How often to retry after a failed sync, so a dropped connection recovers. */
const SYNC_RETRY_MS = 30_000

/**
 * Idle tabs used to skip the network entirely (nothing dirty → no /sync).
 * A second Chrome window, including Incognito, never saw argument notes until
 * reload. Pull on this interval, and again when the tab becomes visible.
 */
const SYNC_HEARTBEAT_MS = 4_000

/**
 * Until the first pull finishes, do not push. A fresh / incognito tab used to
 * mark seed arguments dirty and overwrite real Postgres notes before pull ran.
 */
let syncBootstrapDone = false
let bootstrapInFlight = false
let bootstrapRetryTimer = 0

/**
 * This browser's workspace key, read once.
 *
 * It cannot change without a reload: adopting another device's key deliberately
 * requires one, because the in-memory store still holds the old workspace's rows.
 */
const WORKSPACE_ID = getWorkspaceId()

function seedCases() {
  return LIBRARY_CASES.map((c) => ({ ...c }))
}

function flattenOpinions(seed) {
  return Object.entries(seed).flatMap(([caseId, list]) =>
    list.map((o) => ({ ...o, caseId }))
  )
}

function flattenFacts(seed) {
  return Object.entries(seed).flatMap(([caseId, list]) =>
    list.map((f) => ({ ...f, caseId }))
  )
}

function emptyStore() {
  return {
    cases: seedCases(),
    annotations: [],
    notesByCase: {},
    filesMeta: [],
    opinions: flattenOpinions(SEED_OPINIONS),
    caseFacts: flattenFacts(SEED_CASE_FACTS),
    cites: SEED_CITES,
    timeline: [...SEED_DOCTRINE_TIMELINE, ...SEED_PROCEDURAL_TIMELINE, ...SEED_RECORD_TIMELINE],
    noteTabs: [],
    // Custom shelf labels keyed by PDF filename (id === name).
    articleTitles: [],
    // Reading bookmarks: { id, fileId, page, label, savedAt }
    pdfBookmarks: [],
    // OneNote notebook snapshot (synced as library_records kind=notebook).
    notebook: notebookRowsFromLocal(),
    argumentsBoard: workspaceDocRowsFromLocal('arguments'),
    guideEdits: workspaceDocRowsFromLocal('guide_edits'),
    factsBoard: workspaceDocRowsFromLocal('facts'),
    openings: workspaceDocRowsFromLocal('openings'),
    activeFileId: null,
    pageByFile: {},
    // Which rows have changed since the backend last accepted them, and how
    // far through the server's timeline we have read. See lib/sync.js.
    syncMeta: emptySyncMeta(),
  }
}

function load() {
  const parsed = readJson(KEY, null)
  if (!parsed || typeof parsed !== 'object') return emptyStore()
  const base = emptyStore()
  return {
    ...base,
    cases: parsed.cases?.length ? parsed.cases : base.cases,
    annotations: parsed.annotations || [],
    notesByCase: parsed.notesByCase || {},
    filesMeta: parsed.filesMeta || [],
    opinions: parsed.opinions?.length ? parsed.opinions : base.opinions,
    caseFacts: parsed.caseFacts?.length ? parsed.caseFacts : base.caseFacts,
    cites: parsed.cites?.length ? parsed.cites : base.cites,
    timeline: parsed.timeline?.length ? parsed.timeline : base.timeline,
    noteTabs: parsed.noteTabs || [],
    articleTitles: Array.isArray(parsed.articleTitles) ? parsed.articleTitles : [],
    pdfBookmarks: Array.isArray(parsed.pdfBookmarks) ? parsed.pdfBookmarks : [],
    // Editors write case-prep-notebook-v3 first. Prefer that over the library
    // mirror, which can lag (debounce / quota) and used to clobber new sections
    // on the next sync hydrate.
    notebook: notebookRowsForLibraryLoad(parsed.notebook),
    argumentsBoard:
      Array.isArray(parsed.argumentsBoard) && parsed.argumentsBoard[0]
        ? parsed.argumentsBoard
        : workspaceDocRowsFromLocal('arguments'),
    guideEdits:
      Array.isArray(parsed.guideEdits) && parsed.guideEdits[0]
        ? parsed.guideEdits
        : workspaceDocRowsFromLocal('guide_edits'),
    factsBoard:
      Array.isArray(parsed.factsBoard) && parsed.factsBoard[0]
        ? parsed.factsBoard
        : workspaceDocRowsFromLocal('facts'),
    openings:
      Array.isArray(parsed.openings) && parsed.openings[0]
        ? parsed.openings
        : workspaceDocRowsFromLocal('openings'),
    activeFileId: parsed.activeFileId || null,
    pageByFile: parsed.pageByFile || {},
    // Absent for anyone who used the app before sync existed. Starting from a
    // blank meta table makes every local row look new, which is what uploads
    // their existing work on the first sync.
    syncMeta: parsed.syncMeta || base.syncMeta,
  }
}

/**
 * If the dedicated notebook key is ahead of the library mirror from the last
 * persist, mark the sync row dirty so the good snapshot is pushed.
 */
function markStaleNotebookMirrorDirty(parsed) {
  if (!WORKSPACE_ID) return
  if (!parsed || typeof parsed !== 'object') return
  const mirrored = Array.isArray(parsed.notebook) ? parsed.notebook[0] : null
  const dedicated = notebookRowsFromLocal()[0]
  if (!dedicated?.tree) return
  if (notebookSnapshotsEqual(mirrored, dedicated)) return
  const key = metaKey('library_records', 'notebook', NOTEBOOK_ROW_ID)
  memory = {
    ...memory,
    store: {
      ...memory.store,
      syncMeta: markDirty(memory.store.syncMeta, [key], Date.now()),
    },
  }
}

const listeners = new Set()
let persistTimer = 0
let syncTimer = 0
let syncInFlight = false

const parsedLibraryForBoot = readJson(KEY, null)

let memory = {
  store: load(),
  blobs: {},
  saveError: '',
  lastSavedAt: 0,
  // 'off' when there is no workspace key, otherwise idle | syncing | error.
  syncStatus: WORKSPACE_ID ? 'idle' : 'off',
  syncError: '',
  lastSyncedAt: 0,
  // False until the first Postgres pull hydrates prep docs. UI stays on a boot
  // screen so localStorage / leftover seed never flash before the DB wins.
  // When sync is off, ready immediately (local-only browser).
  workspaceReady: !WORKSPACE_ID,
}

// Dedicated notes key can be ahead of the library mirror after a crashed tab
// or quota failure. Push that snapshot instead of letting sync hydrate wipe it.
markStaleNotebookMirrorDirty(parsedLibraryForBoot)

/**
 * Editors call this (via notebookWorkspace) whenever the OneNote notebook changes.
 * Mirrors the snapshot into the sync store and schedules a Postgres push.
 */
function publishNotebookToSync(tree, pagesBySection) {
  const nextRow = { id: NOTEBOOK_ROW_ID, tree, pagesBySection }
  const prev = memory.store.notebook?.[0]
  if (
    prev &&
    JSON.stringify(prev.tree) === JSON.stringify(tree) &&
    JSON.stringify(prev.pagesBySection) === JSON.stringify(pagesBySection)
  ) {
    return
  }
  updateStore(
    (s) => ({ ...s, notebook: [nextRow] }),
    [metaKey('library_records', 'notebook', NOTEBOOK_ROW_ID)]
  )
  if (syncBootstrapDone) scheduleSync(WORKSPACE_DOC_SYNC_MS)
}

registerNotebookSyncPublisher(publishNotebookToSync)

function publishWorkspaceDocToSync(kind, data) {
  const spec = WORKSPACE_DOCS[kind]
  if (!spec) return
  const nextRow = spec.toRow(data)
  const prev = memory.store[spec.collection]?.[0]
  if (prev && JSON.stringify(prev) === JSON.stringify(nextRow)) return
  updateStore(
    (s) => ({ ...s, [spec.collection]: [nextRow] }),
    [metaKey('library_records', spec.kind, DOC_ROW_ID)]
  )
  if (syncBootstrapDone) {
    scheduleSync(kind === 'arguments' ? 0 : WORKSPACE_DOC_SYNC_MS)
  }
}

for (const kind of allWorkspaceDocKinds()) {
  registerWorkspaceDocPublisher(kind, (data) => publishWorkspaceDocToSync(kind, data))
}

function markUnsyncedDocDirty(kind, collection, rowId) {
  if (!WORKSPACE_ID) return
  if (!memory.store[collection]?.[0]) return
  const key = metaKey('library_records', kind, rowId)
  if (memory.store.syncMeta?.rows?.[key]) return
  memory = {
    ...memory,
    store: {
      ...memory.store,
      syncMeta: markDirty(memory.store.syncMeta, [key], Date.now()),
    },
  }
}

// Do not mark seed rows dirty or scheduleSync here. bootstrapSync pulls first;
// only then do we offer local-only rows. Early push was wiping Arguments.

function emit() {
  for (const fn of listeners) fn()
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot() {
  return memory
}

function persistNow() {
  const result = writeJson(KEY, memory.store)
  if (result.ok) {
    memory = { ...memory, saveError: '', lastSavedAt: Date.now() }
  } else {
    const quota = result.error?.name === 'QuotaExceededError'
    memory = {
      ...memory,
      saveError: quota
        ? 'Browser storage is full. Notes did not save. Remove a PDF or extra notes and try again.'
        : 'Could not save to this browser. Check you are not in private mode with storage blocked.',
    }
  }
  emit()
}

function persistSoon() {
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(persistNow, 200)
}

function setMemory(patch) {
  memory = { ...memory, ...patch }
  emit()
}

/**
 * Apply a store change and record which rows the backend now needs.
 *
 * @param {Function|object} updater Next store, or a reducer over the current one.
 * @param {string[]} dirtyKeys Meta keys from metaKey() for the rows that
 *   changed. Pass an empty array for view state such as the active page, which
 *   is local to this browser and not worth syncing.
 * @param {boolean} deleted True when those keys are now tombstones.
 */
function updateStore(updater, dirtyKeys = [], deleted = false) {
  const store = typeof updater === 'function' ? updater(memory.store) : updater
  if (store === memory.store) return

  const withMeta = dirtyKeys.length
    ? { ...store, syncMeta: markDirty(store.syncMeta, dirtyKeys, Date.now(), deleted) }
    : store

  memory = { ...memory, store: withMeta, saveError: '' }
  emit()
  persistSoon()
  if (dirtyKeys.length) scheduleSync()
}

function setSyncMeta(syncMeta) {
  memory = { ...memory, store: { ...memory.store, syncMeta } }
  emit()
  persistSoon()
}

function scheduleSync(delay = SYNC_DEBOUNCE_MS, options = {}) {
  if (memory.syncStatus === 'off') return
  // Block outbound pushes until the first pull finished (incognito / new device).
  if (!syncBootstrapDone && !options.forcePull && !options.allowBeforeBootstrap) {
    return
  }
  window.clearTimeout(syncTimer)
  syncTimer = window.setTimeout(() => runSync(options), delay)
}

/**
 * Exchange one batch with the backend.
 *
 * Failures are recorded and retried rather than thrown. The local store is
 * authoritative for this browser, so being offline is a normal state here, not
 * an error the user has to act on.
 *
 * @param {object} changes Rows to push, possibly empty for a pull-only sync.
 * @param {object} sent Snapshot of what those rows looked like, from
 *   collectChanges(), used to decide which keys may stop being dirty.
 */
async function exchange(changes, sent, { keepalive = false } = {}) {
  syncInFlight = true
  memory = { ...memory, syncStatus: 'syncing', syncError: '' }
  emit()

  try {
    const response = await syncChanges(memory.store.syncMeta.cursor, changes, { keepalive })

    const notebookBefore = memory.store.notebook?.[0]
    const docsBefore = Object.fromEntries(
      allWorkspaceDocKinds().map((kind) => {
        const spec = WORKSPACE_DOCS[kind]
        return [kind, memory.store[spec.collection]?.[0]]
      })
    )

    const applied = applyChanges(memory.store, memory.store.syncMeta, response.changes)
    const syncMeta = clearAccepted(applied.syncMeta, sent, response.serverTime)

    memory = {
      ...memory,
      store: { ...applied.store, syncMeta },
      syncStatus: 'idle',
      syncError: '',
      lastSyncedAt: Date.now(),
    }
    emit()
    persistSoon()

    // Only rewrite dedicated editor keys when applyChanges accepted a newer
    // remote row. Hydrating after every sync was wiping local Notes sections
    // whenever the library mirror lagged behind case-prep-notebook-v3.
    const notebookAfter = memory.store.notebook?.[0]
    if (notebookAfter && !notebookSnapshotsEqual(notebookBefore, notebookAfter)) {
      hydrateNotebookFromRemote(notebookAfter)
    }
    for (const kind of allWorkspaceDocKinds()) {
      const spec = WORKSPACE_DOCS[kind]
      const row = memory.store[spec.collection]?.[0]
      if (row && JSON.stringify(docsBefore[kind]) !== JSON.stringify(row)) {
        hydrateWorkspaceDocFromRemote(kind, row)
      }
    }

    await hydrateBlobs()
    return true
  } catch (error) {
    console.warn('Sync failed; local cache kept, database unreachable', error)
    memory = {
      ...memory,
      syncStatus: 'error',
      syncError: error?.message || 'Could not reach the backend.',
    }
    emit()
    scheduleSync(SYNC_RETRY_MS)
    return false
  } finally {
    syncInFlight = false
  }
}

/** Push dirty rows and pull whatever else changed. */
async function runSync({ keepalive = false, forcePull = false, allowBeforeBootstrap = false } = {}) {
  if (memory.syncStatus === 'off') return
  if (!syncBootstrapDone && !allowBeforeBootstrap && !forcePull) return

  // An edit that lands mid-request must not be dropped. Come back once the
  // current exchange is done rather than returning and waiting for either
  // another edit or the retry timer.
  if (syncInFlight) {
    scheduleSync(SYNC_DEBOUNCE_MS, { forcePull })
    return
  }

  const { changes, sent } = collectChanges(memory.store, memory.store.syncMeta)
  // Without forcePull, a quiet tab never talks to Postgres. That is fine for
  // saving (this tab has nothing to push) and wrong for live windows: the
  // other browser already uploaded arguments. Heartbeat / visibility use
  // forcePull so idle clients still pull.
  if (!forcePull && !Object.keys(sent).length && memory.syncStatus !== 'error') return

  const ok = await exchange(changes, sent, { keepalive })

  // A row re-edited while the request was in flight stays dirty, so give it
  // its own push instead of waiting for the next edit to trigger one.
  if (ok && pendingCount(memory.store.syncMeta) > 0) scheduleSync()
}

const MERGE_BACKUP_KEY = 'case-prep-merge-backup-v1'
// Bump the suffix when a one-shot server restore must run again after deploy.
const RECOVER_NOTES_FLAG = 'case-prep-recover-notes-2026-10-05-askai'
// Force Postgres arguments to win once after seed/localStorage wipe bugs.
const RECOVER_ARGUMENTS_FLAG = 'case-prep-recover-args-2026-10-06-pitr-815'

function pickMergedText(keepVal, dropVal) {
  const keep = String(keepVal || '').trim()
  const drop = String(dropVal || '').trim()
  if (keep) return keepVal || ''
  if (drop) return dropVal || ''
  return keepVal || dropVal || ''
}

/**
 * One-shot after the Costanzo merge scare: drop stale local tombstones that
 * would re-delete server notes, reset the sync cursor, and pull everything.
 */
async function recoverNotesFromServerOnce() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(RECOVER_NOTES_FLAG) === '1') return

  const syncMeta = memory.store.syncMeta || emptySyncMeta()
  const dirty = { ...(syncMeta.dirty || {}) }
  const rows = { ...(syncMeta.rows || {}) }
  for (const key of Object.keys(dirty)) {
    if (
      key.startsWith('annotations::') ||
      key.startsWith('documents::') ||
      key.startsWith('cases::') ||
      key === 'cases::case-1791153201425'
    ) {
      delete dirty[key]
      // Forget local "deleted" so a full pull can restore the server row.
      if (rows[key]?.deleted) delete rows[key]
    }
  }
  // Also clear deleted flags on annotation/document/case row meta even if not
  // dirty, so applyChanges accepts the restored server copies (headline note).
  for (const key of Object.keys(rows)) {
    if (
      (key.startsWith('annotations::') ||
        key.startsWith('documents::') ||
        key === 'cases::costanzo') &&
      rows[key]
    ) {
      // Drop local timestamps for costanzo so the restored headline wins.
      if (key === 'cases::costanzo') delete rows[key]
      else if (rows[key]?.deleted) delete rows[key]
    }
  }
  setSyncMeta({ ...syncMeta, dirty, rows, cursor: 0 })
  const ok = await exchange({}, {})
  if (ok) localStorage.setItem(RECOVER_NOTES_FLAG, '1')
  return ok
}

/**
 * One-shot: drop local arguments dirty/meta so Postgres wins over a seed copy
 * left in this browser after clearing site data or a bad merge.
 */
async function recoverArgumentsFromServerOnce() {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(RECOVER_ARGUMENTS_FLAG) === '1') return

  const argsKey = metaKey('library_records', 'arguments', DOC_ROW_ID)
  const syncMeta = memory.store.syncMeta || emptySyncMeta()
  const dirty = { ...(syncMeta.dirty || {}) }
  const rows = { ...(syncMeta.rows || {}) }
  delete dirty[argsKey]
  delete rows[argsKey]
  setSyncMeta({ ...syncMeta, dirty, rows, cursor: 0 })
  const ok = await exchange({}, {})
  if (ok) {
    localStorage.setItem(RECOVER_ARGUMENTS_FLAG, '1')
    const row = memory.store.argumentsBoard?.[0]
    // Database only. Do not re-merge the pre-pull seed board back on top.
    if (row) hydrateWorkspaceDocFromRemote('arguments', row)
  }
  return ok
}

function markWorkspaceReady() {
  if (memory.workspaceReady && syncBootstrapDone) return
  syncBootstrapDone = true
  memory = { ...memory, workspaceReady: true }
  emit()
}

/**
 * First sync after a page load: read the workspace, then offer local rows.
 *
 * Order matters on a browser that has never synced. Its store is full of seed
 * data stamped with the current time, which would outrank genuine edits made
 * earlier on another device. Pulling first gives those rows their real
 * timestamps, so only the rows the workspace has genuinely never seen get
 * offered as new.
 *
 * The UI stays on a boot screen until this finishes so editors never mount on
 * stale localStorage or invented seed boards. After ready, cache + heartbeat
 * pulls update in the background with no loading gate.
 */
async function bootstrapSync() {
  if (memory.syncStatus === 'off') {
    markWorkspaceReady()
    return
  }
  if (syncBootstrapDone) return
  if (bootstrapInFlight) return
  bootstrapInFlight = true

  try {
    await recoverNotesFromServerOnce()
    await recoverArgumentsFromServerOnce()

    // Always pull before any push so seed / empty localStorage cannot overwrite
    // real argument notes that already live in Postgres.
    const pulled = await exchange({}, {}, { keepalive: false })
    if (!pulled) {
      // Stay on the boot screen. Retry bootstrap itself (not a bare forcePull)
      // so hydrate-from-DB still runs before editors mount.
      window.clearTimeout(bootstrapRetryTimer)
      bootstrapRetryTimer = window.setTimeout(() => {
        void bootstrapSync()
      }, SYNC_RETRY_MS)
      return
    }

    // Prep docs: database is source of truth on boot. Rewrite local caches from
    // the pulled rows and clear dirty flags so a seed board never pushes next.
    for (const kind of allWorkspaceDocKinds()) {
      const spec = WORKSPACE_DOCS[kind]
      const row = memory.store[spec.collection]?.[0]
      if (row) hydrateWorkspaceDocFromRemote(kind, row)
    }
    {
      const syncMeta = memory.store.syncMeta || emptySyncMeta()
      const dirty = { ...(syncMeta.dirty || {}) }
      for (const kind of allWorkspaceDocKinds()) {
        const spec = WORKSPACE_DOCS[kind]
        delete dirty[metaKey('library_records', spec.kind, DOC_ROW_ID)]
      }
      delete dirty[metaKey('library_records', 'notebook', NOTEBOOK_ROW_ID)]
      setSyncMeta({ ...syncMeta, dirty })
    }

    // Notebook can legitimately be ahead after a crashed tab; arguments must not
    // use the same path because empty localStorage normalizes to seed.
    markStaleNotebookMirrorDirty(memory.store)

    markUnsyncedDocDirty('notebook', 'notebook', NOTEBOOK_ROW_ID)
    for (const kind of allWorkspaceDocKinds()) {
      const spec = WORKSPACE_DOCS[kind]
      markUnsyncedDocDirty(spec.kind, spec.collection, DOC_ROW_ID)
    }

    setSyncMeta(markSeedRowsDirty(memory.store, memory.store.syncMeta, Date.now()))
    // markSeedRowsDirty can re-dirty arguments when the pull row was missing.
    // If Postgres did send arguments, keep it clean so we do not push seed.
    if (memory.store.argumentsBoard?.[0]) {
      const syncMeta = memory.store.syncMeta || emptySyncMeta()
      const dirty = { ...(syncMeta.dirty || {}) }
      delete dirty[metaKey('library_records', 'arguments', DOC_ROW_ID)]
      setSyncMeta({ ...syncMeta, dirty })
    }
    markWorkspaceReady()
    await runSync({ allowBeforeBootstrap: true })
  } finally {
    bootstrapInFlight = false
  }
}

/** Manual retry from the boot screen when the first pull failed. */
export function retryWorkspaceBootstrap() {
  if (syncBootstrapDone) return Promise.resolve()
  window.clearTimeout(bootstrapRetryTimer)
  return bootstrapSync()
}

/**
 * Publish newly loaded PDF bytes so the library can open a file as soon as
 * that one arrives, instead of waiting for the whole hydrate loop.
 */
function commitBlobs(partial) {
  if (!partial || !Object.keys(partial).length) return
  memory = { ...memory, blobs: { ...memory.blobs, ...partial } }
  emit()
}

/**
 * Load PDF bytes into memory for every file in the library.
 *
 * IndexedDB first, because it is local and instant. A file this browser has
 * never seen, synced from another device, is then fetched from the backend and
 * cached in IndexedDB so the next refresh is local again.
 *
 * Network fetches run a few at a time and each success is committed immediately.
 * The old loop waited for every PDF (~30 MB) before clearing any "loading…"
 * label, so Youngstown looked stuck behind Milligan / other large opinions.
 */
async function hydrateBlobs() {
  const pendingNetwork = []

  for (const meta of memory.store.filesMeta) {
    if (memory.blobs[meta.id]) continue

    try {
      const row = await idbGetFile(meta.id)
      if (row?.blob) {
        commitBlobs({ [meta.id]: row.blob })
        continue
      }
    } catch {
      // Fall through to the backend copy, and try IndexedDB again next time.
    }

    // Only worth a request when the backend told us it holds the bytes.
    if (!meta.stored || memory.syncStatus === 'off') continue
    pendingNetwork.push(meta)
  }

  const CONCURRENCY = 3
  let cursor = 0
  async function worker() {
    while (cursor < pendingNetwork.length) {
      const meta = pendingNetwork[cursor]
      cursor += 1
      if (memory.blobs[meta.id]) continue
      try {
        const blob = await downloadDocument(meta.id)
        commitBlobs({ [meta.id]: blob })
        await idbPutFile({ id: meta.id, caseId: meta.caseId, name: meta.name, blob })
      } catch (error) {
        console.warn(`Could not fetch ${meta.name} from the backend`, error)
      }
    }
  }
  if (pendingNetwork.length) {
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pendingNetwork.length) }, () => worker())
    )
  }

  // Instant Case / library PDFs must also live in FAISS for Ask AI, including
  // ones attached before this wiring existed.
  void indexPendingAskAiFiles()
}

/**
 * Send one PDF's bytes to the backend and mark the row as stored.
 *
 * The `stored` flag is written without marking the row dirty: the upload
 * endpoint already recorded it server-side, so pushing it again through /sync
 * would be a wasted round trip.
 *
 * @param {object} meta The filesMeta row just added.
 * @param {Blob} blob The bytes already saved to IndexedDB.
 */
async function uploadFileBytes(meta, blob) {
  if (memory.syncStatus === 'off' || !blob) return

  try {
    // Direct-to-Blob for every file: avoids Vercel's 4.5 MB API body cap so
    // full opinions (Youngstown, Milligan) sync across devices.
    await uploadDocumentDirect(blob, {
      documentId: meta.id,
      caseId: meta.caseId,
      name: meta.name,
    })
    memory = {
      ...memory,
      store: {
        ...memory.store,
        filesMeta: memory.store.filesMeta.map((file) =>
          file.id === meta.id ? { ...file, stored: true } : file
        ),
      },
    }
    emit()
    persistSoon()
  } catch (directError) {
    // Small files can still use the older proxied path when the token mint
    // fails (missing BLOB_READ_WRITE_TOKEN locally, etc.).
    if (blob.size <= 4 * 1024 * 1024) {
      try {
        await uploadDocument(blob, {
          documentId: meta.id,
          caseId: meta.caseId,
          name: meta.name,
        })
        memory = {
          ...memory,
          store: {
            ...memory.store,
            filesMeta: memory.store.filesMeta.map((file) =>
              file.id === meta.id ? { ...file, stored: true } : file
            ),
          },
        }
        emit()
        persistSoon()
        return
      } catch (proxyError) {
        console.warn(`Could not upload ${meta.name}`, proxyError)
        setMemory({
          saveError: `${meta.name} is in this browser's cache but NOT yet on the database. Retry upload or the PDF can vanish after a hard refresh. ${proxyError?.message || ''}`.trim(),
        })
        return
      }
    }
    console.warn(`Could not upload ${meta.name}`, directError)
    setMemory({
      saveError: `${meta.name} is in this browser's cache but NOT yet on the database. Retry upload or the PDF can vanish after a hard refresh. ${directError?.message || ''}`.trim(),
    })
  }
}

/** Skip auto-retry for a minute after a failed Ask AI index so hydrate does not spam. */
const askAiIndexCooldownUntil = new Map()
const askAiIndexingIds = new Set()

/**
 * FAISS source label for Ask AI. Instant Case gets a clear Bronner prefix so
 * Uploaded docs mode can find the record instead of only Hamdi-style neighbors.
 */
function askAiSourceName(meta) {
  const raw = String(meta?.name || 'document.pdf').trim() || 'document.pdf'
  if (meta?.caseId !== CASE_AT_BAR_ID) return raw
  if (/^instant case/i.test(raw)) return raw
  return `${CASE_AT_BAR_LABEL} — ${raw}`
}

/**
 * Chunk a library / Case-at-bar PDF into the FAISS index Ask AI searches.
 *
 * Storage (Blob / IndexedDB) and retrieval (FAISS) are different paths. Without
 * this call, Instant Case PDFs are readable but invisible to Ask AI.
 *
 * @param {object} meta The filesMeta row.
 * @param {Blob} blob PDF bytes.
 * @param {{ force?: boolean }} [options] Pass force to ignore the cooldown (Retry).
 */
async function indexFileForAskAi(meta, blob, options = {}) {
  if (!blob || meta.askAiIndexed) return
  if (askAiIndexingIds.has(meta.id)) return
  const cooldownUntil = askAiIndexCooldownUntil.get(meta.id) || 0
  if (!options.force && Date.now() < cooldownUntil) return

  askAiIndexingIds.add(meta.id)
  const sourceName = askAiSourceName(meta)
  try {
    // Stale local failures are common after a proxy "Failed to fetch" even when
    // the PDF already landed in FAISS (or was indexed on another path).
    if (!options.force) {
      const already = await sourceNameIsIndexed(meta.name, sourceName)
      if (already) {
        markFileAskAiIndexed(meta.id, meta.name)
        return
      }
    }

    const file = new File([blob], sourceName, {
      type: 'application/pdf',
    })
    await ingestPdf(file)
    markFileAskAiIndexed(meta.id, meta.name)
  } catch (error) {
    console.warn(`Could not index ${meta.name} for Ask AI`, error)
    // Upload may have succeeded server-side while the browser lost the response.
    const already = await sourceNameIsIndexed(meta.name, sourceName)
    if (already) {
      markFileAskAiIndexed(meta.id, meta.name)
      return
    }
    askAiIndexCooldownUntil.set(meta.id, Date.now() + 60_000)
    const detail = (error?.message || '').trim()
    const nextStore = {
      ...memory.store,
      filesMeta: memory.store.filesMeta.map((row) =>
        row.id === meta.id ? { ...row, askAiIndexError: detail || 'index failed' } : row
      ),
    }
    // Write the error flag directly. persistSoon → persistNow clears saveError
    // on a successful localStorage write, which would hide the banner.
    memory = {
      ...memory,
      store: nextStore,
      saveError: `${meta.name} is readable, but Ask AI could not index it yet. ${detail}`.trim(),
    }
    emit()
    writeJson(KEY, nextStore)
  } finally {
    askAiIndexingIds.delete(meta.id)
  }
}

async function sourceNameIsIndexed(...names) {
  const wanted = names
    .map((n) => String(n || '').trim())
    .filter(Boolean)
  if (!wanted.length) return false
  try {
    const data = await listIngestSources()
    return (data.sources || []).some((row) => {
      const source = typeof row === 'string' ? row : row?.source
      if (!source) return false
      return wanted.some((name) => {
        if (source === name) return true
        if (source.endsWith(name) || source.includes(` — ${name}`)) return true
        const base = name.replace(/^Instant Case[^—]*—\s*/i, '').trim()
        return Boolean(base && (source === base || source.endsWith(base)))
      })
    })
  } catch {
    return false
  }
}

function markFileAskAiIndexed(fileId, fileName = '') {
  askAiIndexCooldownUntil.delete(fileId)
  memory = {
    ...memory,
    store: {
      ...memory.store,
      filesMeta: memory.store.filesMeta.map((row) =>
        row.id === fileId ? { ...row, askAiIndexed: true, askAiIndexError: '' } : row
      ),
    },
    saveError:
      fileName && memory.saveError?.includes(fileName) ? '' : memory.saveError,
  }
  emit()
  persistSoon()
}

/**
 * One-shot: index any already-attached PDFs that never made it into FAISS
 * (e.g. Instant Case uploads from before this wiring).
 */
async function indexPendingAskAiFiles() {
  for (const meta of memory.store.filesMeta) {
    if (meta.askAiIndexed) continue
    const blob = memory.blobs[meta.id]
    if (!blob) continue
    await indexFileForAskAi(meta, blob)
  }
}

/**
 * Push any PDF that is only in IndexedDB up to Vercel Blob.
 *
 * Large opinions (Youngstown / Milligan / Hamdi) used to stay browser-only when
 * the first upload failed. Hard refresh then made them disappear. Retry until
 * the row is marked stored, then force a sync so other devices see the bytes.
 */
async function uploadPendingServerFiles() {
  if (memory.syncStatus === 'off') return
  let uploaded = 0
  for (const meta of memory.store.filesMeta) {
    if (meta.stored) continue
    const blob = memory.blobs[meta.id]
    if (!blob) continue
    const typed =
      blob.type === 'application/pdf' ? blob : blob.slice(0, blob.size, 'application/pdf')
    await uploadFileBytes(meta, typed)
    const next = memory.store.filesMeta.find((f) => f.id === meta.id)
    if (next?.stored) uploaded += 1
  }
  if (uploaded > 0) scheduleSync(0, { forcePull: true })
}

hydrateBlobs().then(() => {
  void uploadPendingServerFiles()
})

function startIdlePullHeartbeat() {
  if (memory.syncStatus === 'off') return
  window.setInterval(() => {
    if (document.visibilityState === 'hidden') return
    if (memory.syncStatus === 'off' || syncInFlight) return
    scheduleSync(0, { forcePull: true })
  }, SYNC_HEARTBEAT_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      scheduleSync(0, { forcePull: true })
    }
  })
}

if (typeof window !== 'undefined') {
  bootstrapSync().then(() => {
    // After pull, stored flags may flip true (bytes already on Blob). Re-hydrate
    // downloads them; uploadPending catches anything still only local.
    void hydrateBlobs().then(() => uploadPendingServerFiles())
    startIdlePullHeartbeat()
  })

  onPageHide(() => {
    // Flush debounced editor writes before the library snapshot / keepalive
    // push, or the last keystrokes never leave this tab.
    flushWorkspaceDocSaves()
    flushNotebookSnapshotSave()
    window.clearTimeout(persistTimer)
    persistNow()
    // Local persist alone is not enough for phone / friend's laptop. Do not
    // wait on the debounce timer (setTimeout can die with the tab). Fire the
    // push now with keepalive so the browser can finish after unload.
    if (WORKSPACE_ID && pendingCount(memory.store.syncMeta) > 0) {
      window.clearTimeout(syncTimer)
      void runSync({ keepalive: true })
    }
  })
  // Coming back online is the common case for a laptop that was shut, so retry
  // straight away rather than waiting out the retry timer.
  window.addEventListener('online', () => scheduleSync(0, { forcePull: true }))
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY || !event.newValue) return
    try {
      const parsed = JSON.parse(event.newValue)
      const docsBefore = Object.fromEntries(
        allWorkspaceDocKinds().map((kind) => {
          const spec = WORKSPACE_DOCS[kind]
          return [kind, memory.store[spec.collection]?.[0]]
        })
      )
      memory = { ...memory, store: { ...emptyStore(), ...parsed } }
      emit()
      hydrateBlobs()
      // Same-profile extra tabs get the library key via storage events, but
      // Arguments / Notes still live in dedicated keys until hydrate runs.
      for (const kind of allWorkspaceDocKinds()) {
        const spec = WORKSPACE_DOCS[kind]
        const row = memory.store[spec.collection]?.[0]
        if (row && JSON.stringify(docsBefore[kind]) !== JSON.stringify(row)) {
          hydrateWorkspaceDocFromRemote(kind, row)
        }
      }
    } catch {
      // ignore other-tab parse errors
    }
  })
}

/**
 * Shared library + Case-at-bar store.
 * One in-memory copy for the whole app so Facts and Library cannot overwrite each other.
 * PDFs live in IndexedDB; everything else in localStorage.
 */
/** Live store snapshot (not React state). Use after sync/recover inside async work. */
export function getCaseLibraryStore() {
  return memory.store
}

export function useCaseLibrary() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    hydrateBlobs()
  }, [snap.store.filesMeta.map((f) => f.id).join('|')])

  const updateCase = useCallback((caseId, patch) => {
    updateStore(
      (prev) => ({
        ...prev,
        cases: prev.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)),
      }),
      [metaKey('cases', caseId)]
    )
  }, [])

  const addCase = useCallback(() => {
    const id = `case-${Date.now()}`
    const next = {
      id,
      name: 'New case',
      cite: '',
      year: '',
      issue: 1,
      tag: null,
      usefulness: 'background',
      headlineNote: '',
      holding: '',
      rule: '',
      usePetitioner: '',
      useRespondent: '',
      suggestedFile: '',
    }
    updateStore((prev) => ({ ...prev, cases: [next, ...prev.cases] }), [metaKey('cases', id)])
    return id
  }, [])

  const setLayerNote = useCallback((caseId, layerId, html) => {
    updateStore(
      (prev) => {
        const current = prev.notesByCase[caseId] || emptyLayerNotes()
        if (current[layerId] === html) return prev
        return {
          ...prev,
          notesByCase: {
            ...prev.notesByCase,
            [caseId]: { ...current, [layerId]: html },
          },
        }
      },
      [metaKey('notes', caseId, layerId)]
    )
  }, [])

  const getLayerNotes = useCallback(
    (caseId) => snap.store.notesByCase[caseId] || emptyLayerNotes(),
    [snap.store.notesByCase]
  )

  /**
   * Attach one PDF blob under a case and return the new filesMeta row.
   * Used by Ask AI cite → viewer jumps when the file lives in /ingest uploads
   * but is not yet in IndexedDB.
   */
  const attachBlob = useCallback(async (caseId, name, blob, options = {}) => {
    if (!caseId || !blob) return null
    const fileName = name || 'document.pdf'
    const already = memory.store.filesMeta.find(
      (f) => f.caseId === caseId && f.name === fileName
    )
    if (already && memory.blobs[already.id]) {
      return already
    }

    const id = already?.id || `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const typed = blob.slice(0, blob.size, blob.type || 'application/pdf')
    try {
      await idbPutFile({ id, caseId, name: fileName, blob: typed })
    } catch (error) {
      console.error('PDF save failed', error)
      setMemory({
        saveError: 'Could not store that PDF in this browser. Try a smaller file, or turn off private mode.',
      })
      return null
    }

    const meta = already
      ? { ...already, size: typed.size, savedAt: Date.now() }
      : {
          id,
          caseId,
          name: fileName,
          size: typed.size,
          savedAt: Date.now(),
          // Already in FAISS when pulled from /ingest/file.
          askAiIndexed: options.askAiIndexed !== false,
        }

    setMemory({ blobs: { ...memory.blobs, [id]: typed }, saveError: '' })
    updateStore(
      (prev) => {
        const filesMeta = already
          ? prev.filesMeta.map((f) => (f.id === id ? meta : f))
          : [meta, ...prev.filesMeta]
        return {
          ...prev,
          filesMeta,
          activeFileId: id,
          pageByFile: { ...prev.pageByFile, [id]: prev.pageByFile[id] || 1 },
        }
      },
      [metaKey('documents', id)]
    )

    await uploadFileBytes(meta, typed)
    if (!meta.askAiIndexed) {
      await indexFileForAskAi(meta, typed)
    }
    return meta
  }, [])

  const attachFiles = useCallback(async (caseId, fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const added = []
    const blobPatch = {}
    try {
      for (const file of files) {
        const id = `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        // Force application/pdf so the Blob client token (PDF-only) accepts the
        // PUT. Empty / octet-stream types from some browsers used to fail as a
        // bare "Failed to fetch" after CORS hid the 400.
        const blob = file.slice(0, file.size, 'application/pdf')
        await idbPutFile({ id, caseId, name: file.name, blob })
        blobPatch[id] = blob
        added.push({ id, caseId, name: file.name, size: file.size, savedAt: Date.now() })
      }
    } catch (error) {
      console.error('PDF save failed', error)
      setMemory({
        saveError: 'Could not store that PDF in this browser. Try a smaller file, or turn off private mode.',
      })
      return
    }
    setMemory({ blobs: { ...memory.blobs, ...blobPatch }, saveError: '' })
    updateStore(
      (prev) => ({
        ...prev,
        filesMeta: [...added, ...prev.filesMeta],
        activeFileId: added[0].id,
        pageByFile: { ...prev.pageByFile, [added[0].id]: 1 },
      }),
      added.map((file) => metaKey('documents', file.id))
    )

    // The PDF is already usable from IndexedDB, so uploading happens after the
    // store update and never blocks the reader. A failure here costs
    // cross-device access, not the file.
    for (const file of added) {
      await uploadFileBytes(file, blobPatch[file.id])
      // Same idea for Ask AI: readable first, then chunk into FAISS so Instant
      // Case / library PDFs are searchable without a second Upload-page drop.
      await indexFileForAskAi(file, blobPatch[file.id])
    }
  }, [])

  const removeFile = useCallback(async (fileId) => {
    const meta = memory.store.filesMeta.find((f) => f.id === fileId)
    await idbDeleteFile(fileId)
    const blobs = { ...memory.blobs }
    delete blobs[fileId]
    setMemory({ blobs })
    updateStore(
      (prev) => ({
        ...prev,
        filesMeta: prev.filesMeta.filter((f) => f.id !== fileId),
        activeFileId: prev.activeFileId === fileId ? null : prev.activeFileId,
      }),
      [metaKey('documents', fileId)],
      true
    )

    if (memory.syncStatus !== 'off') {
      try {
        await deleteDocument(fileId)
      } catch (error) {
        // The tombstone still syncs through /sync, so the other device will
        // drop the file. Only the stored bytes may linger.
        console.warn('Could not delete the stored PDF on the backend', error)
      }
    }

    if (meta?.askAiIndexed && meta?.name) {
      try {
        await removeIngestSource(meta.name)
      } catch (error) {
        console.warn(`Could not remove ${meta.name} from the Ask AI index`, error)
      }
    }
  }, [])

  /**
   * Re-try backend storage and/or FAISS indexing for a PDF that is readable
   * locally but failed earlier (common for ~5 MB+ Articles PDFs when the Blob
   * PUT died mid-flight, or when MIME type made Blob reject the upload).
   */
  const retryAskAiIndex = useCallback(async (fileId) => {
    let meta = memory.store.filesMeta.find((f) => f.id === fileId)
    const blob = memory.blobs[fileId]
    if (!meta || !blob) return false
    askAiIndexCooldownUntil.delete(fileId)
    setMemory({ saveError: '' })

    const typed =
      blob.type === 'application/pdf'
        ? blob
        : blob.slice(0, blob.size, 'application/pdf')

    // Retry storage first when the file never landed on the backend. The banner
    // used to say "not on the backend" while the button only re-ran Ask AI.
    if (!meta.stored && memory.syncStatus !== 'off') {
      await uploadFileBytes(meta, typed)
      meta = memory.store.filesMeta.find((f) => f.id === fileId) || meta
    }

    if (!meta.askAiIndexed) {
      await indexFileForAskAi(meta, typed, { force: true })
    }

    const next = memory.store.filesMeta.find((f) => f.id === fileId)
    return Boolean(next?.askAiIndexed || next?.stored)
  }, [])

  /**
   * When /ingest/sources already lists a local PDF by filename, clear the stale
   * "Failed to fetch" banner and mark it indexed without re-uploading.
   */
  const reconcileAskAiIndexed = useCallback((sourceNames) => {
    const names = new Set(
      (sourceNames || [])
        .map((row) => (typeof row === 'string' ? row : row?.source))
        .filter(Boolean)
    )
    if (!names.size) return

    const pending = memory.store.filesMeta.filter(
      (row) => !row.askAiIndexed && names.has(row.name)
    )
    if (!pending.length) return

    const ids = new Set(pending.map((row) => row.id))
    const clearedNames = pending.map((row) => row.name)
    for (const id of ids) askAiIndexCooldownUntil.delete(id)

    memory = {
      ...memory,
      store: {
        ...memory.store,
        filesMeta: memory.store.filesMeta.map((row) =>
          ids.has(row.id) ? { ...row, askAiIndexed: true, askAiIndexError: '' } : row
        ),
      },
      saveError:
        memory.saveError && clearedNames.some((name) => memory.saveError.includes(name))
          ? ''
          : memory.saveError,
    }
    emit()
    persistSoon()
  }, [])

  /**
   * Remove a library case and its local notes / annotations / PDFs.
   * Sync tombstones the case (and related rows) so other devices drop it too.
   */
  const removeCase = useCallback(
    async (caseId) => {
      if (!caseId) return

      const fileIds = memory.store.filesMeta
        .filter((f) => f.caseId === caseId)
        .map((f) => f.id)
      for (const fileId of fileIds) {
        await removeFile(fileId)
      }

      const annotationIds = memory.store.annotations
        .filter((a) => a.caseId === caseId)
        .map((a) => a.id)
      const noteLayers = Object.keys(memory.store.notesByCase[caseId] || {})
      const citeIds = (memory.store.cites || [])
        .filter((c) => c.fromCaseId === caseId || c.toCaseId === caseId)
        .map((c) => c.id)
      const noteTabIds = (memory.store.noteTabs || [])
        .filter((t) => t.caseId === caseId)
        .map((t) => t.id)
      const dirtyKeys = [
        metaKey('cases', caseId),
        ...annotationIds.map((id) => metaKey('annotations', id)),
        ...noteLayers.map((layerId) => metaKey('notes', caseId, layerId)),
        ...citeIds.map((id) => metaKey('library_records', 'cites', id)),
        ...noteTabIds.map((id) => metaKey('library_records', 'note_tabs', id)),
      ]

      updateStore(
        (prev) => {
          const notesByCase = { ...prev.notesByCase }
          delete notesByCase[caseId]
          return {
            ...prev,
            cases: prev.cases.filter((c) => c.id !== caseId),
            annotations: prev.annotations.filter((a) => a.caseId !== caseId),
            notesByCase,
            noteTabs: (prev.noteTabs || []).filter((t) => t.caseId !== caseId),
            cites: (prev.cites || []).filter(
              (c) => c.fromCaseId !== caseId && c.toCaseId !== caseId
            ),
          }
        },
        dirtyKeys,
        true
      )
    },
    [removeFile]
  )

  /**
   * Fold a duplicate case into another: PDFs, highlights, and notes move over,
   * then the empty duplicate card is removed (files are not deleted).
   */
  const mergeCases = useCallback((keepId, dropId) => {
    if (!keepId || !dropId || keepId === dropId) return false
    const keep = memory.store.cases.find((c) => c.id === keepId)
    const drop = memory.store.cases.find((c) => c.id === dropId)
    if (!keep || !drop) return false

    // Snapshot so a bad merge can be reversed from this browser.
    try {
      sessionStorage.setItem(
        MERGE_BACKUP_KEY,
        JSON.stringify({
          at: Date.now(),
          keepId,
          dropId,
          store: {
            cases: memory.store.cases,
            filesMeta: memory.store.filesMeta,
            annotations: memory.store.annotations,
            notesByCase: memory.store.notesByCase,
            noteTabs: memory.store.noteTabs,
            cites: memory.store.cites,
            caseFacts: memory.store.caseFacts,
            opinions: memory.store.opinions,
            timeline: memory.store.timeline,
          },
        })
      )
    } catch {
      /* ignore quota */
    }

    const movedFiles = memory.store.filesMeta.filter((f) => f.caseId === dropId)
    const movedAnnos = memory.store.annotations.filter((a) => a.caseId === dropId)
    // Annotations already on keep stay put; never filter them out.
    const keepAnnos = memory.store.annotations.filter((a) => a.caseId === keepId)
    const dropNotes = memory.store.notesByCase[dropId] || {}
    const dropTabs = (memory.store.noteTabs || []).filter((t) => t.caseId === dropId)
    const dropCites = (memory.store.cites || []).filter(
      (c) => c.fromCaseId === dropId || c.toCaseId === dropId
    )
    const dropFacts = (memory.store.caseFacts || []).filter((f) => f.caseId === dropId)
    const dropOpinions = (memory.store.opinions || []).filter((o) => o.caseId === dropId)
    const dropTimeline = (memory.store.timeline || []).filter((t) => t.caseId === dropId)

    const dirtyKeys = [
      metaKey('cases', keepId),
      ...movedFiles.map((f) => metaKey('documents', f.id)),
      ...movedAnnos.map((a) => metaKey('annotations', a.id)),
      ...keepAnnos.map((a) => metaKey('annotations', a.id)),
      ...Object.keys(dropNotes).map((layerId) => metaKey('notes', keepId, layerId)),
      ...Object.keys(dropNotes).map((layerId) => metaKey('notes', dropId, layerId)),
      ...Object.keys(memory.store.notesByCase[keepId] || {}).map((layerId) =>
        metaKey('notes', keepId, layerId)
      ),
      ...dropTabs.map((t) => metaKey('library_records', 'note_tabs', t.id)),
      ...dropCites.map((c) => metaKey('library_records', 'cites', c.id)),
      ...dropFacts.map((f) => metaKey('library_records', 'case_facts', f.id)),
      ...dropOpinions.map((o) => metaKey('library_records', 'opinions', o.id)),
      ...dropTimeline.map((t) => metaKey('library_records', 'timeline', t.id)),
    ]

    updateStore(
      (prev) => {
        const keepNotes = { ...(prev.notesByCase[keepId] || emptyLayerNotes()) }
        for (const [layerId, html] of Object.entries(dropNotes)) {
          const existing = String(keepNotes[layerId] || '').trim()
          const incoming = String(html || '').trim()
          if (!incoming) continue
          // Skip empty / template-only incoming so merge does not clobber keep.
          const plain = incoming
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          if (plain.length < 8) continue
          keepNotes[layerId] = existing
            ? `${existing}\n\n<!-- merged from duplicate -->\n${incoming}`
            : incoming
        }
        const notesByCase = { ...prev.notesByCase, [keepId]: keepNotes }
        delete notesByCase[dropId]

        // Card fields (headline, holding, rule, …) lived only on the duplicate
        // before; fold any non-empty drop values into keep when keep is blank.
        const keepCase = prev.cases.find((c) => c.id === keepId)
        const dropCase = prev.cases.find((c) => c.id === dropId)
        const mergedCase = keepCase
          ? {
              ...keepCase,
              name: pickMergedText(keepCase.name, dropCase?.name) || keepCase.name,
              cite: pickMergedText(keepCase.cite, dropCase?.cite),
              year: keepCase.year || dropCase?.year || '',
              issue: keepCase.issue || dropCase?.issue || 1,
              tag: keepCase.tag || dropCase?.tag || null,
              usefulness: keepCase.usefulness || dropCase?.usefulness || 'background',
              headlineNote: pickMergedText(keepCase.headlineNote, dropCase?.headlineNote),
              holding: pickMergedText(keepCase.holding, dropCase?.holding),
              rule: pickMergedText(keepCase.rule, dropCase?.rule),
              usePetitioner: pickMergedText(keepCase.usePetitioner, dropCase?.usePetitioner),
              useRespondent: pickMergedText(keepCase.useRespondent, dropCase?.useRespondent),
              suggestedFile: pickMergedText(keepCase.suggestedFile, dropCase?.suggestedFile),
            }
          : keepCase

        return {
          ...prev,
          cases: prev.cases
            .filter((c) => c.id !== dropId)
            .map((c) => (c.id === keepId && mergedCase ? mergedCase : c)),
          filesMeta: prev.filesMeta.map((f) =>
            f.caseId === dropId ? { ...f, caseId: keepId } : f
          ),
          annotations: prev.annotations.map((a) =>
            a.caseId === dropId ? { ...a, caseId: keepId } : a
          ),
          notesByCase,
          noteTabs: (prev.noteTabs || []).map((t) =>
            t.caseId === dropId ? { ...t, caseId: keepId } : t
          ),
          cites: (prev.cites || []).map((c) => ({
            ...c,
            fromCaseId: c.fromCaseId === dropId ? keepId : c.fromCaseId,
            toCaseId: c.toCaseId === dropId ? keepId : c.toCaseId,
          })),
          caseFacts: (prev.caseFacts || []).map((f) =>
            f.caseId === dropId ? { ...f, caseId: keepId } : f
          ),
          opinions: (prev.opinions || []).map((o) =>
            o.caseId === dropId ? { ...o, caseId: keepId } : o
          ),
          timeline: (prev.timeline || []).map((t) =>
            t.caseId === dropId ? { ...t, caseId: keepId } : t
          ),
        }
      },
      dirtyKeys
    )

    // Tombstone the dropped case so other devices drop the empty card too.
    // Never tombstone annotations / documents — they already moved to keepId.
    updateStore((prev) => prev, [metaKey('cases', dropId)], true)
    return true
  }, [])

  /** Restore the pre-merge library snapshot from this browser (if still in session). */
  const undoLastMerge = useCallback(() => {
    let raw
    try {
      raw = sessionStorage.getItem(MERGE_BACKUP_KEY)
    } catch {
      return false
    }
    if (!raw) return false
    let backup
    try {
      backup = JSON.parse(raw)
    } catch {
      return false
    }
    if (!backup?.store?.cases) return false

    const dirtyKeys = [
      ...(backup.store.cases || []).map((c) => metaKey('cases', c.id)),
      ...(backup.store.filesMeta || []).map((f) => metaKey('documents', f.id)),
      ...(backup.store.annotations || []).map((a) => metaKey('annotations', a.id)),
    ]
    for (const [caseId, layers] of Object.entries(backup.store.notesByCase || {})) {
      for (const layerId of Object.keys(layers || {})) {
        dirtyKeys.push(metaKey('notes', caseId, layerId))
      }
    }

    updateStore(
      (prev) => ({
        ...prev,
        cases: backup.store.cases,
        filesMeta: backup.store.filesMeta,
        annotations: backup.store.annotations,
        notesByCase: backup.store.notesByCase,
        noteTabs: backup.store.noteTabs || [],
        cites: backup.store.cites || [],
        caseFacts: backup.store.caseFacts || [],
        opinions: backup.store.opinions || [],
        timeline: backup.store.timeline || [],
      }),
      dirtyKeys
    )
    // Clear the tombstone on the restored drop card if present.
    if (backup.dropId) {
      const rows = { ...(memory.store.syncMeta.rows || {}) }
      const key = metaKey('cases', backup.dropId)
      if (rows[key]) rows[key] = { ...rows[key], deleted: false, updatedAt: Date.now() }
      setSyncMeta({ ...memory.store.syncMeta, rows })
    }
    try {
      sessionStorage.removeItem(MERGE_BACKUP_KEY)
    } catch {
      /* ignore */
    }
    scheduleSync(0, { forcePull: true })
    return true
  }, [])

  // Active file and current page are this browser's view state, not shared
  // data, so they are deliberately left out of sync. Syncing them would make
  // two open devices fight over each other's scroll position.
  const setActiveFileId = useCallback((id) => {
    updateStore((prev) => ({ ...prev, activeFileId: id }))
  }, [])

  const setPage = useCallback((fileId, page) => {
    if (!fileId) return
    updateStore((prev) => ({
      ...prev,
      pageByFile: { ...prev.pageByFile, [fileId]: page },
    }))
  }, [])

  const upsertAnnotation = useCallback((payload) => {
    // The id is settled before the updater runs, because sync has to know
    // which row changed and a reducer cannot report back.
    const id = payload.id || `a-${Date.now()}`

    updateStore(
      (prev) => {
        if (payload.id) {
          const { id: _ignored, ...patch } = payload
          return {
            ...prev,
            annotations: prev.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
          }
        }
        const next = {
          id,
          caseId: payload.caseId,
          fileId: payload.fileId || null,
          // page 0 = article-level general note (not tied to a PDF page)
          page:
            payload.kind === 'general'
              ? 0
              : Number.isFinite(payload.page)
                ? payload.page
                : 1,
          text: payload.text || '',
          quote: payload.quote || '',
          rects: payload.rects || null,
          kind: payload.kind || (payload.quote ? 'highlight' : 'page'),
          pinned: Boolean(payload.pinned),
          color: payload.color || 'gold',
          topics: Array.isArray(payload.topics) ? payload.topics : [],
          savedAt: Date.now(),
        }
        return { ...prev, annotations: [next, ...prev.annotations] }
      },
      [metaKey('annotations', id)]
    )
  }, [])

  const updateAnnotation = useCallback((id, patch) => {
    updateStore(
      (prev) => ({
        ...prev,
        annotations: prev.annotations.map((a) => {
          if (a.id !== id) return a
          const next = { ...a, ...patch, savedAt: Date.now() }
          if (Object.prototype.hasOwnProperty.call(patch, 'topics')) {
            next.topics = Array.isArray(patch.topics) ? patch.topics : []
          }
          return next
        }),
      }),
      [metaKey('annotations', id)]
    )
  }, [])

  const removeAnnotation = useCallback((id) => {
    updateStore(
      (prev) => ({
        ...prev,
        annotations: prev.annotations.filter((a) => a.id !== id),
      }),
      [metaKey('annotations', id)],
      true
    )
  }, [])

  const upsertOpinion = useCallback((opinion) => {
    updateStore(
      (prev) => {
        const exists = prev.opinions.some((o) => o.id === opinion.id)
        if (exists) {
          return {
            ...prev,
            opinions: prev.opinions.map((o) => (o.id === opinion.id ? { ...o, ...opinion } : o)),
          }
        }
        return { ...prev, opinions: [{ ...opinion }, ...prev.opinions] }
      },
      [metaKey('library_records', 'opinions', opinion.id)]
    )
  }, [])

  const removeOpinion = useCallback((id) => {
    updateStore(
      (prev) => ({
        ...prev,
        opinions: prev.opinions.filter((o) => o.id !== id),
      }),
      [metaKey('library_records', 'opinions', id)],
      true
    )
  }, [])

  const upsertCaseFact = useCallback((fact) => {
    updateStore(
      (prev) => {
        const exists = prev.caseFacts.some((f) => f.id === fact.id)
        if (exists) {
          return {
            ...prev,
            caseFacts: prev.caseFacts.map((f) => (f.id === fact.id ? { ...f, ...fact } : f)),
          }
        }
        return { ...prev, caseFacts: [{ ...fact }, ...prev.caseFacts] }
      },
      [metaKey('library_records', 'case_facts', fact.id)]
    )
  }, [])

  const removeCaseFact = useCallback((id) => {
    updateStore(
      (prev) => ({
        ...prev,
        caseFacts: prev.caseFacts.filter((f) => f.id !== id),
      }),
      [metaKey('library_records', 'case_facts', id)],
      true
    )
  }, [])

  const upsertCite = useCallback((cite) => {
    updateStore(
      (prev) => {
        const exists = prev.cites.some((c) => c.id === cite.id)
        if (exists) {
          return {
            ...prev,
            cites: prev.cites.map((c) => (c.id === cite.id ? { ...c, ...cite } : c)),
          }
        }
        return { ...prev, cites: [{ ...cite }, ...prev.cites] }
      },
      [metaKey('library_records', 'cites', cite.id)]
    )
  }, [])

  const removeCite = useCallback((id) => {
    updateStore(
      (prev) => ({
        ...prev,
        cites: prev.cites.filter((c) => c.id !== id),
      }),
      [metaKey('library_records', 'cites', id)],
      true
    )
  }, [])

  const upsertTimeline = useCallback((event) => {
    updateStore(
      (prev) => {
        const exists = prev.timeline.some((t) => t.id === event.id)
        if (exists) {
          return {
            ...prev,
            timeline: prev.timeline.map((t) => (t.id === event.id ? { ...t, ...event } : t)),
          }
        }
        return { ...prev, timeline: [...prev.timeline, event] }
      },
      [metaKey('library_records', 'timeline', event.id)]
    )
  }, [])

  const removeTimeline = useCallback((id) => {
    updateStore(
      (prev) => ({
        ...prev,
        timeline: prev.timeline.filter((t) => t.id !== id),
      }),
      [metaKey('library_records', 'timeline', id)],
      true
    )
  }, [])

  const addNoteTab = useCallback(({ caseId, label, kind }) => {
    const id = `tab-${Date.now()}`
    const next = {
      id,
      caseId,
      label: (label || 'Tab').trim() || 'Tab',
      kind: kind || 'text',
    }
    updateStore(
      (prev) => ({
        ...prev,
        noteTabs: [...(prev.noteTabs || []), next],
      }),
      [metaKey('library_records', 'note_tabs', id)]
    )
    return next
  }, [])

  const removeNoteTab = useCallback((id) => {
    const existing = memory.store.noteTabs?.find((t) => t.id === id)
    const dirtyKeys = [metaKey('library_records', 'note_tabs', id)]
    if (existing?.kind === 'text' && existing.caseId) {
      dirtyKeys.push(metaKey('notes', existing.caseId, id))
    }
    updateStore(
      (prev) => {
        const tab = (prev.noteTabs || []).find((t) => t.id === id)
        let notesByCase = prev.notesByCase
        if (tab?.kind === 'text' && tab.caseId) {
          const layers = { ...(notesByCase[tab.caseId] || {}) }
          delete layers[tab.id]
          notesByCase = { ...notesByCase, [tab.caseId]: layers }
        }
        return {
          ...prev,
          noteTabs: (prev.noteTabs || []).filter((t) => t.id !== id),
          notesByCase,
        }
      },
      dirtyKeys,
      true
    )
  }, [])

  /**
   * Set or clear the Articles-shelf display title for a PDF filename.
   * Empty title removes the override so the auto label returns.
   */
  const setArticleTitle = useCallback((filename, title) => {
    const name = String(filename || '').trim()
    if (!name) return
    const nextTitle = String(title || '').trim()
    updateStore(
      (prev) => {
        const list = prev.articleTitles || []
        if (!nextTitle) {
          return {
            ...prev,
            articleTitles: list.filter((row) => row.id !== name),
          }
        }
        const row = { id: name, name, title: nextTitle }
        const exists = list.some((r) => r.id === name)
        return {
          ...prev,
          articleTitles: exists
            ? list.map((r) => (r.id === name ? row : r))
            : [row, ...list],
        }
      },
      [metaKey('library_records', 'article_titles', name)],
      !nextTitle
    )
  }, [])

  /**
   * Drop a reading bookmark on the current PDF page so you can step away and
   * jump straight back. One bookmark per file+page; re-saving refreshes the label.
   */
  const addPdfBookmark = useCallback((fileId, page, label = '') => {
    if (!fileId || !page) return null
    const pageNum = Number(page) || 1
    const existing = (memory.store.pdfBookmarks || []).find(
      (row) => row.fileId === fileId && Number(row.page) === pageNum
    )
    if (existing) {
      const row = {
        ...existing,
        label: String(label || '').trim() || existing.label || `Page ${pageNum}`,
        savedAt: Date.now(),
      }
      updateStore(
        (prev) => ({
          ...prev,
          pdfBookmarks: (prev.pdfBookmarks || []).map((b) => (b.id === existing.id ? row : b)),
        }),
        [metaKey('library_records', 'pdf_bookmarks', existing.id)]
      )
      return row
    }
    const id = `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const row = {
      id,
      fileId,
      page: pageNum,
      label: String(label || '').trim() || `Page ${pageNum}`,
      savedAt: Date.now(),
    }
    updateStore(
      (prev) => ({
        ...prev,
        pdfBookmarks: [row, ...(prev.pdfBookmarks || [])],
      }),
      [metaKey('library_records', 'pdf_bookmarks', id)]
    )
    return row
  }, [])

  const removePdfBookmark = useCallback((id) => {
    if (!id) return
    updateStore(
      (prev) => ({
        ...prev,
        pdfBookmarks: (prev.pdfBookmarks || []).filter((row) => row.id !== id),
      }),
      [metaKey('library_records', 'pdf_bookmarks', id)],
      true
    )
  }, [])

  return {
    cases: snap.store.cases,
    annotations: snap.store.annotations,
    filesMeta: snap.store.filesMeta,
    opinions: snap.store.opinions,
    caseFacts: snap.store.caseFacts,
    cites: snap.store.cites,
    timeline: snap.store.timeline,
    // Full notes map for ⌘K / workspace search (not only getLayerNotes).
    notesByCase: snap.store.notesByCase,
    noteTabs: snap.store.noteTabs,
    articleTitles: snap.store.articleTitles || [],
    pdfBookmarks: snap.store.pdfBookmarks || [],
    blobs: snap.blobs,
    activeFileId: snap.store.activeFileId,
    setActiveFileId,
    pageByFile: snap.store.pageByFile,
    saveError: snap.saveError,
    lastSavedAt: snap.lastSavedAt,
    workspaceReady: snap.workspaceReady,
    sync: {
      // 'off' (no workspace key) | 'idle' | 'syncing' | 'error'
      status: snap.syncStatus,
      error: snap.syncError,
      lastSyncedAt: snap.lastSyncedAt,
      pending: pendingCount(snap.store.syncMeta),
      workspaceId: WORKSPACE_ID,
    },
    syncNow: () => {
      flushWorkspaceDocSaves()
      flushNotebookSnapshotSave()
      window.clearTimeout(syncTimer)
      return runSync({ forcePull: true })
    },
    retryWorkspaceBootstrap,
    recoverFromServer: () => {
      try {
        localStorage.removeItem(RECOVER_NOTES_FLAG)
      } catch {
        /* ignore */
      }
      return recoverNotesFromServerOnce()
    },
    undoLastMerge,
    updateCase,
    addCase,
    removeCase,
    mergeCases,
    setLayerNote,
    getLayerNotes,
    attachFiles,
    attachBlob,
    removeFile,
    retryAskAiIndex,
    reconcileAskAiIndexed,
    setArticleTitle,
    addPdfBookmark,
    removePdfBookmark,
    setPage,
    upsertAnnotation,
    updateAnnotation,
    removeAnnotation,
    upsertOpinion,
    removeOpinion,
    upsertCaseFact,
    removeCaseFact,
    upsertCite,
    removeCite,
    upsertTimeline,
    removeTimeline,
    addNoteTab,
    removeNoteTab,
  }
}
