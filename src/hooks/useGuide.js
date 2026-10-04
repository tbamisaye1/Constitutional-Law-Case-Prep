import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { guideSections } from '../data/guideCopy'
import { onPageHide, readJson } from '../lib/persist'
import { saveWorkspaceDoc, WORKSPACE_DOCS } from '../lib/workspaceDocs'

/** Bumped after TipTap stripped tables/callouts into merged text. */
const KEY = 'case-prep-guide-edits-v2'
const LEGACY_KEY = 'case-prep-guide-edits-v1'

/**
 * TipTap's default schema used to flatten guide tables into run-on words
 * like "CourtFourthAmendment…". Drop those overrides so seed HTML returns.
 */
function looksMangled(html) {
  if (!html || typeof html !== 'string') return false
  if (/CourtFourth|Article IIResult|CourtFourth Amendment/i.test(html)) return true
  if (/Posture/i.test(html) && !/<table[\s>]/i.test(html) && !/guide-table-wrap/i.test(html)) {
    return true
  }
  // TipTap often left bare cell text mashed together without separators.
  if (/District Court[\s\S]{0,40}Bronner wins[\s\S]{0,80}Fourteenth Circuit/i.test(html)) {
    if (!/<table[\s>]/i.test(html)) return true
  }
  return false
}

function scrubEdits(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const next = {}
  for (const [id, html] of Object.entries(raw)) {
    if (typeof html !== 'string') continue
    if (looksMangled(html)) continue
    next[id] = html
  }
  return next
}

function loadEdits() {
  const current = readJson(KEY, null)
  if (current && typeof current === 'object') return scrubEdits(current)

  const legacy = readJson(LEGACY_KEY, null)
  if (legacy && typeof legacy === 'object') return scrubEdits(legacy)

  return {}
}

/**
 * Bronner guide sections (from HTML) + optional per-section HTML overrides.
 */
export function useGuide() {
  const [edits, setEdits] = useState(loadEdits)
  const sections = useMemo(() => guideSections, [])
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
    saveWorkspaceDoc('guide_edits', { edits })
  }, [edits])

  useEffect(() => onPageHide(() => saveWorkspaceDoc('guide_edits', { edits })), [edits])

  useEffect(() => {
    function onHydrate(event) {
      const next = event?.detail
      if (!next || typeof next.edits !== 'object') return
      applyingRemote.current = true
      setEdits(next.edits || {})
    }
    window.addEventListener(WORKSPACE_DOCS.guide_edits.event, onHydrate)
    return () => window.removeEventListener(WORKSPACE_DOCS.guide_edits.event, onHydrate)
  }, [])

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
