import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatSourceLabel, mergeAppendSeedFacts, SEED_FACTS } from '../data/factsSeed'
import { onPageHide, readJson } from '../lib/persist'
import { saveWorkspaceDoc, WORKSPACE_DOCS } from '../lib/workspaceDocs'

const KEY = 'case-prep-facts-v3'

function load() {
  const saved = readJson(KEY, null)
  if (Array.isArray(saved)) return mergeAppendSeedFacts(saved)
  return SEED_FACTS
}

export function useFacts() {
  const [facts, setFacts] = useState(load)
  const [selectedId, setSelectedId] = useState(() => load()[0]?.id || null)
  const [query, setQuery] = useState('')
  const [subsection, setSubsection] = useState('all')
  const [side, setSide] = useState('all')
  const [argumentTag, setArgumentTag] = useState('all')
  const [view, setView] = useState('record') // record | browse | timeline | memorise
  const skipFirstWrite = useRef(true)
  const applyingRemote = useRef(false)
  const mergedAppend = useRef(false)

  // Persist newly appended seed facts once after load so sync picks them up.
  useEffect(() => {
    if (mergedAppend.current) return
    mergedAppend.current = true
    const saved = readJson(KEY, null)
    if (!Array.isArray(saved)) return
    const merged = mergeAppendSeedFacts(saved)
    if (merged.length === saved.length) return
    setFacts(merged)
  }, [])

  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false
      return
    }
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    saveWorkspaceDoc('facts', { facts })
  }, [facts])

  useEffect(
    () => onPageHide(() => saveWorkspaceDoc('facts', { facts }, { immediate: true })),
    [facts]
  )

  useEffect(() => {
    function onHydrate(event) {
      const next = event?.detail
      if (!Array.isArray(next?.facts)) return
      applyingRemote.current = true
      const merged = mergeAppendSeedFacts(next.facts)
      setFacts(merged)
      // If we appended seed facts onto a remote board, push the merge.
      if (merged.length !== next.facts.length) {
        applyingRemote.current = false
        skipFirstWrite.current = false
      }
    }
    window.addEventListener(WORKSPACE_DOCS.facts.event, onHydrate)
    return () => window.removeEventListener(WORKSPACE_DOCS.facts.event, onHydrate)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return facts.filter((f) => {
      if (subsection !== 'all' && f.subsection !== subsection) return false
      if (side !== 'all' && f.side !== side) return false
      if (argumentTag !== 'all' && !(f.argumentTags || []).includes(argumentTag)) return false
      if (!q) return true
      const hay = [
        f.text,
        f.memoriseLine,
        formatSourceLabel(f.source),
        f.source?.page,
        f.source?.footnote,
        f.source?.note,
        ...(f.argumentTags || []),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [facts, query, subsection, side, argumentTag])

  const memorisePool = useMemo(() => {
    const q = query.trim().toLowerCase()
    return facts.filter((f) => {
      const isMemo = (f.argumentTags || []).includes('memorise') || Boolean(f.memoriseLine)
      if (!isMemo) return false
      if (!q) return true
      const hay = [f.text, f.memoriseLine, formatSourceLabel(f.source), f.side]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [facts, query])

  const sideCounts = useMemo(() => {
    const counts = { all: memorisePool.length, neutral: 0, petitioner: 0, respondent: 0 }
    for (const f of memorisePool) {
      if (counts[f.side] != null) counts[f.side] += 1
    }
    return counts
  }, [memorisePool])

  const memoriseDeck = useMemo(() => {
    if (side === 'all') return memorisePool
    return memorisePool.filter((f) => f.side === side)
  }, [memorisePool, side])

  const selected = facts.find((f) => f.id === selectedId) || filtered[0] || null

  const updateFact = useCallback((id, patch) => {
    setFacts((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  const addFact = useCallback(() => {
    const id = `f-${Date.now()}`
    const fact = {
      id,
      text: '',
      subsection: subsection === 'all' ? 'timeline' : subsection,
      side: side === 'all' ? 'neutral' : side,
      source: { page: '', footnote: '', note: '' },
      argumentTags: argumentTag === 'all' ? [] : [argumentTag],
      memoriseLine: '',
    }
    setFacts((prev) => [fact, ...prev])
    setSelectedId(id)
    return id
  }, [subsection, side, argumentTag])

  /**
   * Turn an Instant Case PDF highlight into a Fact card.
   * Quote becomes the card text; page is stored as the cite.
   */
  const addFactFromHighlight = useCallback(
    ({
      text,
      page,
      footnote,
      note,
      subsection: sub,
      side: factSide,
      fileId,
      annotationId,
    } = {}) => {
      const quote = String(text || '').trim()
      if (!quote) return null
      const id = `f-${Date.now()}`
      const fact = {
        id,
        text: quote,
        subsection: sub || (subsection === 'all' ? 'timeline' : subsection),
        side: factSide || (side === 'all' ? 'neutral' : side),
        source: {
          page: page != null && page !== '' ? String(page) : '',
          footnote: footnote != null && footnote !== '' ? String(footnote).trim() : '',
          note: note || 'Instant Case record',
          fileId: fileId || null,
          annotationId: annotationId || null,
        },
        argumentTags: argumentTag === 'all' ? [] : [argumentTag],
        memoriseLine: quote.length > 160 ? `${quote.slice(0, 157).trim()}…` : quote,
      }
      setFacts((prev) => [fact, ...prev])
      setSelectedId(id)
      return id
    },
    [subsection, side, argumentTag]
  )

  const removeFact = useCallback(
    (id) => {
      setFacts((prev) => prev.filter((f) => f.id !== id))
      if (selectedId === id) setSelectedId(null)
    },
    [selectedId]
  )

  return {
    facts,
    filtered,
    memoriseDeck,
    sideCounts,
    selected,
    selectedId: selected?.id || null,
    setSelectedId,
    query,
    setQuery,
    subsection,
    setSubsection,
    side,
    setSide,
    argumentTag,
    setArgumentTag,
    view,
    setView,
    updateFact,
    addFact,
    addFactFromHighlight,
    removeFact,
  }
}
