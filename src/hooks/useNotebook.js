import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SEED_PAGES, SEED_TREE, SECTION_COLORS } from '../data/notebookSeed'
import { onPageHide, readJson, writeJson } from '../lib/persist'
import {
  findPage,
  firstPageId,
  insertAfter,
  mapPages,
  movePages,
  pickPageAfterDelete,
  removePage,
} from '../lib/pageTree'

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

function withPreviews(nodes) {
  return mapPages(nodes || [], (p) => ({
    ...p,
    preview: stripHtml(p.html).slice(0, 90),
  }))
}

/**
 * Local-first notebook store: section-group tree + pages per section.
 * Pages are a nestable tree (reorder + subpages). Mirrors OneNote until a notes API exists.
 */
export function useNotebook() {
  const initial = useMemo(() => loadState(), [])
  const [tree, setTree] = useState(initial.tree)
  const [pagesBySection, setPagesBySection] = useState(initial.pagesBySection)
  const [sectionId, setSectionId] = useState(() => findFirstSectionId(initial.tree))
  const [pageId, setPageId] = useState(() => {
    const firstSec = findFirstSectionId(initial.tree)
    return firstPageId(initial.pagesBySection[firstSec] || [])
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
  const activePage = findPage(pages, pageId) || findPage(pages, firstPageId(pages)) || null

  const selectSection = useCallback(
    (id) => {
      setSectionId(id)
      setPageId(firstPageId(pagesBySection[id] || []))
    },
    [pagesBySection]
  )

  const selectPage = useCallback((id) => setPageId(id), [])

  const updatePageHtml = useCallback(
    (html) => {
      if (!activePage) return
      setPagesBySection((prev) => ({
        ...prev,
        [sectionId]: mapPages(prev[sectionId] || [], (p) =>
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
        [sectionId]: mapPages(prev[sectionId] || [], (p) =>
          p.id === activePage.id ? { ...p, title } : p
        ),
      }))
    },
    [activePage, sectionId]
  )

  /**
   * Add below the current page (same parent level), or at the top of the section
   * when nothing is selected / the section is empty.
   */
  const addPage = useCallback(() => {
    if (!sectionId) return
    const id = `pg-${Date.now()}`
    const page = { id, title: 'Untitled page', html: '<p></p>' }
    const afterId = activePage?.id || null
    setPagesBySection((prev) => ({
      ...prev,
      [sectionId]: insertAfter(prev[sectionId] || [], afterId, page),
    }))
    setPageId(id)
  }, [sectionId, activePage])

  const deletePage = useCallback(
    (id) => {
      if (!sectionId || !id) return
      const list = pagesBySection[sectionId] || []
      const target = findPage(list, id)
      if (!target) return
      const label = target.title || 'this page'
      const childCount = countDescendants(target)
      const extra =
        childCount > 0
          ? ` This also deletes ${childCount} subpage${childCount === 1 ? '' : 's'}.`
          : ''
      if (!window.confirm(`Delete “${label}”?${extra} This cannot be undone.`)) return

      const nextId = pickPageAfterDelete(list, id)
      const { tree: nextList } = removePage(list, id)
      setPagesBySection((prev) => ({
        ...prev,
        [sectionId]: nextList,
      }))
      // Reselect if we deleted the active page or one of its ancestors.
      if (findPage([target], pageId)) {
        setPageId(nextId)
      }
    },
    [sectionId, pagesBySection, pageId]
  )

  const reorderPages = useCallback(
    (dragIds, parentId, index) => {
      if (!sectionId) return
      setPagesBySection((prev) => ({
        ...prev,
        [sectionId]: movePages(prev[sectionId] || [], dragIds, parentId, index),
      }))
    },
    [sectionId]
  )

  const addSection = useCallback((parentGroupId) => {
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
  }, [])

  const addSectionGroup = useCallback(() => {
    const id = `grp-${Date.now()}`
    setTree((prev) => [...prev, { id, name: 'New section group', kind: 'group', children: [] }])
  }, [])

  const renameTreeNode = useCallback((id, name) => {
    const trimmed = (name || '').trim()
    if (!trimmed) return
    setTree((prev) => renameInTree(prev, id, trimmed))
  }, [])

  const deleteTreeNodes = useCallback(
    (ids) => {
      if (!ids?.length) return
      const idSet = new Set(ids)
      const removedSectionIds = collectSectionIds(tree, idSet)
      const nextTree = removeFromTree(tree, idSet)
      const nextPages = { ...pagesBySection }
      for (const sid of removedSectionIds) delete nextPages[sid]

      const nextSectionId =
        sectionId && !removedSectionIds.has(sectionId)
          ? sectionId
          : findFirstSectionId(nextTree)

      setTree(nextTree)
      setPagesBySection(nextPages)
      setSectionId(nextSectionId)
      setPageId(nextSectionId ? firstPageId(nextPages[nextSectionId] || []) : null)
    },
    [tree, pagesBySection, sectionId]
  )

  return {
    tree,
    setTree,
    sectionId,
    pageId: activePage?.id || null,
    pages: withPreviews(pages),
    activePage,
    selectSection,
    selectPage,
    updatePageHtml,
    renamePage,
    addPage,
    deletePage,
    reorderPages,
    addSection,
    addSectionGroup,
    renameTreeNode,
    deleteTreeNodes,
  }
}

function countDescendants(node) {
  let n = 0
  for (const c of node.children || []) {
    n += 1 + countDescendants(c)
  }
  return n
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

/** Section ids removed when deleting the given node ids (includes nested sections). */
function collectSectionIds(nodes, idSet) {
  const out = new Set()
  function walk(list, ancestorHit) {
    for (const n of list) {
      const hit = ancestorHit || idSet.has(n.id)
      if (n.kind === 'section' && hit) out.add(n.id)
      if (n.children?.length) walk(n.children, hit)
    }
  }
  walk(nodes, false)
  return out
}

function removeFromTree(nodes, idSet) {
  const next = []
  for (const n of nodes) {
    if (idSet.has(n.id)) continue
    if (n.children) next.push({ ...n, children: removeFromTree(n.children, idSet) })
    else next.push(n)
  }
  return next
}
