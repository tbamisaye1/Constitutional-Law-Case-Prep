import { useMemo, useRef } from 'react'
import { Tree } from 'react-arborist'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'

/**
 * Middle OneNote pane: nestable pages with drag reorder / subpages (react-arborist).
 * Drop a page onto another to nest; drag between siblings to reorder.
 */
export function PageList({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onMovePages,
  sectionName,
}) {
  const wrapRef = useRef(null)
  const data = useMemo(() => pages || [], [pages])

  return (
    <div className="onenote-pages">
      <div className="onenote-pane-label mono">{sectionName || 'Pages'}</div>
      <div className="onenote-pages-body" ref={wrapRef}>
        {data.length === 0 ? (
          <p className="onenote-empty">No pages yet. Add one below.</p>
        ) : (
          <Tree
            data={data}
            width="100%"
            height={480}
            indent={14}
            rowHeight={64}
            openByDefault
            selection={activePageId || undefined}
            onMove={({ dragIds, parentId, index }) => {
              onMovePages?.(dragIds, parentId, index)
            }}
            onActivate={(node) => onSelectPage(node.id)}
            disableDrag={false}
          >
            {({ node, style, dragHandle }) => (
              <div
                ref={dragHandle}
                style={style}
                className={node.isSelected ? 'page-row on' : 'page-row'}
                onClick={() => onSelectPage(node.id)}
              >
                {!node.isLeaf ? (
                  <button
                    type="button"
                    className="page-chevron"
                    aria-label={node.isOpen ? 'Collapse subpages' : 'Expand subpages'}
                    onClick={(e) => {
                      e.stopPropagation()
                      node.toggle()
                    }}
                  >
                    {node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <span className="page-chevron-spacer" aria-hidden />
                )}
                <button
                  type="button"
                  className={node.isSelected ? 'page-card on' : 'page-card'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectPage(node.id)
                  }}
                >
                  <strong>{node.data.title}</strong>
                  {node.data.preview ? (
                    <span className="page-preview">{node.data.preview}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="page-delete"
                  aria-label={`Delete ${node.data.title}`}
                  title="Delete page"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeletePage?.(node.id)
                  }}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            )}
          </Tree>
        )}
      </div>
      <button type="button" className="onenote-add page-add" onClick={onAddPage}>
        <Plus size={14} /> Add page
      </button>
    </div>
  )
}
