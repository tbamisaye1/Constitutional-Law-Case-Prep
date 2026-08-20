import { useMemo, useRef } from 'react'
import { Tree } from 'react-arborist'
import { ChevronDown, ChevronRight, Folder, FolderOpen, Plus } from 'lucide-react'

/**
 * Left OneNote pane: section groups + sections.
 * Tree behavior from react-arborist (drag, open/close, keyboard).
 * https://github.com/brimdata/react-arborist
 */
export function SectionTree({
  tree,
  setTree,
  selectedSectionId,
  onSelectSection,
  onAddGroup,
  onAddSection,
  onRenameNode,
}) {
  const wrapRef = useRef(null)
  const data = useMemo(() => tree, [tree])

  return (
    <div className="onenote-tree" ref={wrapRef}>
      <div className="onenote-pane-label mono">Sections</div>
      <div className="onenote-tree-body">
        <Tree
          data={data}
          width="100%"
          height={480}
          indent={18}
          rowHeight={32}
          openByDefault
          selection={selectedSectionId || undefined}
          onRename={({ id, name }) => onRenameNode(id, name)}
          onMove={({ dragIds, parentId, index }) => {
            setTree((prev) => moveNodes(prev, dragIds, parentId, index))
          }}
          disableDrop={({ parentNode }) => parentNode?.data?.kind === 'section'}
          onActivate={(node) => {
            if (node.data.kind === 'section') onSelectSection(node.id)
          }}
        >
          {({ node, style, dragHandle }) => (
            <div
              ref={dragHandle}
              style={style}
              className={
                node.isSelected && node.data.kind === 'section'
                  ? 'tree-row on'
                  : 'tree-row'
              }
              onClick={() => {
                if (node.data.kind === 'group') node.toggle()
                else onSelectSection(node.id)
              }}
            >
              {node.data.kind === 'group' ? (
                <button
                  type="button"
                  className="tree-chevron"
                  aria-label={node.isOpen ? 'Collapse' : 'Expand'}
                  onClick={(e) => {
                    e.stopPropagation()
                    node.toggle()
                  }}
                >
                  {node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span
                  className="section-tab"
                  style={{ background: node.data.color || '#4C5158' }}
                  aria-hidden
                />
              )}
              {node.data.kind === 'group' ? (
                node.isOpen ? (
                  <FolderOpen size={15} strokeWidth={1.75} />
                ) : (
                  <Folder size={15} strokeWidth={1.75} />
                )
              ) : null}
              <span className="tree-name">{node.data.name}</span>
            </div>
          )}
        </Tree>
      </div>
      <div className="onenote-tree-actions">
        <button type="button" className="onenote-add" onClick={onAddGroup}>
          <Plus size={14} /> Add section group
        </button>
        <button
          type="button"
          className="onenote-add"
          onClick={() => onAddSection(findParentGroup(tree, selectedSectionId))}
        >
          <Plus size={14} /> Add section
        </button>
      </div>
    </div>
  )
}

function findParentGroup(tree, sectionId) {
  for (const node of tree) {
    if (node.kind === 'group' && node.children?.some((c) => c.id === sectionId)) {
      return node.id
    }
  }
  // Default: first group
  return tree.find((n) => n.kind === 'group')?.id || null
}

/** Simple move helper for arborist onMove (reorder within / across groups). */
function moveNodes(nodes, dragIds, parentId, index) {
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

  let root = remove(nodes)
  if (!moved) return nodes

  if (!parentId) {
    root = [...root.slice(0, index), moved, ...root.slice(index)]
    return root
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
