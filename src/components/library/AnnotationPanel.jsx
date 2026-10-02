import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  LocateFixed,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  PinOff,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import {
  HIGHLIGHT_COLORS,
  highlightColorMeta,
  normalizeHighlightColor,
} from '../../lib/highlightColors'

const PAGE_SIZE = 24

/** Top-most rect on the page (fractional 0–1). Missing rects sort after positioned highlights. */
function highlightTop(annotation) {
  const rects = annotation?.rects
  if (!Array.isArray(rects) || !rects.length) return Number.POSITIVE_INFINITY
  return Math.min(...rects.map((r) => (typeof r.top === 'number' ? r.top : 0)))
}

function highlightLeft(annotation) {
  const rects = annotation?.rects
  if (!Array.isArray(rects) || !rects.length) return Number.POSITIVE_INFINITY
  return Math.min(...rects.map((r) => (typeof r.left === 'number' ? r.left : 0)))
}

/**
 * Reading order on a page: pinned first, then page number, then highlight
 * position top→bottom / left→right. Page notes without rects follow highlights
 * on that page, then fall back to most recently edited.
 */
export function compareAnnotations(a, b) {
  const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
  if (pinDiff) return pinDiff

  if (a.page !== b.page) return a.page - b.page

  const aHasRect = Array.isArray(a.rects) && a.rects.length > 0
  const bHasRect = Array.isArray(b.rects) && b.rects.length > 0
  if (aHasRect && bHasRect) {
    const topDiff = highlightTop(a) - highlightTop(b)
    if (Math.abs(topDiff) > 0.002) return topDiff
    const leftDiff = highlightLeft(a) - highlightLeft(b)
    if (Math.abs(leftDiff) > 0.002) return leftDiff
  } else if (aHasRect !== bHasRect) {
    return aHasRect ? -1 : 1
  }

  return (b.savedAt || 0) - (a.savedAt || 0)
}

function previewText(text) {
  const value = (text || '').replace(/\s+/g, ' ').trim()
  if (!value) return ''
  return value.length > 140 ? `${value.slice(0, 140)}…` : value
}

