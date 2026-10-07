import { useEffect, useRef, useState } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'

const WIDTH_KEY = 'case-prep-args-outline-width'
const DEFAULT_W = 260
const MIN_W = 220
const MAX_W = 520

function readWidth() {
  try {
    const n = Number(localStorage.getItem(WIDTH_KEY))
    return Number.isFinite(n) && n >= MIN_W && n <= MAX_W ? n : DEFAULT_W
  } catch {
    return DEFAULT_W
  }
}

const DRAG_TITLE = {
  section: 'Drag to move this section and everything under it',
  prong: 'Drag to move this prong and its sub-points',
  point: 'Drag to move this sub-point',
}

/**
 * Left column of the page view: drafts, then the outline generated from the
 * page's section / prong / point headings. Click jumps, drag reorders (a
 * heading moves with everything under it; only drops that keep the structure
 * intact are offered), hover shows add / delete. Drag the right edge to
 * widen it; double-click the edge to reset.
 */
export function PageOutline({ args, outline, activeId, onJump, onMove, canMove, onAdd, onDelete }) {
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const [width, setWidth] = useState(readWidth)
  const resizing = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(WIDTH_KEY, String(width))
    } catch {
      /* ignore */
    }
  }, [width])

  function startResize(event) {
    event.preventDefault()
    resizing.current = { x: event.clientX, w: width }
    const move = (e) => {
      if (!resizing.current) return
      const next = resizing.current.w + (e.clientX - resizing.current.x)
      setWidth(Math.max(MIN_W, Math.min(MAX_W, next)))
    }
    const up = () => {
      resizing.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function drop(beforeId) {
    const from = dragId
    setDragId(null)
    setOverId(null)
    if (!from || from === beforeId) return
    onMove(from, beforeId)
  }

  return (
    <div className="argpage-outline-wrap" style={{ width }}>
      <div
        className="argpage-outline-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize outline"
        title="Drag to resize · double-click to reset"
        onPointerDown={startResize}
        onDoubleClick={() => setWidth(DEFAULT_W)}
      />
      <aside className="argpage-outline" aria-label="Argument outline">
        <div className="args-drafts">
          <div className="args-drafts-label mono">Drafts</div>
          <div className="args-draft-chips">
            {(args.drafts || []).map((d) => (
              <button
                key={d.id}
                type="button"
                className={d.id === args.activeDraftId ? 'args-draft-chip on' : 'args-draft-chip'}
                onClick={() => args.selectDraft(d.id)}
              >
                {d.name}
              </button>
            ))}
            <button type="button" className="args-draft-chip add" onClick={args.addDraft}>
              + Draft
            </button>
          </div>
          {args.activeDraft ? (
            <div className="args-draft-rename">
              <input
                className="args-input"
                value={args.activeDraft.name}
                aria-label="Draft name"
                onChange={(e) => args.renameDraft(args.activeDraftId, e.target.value)}
                onBlur={() => args.commitDraftName(args.activeDraftId)}
              />
              {args.canRemoveDraft ? (
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label="Delete this draft"
                  title="Delete this draft"
                  onClick={() => {
                    if (window.confirm(`Delete the draft "${args.activeDraft.name}"?`)) {
                      args.removeDraft(args.activeDraftId)
                    }
                  }}
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="argpage-outline-label mono">Outline</div>
        {outline.length === 0 ? (
          <p className="argpage-outline-empty">
            No sections yet. In the page, type <kbd>/section</kbd> then a space, or press{' '}
            <kbd>⌘⌥1</kbd>. Prongs: <kbd>/prong</kbd> (<kbd>⌘⌥2</kbd>). Sub-points:{' '}
            <kbd>/point</kbd> (<kbd>⌘⌥3</kbd>).
          </p>
        ) : null}
        <ol className="argpage-outline-list">
          {outline.map((item) => (
            <li
              key={item.id}
              className={[
                'argpage-outline-item',
                `is-${item.kind}`,
                item.id === activeId ? 'on' : '',
                overId === item.id ? 'is-drop-target' : '',
                dragId === item.id ? 'is-dragging' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onDragOver={(e) => {
                if (!dragId || dragId === item.id) return
                if (canMove && !canMove(dragId, item.id)) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setOverId(item.id)
              }}
              onDragLeave={() => setOverId((cur) => (cur === item.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault()
                drop(item.id)
              }}
            >
              <span
                className="argpage-grip"
                draggable
                title={DRAG_TITLE[item.kind]}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', item.id)
                  setDragId(item.id)
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setOverId(null)
                }}
              >
                <GripVertical size={13} aria-hidden />
              </span>
              <button
                type="button"
                className="argpage-outline-jump"
                title={item.title || undefined}
                onClick={() => onJump(item.id)}
              >
                <span className="mono argpage-outline-num">{item.number}</span>
                <span className={item.title ? 'argpage-outline-title' : 'argpage-outline-title is-empty'}>
                  {item.title || 'Untitled'}
                </span>
              </button>
              <span className="argpage-outline-actions">
                {item.kind === 'section' ? (
                  <button
                    type="button"
                    className="icon-btn soft"
                    title="Add a prong at the end of this section"
                    aria-label="Add prong"
                    onClick={() => onAdd('prong', item.id)}
                  >
                    <Plus size={13} />
                  </button>
                ) : null}
                {item.kind === 'prong' ? (
                  <button
                    type="button"
                    className="icon-btn soft"
                    title="Add a sub-point at the end of this prong"
                    aria-label="Add sub-point"
                    onClick={() => onAdd('point', item.id)}
                  >
                    <Plus size={13} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="icon-btn danger"
                  title={{ section: 'Delete section', prong: 'Delete prong', point: 'Delete sub-point' }[item.kind]}
                  aria-label="Delete"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </li>
          ))}
          {dragId ? (
            <li
              className={overId === '__end' ? 'argpage-outline-end is-drop-target' : 'argpage-outline-end'}
              onDragOver={(e) => {
                if (canMove && !canMove(dragId, null)) return
                e.preventDefault()
                setOverId('__end')
              }}
              onDrop={(e) => {
                e.preventDefault()
                drop(null)
              }}
            >
              Move to the end
            </li>
          ) : null}
        </ol>
        <button type="button" className="args-add-prong" onClick={() => onAdd('section')}>
          <Plus size={14} strokeWidth={1.75} /> Add section
        </button>
      </aside>
    </div>
  )
}
