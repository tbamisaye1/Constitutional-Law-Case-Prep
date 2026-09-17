import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { emptyLayerNotes, LIBRARY_CASES } from '../data/casesSeed'
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
  removeIngestSource,
  syncChanges,
  uploadDocument,
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

const KEY = 'case-prep-library-v5'

/** Quiet period before a burst of edits turns into one push. */
const SYNC_DEBOUNCE_MS = 1200

/** How often to retry after a failed sync, so a dropped connection recovers. */
const SYNC_RETRY_MS = 30_000

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
    activeFileId: parsed.activeFileId || null,
    pageByFile: parsed.pageByFile || {},
    // Absent for anyone who used the app before sync existed. Starting from a
    // blank meta table makes every local row look new, which is what uploads
    // their existing work on the first sync.
    syncMeta: parsed.syncMeta || base.syncMeta,
  }
}

const listeners = new Set()
let persistTimer = 0
let syncTimer = 0
let syncInFlight = false

let memory = {
  store: load(),
  blobs: {},
  saveError: '',
  lastSavedAt: 0,
  // 'off' when there is no workspace key, otherwise idle | syncing | error.
  syncStatus: WORKSPACE_ID ? 'idle' : 'off',
  syncError: '',
  lastSyncedAt: 0,
}

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

