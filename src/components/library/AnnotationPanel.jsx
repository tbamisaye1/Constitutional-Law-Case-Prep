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
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  HIGHLIGHT_COLORS,
  highlightColorMeta,
  normalizeHighlightColor,
} from '../../lib/highlightColors'
import {
  addTopic,
  annotationHasTopic,
  normalizeTopicLabel,
  normalizeTopicsList,
  removeTopic,
  topicsInList,
} from '../../lib/annotationTopics'

const PAGE_SIZE = 24

/** Article-level note: not tied to a PDF page or highlight. */
export function isGeneralAnnotation(annotation) {
  return annotation?.kind === 'general' || Number(annotation?.page) === 0
}

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
 * Reading order: pinned first, then general (article-level) notes, then by
 * page, then highlight position top→bottom / left→right. Page notes without
 * rects follow highlights on that page, then fall back to most recently edited.
 */
export function compareAnnotations(a, b) {
  const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
  if (pinDiff) return pinDiff

  const aGeneral = isGeneralAnnotation(a)
  const bGeneral = isGeneralAnnotation(b)
  if (aGeneral !== bGeneral) return aGeneral ? -1 : 1
  if (aGeneral && bGeneral) return (b.savedAt || 0) - (a.savedAt || 0)

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

/**
 * Multi-select topic chips for one annotation.
 *
 * Reuse: unused labels already on this article show as one-click picks.
 * New: type in the field and press Enter / Add. Stays open so you can stack
 * several topics without reopening the picker each time.
 */
function TopicEditor({ topics, vocabulary, onChange, onFlush }) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const current = normalizeTopicsList(topics, vocabulary)
  const q = normalizeTopicLabel(draft).toLowerCase()
  const available = (vocabulary || []).filter((label) => !annotationHasTopic(current, label))
  const filteredAvailable = q
    ? available.filter((label) => label.toLowerCase().includes(q))
    : available
  const canCreate =
    Boolean(q) && !annotationHasTopic(current, draft) && !available.some((l) => l.toLowerCase() === q)

  function commit(raw, { keepOpen = true } = {}) {
    const next = addTopic(current, raw, vocabulary)
    if (next.length === current.length) {
      setDraft('')
      return
    }
    onChange(next)
    onFlush?.()
    setDraft('')
    if (!keepOpen) setOpen(false)
    else requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="anno-topics">
      <div className="anno-topic-chips" aria-label="Topics on this note">
        {current.map((label) => (
          <span key={label.toLowerCase()} className="anno-topic-chip on">
            {label}
            <button
              type="button"
              className="anno-topic-remove"
              aria-label={`Remove topic ${label}`}
              onClick={() => {
                onChange(removeTopic(current, label))
                onFlush?.()
              }}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {!open ? (
          <button
            type="button"
            className="anno-topic-add"
            onClick={() => {
              setOpen(true)
              requestAnimationFrame(() => inputRef.current?.focus())
            }}
          >
            <Plus size={12} /> Topic
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="anno-topic-compose">
          {available.length ? (
            <div className="anno-topic-pick-row" role="listbox" aria-label="Reuse a topic from this article">
              <span className="mono anno-topic-pick-label">Reuse</span>
              {filteredAvailable.length ? (
                filteredAvailable.map((label) => (
                  <button
                    key={label.toLowerCase()}
                    type="button"
                    className="anno-topic-chip pick"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(label)}
                  >
                    {label}
                  </button>
                ))
              ) : (
                <span className="anno-topic-pick-empty mono">No match — type a new topic</span>
              )}
            </div>
          ) : (
            <p className="anno-topic-pick-empty mono">No topics on this article yet. Type one below.</p>
          )}
          <div className="anno-topic-input-row">
            <input
              ref={inputRef}
              className="anno-topic-input"
              value={draft}
              maxLength={40}
              placeholder="New topic for this article…"
              aria-label="New topic"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (draft.trim()) commit(draft)
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setDraft('')
                  setOpen(false)
                }
              }}
            />
            <button
              type="button"
              className="btn-soft anno-topic-create"
              disabled={!canCreate}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(draft)}
            >
              Add
            </button>
            <button
              type="button"
              className="btn-soft"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setDraft('')
                setOpen(false)
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
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
  vocabulary,
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
  const isGeneral = isGeneralAnnotation(a)
  const isHighlight = !isGeneral && (a.kind === 'highlight' || Boolean(a.quote))
  const onCurrentPage = !isGeneral && a.page === currentPage

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
        onCurrentPage ? 'on' : '',
        isGeneral ? 'general' : '',
        a.pinned ? 'pinned' : '',
        focused ? 'focused' : '',
        expanded ? 'expanded' : 'compact',
      ]
        .filter(Boolean)
        .join(' ')}
      style={isHighlight ? { borderLeftColor: color.solid, borderLeftWidth: 3 } : undefined}
    >
      <div className="anno-side">
        {isGeneral ? (
          <span className="anno-jump mono anno-general-label" title="Article-level note">
            All
          </span>
        ) : (
          <button
            type="button"
            className="anno-jump"
            title="Go to this place in the PDF"
            onClick={() => onJump?.(a)}
          >
            <span className="mono">p. {a.page}</span>
          </button>
        )}
        {!isGeneral ? (
          <button
            type="button"
            className="icon-btn soft"
            aria-label="Go to this highlight in the PDF"
            title="Go to highlight"
            onClick={() => onJump?.(a)}
          >
            <LocateFixed size={14} />
          </button>
        ) : null}
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
              isGeneral
                ? 'Overall takeaways, themes, how this article fits the case…'
                : a.quote
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
                {isGeneral
                  ? 'Empty general note. Click to edit.'
                  : a.quote
                    ? 'Add a note on this highlight…'
                    : 'Empty page note. Click to edit.'}
              </span>
            )}
          </button>
        )}

        <div className="anno-card-foot">
          <span className="anno-kind mono">
            {a.pinned ? 'pinned · ' : ''}
            {isGeneral ? 'general' : isHighlight ? 'highlight' : 'page note'}
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

        <TopicEditor
          topics={a.topics}
          vocabulary={vocabulary}
          onChange={(topics) => onUpdate(a.id, { topics })}
          onFlush={onFlush}
        />
      </div>
    </li>
  )
}

