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
import { idbDeleteFile, idbGetFile, idbPutFile } from '../lib/fileStore'
import { onPageHide, readJson, writeJson } from '../lib/persist'

const KEY = 'case-prep-library-v5'

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
  }
}

const listeners = new Set()
let persistTimer = 0

let memory = {
  store: load(),
  blobs: {},
  saveError: '',
  lastSavedAt: 0,
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

function updateStore(updater) {
  const store = typeof updater === 'function' ? updater(memory.store) : updater
  if (store === memory.store) return
  memory = { ...memory, store, saveError: '' }
  emit()
  persistSoon()
}

async function hydrateBlobs() {
  const ids = memory.store.filesMeta.map((f) => f.id)
  const next = { ...memory.blobs }
  let added = false
  for (const id of ids) {
    if (next[id]) continue
    try {
      const row = await idbGetFile(id)
      if (row?.blob) {
        next[id] = row.blob
        added = true
      }
    } catch {
      // re-add later
    }
  }
  if (!added) return
  memory = { ...memory, blobs: next }
  emit()
}

hydrateBlobs()

if (typeof window !== 'undefined') {
  onPageHide(() => {
    window.clearTimeout(persistTimer)
    persistNow()
  })
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
    updateStore((prev) => ({
      ...prev,
      cases: prev.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)),
    }))
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
    updateStore((prev) => ({ ...prev, cases: [next, ...prev.cases] }))
    return id
  }, [])

  const setLayerNote = useCallback((caseId, layerId, html) => {
    updateStore((prev) => {
      const current = prev.notesByCase[caseId] || emptyLayerNotes()
      if (current[layerId] === html) return prev
      return {
        ...prev,
        notesByCase: {
          ...prev.notesByCase,
          [caseId]: { ...current, [layerId]: html },
        },
      }
    })
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
    updateStore((prev) => ({
      ...prev,
      filesMeta: [...added, ...prev.filesMeta],
      activeFileId: added[0].id,
      pageByFile: { ...prev.pageByFile, [added[0].id]: 1 },
    }))
  }, [])

  const removeFile = useCallback(async (fileId) => {
    await idbDeleteFile(fileId)
    const blobs = { ...memory.blobs }
    delete blobs[fileId]
    setMemory({ blobs })
    updateStore((prev) => ({
      ...prev,
      filesMeta: prev.filesMeta.filter((f) => f.id !== fileId),
      activeFileId: prev.activeFileId === fileId ? null : prev.activeFileId,
    }))
  }, [])

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
    updateStore((prev) => {
      if (payload.id) {
        const { id, ...patch } = payload
        return {
          ...prev,
          annotations: prev.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }
      }
      const next = {
        id: `a-${Date.now()}`,
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
    })
  }, [])

  const updateAnnotation = useCallback((id, patch) => {
    updateStore((prev) => ({
      ...prev,
      annotations: prev.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }))
  }, [])

  const removeAnnotation = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      annotations: prev.annotations.filter((a) => a.id !== id),
    }))
  }, [])

  const upsertOpinion = useCallback((opinion) => {
    updateStore((prev) => {
      const exists = prev.opinions.some((o) => o.id === opinion.id)
      if (exists) {
        return {
          ...prev,
          opinions: prev.opinions.map((o) => (o.id === opinion.id ? { ...o, ...opinion } : o)),
        }
      }
      return { ...prev, opinions: [{ ...opinion }, ...prev.opinions] }
    })
  }, [])

  const removeOpinion = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      opinions: prev.opinions.filter((o) => o.id !== id),
    }))
  }, [])

  const upsertCaseFact = useCallback((fact) => {
    updateStore((prev) => {
      const exists = prev.caseFacts.some((f) => f.id === fact.id)
      if (exists) {
        return {
          ...prev,
          caseFacts: prev.caseFacts.map((f) => (f.id === fact.id ? { ...f, ...fact } : f)),
        }
      }
      return { ...prev, caseFacts: [{ ...fact }, ...prev.caseFacts] }
    })
  }, [])

  const removeCaseFact = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      caseFacts: prev.caseFacts.filter((f) => f.id !== id),
    }))
  }, [])

  const upsertCite = useCallback((cite) => {
    updateStore((prev) => {
      const exists = prev.cites.some((c) => c.id === cite.id)
      if (exists) {
        return {
          ...prev,
          cites: prev.cites.map((c) => (c.id === cite.id ? { ...c, ...cite } : c)),
        }
      }
      return { ...prev, cites: [{ ...cite }, ...prev.cites] }
    })
  }, [])

  const removeCite = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      cites: prev.cites.filter((c) => c.id !== id),
    }))
  }, [])

  const upsertTimeline = useCallback((event) => {
    updateStore((prev) => {
      const exists = prev.timeline.some((t) => t.id === event.id)
      if (exists) {
        return {
          ...prev,
          timeline: prev.timeline.map((t) => (t.id === event.id ? { ...t, ...event } : t)),
        }
      }
      return { ...prev, timeline: [...prev.timeline, event] }
    })
  }, [])

  const removeTimeline = useCallback((id) => {
    updateStore((prev) => ({
      ...prev,
      timeline: prev.timeline.filter((t) => t.id !== id),
    }))
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