function resizeTextarea(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.max(el.scrollHeight, 88)}px`
}

/**
 * One annotation card: compact preview by default, full editor when expanded.
 */
function AnnotationItem({
  annotation: a,
  currentPage,
  expanded,
  focused,
  onToggleExpand,
  onTogglePin,
  onUpdate,
  onRemove,
  onJump,
  onFlush,
}) {
  const textRef = useRef(null)
  const itemRef = useRef(null)
  const text = a.text || ''
  const preview = previewText(text)
  const color = highlightColorMeta(a.color)
  const isHighlight = a.kind === 'highlight' || Boolean(a.quote)

  useEffect(() => {
    if (expanded) resizeTextarea(textRef.current)
  }, [expanded, text])

  useEffect(() => {
    if (!focused || !itemRef.current) return
    itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focused])

  return (
    <li
      ref={itemRef}
      data-anno-id={a.id}
      className={[
        'anno-item',
        a.page === currentPage ? 'on' : '',
        a.pinned ? 'pinned' : '',
        focused ? 'focused' : '',
        expanded ? 'expanded' : 'compact',
      ]
        .filter(Boolean)
        .join(' ')}
      style={isHighlight ? { borderLeftColor: color.solid, borderLeftWidth: 3 } : undefined}
    >
      <div className="anno-side">
        <button
          type="button"
          className="anno-jump"
          title="Go to this place in the PDF"
          onClick={() => onJump?.(a)}
        >
          <span className="mono">p. {a.page}</span>
        </button>
        <button
          type="button"
          className="icon-btn soft"
          aria-label="Go to this highlight in the PDF"
          title="Go to highlight"
          onClick={() => onJump?.(a)}
        >
          <LocateFixed size={14} />
        </button>
        <button
          type="button"
          className={a.pinned ? 'icon-btn soft pinned-btn on' : 'icon-btn soft pinned-btn'}
          aria-label={a.pinned ? 'Unpin note' : 'Pin note to top'}
          aria-pressed={Boolean(a.pinned)}
          onClick={() => onTogglePin(a.id, !a.pinned)}
        >
          {a.pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
        <button
          type="button"
          className="icon-btn soft"
          aria-label="Delete annotation"
          onClick={() => onRemove(a.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="anno-body">
        {a.quote ? (
          <blockquote
            className="anno-quote anno-quote-jump"
            style={{ borderLeftColor: color.solid, background: color.fill }}
            role="button"
            tabIndex={0}
            title="Go to this highlight in the PDF"
            onClick={() => onJump?.(a)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onJump?.(a)
              }
            }}
          >
            “{expanded || a.quote.length <= 160 ? a.quote : `${a.quote.slice(0, 160)}…`}”
          </blockquote>
        ) : null}

        {expanded ? (
          <textarea
            ref={textRef}
            className="anno-text anno-text-expanded"
            rows={Math.min(14, Math.max(4, text.split('\n').length + 1))}
            value={text}
            onChange={(e) => onUpdate(a.id, { text: e.target.value })}
            onBlur={() => onFlush?.()}
            placeholder={
              a.quote
                ? 'Your note on this highlight…'
                : 'Quote scrap, rule left behind, how you will use it…'
            }
          />
        ) : (
          <button
            type="button"
            className="anno-preview"
            onClick={() => onToggleExpand(a.id)}
          >
            {preview || (
              <span className="anno-preview-empty">
                {a.quote ? 'Add a note on this highlight…' : 'Empty page note. Click to edit.'}
              </span>
            )}
          </button>
        )}

        <div className="anno-card-foot">
          <span className="anno-kind mono">
            {a.pinned ? 'pinned · ' : ''}
            {isHighlight ? 'highlight' : 'page note'}
          </span>
          <button
            type="button"
            className="anno-expand-btn"
            onClick={() => onToggleExpand(a.id)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                <ChevronUp size={14} /> Collapse
              </>
            ) : (
              <>
                <ChevronDown size={14} /> {preview ? 'Open note' : 'Edit'}
              </>
            )}
          </button>
        </div>

        {isHighlight ? (
          <div className="hl-color-row" role="group" aria-label="Highlight color">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={
                  normalizeHighlightColor(a.color) === c.id ? 'hl-swatch on' : 'hl-swatch'
                }
                style={{ background: c.solid }}
                aria-label={c.label}
                aria-pressed={normalizeHighlightColor(a.color) === c.id}
                onClick={() => {
                  onUpdate(a.id, { color: c.id })
                  onFlush?.()
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </li>
  )
}

function TakeawaysReview({
  title,
  annotations,
  onClose,
  onJump,
  onExportNotes,
  exportBusy,
  exportMessage,
}) {
  const sorted = useMemo(() => [...annotations].sort(compareAnnotations), [annotations])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  let lastPage = null

  return (
    <div className="takeaways-overlay" role="dialog" aria-modal="true" aria-label="Article takeaways">
      <button type="button" className="takeaways-backdrop" aria-label="Close takeaways" onClick={onClose} />
      <div className="takeaways-sheet">
        <header className="takeaways-head">
          <div>
            <p className="mono takeaways-kicker">Takeaways</p>
            <h2>{title || 'This article'}</h2>
            <p className="takeaways-sub mono">
              {sorted.length} note{sorted.length === 1 ? '' : 's'} · Esc to close
            </p>
          </div>
          <div className="takeaways-head-actions">
            {onExportNotes ? (
              <button
                type="button"
                className="btn-ink"
                disabled={exportBusy || !sorted.length}
                onClick={onExportNotes}
              >
                <NotebookPen size={14} />
                {exportBusy ? 'Sending…' : 'Send to Notes'}
              </button>
            ) : null}
            <button type="button" className="btn-soft" onClick={onClose}>
              <X size={14} /> Close
            </button>
          </div>
        </header>

        {exportMessage ? <p className="takeaways-flash mono">{exportMessage}</p> : null}

        <div className="takeaways-body">
          {sorted.length === 0 ? (
            <p className="takeaways-empty">No highlights or page notes yet on this article.</p>
          ) : (
            sorted.map((a) => {
              const pageNum = Number(a.page) || 1
              const showPage = pageNum !== lastPage
              lastPage = pageNum
              const color = highlightColorMeta(a.color)
              const isHighlight = a.kind === 'highlight' || Boolean(a.quote)
              return (
                <article key={a.id} className="takeaways-card">
                  {showPage ? <h3 className="takeaways-page mono">Page {pageNum}</h3> : null}
                  <div
                    className="takeaways-card-inner"
                    style={isHighlight ? { borderLeftColor: color.solid } : undefined}
                  >
                    <div className="takeaways-card-meta">
                      <span className="anno-kind mono">
                        {a.pinned ? 'pinned · ' : ''}
                        {isHighlight ? 'highlight' : 'page note'}
                      </span>
                      <button type="button" className="anno-expand-btn" onClick={() => onJump?.(a)}>
                        <LocateFixed size={14} /> Go to PDF
                      </button>
                    </div>
                    {a.quote ? (
                      <blockquote
                        className="anno-quote"
                        style={{ borderLeftColor: color.solid, background: color.fill }}
                      >
                        “{a.quote}”
                      </blockquote>
                    ) : null}
                    {a.text?.trim() ? (
                      <p className="takeaways-note">{a.text}</p>
                    ) : (
                      <p className="takeaways-note empty">No note text yet.</p>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Annotations beside the PDF:
 * - default: all notes on this case/file
 * - toggle: only this PDF page
 * - compact previews so more notes fit; expand to edit
 * - reading order by highlight position; pinned stay on top
 * - focusAnnotationId scrolls the matching card into view
 * - Review takeaways opens a roomy overlay; Send to Notes writes a notebook page
 */
export function AnnotationPanel({
  caseId,
  page,
  annotations,
  onAdd,
  onUpdate,
  onRemove,
  onJump,
  onFlush,
  focusAnnotationId = null,
  articleTitle = '',
  onExportToNotes = null,
  collapsed = false,
  onToggleCollapsed = null,
}) {
  const [scope, setScope] = useState('all') // all | page
  const [listPage, setListPage] = useState(1)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [expandAll, setExpandAll] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const listRef = useRef(null)

  const forCase = useMemo(
    () => annotations.filter((a) => a.caseId === caseId).sort(compareAnnotations),
    [annotations, caseId]
  )

  const filtered = useMemo(() => {
    if (scope === 'page') return forCase.filter((a) => a.page === page)
    return forCase
  }, [forCase, scope, page])

  const totalListPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safeListPage = Math.min(listPage, totalListPages)
  const slice = filtered.slice((safeListPage - 1) * PAGE_SIZE, safeListPage * PAGE_SIZE)
  const onThisPage = forCase.filter((a) => a.page === page)

  useEffect(() => {
    setListPage(1)
  }, [scope, caseId, page, filtered.length])

  useEffect(() => {
    if (!focusAnnotationId) return
    const index = filtered.findIndex((a) => a.id === focusAnnotationId)
    if (index >= 0) {
      setListPage(Math.floor(index / PAGE_SIZE) + 1)
    }
    setExpandAll(false)
    setExpandedIds((prev) => new Set(prev).add(focusAnnotationId))
  }, [focusAnnotationId, filtered])

  function isExpanded(id) {
    return expandAll || expandedIds.has(id)
  }

  function toggleExpand(id) {
    setExpandAll(false)
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleExpandAll() {
    if (expandAll) {
      setExpandAll(false)
      setExpandedIds(new Set())
      return
    }
    setExpandAll(true)
    setExpandedIds(new Set(filtered.map((a) => a.id)))
  }

  function togglePin(id, pinned) {
    onUpdate(id, { pinned: Boolean(pinned) })
    onFlush?.()
  }

  async function handleExport() {
    if (!onExportToNotes || exportBusy) return
    setExportBusy(true)
    setExportMessage('')
    try {
      const result = await onExportToNotes(forCase)
      if (result?.notesPath) {
        setExportMessage('Saved under Notes → Articles. Opening…')
      } else {
        setExportMessage('Saved under Notes → Articles.')
      }
    } catch (error) {
      setExportMessage(error?.message || 'Could not send to Notes.')
    } finally {
      setExportBusy(false)
    }
  }

  if (collapsed) {
    return (
      <div className="anno-panel is-collapsed">
        <button
          type="button"
          className="anno-rail-toggle"
          onClick={() => onToggleCollapsed?.(false)}
          title="Show annotations"
        >
          <PanelRightOpen size={16} />
          <span className="mono">Notes ({forCase.length})</span>
        </button>
      </div>
    )
  }

  return (
    <div className="anno-panel">
      <div className="anno-head">
        <h3>Annotations</h3>
        <div className="anno-head-actions">
          {onToggleCollapsed ? (
            <button
              type="button"
              className="icon-btn soft"
              aria-label="Hide annotations panel"
              title="Hide panel (more room for the PDF)"
              onClick={() => onToggleCollapsed(true)}
            >
              <PanelRightClose size={15} />
            </button>
          ) : null}
          <button type="button" className="btn-ink" onClick={() => onAdd({ page, text: '' })}>
            <Plus size={14} /> Page {page}
          </button>
        </div>
      </div>

      <div className="anno-tools">
        <button
          type="button"
          className="btn-soft anno-tool-btn"
          onClick={() => {
            setExportMessage('')
            setReviewOpen(true)
          }}
        >
          Review takeaways ({forCase.length})
        </button>
        {onExportToNotes ? (
          <button
            type="button"
            className="btn-soft anno-tool-btn"
            disabled={exportBusy || !forCase.length}
            onClick={handleExport}
            title="Create or update a Notes page for this article"
          >
            <NotebookPen size={14} />
            {exportBusy ? 'Sending…' : 'Send to Notes'}
          </button>
        ) : null}
      </div>
      {exportMessage && !reviewOpen ? <p className="anno-export-flash mono">{exportMessage}</p> : null}

      <div className="anno-scope" role="tablist" aria-label="Note scope">
        <button
          type="button"
          className={scope === 'all' ? 'on' : ''}
          onClick={() => setScope('all')}
        >
          All notes ({forCase.length})
        </button>
        <button
          type="button"
          className={scope === 'page' ? 'on' : ''}
          onClick={() => setScope('page')}
        >
          This page ({onThisPage.length})
        </button>
      </div>

      <div className="anno-bulk">
        <button type="button" className="anno-expand-btn" onClick={toggleExpandAll}>
          {expandAll ? (
            <>
              <ChevronsDownUp size={14} /> Collapse all
            </>
          ) : (
            <>
              <ChevronsUpDown size={14} /> Expand all
            </>
          )}
        </button>
      </div>

      <p className="anno-hint mono">
        Click a note or locate to jump in the PDF. Review takeaways for a wider scan. Send to Notes
        keeps one page per article under Notes → Articles.
      </p>

      <ul className="anno-list" ref={listRef}>
        {slice.length === 0 ? (
          <li className="anno-empty">
            {scope === 'page'
              ? 'No notes on this page yet.'
              : 'No notes yet. Add a page note or highlight text in the PDF.'}
          </li>
        ) : (
          slice.map((a) => (
            <AnnotationItem
              key={a.id}
              annotation={a}
              currentPage={page}
              expanded={isExpanded(a.id)}
              focused={a.id === focusAnnotationId}
              onToggleExpand={toggleExpand}
              onTogglePin={togglePin}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onJump={onJump}
              onFlush={onFlush}
            />
          ))
        )}
      </ul>

      {filtered.length > PAGE_SIZE ? (
        <div className="anno-pager">
          <button
            type="button"
            className="btn-soft"
            disabled={safeListPage <= 1}
            onClick={() => setListPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="mono">
            {safeListPage} / {totalListPages}
          </span>
          <button
            type="button"
            className="btn-soft"
            disabled={safeListPage >= totalListPages}
            onClick={() => setListPage((p) => Math.min(totalListPages, p + 1))}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      ) : null}

      {reviewOpen ? (
        <TakeawaysReview
          title={articleTitle}
          annotations={forCase}
          onClose={() => setReviewOpen(false)}
          onJump={(anno) => {
            setReviewOpen(false)
            onJump?.(anno)
          }}
          onExportNotes={onExportToNotes ? handleExport : null}
          exportBusy={exportBusy}
          exportMessage={exportMessage}
        />
      ) : null}
    </div>
  )
}