function TakeawaysCard({ annotation: a, vocabulary, onJump, onUpdate, onFlush, onTogglePin }) {
  const textRef = useRef(null)
  const text = a.text || ''
  const color = highlightColorMeta(a.color)
  const isGeneral = isGeneralAnnotation(a)
  const isHighlight = !isGeneral && (a.kind === 'highlight' || Boolean(a.quote))

  useEffect(() => {
    resizeTextarea(textRef.current)
  }, [text])

  return (
    <article
      className={isGeneral ? 'takeaways-card-inner is-general' : 'takeaways-card-inner'}
      style={isHighlight ? { borderLeftColor: color.solid } : undefined}
      data-anno-id={a.id}
    >
      <div className="takeaways-card-meta">
        <span className="anno-kind mono">
          {a.pinned ? 'pinned · ' : ''}
          {isGeneral ? 'general note' : isHighlight ? 'highlight' : 'page note'}
          {!isGeneral ? ` · p. ${a.page}` : ''}
        </span>
        <div className="takeaways-card-actions">
          <button
            type="button"
            className={a.pinned ? 'icon-btn soft pinned-btn on' : 'icon-btn soft pinned-btn'}
            aria-label={a.pinned ? 'Unpin note' : 'Pin note'}
            onClick={() => onTogglePin?.(a.id, !a.pinned)}
          >
            {a.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          {!isGeneral ? (
            <button type="button" className="anno-expand-btn" onClick={() => onJump?.(a)}>
              <LocateFixed size={14} /> Go to PDF
            </button>
          ) : null}
        </div>
      </div>

      {a.quote ? (
        <blockquote
          className="anno-quote takeaways-quote"
          style={{ borderLeftColor: color.solid, background: color.fill }}
        >
          “{a.quote}”
        </blockquote>
      ) : null}

      <label className="takeaways-edit-label mono" htmlFor={`takeaway-text-${a.id}`}>
        Your note
      </label>
      <textarea
        id={`takeaway-text-${a.id}`}
        ref={textRef}
        className="takeaways-note-edit"
        rows={Math.min(12, Math.max(isGeneral ? 5 : 3, text.split('\n').length + 1))}
        value={text}
        onChange={(e) => {
          onUpdate?.(a.id, { text: e.target.value })
          resizeTextarea(e.target)
        }}
        onBlur={() => onFlush?.()}
        placeholder={
          isGeneral
            ? 'Overall takeaways, themes, how this article fits the case…'
            : a.quote
              ? 'What this highlight means / how you will use it…'
              : 'Reading goals, rules, takeaways…'
        }
      />

      {isHighlight ? (
        <div className="hl-color-row takeaways-colors" role="group" aria-label="Highlight color">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={normalizeHighlightColor(a.color) === c.id ? 'hl-swatch on' : 'hl-swatch'}
              style={{ background: c.solid }}
              aria-label={c.label}
              aria-pressed={normalizeHighlightColor(a.color) === c.id}
              onClick={() => {
                onUpdate?.(a.id, { color: c.id })
                onFlush?.()
              }}
            />
          ))}
        </div>
      ) : null}

      <TopicEditor
        topics={a.topics}
        vocabulary={vocabulary}
        onChange={(topics) => onUpdate?.(a.id, { topics })}
        onFlush={onFlush}
      />
    </article>
  )
}

