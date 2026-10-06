import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onPageHide, readJson } from '../lib/persist'
import { joinArgumentOutlineBlocks } from '../lib/argumentNotes'
import { saveWorkspaceDoc, WORKSPACE_DOCS } from '../lib/workspaceDocs'
import {
  CATEGORY3_LADDER_DRAFT_ID,
  moveArrayItem,
  normalizeArgumentsBoard,
  normalizeFocus,
  normalizeSections,
  newId,
} from '../lib/argumentsBoard'

export { normalizeSections, normalizeArgumentsBoard }

const STORAGE_KEY = 'case-prep-arguments-v1'
const HYDRATE_EVENT = WORKSPACE_DOCS.arguments.event

function loadState() {
  return normalizeArgumentsBoard(readJson(STORAGE_KEY, null))
}

function updateActiveDraft(draftsBySide, side, draftId, updater) {
  return {
    ...draftsBySide,
    [side]: (draftsBySide[side] || []).map((d) =>
      d.id === draftId ? updater(d) : d
    ),
  }
}

/**
 * Argument board: multiple drafts per side (Main + alternatives).
 * Each draft has whole-argument notes + sections with nested prongs.
 */
export function useArguments() {
  const initial = useMemo(() => loadState(), [])
  const [side, setSide] = useState('petitioner')
  const [draftsBySide, setDraftsBySide] = useState(initial.draftsBySide)
  const [activeDraftBySide, setActiveDraftBySide] = useState(initial.activeDraftBySide)
  const [activeSectionBySide, setActiveSectionBySide] = useState(initial.activeSectionBySide)
  const [activeFocusBySide, setActiveFocusBySide] = useState(initial.activeFocusBySide)
  const skipFirstWrite = useRef(true)
  const applyingRemote = useRef(false)

  const drafts = draftsBySide[side] || []
  const activeDraftId =
    activeDraftBySide[side] && drafts.some((d) => d.id === activeDraftBySide[side])
      ? activeDraftBySide[side]
      : drafts[0]?.id || null
  const activeDraft = drafts.find((d) => d.id === activeDraftId) || drafts[0] || null
  const sections = activeDraft?.sections || []
  const draftNotes = activeDraft?.notes || ''

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
    return draftNotes
  }, [focus, sections, draftNotes])

  const joinedBlocks = useMemo(() => joinArgumentOutlineBlocks(sections), [sections])

  const focusLabel = useMemo(() => {
    const draftName = activeDraft?.name || 'Draft'
    if (focus.type === 'joined') {
      return `${draftName} · full argument (joined)`
    }
    if (focus.type === 'section') {
      const idx = sections.findIndex((s) => s.id === focus.sectionId)
      const section = sections[idx]
      return `${draftName} · ${idx + 1}. ${section?.title || 'Section'}`
    }
    if (focus.type === 'prong') {
      const sIdx = sections.findIndex((s) => s.id === focus.sectionId)
      const section = sections[sIdx]
      const pIdx = (section?.prongs || []).findIndex((p) => p.id === focus.prongId)
      const prong = section?.prongs?.[pIdx]
      return `${draftName} · ${sIdx + 1}.${pIdx + 1} ${prong?.title || 'Prong'}`
    }
    return `${draftName} · whole argument notes`
  }, [focus, sections, activeDraft])

  function persist(
    next = {
      draftsBySide,
      activeDraftBySide,
      activeSectionBySide,
      activeFocusBySide,
    }
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
  }, [draftsBySide, activeDraftBySide, activeSectionBySide, activeFocusBySide])

  useEffect(
    () =>
      onPageHide(() =>
        saveWorkspaceDoc(
          'arguments',
          {
            draftsBySide,
            activeDraftBySide,
            activeSectionBySide,
            activeFocusBySide,
          },
          { immediate: true }
        )
      ),
    [draftsBySide, activeDraftBySide, activeSectionBySide, activeFocusBySide]
  )

  useEffect(() => {
    function onHydrate(event) {
      const next = event?.detail
      if (!next) return
      const normalized = normalizeArgumentsBoard(next)
      applyingRemote.current = true
      setDraftsBySide(normalized.draftsBySide)
      setActiveDraftBySide(normalized.activeDraftBySide)
      // Keep outline focus local. Sync was re-applying an older activeFocus
      // (e.g. prong 3.2) on every pull and yanking the editor back mid-click.
    }
    window.addEventListener(HYDRATE_EVENT, onHydrate)
    return () => window.removeEventListener(HYDRATE_EVENT, onHydrate)
  }, [])

  const selectDraft = useCallback(
    (draftId) => {
      if (!drafts.some((d) => d.id === draftId)) return
      setActiveDraftBySide((prev) => ({ ...prev, [side]: draftId }))
      setActiveFocusBySide((prev) => ({ ...prev, [side]: { type: 'side' } }))
    },
    [side, drafts]
  )

  const addDraft = useCallback(() => {
    const id = newId('draft')
    const draft = {
      id,
      name: 'New draft',
      notes: '<h2>New draft</h2><p>Scratch structure for this side.</p>',
      sections: [
        { id: newId('sec'), title: 'Opening theme', notes: '', prongs: [] },
        { id: newId('sec'), title: 'First issue', notes: '', prongs: [] },
      ],
    }
    setDraftsBySide((prev) => ({
      ...prev,
      [side]: [...(prev[side] || []), draft],
    }))
    setActiveDraftBySide((prev) => ({ ...prev, [side]: id }))
    setActiveFocusBySide((prev) => ({ ...prev, [side]: { type: 'side' } }))
  }, [side])

  const renameDraft = useCallback(
    (draftId, name) => {
      // Do not trim on every keystroke: that eats the space before the next word
      // ("Working " → "Working") so draft names could never contain spaces.
      const nextName = String(name ?? '')
      setDraftsBySide((prev) =>
        updateActiveDraft(prev, side, draftId, (d) => ({ ...d, name: nextName }))
      )
    },
    [side]
  )

  const commitDraftName = useCallback(
    (draftId) => {
      setDraftsBySide((prev) =>
        updateActiveDraft(prev, side, draftId, (d) => {
          const trimmed = String(d.name || '').trim()
          return { ...d, name: trimmed || 'Untitled draft' }
        })
      )
    },
    [side]
  )

  const removeDraft = useCallback(
    (draftId) => {
      setDraftsBySide((prev) => {
        const list = prev[side] || []
        if (list.length <= 1) return prev
        const next = list.filter((d) => d.id !== draftId)
        if (next.length === list.length) return prev
        setActiveDraftBySide((active) => {
          if (active[side] !== draftId) return active
          return { ...active, [side]: next[0].id }
        })
        setActiveFocusBySide((active) => ({ ...active, [side]: { type: 'side' } }))
        return { ...prev, [side]: next }
      })
    },
    [side]
  )

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

  const patchActiveDraft = useCallback(
    (updater) => {
      if (!activeDraftId) return
      setDraftsBySide((prev) => updateActiveDraft(prev, side, activeDraftId, updater))
    },
    [side, activeDraftId]
  )

  const addSection = useCallback(() => {
    const id = newId(side[0])
    const section = { id, title: 'New section', notes: '', prongs: [] }
    patchActiveDraft((d) => ({
      ...d,
      sections: [...(d.sections || []), section],
    }))
    setActiveSectionBySide((prev) => ({ ...prev, [side]: id }))
    setActiveFocusBySide((prev) => ({
      ...prev,
      [side]: { type: 'section', sectionId: id },
    }))
  }, [side, patchActiveDraft])

  const updateSectionTitle = useCallback(
    (sectionId, title) => {
      patchActiveDraft((d) => ({
        ...d,
        sections: (d.sections || []).map((s) => (s.id === sectionId ? { ...s, title } : s)),
      }))
    },
    [patchActiveDraft]
  )

  const removeSection = useCallback(
    (sectionId) => {
      patchActiveDraft((d) => {
        const next = (d.sections || []).filter((s) => s.id !== sectionId)
        setActiveSectionBySide((active) => {
          if (active[side] !== sectionId) return active
          return { ...active, [side]: next[0]?.id || null }
        })
        setActiveFocusBySide((active) => {
          const cur = normalizeFocus(active[side])
          if (cur.sectionId !== sectionId) return active
          return { ...active, [side]: { type: 'side' } }
        })
        return { ...d, sections: next }
      })
    },
    [side, patchActiveDraft]
  )

  const addProng = useCallback(
    (sectionId) => {
      const targetId = sectionId || activeSectionId
      if (!targetId) {
        const secId = newId(side[0])
        const prongId = newId('pr')
        patchActiveDraft((d) => ({
          ...d,
          sections: [
            ...(d.sections || []),
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
      patchActiveDraft((d) => ({
        ...d,
        sections: (d.sections || []).map((s) =>
          s.id === targetId ? { ...s, prongs: [...(s.prongs || []), prong] } : s
        ),
      }))
      setActiveSectionBySide((prev) => ({ ...prev, [side]: targetId }))
      setActiveFocusBySide((prev) => ({
        ...prev,
        [side]: { type: 'prong', sectionId: targetId, prongId: prong.id },
      }))
    },
    [side, activeSectionId, patchActiveDraft]
  )

  const updateProngTitle = useCallback(
    (sectionId, prongId, title) => {
      patchActiveDraft((d) => ({
        ...d,
        sections: (d.sections || []).map((s) =>
          s.id === sectionId
            ? {
                ...s,
                prongs: (s.prongs || []).map((p) => (p.id === prongId ? { ...p, title } : p)),
              }
            : s
        ),
      }))
    },
    [patchActiveDraft]
  )

  const removeProng = useCallback(
    (sectionId, prongId) => {
      patchActiveDraft((d) => ({
        ...d,
        sections: (d.sections || []).map((s) =>
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
    [side, patchActiveDraft]
  )

  const moveSection = useCallback(
    (sectionId, toIndex) => {
      patchActiveDraft((d) => {
        const sections = d.sections || []
        const fromIndex = sections.findIndex((s) => s.id === sectionId)
        if (fromIndex < 0) return d
        const next = moveArrayItem(sections, fromIndex, toIndex)
        return next === sections ? d : { ...d, sections: next }
      })
    },
    [patchActiveDraft]
  )

  const moveSectionByDelta = useCallback(
    (sectionId, delta) => {
      patchActiveDraft((d) => {
        const sections = d.sections || []
        const fromIndex = sections.findIndex((s) => s.id === sectionId)
        if (fromIndex < 0) return d
        const next = moveArrayItem(sections, fromIndex, fromIndex + delta)
        return next === sections ? d : { ...d, sections: next }
      })
    },
    [patchActiveDraft]
  )

  const moveProng = useCallback(
    (sectionId, prongId, toIndex) => {
      patchActiveDraft((d) => ({
        ...d,
        sections: (d.sections || []).map((s) => {
          if (s.id !== sectionId) return s
          const prongs = s.prongs || []
          const fromIndex = prongs.findIndex((p) => p.id === prongId)
          if (fromIndex < 0) return s
          const next = moveArrayItem(prongs, fromIndex, toIndex)
          return next === prongs ? s : { ...s, prongs: next }
        }),
      }))
    },
    [patchActiveDraft]
  )

  const moveProngByDelta = useCallback(
    (sectionId, prongId, delta) => {
      patchActiveDraft((d) => ({
        ...d,
        sections: (d.sections || []).map((s) => {
          if (s.id !== sectionId) return s
          const prongs = s.prongs || []
          const fromIndex = prongs.findIndex((p) => p.id === prongId)
          if (fromIndex < 0) return s
          const next = moveArrayItem(prongs, fromIndex, fromIndex + delta)
          return next === prongs ? s : { ...s, prongs: next }
        }),
      }))
    },
    [patchActiveDraft]
  )

  const setFocusedNotes = useCallback(
    (html) => {
      if (focus.type === 'joined') return
      if (focus.type === 'section') {
        patchActiveDraft((d) => ({
          ...d,
          sections: (d.sections || []).map((s) =>
            s.id === focus.sectionId ? { ...s, notes: html } : s
          ),
        }))
        return
      }
      if (focus.type === 'prong') {
        patchActiveDraft((d) => ({
          ...d,
          sections: (d.sections || []).map((s) =>
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
      patchActiveDraft((d) => ({ ...d, notes: html }))
    },
    [focus, patchActiveDraft]
  )

  const boardSnapshot = useMemo(
    () => ({
      draftsBySide,
      outlines: {
        petitioner: draftsBySide.petitioner?.[0]?.sections || [],
        respondent: draftsBySide.respondent?.[0]?.sections || [],
      },
      notes: {
        petitioner: draftsBySide.petitioner?.[0]?.notes || '',
        respondent: draftsBySide.respondent?.[0]?.notes || '',
      },
    }),
    [draftsBySide]
  )

  return {
    side,
    setSide,
    drafts,
    activeDraftId,
    activeDraft,
    selectDraft,
    addDraft,
    renameDraft,
    commitDraftName,
    removeDraft,
    canRemoveDraft: drafts.length > 1,
    isSeededLadder: activeDraftId === CATEGORY3_LADDER_DRAFT_ID,
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
    moveSection,
    moveSectionByDelta,
    moveProng,
    moveProngByDelta,
    notesHtml: focusedNotesHtml,
    setNotesForSide: setFocusedNotes,
    boardSnapshot,
  }
}
