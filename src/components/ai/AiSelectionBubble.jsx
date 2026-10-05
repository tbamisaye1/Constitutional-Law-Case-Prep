import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Maximize2, Minimize2, Sparkles, X } from 'lucide-react'
import { GroundingBadge } from '../GroundingBadge'
import { useAiUi } from '../../ai/AiUiContext'
import { useCaseLibrary } from '../../hooks/useCaseLibrary'
import { downloadIngestFile } from '../../api/client'
import { openEvidencePdf } from '../../lib/openEvidencePdf'
import {
  SAMPLE_PROMPT_GROUPS,
  WEB_SAMPLE_PROMPT_GROUPS,
  SELECTION_QUICK,
  WEB_SELECTION_QUICK,
  formatReplyForDisplay,
} from '../../ai/samplePrompts'

const EXPAND_KEY = 'case-prep-ask-ai-expanded'
const POS_KEY = 'case-prep-ask-ai-pos'
const SIZE_KEY = 'case-prep-ask-ai-size'

const MIN_BUBBLE_WIDTH = 280
const MIN_BUBBLE_HEIGHT = 260

function readExpanded() {
  try {
    return localStorage.getItem(EXPAND_KEY) === '1'
  } catch {
    return false
  }
}

/** @returns {{ left: number, top: number } | null} */
function readPos() {
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.left === 'number' && typeof parsed?.top === 'number') return parsed
  } catch {
    /* ignore */
  }
  return null
}

/** @returns {{ width: number, height: number } | null} */
function readSize() {
  try {
    const raw = localStorage.getItem(SIZE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.width === 'number' &&
      typeof parsed?.height === 'number' &&
      parsed.width >= MIN_BUBBLE_WIDTH &&
      parsed.height >= MIN_BUBBLE_HEIGHT
    ) {
      return { width: parsed.width, height: parsed.height }
    }
  } catch {
    /* ignore */
  }
  return null
}

function clampPos(left, top, width, height) {
  const margin = 8
  const maxLeft = Math.max(margin, window.innerWidth - width - margin)
  const maxTop = Math.max(margin, window.innerHeight - height - margin)
  return {
    left: Math.min(maxLeft, Math.max(margin, left)),
    top: Math.min(maxTop, Math.max(margin, top)),
  }
}

function clampSize(width, height) {
  const margin = 16
  const maxW = Math.max(MIN_BUBBLE_WIDTH, window.innerWidth - margin * 2)
  const maxH = Math.max(MIN_BUBBLE_HEIGHT, window.innerHeight - 92)
  return {
    width: Math.min(maxW, Math.max(MIN_BUBBLE_WIDTH, Math.round(width))),
    height: Math.min(maxH, Math.max(MIN_BUBBLE_HEIGHT, Math.round(height))),
  }
}

function isNotebookEvidence(ev) {
  return (
    ev?.source_type === 'notebook' ||
    ev?.source_type === 'annotation' ||
    Boolean(ev?.notes_path)
  )
}

/**
 * Floating AI bubble.
 * Drag the header to park it beside Highlights & Notes without closing the thread.
 * Mode switch: Uploaded docs | Web. Optional Include my notes.
 */
