import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onPageHide, readJson } from '../lib/persist'
import { saveWorkspaceDoc, WORKSPACE_DOCS } from '../lib/workspaceDocs'

const STORAGE_KEY = 'case-prep-arguments-v1'
const HYDRATE_EVENT = WORKSPACE_DOCS.arguments.event

const DEFAULT_NOTES = {
  petitioner: '<h2>Petitioner working notes</h2><p>Quips, corrections, language.</p>',
  respondent: '<h2>Respondent working notes</h2><p>Structure and rebuttal scratch.</p>',
}

/**
 * Seed outline mirrors the old flat board as sections (no prongs yet).
 * Users add prongs under each section for Katz / Carpenter / Youngstown steps.
 */
const DEFAULT_OUTLINES = {
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

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Accept v1 section shape, or migrate the original flat `{id, title}` rows.
 * @param {unknown} raw
 * @returns {Array<{id: string, title: string, prongs: Array<{id: string, title: string}>}>}
 */
export function normalizeSections(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((row, index) => {
    if (!row || typeof row !== 'object') {
      return { id: newId('sec'), title: `Section ${index + 1}`, prongs: [] }
    }
    const id = typeof row.id === 'string' && row.id ? row.id : newId('sec')
    const title = typeof row.title === 'string' ? row.title : 'Untitled section'
    const prongs = Array.isArray(row.prongs)
      ? row.prongs
          .filter((p) => p && typeof p === 'object')
          .map((p, i) => ({
            id: typeof p.id === 'string' && p.id ? p.id : newId('pr'),
            title: typeof p.title === 'string' ? p.title : `Prong ${i + 1}`,
          }))
      : []
    return { id, title, prongs }
  })
}

function loadSideSections(raw, fallback) {
  const sections = normalizeSections(raw)
  return sections.length ? sections : fallback.map((s) => ({ ...s, prongs: [...(s.prongs || [])] }))
}

function loadState() {
  const saved = readJson(STORAGE_KEY, null)
  if (saved && typeof saved === 'object') {
    return {
      outlines: {
        petitioner: loadSideSections(saved.outlines?.petitioner, DEFAULT_OUTLINES.petitioner),
        respondent: loadSideSections(saved.outlines?.respondent, DEFAULT_OUTLINES.respondent),
      },
      notes: {
        petitioner:
          typeof saved.notes?.petitioner === 'string'
            ? saved.notes.petitioner
            : DEFAULT_NOTES.petitioner,
        respondent:
          typeof saved.notes?.respondent === 'string'
            ? saved.notes.respondent
            : DEFAULT_NOTES.respondent,
      },
      activeSectionBySide: {
        petitioner: saved.activeSectionBySide?.petitioner || null,
        respondent: saved.activeSectionBySide?.respondent || null,
      },
    }
  }
  return {
    outlines: {
      petitioner: DEFAULT_OUTLINES.petitioner.map((s) => ({ ...s, prongs: [] })),
      respondent: DEFAULT_OUTLINES.respondent.map((s) => ({ ...s, prongs: [] })),
    },
    notes: { ...DEFAULT_NOTES },
    activeSectionBySide: { petitioner: null, respondent: null },
  }
}

/**
 * Argument board: sections with nested prongs.
 * Saves locally and syncs to the workspace so phone / laptop stay aligned.
 */
export function useArguments() {
  const initial = useMemo(() => loadState(), [])
  const [side, setSide] = useState('petitioner')
  const [outlines, setOutlines] = useState(initial.outlines)
  const [notes, setNotes] = useState(initial.notes)
  const [activeSectionBySide, setActiveSectionBySide] = useState(initial.activeSectionBySide)
  const skipFirstWrite = useRef(true)
  const applyingRemote = useRef(false)

  const sections = outlines[side] || []
  const activeSectionId =
    activeSectionBySide[side] && sections.some((s) => s.id === activeSectionBySide[side])
      ? activeSectionBySide[side]
      : sections[0]?.id || null

  function persist(next = { outlines, notes, activeSectionBySide }) {
    saveWorkspaceDoc('arguments', next)
  }

  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false
      return
    }
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    persist()
  }, [outlines, notes, activeSectionBySide])

  useEffect(
    () => onPageHide(() => persist()),
    [outlines, notes, activeSectionBySide]
  )

  useEffect(() => {
    function onHydrate(event) {
      const next = event?.detail
      if (!next?.outlines || !next?.notes) return
      applyingRemote.current = true
      setOutlines(next.outlines)
      setNotes(next.notes)
      setActiveSectionBySide(
        next.activeSectionBySide || { petitioner: null, respondent: null }
      )
    }
    window.addEventListener(HYDRATE_EVENT, onHydrate)
    return () => window.removeEventListener(HYDRATE_EVENT, onHydrate)
  }, [])

  const selectSection = useCallback((sectionId) => {
    setActiveSectionBySide((prev) => ({ ...prev, [side]: sectionId }))
  }, [side])

  const addSection = useCallback(() => {
    const id = newId(side[0])
    const section = { id, title: 'New section', prongs: [] }
    setOutlines((prev) => ({
      ...prev,
      [side]: [...(prev[side] || []), section],
    }))
    setActiveSectionBySide((prev) => ({ ...prev, [side]: id }))
  }, [side])

  const updateSectionTitle = useCallback(
    (sectionId, title) => {
      setOutlines((prev) => ({
        ...prev,
        [side]: (prev[side] || []).map((s) => (s.id === sectionId ? { ...s, title } : s)),
      }))
    },
    [side]
  )

  const removeSection = useCallback(
    (sectionId) => {
      setOutlines((prev) => {
        const next = (prev[side] || []).filter((s) => s.id !== sectionId)
        setActiveSectionBySide((active) => {
          if (active[side] !== sectionId) return active
          return { ...active, [side]: next[0]?.id || null }
        })
        return { ...prev, [side]: next }
      })
    },
    [side]
  )

  const addProng = useCallback(
    (sectionId) => {
      const targetId = sectionId || activeSectionId
      if (!targetId) {
        // No section yet: create one, then add the first prong under it.
        const secId = newId(side[0])
        const prongId = newId('pr')
        setOutlines((prev) => ({
          ...prev,
          [side]: [
            ...(prev[side] || []),
            { id: secId, title: 'New section', prongs: [{ id: prongId, title: 'New prong' }] },
          ],
        }))
        setActiveSectionBySide((prev) => ({ ...prev, [side]: secId }))
        return
      }
      const prong = { id: newId('pr'), title: 'New prong' }
      setOutlines((prev) => ({
        ...prev,
        [side]: (prev[side] || []).map((s) =>
          s.id === targetId ? { ...s, prongs: [...(s.prongs || []), prong] } : s
        ),
      }))
      setActiveSectionBySide((prev) => ({ ...prev, [side]: targetId }))
    },
    [side, activeSectionId]
  )

  const updateProngTitle = useCallback(
    (sectionId, prongId, title) => {
      setOutlines((prev) => ({
        ...prev,
        [side]: (prev[side] || []).map((s) =>
          s.id === sectionId
            ? {
                ...s,
                prongs: (s.prongs || []).map((p) => (p.id === prongId ? { ...p, title } : p)),
              }
            : s
        ),
      }))
    },
    [side]
  )

  const removeProng = useCallback(
    (sectionId, prongId) => {
      setOutlines((prev) => ({
        ...prev,
        [side]: (prev[side] || []).map((s) =>
          s.id === sectionId
            ? { ...s, prongs: (s.prongs || []).filter((p) => p.id !== prongId) }
            : s
        ),
      }))
    },
    [side]
  )

  const setNotesForSide = useCallback(
    (html) => {
      setNotes((prev) => ({ ...prev, [side]: html }))
    },
    [side]
  )

  return {
    side,
    setSide,
    sections,
    activeSectionId,
    selectSection,
    addSection,
    updateSectionTitle,
    removeSection,
    addProng,
    updateProngTitle,
    removeProng,
    notesHtml: notes[side],
    setNotesForSide,
  }
}