function scheduleSync(delay = SYNC_DEBOUNCE_MS) {
  if (memory.syncStatus === 'off') return
  window.clearTimeout(syncTimer)
  syncTimer = window.setTimeout(runSync, delay)
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
async function exchange(changes, sent) {
  syncInFlight = true
  memory = { ...memory, syncStatus: 'syncing', syncError: '' }
  emit()

  try {
    const response = await syncChanges(memory.store.syncMeta.cursor, changes)

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

    await hydrateBlobs()
    return true
  } catch (error) {
    console.warn('Sync failed; still saved in this browser', error)
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
async function runSync() {
  if (memory.syncStatus === 'off') return

  // An edit that lands mid-request must not be dropped. Come back once the
  // current exchange is done rather than returning and waiting for either
  // another edit or the retry timer.
  if (syncInFlight) {
    scheduleSync()
    return
  }

  const { changes, sent } = collectChanges(memory.store, memory.store.syncMeta)
  if (!Object.keys(sent).length && memory.syncStatus !== 'error') return

  const ok = await exchange(changes, sent)

  // A row re-edited while the request was in flight stays dirty, so give it
  // its own push instead of waiting for the next edit to trigger one.
  if (ok && pendingCount(memory.store.syncMeta) > 0) scheduleSync()
}

/**
 * First sync after a page load: read the workspace, then offer local rows.
 *
 * Order matters on a browser that has never synced. Its store is full of seed
 * data stamped with the current time, which would outrank genuine edits made
 * earlier on another device. Pulling first gives those rows their real
 * timestamps, so only the rows the workspace has genuinely never seen get
 * offered as new.
 */
async function bootstrapSync() {
  if (memory.syncStatus === 'off') return

  if (memory.store.syncMeta.cursor === 0) {
    const ok = await exchange({}, {})
    if (!ok) return
  }

  setSyncMeta(markSeedRowsDirty(memory.store, memory.store.syncMeta, Date.now()))
  await runSync()
}

/**
 * Load PDF bytes into memory for every file in the library.
 *
 * IndexedDB first, because it is local and instant. A file this browser has
 * never seen, synced from another device, is then fetched from the backend and
 * cached in IndexedDB so the next refresh is local again.
 */
async function hydrateBlobs() {
  const next = { ...memory.blobs }
  let added = false

  for (const meta of memory.store.filesMeta) {
    if (next[meta.id]) continue

    try {
      const row = await idbGetFile(meta.id)
      if (row?.blob) {
        next[meta.id] = row.blob
        added = true
        continue
      }
    } catch {
      // Fall through to the backend copy, and try IndexedDB again next time.
    }

    // Only worth a request when the backend told us it holds the bytes.
    if (!meta.stored || memory.syncStatus === 'off') continue
    try {
      const blob = await downloadDocument(meta.id)
      next[meta.id] = blob
      added = true
      await idbPutFile({ id: meta.id, caseId: meta.caseId, name: meta.name, blob })
    } catch (error) {
      console.warn(`Could not fetch ${meta.name} from the backend`, error)
    }
  }

  if (added) {
    memory = { ...memory, blobs: next }
    emit()
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
  } catch (error) {
    console.warn(`Could not upload ${meta.name}`, error)
    // Worth showing: the file works here but will not appear on another
    // device, and the size limit is something the user can act on.
    setMemory({
      saveError: `${meta.name} is saved in this browser but not on the backend. ${error?.message || ''}`.trim(),
    })
  }
}

/**
 * Chunk a library / Case-at-bar PDF into the FAISS index Ask AI searches.
 *
 * Storage (Blob / IndexedDB) and retrieval (FAISS) are different paths. Without
 * this call, Instant Case PDFs are readable but invisible to Ask AI.
 *
 * @param {object} meta The filesMeta row.
 * @param {Blob} blob PDF bytes.
 */
async function indexFileForAskAi(meta, blob) {
  if (!blob || meta.askAiIndexed) return

  try {
    const file = new File([blob], meta.name, {
      type: blob.type || 'application/pdf',
    })
    await ingestPdf(file)
    memory = {
      ...memory,
      store: {
        ...memory.store,
        filesMeta: memory.store.filesMeta.map((file) =>
          file.id === meta.id ? { ...file, askAiIndexed: true } : file
        ),
      },
    }
    emit()
    persistSoon()
  } catch (error) {
    console.warn(`Could not index ${meta.name} for Ask AI`, error)
    setMemory({
      saveError: `${meta.name} is readable, but Ask AI could not index it yet. ${error?.message || ''}`.trim(),
    })
  }
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

hydrateBlobs()

if (typeof window !== 'undefined') {
  bootstrapSync()

  onPageHide(() => {
    window.clearTimeout(persistTimer)
    persistNow()
  })
  // Coming back online is the common case for a laptop that was shut, so retry
  // straight away rather than waiting out the retry timer.
  window.addEventListener('online', () => scheduleSync(0))
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY || !event.newValue) return
    try {
      const parsed = JSON.parse(event.newValue)
      memory = { ...memory, store: { ...emptyStore(), ...parsed } }
      emit()
      hydrateBlobs()
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

  const attachFiles = useCallback(async (caseId, fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const added = []
    const blobPatch = {}
    try {
      for (const file of files) {
        const id = `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const blob = file.slice(0, file.size, file.type || 'application/pdf')
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
          page: payload.page || 1,
          text: payload.text || '',
          quote: payload.quote || '',
          rects: payload.rects || null,
          kind: payload.kind || (payload.quote ? 'highlight' : 'page'),
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
        annotations: prev.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
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

  return {
    cases: snap.store.cases,
    annotations: snap.store.annotations,
    filesMeta: snap.store.filesMeta,
    opinions: snap.store.opinions,
    caseFacts: snap.store.caseFacts,
    cites: snap.store.cites,
    timeline: snap.store.timeline,
    blobs: snap.blobs,
    activeFileId: snap.store.activeFileId,
    setActiveFileId,
    pageByFile: snap.store.pageByFile,
    saveError: snap.saveError,
    lastSavedAt: snap.lastSavedAt,
    sync: {
      // 'off' (no workspace key) | 'idle' | 'syncing' | 'error'
      status: snap.syncStatus,
      error: snap.syncError,
      lastSyncedAt: snap.lastSyncedAt,
      pending: pendingCount(snap.store.syncMeta),
      workspaceId: WORKSPACE_ID,
    },
    syncNow: () => scheduleSync(0),
    updateCase,
    addCase,
    setLayerNote,
    getLayerNotes,
    attachFiles,
    removeFile,
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
  }
}
