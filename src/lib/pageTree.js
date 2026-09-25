/**
 * Helpers for nested notebook pages (OneNote-style page → subpage tree).
 * Flat arrays from older localStorage remain valid root-level lists.
 */

export function findPage(nodes, id) {
  if (!id || !nodes?.length) return null
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const hit = findPage(n.children, id)
      if (hit) return hit
    }
  }
  return null
}

/** Depth-first first page id (used when opening a section). */
export function firstPageId(nodes) {
  if (!nodes?.length) return null
  return nodes[0]?.id || null
}

export function mapPages(nodes, mapper) {
  return (nodes || []).map((n) => {
    const mapped = mapper(n)
    if (n.children?.length) {
      return { ...mapped, children: mapPages(n.children, mapper) }
    }
    return mapped
  })
}

/** Remove a page and its descendants. Returns { tree, removedIds }. */
export function removePage(nodes, id) {
  const removedIds = new Set()
  function collect(n) {
    removedIds.add(n.id)
    for (const c of n.children || []) collect(c)
  }
  function walk(list) {
    const out = []
    for (const n of list) {
      if (n.id === id) {
        collect(n)
        continue
      }
      if (n.children?.length) out.push({ ...n, children: walk(n.children) })
      else out.push(n)
    }
    return out
  }
  return { tree: walk(nodes || []), removedIds }
}

/**
 * Insert newPage as the next sibling after afterId (same parent).
 * If afterId is missing, prepend at the root.
 */
export function insertAfter(nodes, afterId, newPage) {
  const list = nodes || []
  if (!afterId) return [newPage, ...list]

  let inserted = false
  function walk(siblings) {
    const out = []
    for (const n of siblings) {
      const next =
        n.children?.length ? { ...n, children: walk(n.children) } : { ...n }
      out.push(next)
      if (!inserted && n.id === afterId) {
        out.push(newPage)
        inserted = true
      }
    }
    return out
  }

  const result = walk(list)
  return inserted ? result : [newPage, ...list]
}

/**
 * Next page to select after deleting `removedId` from the pre-delete tree.
 * Prefer next sibling, then previous sibling, then parent, then first remaining.
 */
export function pickPageAfterDelete(nodes, removedId) {
  const { tree } = removePage(nodes, removedId)
  if (!tree.length) return null

  function siblingPick(list, id) {
    const idx = list.findIndex((n) => n.id === id)
    if (idx === -1) return null
    if (list[idx + 1]) return list[idx + 1].id
    if (list[idx - 1]) return list[idx - 1].id
    return null
  }

  function walk(list, parentId) {
    const direct = siblingPick(list, removedId)
    if (direct) return direct
    for (const n of list) {
      if (n.children?.length) {
        const hit = walk(n.children, n.id)
        if (hit) return hit
      }
    }
    if (list.some((n) => n.id === removedId) && parentId) return parentId
    return null
  }

  return walk(nodes, null) || firstPageId(tree)
}

/** react-arborist onMove: reorder / nest pages. */
export function movePages(nodes, dragIds, parentId, index) {
  const id = dragIds[0]
  if (!id) return nodes
  let moved = null

  function remove(list) {
    const next = []
    for (const n of list) {
      if (n.id === id) {
        moved = n
        continue
      }
      if (n.children) next.push({ ...n, children: remove(n.children) })
      else next.push(n)
    }
    return next
  }

  let root = remove(nodes || [])
  if (!moved) return nodes

  // Don't drop a page into its own descendant
  if (parentId && findPage(moved.children || [], parentId)) return nodes

  if (!parentId) {
    return [...root.slice(0, index), moved, ...root.slice(index)]
  }

  function insert(list) {
    return list.map((n) => {
      if (n.id === parentId) {
        const kids = [...(n.children || [])]
        kids.splice(index, 0, moved)
        return { ...n, children: kids }
      }
      if (n.children) return { ...n, children: insert(n.children) }
      return n
    })
  }

  return insert(root)
}