export function AiSelectionBubble() {
  const {
    open,
    ctx,
    setCtx,
    groundingSource,
    switchGroundingSource,
    includeNotes,
    setIncludeNotes,
    advancedResponses,
    setAdvancedResponses,
    prompt,
    setPrompt,
    loading,
    reply,
    memory,
    memoryNearFull,
    memoryFull,
    closeBubble,
    askAi,
    runPrompt,
    clearReply,
    clearMemory,
    restoreFromMemory,
    consumeSkipAutoRestore,
  } = useAiUi()
  const navigate = useNavigate()
  const lib = useCaseLibrary()
  const [openingId, setOpeningId] = useState('')
  const [openError, setOpenError] = useState('')
  const [expanded, setExpanded] = useState(readExpanded)
  const [pos, setPos] = useState(readPos)
  const [size, setSize] = useState(readSize)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)

  const focusRef = useRef(null)
  const panelRef = useRef(null)
  const dragRef = useRef(null)
  const resizeRef = useRef(null)
  const webPlus = groundingSource === 'web_plus'

  const hasSelection = Boolean(ctx.selection?.trim())
  const sourceFile = (ctx.source_file || '').trim()
  const readingArticle = Boolean(sourceFile) || ctx.surface === 'pdf'
  const showSideToggles = hasSelection && !readingArticle
  const showSamples = !hasSelection && !loading && !reply
  const sampleGroups = webPlus ? WEB_SAMPLE_PROMPT_GROUPS : SAMPLE_PROMPT_GROUPS
  const quickActions = webPlus ? WEB_SELECTION_QUICK : SELECTION_QUICK

  useEffect(() => {
    try {
      localStorage.setItem(EXPAND_KEY, expanded ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [expanded])

  useEffect(() => {
    try {
      if (!pos) localStorage.removeItem(POS_KEY)
      else localStorage.setItem(POS_KEY, JSON.stringify(pos))
    } catch {
      /* ignore */
    }
  }, [pos])

  useEffect(() => {
    try {
      if (!size) localStorage.removeItem(SIZE_KEY)
      else localStorage.setItem(SIZE_KEY, JSON.stringify(size))
    } catch {
      /* ignore */
    }
  }, [size])

  // Keep a dragged / custom-sized panel inside the viewport after window resize.
  useEffect(() => {
    if (!open || !panelRef.current) return undefined
    function onResize() {
      const rect = panelRef.current?.getBoundingClientRect()
      if (!rect) return
      setSize((prev) => (prev ? clampSize(prev.width, prev.height) : prev))
      setPos((prev) => {
        if (!prev) return prev
        const nextSize = size || { width: rect.width, height: rect.height }
        return clampPos(prev.left, prev.top, nextSize.width, nextSize.height)
      })
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [open, pos, size, expanded])

  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (expanded) {
        setExpanded(false)
        return
      }
      closeBubble()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, expanded, closeBubble])

  useEffect(() => {
    if (!open || (!loading && !reply)) return
    requestAnimationFrame(() => {
      focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [open, loading, reply])

  useEffect(() => {
    setOpenError('')
    setOpeningId('')
  }, [reply])

  // Auto-open the newest full reply when reopening Ask AI with memory but no
  // on-screen answer. Skip once after New question / Clear memory.
  useEffect(() => {
    if (!open || loading || reply || !memory.length) return
    if (consumeSkipAutoRestore()) return
    restoreFromMemory()
  }, [open, loading, reply, memory, restoreFromMemory, consumeSkipAutoRestore])

  function onResizePointerDown(event) {
    if (event.button !== 0) return
    const el = panelRef.current
    if (!el || expanded) return
    event.preventDefault()
    event.stopPropagation()
    const rect = el.getBoundingClientRect()
    resizeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startW: size?.width || rect.width,
      startH: size?.height || rect.height,
      // Docked panels are anchored bottom-right; convert to placed coords so
      // resizing from the SE corner still feels natural.
      startLeft: pos?.left ?? rect.left,
      startTop: pos?.top ?? rect.top,
      placed: Boolean(pos),
      pointerId: event.pointerId,
    }
    setResizing(true)
    try {
      el.setPointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }

    function onMove(ev) {
      const drag = resizeRef.current
      if (!drag) return
      const next = clampSize(
        drag.startW + (ev.clientX - drag.startX),
        drag.startH + (ev.clientY - drag.startY)
      )
      setSize(next)
      if (!drag.placed) {
        // Keep the bottom-right corner fixed while growing/shrinking.
        setPos(
          clampPos(
            drag.startLeft + drag.startW - next.width,
            drag.startTop + drag.startH - next.height,
            next.width,
            next.height
          )
        )
      }
    }

    function onUp(ev) {
      resizeRef.current = null
      setResizing(false)
      try {
        el.releasePointerCapture(ev.pointerId)
      } catch {
        /* ignore */
      }
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }

  function onHeaderPointerDown(event) {
    if (event.button !== 0) return
    if (event.target.closest('button, a, input, textarea, select')) return
    const el = panelRef.current
    if (!el) return
    event.preventDefault()
    const rect = el.getBoundingClientRect()
    const startLeft = pos?.left ?? rect.left
    const startTop = pos?.top ?? rect.top
    dragRef.current = {
      offsetX: event.clientX - startLeft,
      offsetY: event.clientY - startTop,
      width: size?.width || rect.width,
      height: size?.height || rect.height,
      pointerId: event.pointerId,
    }
    setDragging(true)
    try {
      el.setPointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }

    function onMove(ev) {
      const drag = dragRef.current
      if (!drag) return
      setPos(
        clampPos(
          ev.clientX - drag.offsetX,
          ev.clientY - drag.offsetY,
          drag.width,
          drag.height
        )
      )
    }

    function onUp() {
      dragRef.current = null
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function goToEvidencePath(path) {
    if (!path) return
    // Collapse + close first so the destination page is visible (expanded Ask AI
    // used to sit on top of /library while the URL changed underneath).
    setExpanded(false)
    try {
      localStorage.setItem(EXPAND_KEY, '0')
    } catch {
      /* ignore */
    }
    closeBubble()
    navigate(path)
    // Hard fallback if the SPA route did not change (seen when opening from TOA).
    window.setTimeout(() => {
      const wantPath = path.split('?')[0]
      if (window.location.pathname !== wantPath) {
        window.location.assign(path)
      }
    }, 80)
  }

  async function onOpenEvidence(ev) {
    if (!ev || ev.source_type === 'web') return
    if (isNotebookEvidence(ev)) {
      goToEvidencePath(ev.notes_path)
      return
    }
    setOpeningId(ev.id)
    setOpenError('')
    try {
      // Collect the path without navigating mid-download; go once after close.
      let pendingPath = ''
      const result = await openEvidencePdf({
        evidence: ev,
        lib,
        navigate: (path) => {
          pendingPath = path || pendingPath
        },
        downloadIngestFile,
      })
      const path = result?.path || pendingPath
      if (path) {
        goToEvidencePath(path)
        if (!result.ok && result.error) {
          // Still opened the case card; surface the attach warning briefly.
          window.setTimeout(() => window.alert(result.error), 120)
        }
      } else if (result?.error) {
        setOpenError(result.error)
      }
    } catch (error) {
      setOpenError(error?.message || 'Could not open that PDF.')
    } finally {
      setOpeningId('')
    }
  }

  if (!open) return null

  const noteEvidence = (reply?.evidence || []).filter(isNotebookEvidence)
  const corpusEvidence = (reply?.evidence || []).filter(
    (ev) => ev.source_type !== 'web' && !isNotebookEvidence(ev)
  )
  const webEvidence = (reply?.evidence || []).filter((ev) => ev.source_type === 'web')

  const className = [
    'ai-bubble',
    expanded ? 'is-expanded' : '',
    pos ? 'is-placed' : '',
    size && !expanded ? 'is-sized' : '',
    dragging ? 'is-dragging' : '',
    resizing ? 'is-resizing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const style = {
    ...(pos
      ? {
          left: pos.left,
          top: pos.top,
          right: 'auto',
          bottom: 'auto',
        }
      : null),
    ...(size && !expanded
      ? {
          width: size.width,
          height: size.height,
          maxHeight: 'none',
        }
      : null),
  }

  return (
    <div
      ref={panelRef}
      className={className}
      style={style}
      role="dialog"
      aria-label={webPlus ? 'Ask AI with uploaded PDFs and web search' : 'Ask AI about uploaded PDFs'}
    >
      <div
        className="ai-bubble-header ai-bubble-drag-handle"
        onPointerDown={onHeaderPointerDown}
        title="Drag to move — chat stays open. Drag the corner to resize."
      >
        <span className="ai-bubble-title">
          <GripVertical size={14} className="ai-bubble-grip" aria-hidden />
          <Sparkles size={14} /> Ask AI
          <span className="ai-bubble-drag-hint mono">drag</span>
        </span>
        <div className="ai-bubble-header-actions">
          {pos ? (
            <button
              type="button"
              className="btn-soft"
              onClick={() => setPos(null)}
              title="Dock back to bottom-right"
            >
              Dock
            </button>
          ) : null}
          {size && !expanded ? (
            <button
              type="button"
              className="btn-soft"
              onClick={() => setSize(null)}
              title="Reset to default size"
            >
              Reset size
            </button>
          ) : null}
          <button
            type="button"
            className={expanded ? 'btn-ink notes-expand-exit' : 'btn-soft'}
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Exit expanded Ask AI' : 'Expand Ask AI'}
            title={expanded ? 'Exit expanded view (Esc)' : 'Expand Ask AI for more room'}
          >
            {expanded ? (
              <>
                <Minimize2 size={15} /> Exit
              </>
            ) : (
              <>
                <Maximize2 size={15} /> Expand
              </>
            )}
          </button>
          <button type="button" className="icon-btn soft" aria-label="Close" onClick={closeBubble}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="ai-bubble-scroll">
        <div className="ai-mode-row" role="tablist" aria-label="Ask AI mode">
          <button
            type="button"
            role="tab"
            aria-selected={!webPlus}
            className={!webPlus ? 'on' : ''}
            onClick={() => switchGroundingSource('documents')}
          >
            Uploaded docs
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={webPlus}
            className={webPlus ? 'on' : ''}
            onClick={() => switchGroundingSource('web_plus')}
          >
            Web
          </button>
        </div>

        <label className="ai-notes-toggle">
          <input
            type="checkbox"
            checked={includeNotes}
            onChange={(e) => setIncludeNotes(e.target.checked)}
          />
          <span>
            Include my notes
            <span className="ai-notes-toggle-hint">
              Searches notebook pages, PDF highlights, case-library tabs, and Arguments
              (whole argument / section / prong notes).
            </span>
          </span>
        </label>

        <label
          className={
            advancedResponses ? 'ai-notes-toggle ai-advanced-toggle on' : 'ai-notes-toggle ai-advanced-toggle'
          }
        >
          <input
            type="checkbox"
            checked={advancedResponses}
            onChange={(e) => setAdvancedResponses(e.target.checked)}
          />
          <span>
            Advanced responses
            <span className="ai-notes-toggle-hint">
              Uses GPT-5 Mini (via OpenAI) instead of GPT-4o Mini. Flip on when a hard
              question is failing; costs a bit more per ask.
            </span>
          </span>
        </label>

        <p className="ai-bubble-policy">
          {webPlus ? (
            <>
              <strong>All uploaded PDFs + web.</strong> Prefers Instant Case, Case library, and
              Articles uploads
              {includeNotes ? ' plus matching notes/annotations' : ''}; searches the web when the
              corpus is thin or you ask for outside definitions and background.
              {advancedResponses ? ' Advanced model is on for this ask.' : ''}
            </>
          ) : (
            <>
              <strong>All uploaded PDFs.</strong> Searches Instant Case (Bronner record), Case
              library opinions, and Articles shelf files
              {includeNotes ? ', plus your notes/annotations when they match' : ''}. Refuses if
              nothing indexed is enough. Say “in my notes” or “my highlights” anytime to pull local
              notes for one question.
              {advancedResponses ? ' Advanced model is on for this ask.' : ''}
            </>
          )}
        </p>

        {memory.length ? (
          <div className={memoryNearFull ? 'ai-memory-bar warn' : 'ai-memory-bar'}>
            <span className="mono">
              Memory · {memory.length} turn{memory.length === 1 ? '' : 's'}
              {memoryFull ? ' (full · oldest will drop)' : memoryNearFull ? ' (getting full)' : ''}
            </span>
            <button type="button" className="btn-soft" onClick={clearMemory}>
              Clear memory
            </button>
          </div>
        ) : null}

        {memoryNearFull ? (
          <p className="ai-memory-hint">
            Chat memory is getting full. Clear it for a fresh thread, or keep going (oldest turns
            drop first).
          </p>
        ) : null}

        {memory.length && !loading ? (
          <div className="ai-memory-transcript">
            <div className="ai-sample-label mono">Recent thread</div>
            <p className="ai-memory-hint">
              Tap a turn to open the full answer, or use Open last full answer.
            </p>
            <button
              type="button"
              className="btn-soft ai-memory-open-last"
              onClick={() => restoreFromMemory()}
            >
              Open last full answer
            </button>
            {memory.slice(-4).map((turn, i) => {
              const absoluteIndex = memory.length - Math.min(4, memory.length) + i
              const canOpen = turn.role === 'assistant'
              return (
                <button
                  key={`${turn.at || absoluteIndex}-${turn.role}`}
                  type="button"
                  className={canOpen ? 'ai-memory-turn ai-memory-turn-btn' : 'ai-memory-turn ai-memory-turn-static'}
                  disabled={!canOpen}
                  onClick={() => {
                    if (canOpen) restoreFromMemory(absoluteIndex)
                  }}
                >
                  <span className="mono">{turn.role === 'user' ? 'You' : 'Ask AI'}</span>
                  {turn.content.slice(0, 140)}
                  {turn.content.length > 140 ? '…' : ''}
                  {canOpen ? <span className="mono ai-memory-open-hint">Open →</span> : null}
                </button>
              )
            })}
          </div>
        ) : null}
        {hasSelection ? (
          <>
            {showSideToggles ? (
              <div className="ai-side-row" role="group" aria-label="Side">
                {['both', 'petitioner', 'respondent'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={ctx.side === s ? 'on' : ''}
                    onClick={() => setCtx((c) => ({ ...c, side: s }))}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            {readingArticle ? (
              <p className="ai-bubble-source mono">
                From {sourceFile || 'this PDF'}
                {ctx.page != null ? ` · p.${ctx.page}` : ''}
                {' · '}
                reading mode (not tied to petitioner/respondent)
              </p>
            ) : null}
            <blockquote className="ai-bubble-quote">
              “{ctx.selection.slice(0, 220)}
              {ctx.selection.length > 220 ? '…' : ''}”
            </blockquote>
            <div className="ai-quick-row">
              {quickActions.map((q) => (
                <button key={q.id} type="button" className="ai-quick" onClick={() => setPrompt(q.prompt)}>
                  {q.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {showSamples ? (
          <>
            <p className="ai-bubble-empty">
              {webPlus
                ? 'Try a sample — definitions can use web search.'
                : 'Try a sample question — no law background needed.'}
            </p>
            <div className="ai-samples">
              {sampleGroups.map((group) => (
                <div key={group.label} className="ai-sample-group">
                  <div className="ai-sample-label mono">{group.label}</div>
                  {group.hint ? <p className="ai-sample-hint">{group.hint}</p> : null}
                  {group.questions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="ai-sample-chip"
                      disabled={loading}
                      onClick={() => runPrompt(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {loading ? (
          <div className="ai-bubble-loading" ref={focusRef} aria-live="polite">
            <div className="ai-sample-label mono">Working</div>
            {prompt ? <p className="ai-bubble-loading-q">{prompt}</p> : null}
            <p className="ai-bubble-loading-status">
              {advancedResponses ? 'Advanced model · ' : ''}
              {includeNotes ||
              /my notes|my ntoes|notebook|where (did|do) i write|in my notes/i.test(prompt)
                ? 'Searching your notes/annotations and uploaded PDFs…'
                : webPlus
                  ? 'Checking Instant Case, Case library, and Articles, then web search if needed…'
                  : 'Retrieving passages from Instant Case, Case library, and Articles…'}
            </p>
          </div>
        ) : null}

        {reply && !loading ? (
          <div className="ai-bubble-reply" ref={focusRef} aria-live="polite">
            <div className="ai-bubble-reply-head">
              <GroundingBadge
                status={reply.grounding_status}
                articleMode={!webPlus}
                webPlus={webPlus || reply.grounding_source === 'web_plus'}
              />
              {reply.model_tier === 'advanced' ? (
                <span className="mono ai-advanced-badge" title="Answered with GPT-5 Mini">
                  Advanced
                </span>
              ) : null}
              {reply.claims_total != null ? (
                <span className="mono ai-stub">
                  quotes {reply.claims_verified}/{reply.claims_total}
                </span>
              ) : null}
            </div>
            {prompt ? <p className="ai-bubble-asked">Q: {prompt}</p> : null}
            {reply.grounding_notes ? <p className="ai-bubble-notes">{reply.grounding_notes}</p> : null}

            {noteEvidence.length ? (
              <div className="ai-bubble-evidence ai-bubble-evidence-first">
                <div className="ai-sample-label mono">From your notes & annotations</div>
                <p className="ai-ev-hint mono">
                  Click to open the notebook page or the PDF annotation in the library.
                </p>
                {noteEvidence.slice(0, 5).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    className="ai-ev-card"
                    onClick={() => onOpenEvidence(ev)}
                    disabled={!ev.notes_path}
                  >
                    <div className="mono ai-ev-src">
                      [{ev.id}] {ev.source}
                    </div>
                    <p>{ev.preview}</p>
                    <span className="mono ai-ev-open">
                      {ev.notes_path
                        ? ev.notes_path.startsWith('/library')
                          ? 'Open in Library →'
                          : 'Open in Notes →'
                        : 'No deep link'}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {corpusEvidence.length ? (
              <div
                className={
                  noteEvidence.length
                    ? 'ai-bubble-evidence'
                    : 'ai-bubble-evidence ai-bubble-evidence-first'
                }
              >
                <div className="ai-sample-label mono">Retrieved from Ask AI corpus</div>
                <p className="ai-ev-hint mono">
                  Click a PDF cite to open it. Oyez summaries are text-only until you attach the
                  opinion.
                </p>
                {openError ? <p className="ai-ev-error">{openError}</p> : null}
                {corpusEvidence.slice(0, 4).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    className="ai-ev-card"
                    disabled={Boolean(openingId)}
                    onClick={() => onOpenEvidence(ev)}
                  >
                    <div className="mono ai-ev-src">
                      [{ev.id}] {ev.source}
                      {ev.page != null ? ` · p.${ev.page}` : ''}
                    </div>
                    <p>{ev.preview}</p>
                    <span className="mono ai-ev-open">
                      {openingId === ev.id ? 'Opening…' : 'Open in viewer →'}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {webEvidence.length ? (
              <div className="ai-bubble-evidence">
                <div className="ai-sample-label mono">From the web</div>
                {webEvidence.slice(0, 4).map((ev) => (
                  <div key={ev.id} className="ai-ev-card ai-ev-card-static">
                    <div className="mono ai-ev-src">
                      [{ev.id}] {ev.source}
                    </div>
                    {ev.url ? (
                      <a className="ai-ev-url" href={ev.url} target="_blank" rel="noreferrer">
                        {ev.url}
                      </a>
                    ) : null}
                    <p>{ev.preview}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <pre className="ai-bubble-reply-text">{formatReplyForDisplay(reply.text)}</pre>
          </div>
        ) : null}
      </div>

      <div className="ai-bubble-footer">
        <textarea
          className="ai-bubble-input"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            includeNotes
              ? webPlus
                ? 'Ask from notes, articles, and the web…'
                : 'Ask from your notes and uploaded PDFs…'
              : webPlus
                ? 'Ask from Instant Case, Case library, Articles, or the web…'
                : 'Ask from Instant Case, Case library, and Articles…'
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              askAi()
            }
          }}
        />

        <div className="ai-bubble-actions">
          <button type="button" className="btn-ink" disabled={loading || !prompt.trim()} onClick={askAi}>
            {loading ? 'Searching…' : 'Ask'}
          </button>
          {reply && !loading ? (
            <button type="button" className="btn-soft" onClick={clearReply}>
              New question
            </button>
          ) : null}
          {memory.length ? (
            <button type="button" className="btn-soft" onClick={clearMemory} title="Clear chat memory">
              Clear memory
            </button>
          ) : null}
          <span className="mono ai-kbd">⌘↵</span>
        </div>
      </div>

      {!expanded ? (
        <div
          className="ai-bubble-resize"
          onPointerDown={onResizePointerDown}
          role="separator"
          aria-orientation="both"
          aria-label="Resize Ask AI"
          title="Drag to resize"
        />
      ) : null}
    </div>
  )
}
