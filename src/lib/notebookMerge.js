/**
 * Merge two OneNote-shaped notebook snapshots so a smaller sync payload
 * cannot erase sections that still exist (with pages) on the other side.
 *
 * Shared ids prefer `primary` (usually the newer sync winner). Section ids that
 * exist only on `secondary` are kept when they still carry pages.
 */

function clone(value) {
  return structuredClone(value)
}

function indexTree(nodes, map = new Map()) {
  for (const node of nodes || []) {
    if (!node?.id) continue
    map.set(node.id, node)
    if (node.children?.length) indexTree(node.children, map)
  }
  return map
}

function mergeChildren(primaryChildren, secondaryChildren) {
  const primary = Array.isArray(primaryChildren) ? primaryChildren : []
  const secondary = Array.isArray(secondaryChildren) ? secondaryChildren : []
  const byId = new Map()
  const order = []

  for (const node of primary) {
    if (!node?.id) continue
    byId.set(node.id, clone(node))
    order.push(node.id)
  }

  for (const node of secondary) {
    if (!node?.id) continue
    if (!byId.has(node.id)) {
      byId.set(node.id, clone(node))
      order.push(node.id)
      continue
    }
    const existing = byId.get(node.id)
    if ((existing.kind === 'group' || node.kind === 'group') && (existing.children || node.children)) {
      existing.children = mergeChildren(existing.children || [], node.children || [])
    }
  }

  return order.map((id) => byId.get(id))
}

function sectionHasPages(pagesBySection, sectionId) {
  const pages = pagesBySection?.[sectionId]
  return Array.isArray(pages) && pages.length > 0
}

/**
 * @param {{ tree?: object[], pagesBySection?: Record<string, object[]> }} primary
 * @param {{ tree?: object[], pagesBySection?: Record<string, object[]> }} secondary
 */
export function mergeNotebookSnapshots(primary, secondary) {
  const primaryTree = primary?.tree || []
  const secondaryTree = secondary?.tree || []
  const primaryPages = primary?.pagesBySection || {}
  const secondaryPages = secondary?.pagesBySection || {}

  const mergedTree = mergeChildren(primaryTree, secondaryTree)
  const primaryIds = indexTree(primaryTree)
  const secondaryIds = indexTree(secondaryTree)

  // Drop secondary-only empty stubs that primary intentionally lacks, but keep
  // any secondary-only section that still has pages (the wipe case).
  function pruneEmptySecondaryOnly(nodes) {
    const out = []
    for (const node of nodes || []) {
      const next = { ...node }
      if (next.children) next.children = pruneEmptySecondaryOnly(next.children)
      const onlySecondary = secondaryIds.has(next.id) && !primaryIds.has(next.id)
      if (onlySecondary && next.kind === 'section' && !sectionHasPages(secondaryPages, next.id)) {
        continue
      }
      if (onlySecondary && next.kind === 'group' && !(next.children || []).length) {
        continue
      }
      out.push(next)
    }
    return out
  }

  const tree = pruneEmptySecondaryOnly(mergedTree)
  const keptIds = indexTree(tree)

  const pagesBySection = { ...secondaryPages, ...primaryPages }
  for (const [sectionId, pages] of Object.entries(secondaryPages)) {
    if (!keptIds.has(sectionId)) {
      delete pagesBySection[sectionId]
      continue
    }
    const primaryList = primaryPages[sectionId]
    if ((!primaryList || primaryList.length === 0) && pages?.length) {
      pagesBySection[sectionId] = clone(pages)
    }
  }
  // Drop page bags for sections that are not in the merged tree.
  for (const sectionId of Object.keys(pagesBySection)) {
    if (!keptIds.has(sectionId)) delete pagesBySection[sectionId]
  }

  return { tree, pagesBySection }
}
