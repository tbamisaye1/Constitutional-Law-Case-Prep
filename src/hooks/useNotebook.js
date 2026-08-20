import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SEED_PAGES, SEED_TREE, SECTION_COLORS } from '../data/notebookSeed'
import { onPageHide, readJson, writeJson } from '../lib/persist'

const STORAGE_KEY = 'case-prep-notebook-v3'

function loadState() {
  const saved = readJson(STORAGE_KEY, null)
  if (saved?.tree && saved?.pagesBySection) return saved
  return { tree: SEED_TREE, pagesBySection: SEED_PAGES }
}

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Local-first notebook store: section-group tree + pages per section.
 * Mirrors OneNote until a real notes API exists.
 */
export function useNotebook() {
  const initial = useMemo(() => loadState(), [])
  const [tree, setTree] = useState(initial.tree)
  const [pagesBySection, setPagesBySection] = useState(initial.pagesBySection)
  const [sectionId, setSectionId] = useState(() => findFirstSectionId(initial.tree))
  const [pageId, setPageId] = useState(() => {
    const firstSec = findFirstSectionId(initial.tree)
    return initial.pagesBySection[firstSec]?.[0]?.id || null
  })

  const skipFirstWrite = useRef(true)

  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false
      return
    }
    writeJson(STORAGE_KEY, { tree, pagesBySection })
  }, [tree, pagesBySection])

  useEffect(
    () => onPageHide(() => writeJson(STORAGE_KEY, { tree, pagesBySection })),
    [tree, pagesBySection]
  )

  const pages = pagesBySection[sectionId] || []
  const activePage = pages.find((p) => p.id === pageId) || pages[0] || null

  const selectSection = useCallback(
    (id) => {
      setSectionId(id)
      const first = (pagesBySection[id] || [])[0]
      setPageId(first?.id || null)
    },
    [pagesBySection]
  )

  const selectPage = useCallback((id) => setPageId(id), [])

  const updatePageHtml = useCallback(
    (html) => {
      if (!activePage) return
      setPagesBySection((prev) => ({
        ...prev,
        [sectionId]: (prev[sectionId] || []).map((p) =>
          p.id === activePage.id ? { ...p, html } : p
        ),
      }))
    },
    [activePage, sectionId]
  )

  const renamePage = useCallback(
    (title) => {
      if (!activePage) return
      setPagesBySection((prev) => ({
        ...prev,
        [sectionId]: (prev[sectionId] || []).map((p) =>
          p.id === activePage.id ? { ...p, title } : p
        ),
      }))
    },
    [activePage, sectionId]
  )

  const addPage = useCallback(() => {
    if (!sectionId) return
    const id = `pg-${Date.now()}`
    const page = { id, title: 'Untitled page', html: '<p></p>' }
    setPagesBySection((prev) => ({
      ...prev,
      [sectionId]: [page, ...(prev[sectionId] || [])],
    }))
    setPageId(id)
  }, [sectionId])

  const addSection = useCallback(
    (parentGroupId) => {
      const id = `sec-${Date.now()}`
      const color = SECTION_COLORS[Math.floor(Math.random() * SECTION_COLORS.length)]
      const section = { id, name: 'New section', kind: 'section', color }

      setTree((prev) => {
        if (!parentGroupId) {
          return [...prev, section]
        }
        return prev.map((node) => {
          if (node.id !== parentGroupId) return node
          return { ...node, children: [...(node.children || []), section] }
        })
      })
      setPagesBySection((prev) => ({ ...prev, [id]: [] }))
      setSectionId(id)
      setPageId(null)
    },
    []
  )

  const addSectionGroup = useCallback(() => {
    const id = `grp-${Date.now()}`
    setTree((prev) => [...prev, { id, name: 'New section group', kind: 'group', children: [] }])
  }, [])

  const renameTreeNode = useCallback((id, name) => {
    setTree((prev) => renameInTree(prev, id, name))
  }, [])

  const pagePreviews = pages.map((p) => ({
    ...p,
    preview: stripHtml(p.html).slice(0, 90),
  }))

  return {
    tree,
    setTree,
    sectionId,
    pageId: activePage?.id || null,
    pages: pagePreviews,
    activePage,
    selectSection,
    selectPage,
    updatePageHtml,
    renamePage,
    addPage,
    addSection,
    addSectionGroup,
    renameTreeNode,
  }
}

function findFirstSectionId(nodes) {
  for (const n of nodes) {
    if (n.kind === 'section') return n.id
    if (n.children?.length) {
      const found = findFirstSectionId(n.children)
      if (found) return found
    }
  }
  return null
}

function renameInTree(nodes, id, name) {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, name }
    if (n.children) return { ...n, children: renameInTree(n.children, id, name) }
    return n
  })
}
