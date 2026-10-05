import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onPageHide, readJson } from '../lib/persist'
import { joinArgumentOutlineBlocks } from '../lib/argumentNotes'
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
    { id: 'p1', title: 'Opening theme', prongs: [], notes: '' },
    { id: 'p2', title: 'Q1 roadmap — search', prongs: [], notes: '' },
    { id: 'p3', title: 'Q2 roadmap — Youngstown', prongs: [], notes: '' },
    { id: 'p4', title: 'Hinge + close', prongs: [], notes: '' },
  ],
  respondent: [
    { id: 'r1', title: 'Opening theme', prongs: [], notes: '' },
    { id: 'r2', title: 'No search / Tuggle line', prongs: [], notes: '' },
    { id: 'r3', title: 'Category 1 authority', prongs: [], notes: '' },
    { id: 'r4', title: 'Rebuttal points', prongs: [], notes: '' },
  ],
}

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function normalizeFocus(raw) {
  if (!raw || typeof raw !== 'object') return { type: 'side' }
  if (raw.type === 'joined') return { type: 'joined' }
  if (raw.type === 'section' && raw.sectionId) {
    return { type: 'section', sectionId: String(raw.sectionId) }
  }
  if (raw.type === 'prong' && raw.sectionId && raw.prongId) {
    return {
      type: 'prong',
      sectionId: String(raw.sectionId),
      prongId: String(raw.prongId),
    }
  }
  return { type: 'side' }
}

/**
 * Accept v1 section shape, or migrate the original flat `{id, title}` rows.
 * Preserves optional HTML notes on sections and prongs.
 */
export function normalizeSections(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((row, index) => {
    if (!row || typeof row !== 'object') {
      return { id: newId('sec'), title: `Section ${index + 1}`, prongs: [], notes: '' }
    }
    const id = typeof row.id === 'string' && row.id ? row.id : newId('sec')
    const title = typeof row.title === 'string' ? row.title : 'Untitled section'
    const notes = typeof row.notes === 'string' ? row.notes : ''
    const prongs = Array.isArray(row.prongs)
      ? row.prongs
          .filter((p) => p && typeof p === 'object')
          .map((p, i) => ({
            id: typeof p.id === 'string' && p.id ? p.id : newId('pr'),
            title: typeof p.title === 'string' ? p.title : `Prong ${i + 1}`,
            notes: typeof p.notes === 'string' ? p.notes : '',
          }))
      : []
    return { id, title, notes, prongs }
  })
}

function loadSideSections(raw, fallback) {
  const sections = normalizeSections(raw)
  return sections.length
    ? sections
    : fallback.map((s) => ({
        ...s,
        notes: typeof s.notes === 'string' ? s.notes : '',
        prongs: (s.prongs || []).map((p) => ({
          ...p,
          notes: typeof p.notes === 'string' ? p.notes : '',
        })),
      }))
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
      activeFocusBySide: {
        petitioner: normalizeFocus(saved.activeFocusBySide?.petitioner),
        respondent: normalizeFocus(saved.activeFocusBySide?.respondent),
      },
    }
  }
  return {
    outlines: {
      petitioner: DEFAULT_OUTLINES.petitioner.map((s) => ({
        ...s,
        notes: '',
        prongs: [],
      })),
      respondent: DEFAULT_OUTLINES.respondent.map((s) => ({
        ...s,
        notes: '',
        prongs: [],
      })),
    },
    notes: { ...DEFAULT_NOTES },
    activeSectionBySide: { petitioner: null, respondent: null },
    activeFocusBySide: {
      petitioner: { type: 'side' },
      respondent: { type: 'side' },
    },
  }
}

/**
 * Argument board: sections with nested prongs, each with its own notes.
 * Side-level working notes stay available as "whole argument".
 */
