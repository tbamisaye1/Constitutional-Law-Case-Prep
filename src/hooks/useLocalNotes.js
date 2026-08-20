import { useCallback, useEffect, useState } from 'react'
import { SEED_NOTE_PAGES } from '../data/seed'

const STORAGE_KEY = 'case-prep-notes-v1'

function loadPages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore corrupt storage
  }
  return SEED_NOTE_PAGES
}

/**
 * Local-first notes until the API exists.
 * Same habit as OneNote sections: list of pages with HTML bodies.
 */
export function useLocalNotes() {
  const [pages, setPages] = useState(loadPages)
  const [activeId, setActiveId] = useState(() => loadPages()[0]?.id || null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages))
  }, [pages])

  const active = pages.find((p) => p.id === activeId) || pages[0] || null

  const updateActiveHtml = useCallback(
    (html) => {
      setPages((prev) => prev.map((p) => (p.id === activeId ? { ...p, html } : p)))
    },
    [activeId]
  )

  const addPage = useCallback(() => {
    const id = `note-${Date.now()}`
    const page = {
      id,
      title: 'Untitled note',
      section: 'Notes',
      html: '<p></p>',
    }
    setPages((prev) => [page, ...prev])
    setActiveId(id)
  }, [])

  const renameActive = useCallback(
    (title) => {
      setPages((prev) => prev.map((p) => (p.id === activeId ? { ...p, title } : p)))
    },
    [activeId]
  )

  return {
    pages,
    active,
    activeId,
    setActiveId,
    updateActiveHtml,
    addPage,
    renameActive,
  }
}
