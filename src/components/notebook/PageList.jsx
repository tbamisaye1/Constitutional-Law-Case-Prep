import { useMemo, useRef } from 'react'
import { Tree } from 'react-arborist'
import {
  ArrowUpToLine,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Plus,
  Trash2,
} from 'lucide-react'
import { useElementSize } from '../../hooks/useElementSize'

/**
 * Middle OneNote pane: nestable pages with drag reorder / subpages.
 * Add page / Add subpage stay pinned under the list; only the list scrolls.
 */
export function PageList({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onAddSubpage,
  onPromotePage,
  onDeletePage,
  onMovePages,
  sectionName,
}) {
  const bodyRef = useRef(null)
  const { width, height } = useElementSize(bodyRef)
  const data = useMemo(() => pages || [], [pages])
  const canSubpage = Boolean(activePageId)
  const treeHeight = Math.max(height, 80)
  const treeWidth = Math.max(width, 120)

  return (
    <div className="onenote-pages">
      <div className="onenote-pane-label mono">{sectionName || 'Pages'}</div>
      <div className="onenote-pages-body" ref={bodyRef}>
        {data.length === 0 ? (
          <p className="onenote-empty">No pages yet. Add one below.</p>
        ) : height > 0 ? (
          <Tree
            data={data}
            width={treeWidth}
            height={treeHeight}
            indent={12}
            rowHeight={64}
            openByDefault
            selection={activePageId || undefined}
            className="page-tree-list"
            onMove={({ dragIds, parentId, index }) => {
              onMovePages?.(dragIds, parentId, index)
            }}
            onActivate={(node) => onSelectPage(node.id)}
            disableDrag={false}
          >
            {({ node, style, dragHandle }) => {
              const nested = node.level > 0
              const { paddingLeft: _ignored, ...rowPlace } = style || {}
              return (
                <div
                  ref={dragHandle}
                  style={{
                    ...rowPlace,
                    paddingLeft: nested ? Math.min(node.level, 5) * 10 : 0,
                  }}
                  className={[
                    'page-row',
                    node.isSelected ? 'on' : '',
                    nested ? 'is-nested' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
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
                    <span
                      className={nested ? 'page-nest-mark' : 'page-chevron-spacer'}
                      aria-hidden
                    />
                  )}
                  <button
                    type="button"
                    className={node.isSelected ? 'page-card on' : 'page-card'}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectPage(node.id)
                    }}
                  >
                    <span className="page-card-title">
                      <strong>{node.data.title}</strong>
                      {nested ? <span className="page-nest-badge mono">sub</span> : null}
                    </span>
                    {node.data.preview ? (
                      <span className="page-preview">{node.data.preview}</span>
                    ) : null}
                  </button>
                  <div className="page-row-actions">
                    {nested ? (
                      <button
                        type="button"
                        className="page-promote"
                        aria-label={`Promote ${node.data.title} to a main page`}
                        title="Promote to main page"
                        onClick={(e) => {
                          e.stopPropagation()
                          onPromotePage?.(node.id)
                        }}
                      >
                        <ArrowUpToLine size={14} strokeWidth={1.75} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="page-subpage"
                      aria-label={`Add subpage under ${node.data.title}`}
                      title="Add subpage"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddSubpage?.(node.id)
                      }}
                    >
                      <CornerDownRight size={14} strokeWidth={1.75} />
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
                </div>
              )
            }}
          </Tree>
        ) : null}
      </div>
      <div className="page-add-row">
        <button type="button" className="onenote-add page-add" onClick={onAddPage}>
          <Plus size={14} /> Add page
        </button>
        <button
          type="button"
          className="onenote-add page-add page-add-sub"
          onClick={() => onAddSubpage?.(activePageId)}
          disabled={!canSubpage}
          title={
            canSubpage
              ? 'Add a subpage under the selected page'
              : 'Select a page first, then add a subpage under it'
          }
        >
          <CornerDownRight size={14} /> Add subpage
        </button>
      </div>
    </div>
  )
}