/**
 * Full-screen takeaways workspace: page index, search, and inline editing.
 * Built for scanning many notes without squinting in the side rail.
 */
function TakeawaysReview({
  title,
  annotations,
  onClose,
  onJump,
  onUpdate,
  onFlush,
  onTogglePin,
  onExportNotes,
  exportBusy,
  exportMessage,
}) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all') // all | general | highlight | page
  const [activePage, setActivePage] = useState(null) // null | 'general' | number
  const bodyRef = useRef(null)
  const searchRef = useRef(null)

  const sorted = useMemo(() => [...annotations].sort(compareAnnotations), [annotations])
  const vocabulary = useMemo(() => topicsInList(sorted), [sorted])

  const generalNotes = useMemo(
    () => sorted.filter((a) => isGeneralAnnotation(a)),
    [sorted]
  )

  const pageIndex = useMemo(() => {
    const map = new Map()
    for (const a of sorted) {
      if (isGeneralAnnotation(a)) continue
      const p = Number(a.page) || 1
      map.set(p, (map.get(p) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [sorted])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sorted.filter((a) => {
      const isGeneral = isGeneralAnnotation(a)
      const isHighlight = !isGeneral && (a.kind === 'highlight' || Boolean(a.quote))
      if (kind === 'general' && !isGeneral) return false
      if (kind === 'highlight' && !isHighlight) return false
      if (kind === 'page' && (isGeneral || isHighlight)) return false
      if (activePage === 'general' && !isGeneral) return false
      if (typeof activePage === 'number' && (isGeneral || Number(a.page) !== activePage)) {
        return false
      }
      if (!q) return true
      const topicHay = normalizeTopicsList(a.topics).join(' ').toLowerCase()
      const hay = `${a.quote || ''} ${a.text || ''} ${topicHay}`.toLowerCase()
      return hay.includes(q)
    })
  }, [sorted, query, kind, activePage])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  function jumpToPageHeader(pageNum) {
    setActivePage(pageNum)
    requestAnimationFrame(() => {
      const el = bodyRef.current?.querySelector(`[data-page-header="${pageNum}"]`)
      el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

  function jumpToGeneral() {
    setActivePage('general')
    requestAnimationFrame(() => {
      const el = bodyRef.current?.querySelector('[data-page-header="general"]')
      el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

  let lastSection = null

  return (
    <div className="takeaways-overlay" role="dialog" aria-modal="true" aria-label="Article takeaways">
      <button type="button" className="takeaways-backdrop" aria-label="Close takeaways" onClick={onClose} />
      <div className="takeaways-sheet">
        <header className="takeaways-head">
          <div className="takeaways-head-copy">
            <p className="mono takeaways-kicker">Takeaways</p>
            <h2>{title || 'This article'}</h2>
            <p className="takeaways-sub mono">
              {filtered.length}
              {filtered.length !== sorted.length ? ` of ${sorted.length}` : ''} note
              {filtered.length === 1 ? '' : 's'}
              {' · '}edit here · ⌘/Ctrl+F search · Esc close
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

        <div className="takeaways-toolbar">
          <label className="takeaways-search">
            <Search size={15} aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search quotes and notes…"
              aria-label="Search takeaways"
            />
          </label>
          <div className="takeaways-kind" role="group" aria-label="Filter by kind">
            {[
              { id: 'all', label: 'All' },
              { id: 'general', label: 'General' },
              { id: 'highlight', label: 'Highlights' },
              { id: 'page', label: 'Page notes' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={kind === opt.id ? 'on' : ''}
                onClick={() => setKind(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {activePage != null ? (
            <button type="button" className="btn-soft" onClick={() => setActivePage(null)}>
              Show all
            </button>
          ) : null}
        </div>

        <div className="takeaways-layout">
          <aside className="takeaways-nav" aria-label="Pages with notes">
            <p className="mono takeaways-nav-label">Jump</p>
            <button
              type="button"
              className={activePage == null ? 'takeaways-nav-item on' : 'takeaways-nav-item'}
              onClick={() => {
                setActivePage(null)
                bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              All <span className="mono">{sorted.length}</span>
            </button>
            <button
              type="button"
              className={
                activePage === 'general' ? 'takeaways-nav-item on' : 'takeaways-nav-item'
              }
              onClick={jumpToGeneral}
            >
              General <span className="mono">{generalNotes.length}</span>
            </button>
            {pageIndex.map(([pageNum, count]) => (
              <button
                key={pageNum}
                type="button"
                className={
                  activePage === pageNum ? 'takeaways-nav-item on' : 'takeaways-nav-item'
                }
                onClick={() => jumpToPageHeader(pageNum)}
              >
                p. {pageNum} <span className="mono">{count}</span>
              </button>
            ))}
          </aside>

          <div className="takeaways-body" ref={bodyRef}>
            {filtered.length === 0 ? (
              <p className="takeaways-empty">
                {sorted.length === 0
                  ? 'No notes yet. Add a general note, a page note, or highlight text in the PDF.'
                  : 'Nothing matches that search or filter.'}
              </p>
            ) : (
              filtered.map((a) => {
                const isGeneral = isGeneralAnnotation(a)
                const sectionKey = isGeneral ? 'general' : String(Number(a.page) || 1)
                const showSection = sectionKey !== lastSection
                lastSection = sectionKey
                return (
                  <div key={a.id} className="takeaways-card">
                    {showSection ? (
                      <h3
                        className="takeaways-page mono"
                        data-page-header={sectionKey}
                        id={`takeaways-page-${sectionKey}`}
                      >
                        {isGeneral ? 'General notes' : `Page ${Number(a.page) || 1}`}
                      </h3>
                    ) : null}
                    <TakeawaysCard
                      annotation={a}
                      vocabulary={vocabulary}
                      onJump={onJump}
                      onUpdate={onUpdate}
                      onFlush={onFlush}
                      onTogglePin={onTogglePin}
                    />
                  </div>
                )
              })
            )}
          </div>
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
  const [scope, setScope] = useState('all') // all | page | general
  const [topicFilters, setTopicFilters] = useState([]) // selected topic labels (OR)
  const [taggedOnly, setTaggedOnly] = useState(false)
  const [untaggedOnly, setUntaggedOnly] = useState(false)
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

  const vocabulary = useMemo(() => topicsInList(forCase), [forCase])

  const generalNotes = useMemo(
    () => forCase.filter((a) => isGeneralAnnotation(a)),
    [forCase]
  )

  const topicCounts = useMemo(() => {
    const map = new Map()
    for (const label of vocabulary) map.set(label, 0)
    let untagged = 0
    let tagged = 0
    for (const a of forCase) {
      const list = normalizeTopicsList(a.topics, vocabulary)
      if (!list.length) {
        untagged += 1
        continue
      }
      tagged += 1
      for (const label of list) {
        map.set(label, (map.get(label) || 0) + 1)
      }
    }
    return { byTopic: map, untagged, tagged }
  }, [forCase, vocabulary])

  const filtered = useMemo(() => {
    let rows = forCase
    if (scope === 'general') rows = generalNotes
    else if (scope === 'page') {
      rows = forCase.filter((a) => !isGeneralAnnotation(a) && a.page === page)
    }
    if (untaggedOnly) {
      rows = rows.filter((a) => normalizeTopicsList(a.topics).length === 0)
    } else if (taggedOnly) {
      rows = rows.filter((a) => normalizeTopicsList(a.topics).length > 0)
    } else if (topicFilters.length) {
      rows = rows.filter((a) =>
        topicFilters.some((label) => annotationHasTopic(a.topics, label))
      )
    }
    return rows
  }, [forCase, generalNotes, scope, page, topicFilters, taggedOnly, untaggedOnly])

  const totalListPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safeListPage = Math.min(listPage, totalListPages)
  const slice = filtered.slice((safeListPage - 1) * PAGE_SIZE, safeListPage * PAGE_SIZE)
  const onThisPage = forCase.filter((a) => !isGeneralAnnotation(a) && a.page === page)

  useEffect(() => {
    setListPage(1)
  }, [scope, caseId, page, filtered.length, topicFilters, taggedOnly, untaggedOnly])

  useEffect(() => {
    setTopicFilters([])
    setTaggedOnly(false)
    setUntaggedOnly(false)
  }, [caseId])

  function clearTopicFilters() {
    setTopicFilters([])
    setTaggedOnly(false)
    setUntaggedOnly(false)
  }

  function toggleTopicFilter(label) {
    setTaggedOnly(false)
    setUntaggedOnly(false)
    setTopicFilters((prev) => {
      const on = prev.some((t) => t.toLowerCase() === label.toLowerCase())
      if (on) return prev.filter((t) => t.toLowerCase() !== label.toLowerCase())
      return [...prev, label]
    })
  }

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
          <button
            type="button"
            className="btn-soft"
            title="Add a note for the whole article (not tied to a page)"
            onClick={() => {
              onAdd({ page: 0, text: '', kind: 'general' })
              setScope('general')
            }}
          >
            <Plus size={14} /> General
          </button>
          <button
            type="button"
            className="btn-ink"
            title={`Add a note on page ${page}`}
            onClick={() => {
              onAdd({ page, text: '', kind: 'page' })
              setScope('page')
            }}
          >
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
          All ({forCase.length})
        </button>
        <button
          type="button"
          className={scope === 'general' ? 'on' : ''}
          onClick={() => setScope('general')}
        >
          General ({generalNotes.length})
        </button>
        <button
          type="button"
          className={scope === 'page' ? 'on' : ''}
          onClick={() => setScope('page')}
        >
          This page ({onThisPage.length})
        </button>
      </div>

      {forCase.length ? (
        <div className="anno-topic-filters" role="group" aria-label="Filter by topic">
          <button
            type="button"
            className={taggedOnly ? 'anno-topic-filter on' : 'anno-topic-filter'}
            aria-pressed={taggedOnly}
            onClick={() => {
              setTopicFilters([])
              setUntaggedOnly(false)
              setTaggedOnly((v) => !v)
            }}
          >
            Tagged <span className="mono">{topicCounts.tagged}</span>
          </button>
          <button
            type="button"
            className={untaggedOnly ? 'anno-topic-filter on' : 'anno-topic-filter'}
            aria-pressed={untaggedOnly}
            onClick={() => {
              setTopicFilters([])
              setTaggedOnly(false)
              setUntaggedOnly((v) => !v)
            }}
          >
            Untagged <span className="mono">{topicCounts.untagged}</span>
          </button>
          {vocabulary.map((label) => {
            const selected = topicFilters.some((t) => t.toLowerCase() === label.toLowerCase())
            const count = topicCounts.byTopic.get(label) || 0
            return (
              <button
                key={label.toLowerCase()}
                type="button"
                className={selected ? 'anno-topic-filter on' : 'anno-topic-filter'}
                aria-pressed={selected}
                onClick={() => toggleTopicFilter(label)}
              >
                {label} <span className="mono">{count}</span>
              </button>
            )
          })}
          {topicFilters.length || taggedOnly || untaggedOnly ? (
            <button type="button" className="anno-topic-filter-clear" onClick={clearTopicFilters}>
              Clear topics
            </button>
          ) : null}
        </div>
      ) : null}

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
        Tag notes with topics for this article (AUMF, Hamdi, …). Filter by topic above. Send to
        Notes groups by topic when tags are set.
      </p>

      <ul className="anno-list" ref={listRef}>
        {slice.length === 0 ? (
          <li className="anno-empty">
            {scope === 'page'
              ? 'No notes on this page yet.'
              : scope === 'general'
                ? 'No general notes yet. Add one for themes and overall takeaways.'
                : 'No notes yet. Add a general note, a page note, or highlight text in the PDF.'}
          </li>
        ) : (
          slice.map((a) => (
            <AnnotationItem
              key={a.id}
              annotation={a}
              currentPage={page}
              expanded={isExpanded(a.id)}
              focused={a.id === focusAnnotationId}
              vocabulary={vocabulary}
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
          onUpdate={onUpdate}
          onFlush={onFlush}
          onTogglePin={togglePin}
          onExportNotes={onExportToNotes ? handleExport : null}
          exportBusy={exportBusy}
          exportMessage={exportMessage}
        />
      ) : null}
    </div>
  )
}