export function useArguments() {
  const initial = useMemo(() => loadState(), [])
  const [side, setSide] = useState('petitioner')
  const [outlines, setOutlines] = useState(initial.outlines)
  const [notes, setNotes] = useState(initial.notes)
  const [activeSectionBySide, setActiveSectionBySide] = useState(initial.activeSectionBySide)
  const [activeFocusBySide, setActiveFocusBySide] = useState(initial.activeFocusBySide)
  const skipFirstWrite = useRef(true)
  const applyingRemote = useRef(false)

  const sections = outlines[side] || []
  const activeSectionId =
    activeSectionBySide[side] && sections.some((s) => s.id === activeSectionBySide[side])
      ? activeSectionBySide[side]
      : sections[0]?.id || null

  const focus = useMemo(() => {
    const raw = normalizeFocus(activeFocusBySide[side])
    if (raw.type === 'joined') return { type: 'joined' }
    if (raw.type === 'section') {
      const section = sections.find((s) => s.id === raw.sectionId)
      if (!section) return { type: 'side' }
      return { type: 'section', sectionId: section.id }
    }
    if (raw.type === 'prong') {
      const section = sections.find((s) => s.id === raw.sectionId)
      const prong = section?.prongs?.find((p) => p.id === raw.prongId)
      if (!section || !prong) return { type: 'side' }
      return { type: 'prong', sectionId: section.id, prongId: prong.id }
    }
    return { type: 'side' }
  }, [activeFocusBySide, side, sections])

  const focusedNotesHtml = useMemo(() => {
    if (focus.type === 'joined') return ''
    if (focus.type === 'section') {
      return sections.find((s) => s.id === focus.sectionId)?.notes || ''
    }
    if (focus.type === 'prong') {
      const section = sections.find((s) => s.id === focus.sectionId)
      return section?.prongs?.find((p) => p.id === focus.prongId)?.notes || ''
    }
    return notes[side] || ''
  }, [focus, sections, notes, side])

  const joinedBlocks = useMemo(() => joinArgumentOutlineBlocks(sections), [sections])

  const focusLabel = useMemo(() => {
    const sideLabel = side === 'petitioner' ? 'Petitioner' : 'Respondent'
    if (focus.type === 'joined') {
      return `${sideLabel} · full argument (joined)`
    }
    if (focus.type === 'section') {
      const idx = sections.findIndex((s) => s.id === focus.sectionId)
      const section = sections[idx]
      return `${idx + 1}. ${section?.title || 'Section'} · section notes`
    }
    if (focus.type === 'prong') {
      const sIdx = sections.findIndex((s) => s.id === focus.sectionId)
      const section = sections[sIdx]
      const pIdx = (section?.prongs || []).findIndex((p) => p.id === focus.prongId)
      const prong = section?.prongs?.[pIdx]
      return `${sIdx + 1}.${pIdx + 1} ${prong?.title || 'Prong'} · prong notes`
    }
    return `${sideLabel} · whole argument notes`
  }, [focus, sections, side])

  function persist(
    next = { outlines, notes, activeSectionBySide, activeFocusBySide }
  ) {
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
  }, [outlines, notes, activeSectionBySide, activeFocusBySide])

  useEffect(
    () => onPageHide(() => persist()),
    [outlines, notes, activeSectionBySide, activeFocusBySide]
  )

  useEffect(() => {
    function onHydrate(event) {
      const next = event?.detail
      if (!next?.outlines || !next?.notes) return
      applyingRemote.current = true
      setOutlines({
        petitioner: normalizeSections(next.outlines.petitioner),
        respondent: normalizeSections(next.outlines.respondent),
      })
      setNotes(next.notes)
      setActiveSectionBySide(
        next.activeSectionBySide || { petitioner: null, respondent: null }
      )
      setActiveFocusBySide({
        petitioner: normalizeFocus(next.activeFocusBySide?.petitioner),
        respondent: normalizeFocus(next.activeFocusBySide?.respondent),
      })
    }
    window.addEventListener(HYDRATE_EVENT, onHydrate)
    return () => window.removeEventListener(HYDRATE_EVENT, onHydrate)
  }, [])

  const focusWholeArgument = useCallback(() => {
    setActiveFocusBySide((prev) => ({ ...prev, [side]: { type: 'side' } }))
  }, [side])

  const focusJoinedArgument = useCallback(() => {
    setActiveFocusBySide((prev) => ({ ...prev, [side]: { type: 'joined' } }))
  }, [side])

  const selectSection = useCallback(
    (sectionId) => {
      setActiveSectionBySide((prev) => ({ ...prev, [side]: sectionId }))
      setActiveFocusBySide((prev) => ({
        ...prev,
        [side]: { type: 'section', sectionId },
      }))
    },
    [side]
  )

  const selectProng = useCallback(
    (sectionId, prongId) => {
      setActiveSectionBySide((prev) => ({ ...prev, [side]: sectionId }))
      setActiveFocusBySide((prev) => ({
        ...prev,
        [side]: { type: 'prong', sectionId, prongId },
      }))
    },
    [side]
  )

  const addSection = useCallback(() => {
    const id = newId(side[0])
    const section = { id, title: 'New section', notes: '', prongs: [] }
    setOutlines((prev) => ({
      ...prev,
      [side]: [...(prev[side] || []), section],
    }))
    setActiveSectionBySide((prev) => ({ ...prev, [side]: id }))
    setActiveFocusBySide((prev) => ({
      ...prev,
      [side]: { type: 'section', sectionId: id },
    }))
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
        setActiveFocusBySide((active) => {
          const cur = normalizeFocus(active[side])
          if (cur.sectionId !== sectionId) return active
          return { ...active, [side]: { type: 'side' } }
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
        const secId = newId(side[0])
        const prongId = newId('pr')
        setOutlines((prev) => ({
          ...prev,
          [side]: [
            ...(prev[side] || []),
            {
              id: secId,
              title: 'New section',
              notes: '',
              prongs: [{ id: prongId, title: 'New prong', notes: '' }],
            },
          ],
        }))
        setActiveSectionBySide((prev) => ({ ...prev, [side]: secId }))
        setActiveFocusBySide((prev) => ({
          ...prev,
          [side]: { type: 'prong', sectionId: secId, prongId },
        }))
        return
      }
      const prong = { id: newId('pr'), title: 'New prong', notes: '' }
      setOutlines((prev) => ({
        ...prev,
        [side]: (prev[side] || []).map((s) =>
          s.id === targetId ? { ...s, prongs: [...(s.prongs || []), prong] } : s
        ),
      }))
      setActiveSectionBySide((prev) => ({ ...prev, [side]: targetId }))
      setActiveFocusBySide((prev) => ({
        ...prev,
        [side]: { type: 'prong', sectionId: targetId, prongId: prong.id },
      }))
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
      setActiveFocusBySide((active) => {
        const cur = normalizeFocus(active[side])
        if (cur.type === 'prong' && cur.prongId === prongId) {
          return { ...active, [side]: { type: 'section', sectionId } }
        }
        return active
      })
    },
    [side]
  )

  const setFocusedNotes = useCallback(
    (html) => {
      if (focus.type === 'joined') return
      if (focus.type === 'section') {
        setOutlines((prev) => ({
          ...prev,
          [side]: (prev[side] || []).map((s) =>
            s.id === focus.sectionId ? { ...s, notes: html } : s
          ),
        }))
        return
      }
      if (focus.type === 'prong') {
        setOutlines((prev) => ({
          ...prev,
          [side]: (prev[side] || []).map((s) =>
            s.id === focus.sectionId
              ? {
                  ...s,
                  prongs: (s.prongs || []).map((p) =>
                    p.id === focus.prongId ? { ...p, notes: html } : p
                  ),
                }
              : s
          ),
        }))
        return
      }
      setNotes((prev) => ({ ...prev, [side]: html }))
    },
    [focus, side]
  )

  /** Snapshot for Ask AI (outline + all note layers). */
  const boardSnapshot = useMemo(
    () => ({
      outlines,
      notes,
    }),
    [outlines, notes]
  )

  return {
    side,
    setSide,
    sections,
    activeSectionId,
    focus,
    focusLabel,
    joinedBlocks,
    focusWholeArgument,
    focusJoinedArgument,
    selectSection,
    selectProng,
    addSection,
    updateSectionTitle,
    removeSection,
    addProng,
    updateProngTitle,
    removeProng,
    notesHtml: focusedNotesHtml,
    setNotesForSide: setFocusedNotes,
    boardSnapshot,
  }
}
