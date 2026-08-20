import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import guideSections from '../data/guideSections.json'
import { onPageHide, readJson, writeJson } from '../lib/persist'

const KEY = 'case-prep-guide-edits-v1'

function loadEdits() {
  const saved = readJson(KEY, null)
  if (saved && typeof saved === 'object') return saved
  return {}
}

/**
 * Bronner guide sections (from HTML) + optional per-section HTML overrides.
 */
export function useGuide() {
  const [edits, setEdits] = useState(loadEdits)
  const sections = useMemo(() => guideSections, [])
  const skipFirstWrite = useRef(true)

  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false
      return
    }
    writeJson(KEY, edits)
  }, [edits])

  useEffect(() => onPageHide(() => writeJson(KEY, edits)), [edits])

  const getHtml = useCallback(
    (id) => {
      if (edits[id] != null) return edits[id]
      return sections.find((s) => s.id === id)?.html || ''
    },
    [edits, sections]
  )

  const setHtml = useCallback((id, html) => {
    setEdits((prev) => ({ ...prev, [id]: html }))
  }, [])

  const resetSection = useCallback((id) => {
    setEdits((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  return { sections, getHtml, setHtml, resetSection }
}
