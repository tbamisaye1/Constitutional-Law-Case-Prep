import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatSourceLabel, SEED_FACTS } from '../data/factsSeed'
import { onPageHide, readJson, writeJson } from '../lib/persist'

const KEY = 'case-prep-facts-v3'

function load() {
  const saved = readJson(KEY, null)
  if (Array.isArray(saved)) return saved
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

  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false
      return
    }
    writeJson(KEY, facts)
  }, [facts])

  useEffect(() => onPageHide(() => writeJson(KEY, facts)), [facts])

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
  }, [subsection, side, argumentTag])

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
    removeFact,
  }
}
