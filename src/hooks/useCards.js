import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { blankCard, mergeSeedCards, SEED_CARDS } from '../data/cardsSeed'
import { onPageHide, readJson } from '../lib/persist'
import { saveWorkspaceDoc, WORKSPACE_DOCS } from '../lib/workspaceDocs'

const KEY = 'case-prep-cards-v1'

function cardsSeedChanged(before, after) {
  if (!Array.isArray(before) || before.length !== after.length) return true
  const prev = new Map(before.map((c) => [c.id, c]))
  for (const card of after) {
    const old = prev.get(card.id)
    if (!old || old.front !== card.front || old.back !== card.back) return true
  }
  return false
}

function load() {
  const saved = readJson(KEY, null)
  if (Array.isArray(saved?.cards)) return mergeSeedCards(saved.cards)
  if (Array.isArray(saved)) return mergeSeedCards(saved)
  return structuredClone(SEED_CARDS)
}

export function useCards() {
  const [cards, setCards] = useState(load)
  const [selectedId, setSelectedId] = useState(() => load()[0]?.id || null)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const [side, setSide] = useState('all')
  const [mode, setMode] = useState('drill') // drill | edit
  const skipFirstWrite = useRef(true)
  const applyingRemote = useRef(false)

  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false
      return
    }
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    saveWorkspaceDoc('cards', { cards })
  }, [cards])

  useEffect(
    () => onPageHide(() => saveWorkspaceDoc('cards', { cards }, { immediate: true })),
    [cards]
  )

  useEffect(() => {
    function onHydrate(event) {
      const next = event?.detail
      if (!Array.isArray(next?.cards)) return
      applyingRemote.current = true
      const merged = mergeSeedCards(next.cards)
      setCards(merged)
      // If learning seed refreshed or appended, push so Postgres picks it up.
      if (cardsSeedChanged(next.cards, merged)) {
        applyingRemote.current = false
        skipFirstWrite.current = false
      }
    }
    window.addEventListener(WORKSPACE_DOCS.cards.event, onHydrate)
    return () => window.removeEventListener(WORKSPACE_DOCS.cards.event, onHydrate)
  }, [])

  // One-shot: refresh learning seed into an existing local board, then persist.
  useEffect(() => {
    const saved = readJson(KEY, null)
    const raw = Array.isArray(saved?.cards) ? saved.cards : Array.isArray(saved) ? saved : null
    if (!raw) return
    const merged = mergeSeedCards(raw)
    if (!cardsSeedChanged(raw, merged)) return
    setCards(merged)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter((c) => {
      if (kind !== 'all' && c.kind !== kind) return false
      if (side !== 'all' && c.side !== side && c.side !== 'either') return false
      if (!q) return true
      const hay = [c.label, c.front, c.back, c.cite, c.kind, c.side, ...(c.tags || [])]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [cards, query, kind, side])

  const selected = cards.find((c) => c.id === selectedId) || filtered[0] || null

  const updateCard = useCallback((id, patch) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  const addCard = useCallback(() => {
    const card = blankCard({
      kind: kind === 'all' ? 'judge_qa' : kind,
      side: side === 'all' ? 'either' : side,
    })
    setCards((prev) => [card, ...prev])
    setSelectedId(card.id)
    setMode('edit')
    return card.id
  }, [kind, side])

  const removeCard = useCallback(
    (id) => {
      setCards((prev) => prev.filter((c) => c.id !== id))
      if (selectedId === id) setSelectedId(null)
    },
    [selectedId]
  )

  return {
    cards,
    filtered,
    selected,
    selectedId: selected?.id || null,
    setSelectedId,
    query,
    setQuery,
    kind,
    setKind,
    side,
    setSide,
    mode,
    setMode,
    updateCard,
    addCard,
    removeCard,
  }
}
