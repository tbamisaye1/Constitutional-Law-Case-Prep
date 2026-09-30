import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileUp,
  Highlighter,
  Search,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useAiUi } from '../../ai/AiUiContext'
import { findQuoteOnPage } from '../../lib/pdfQuoteFocus'
import { findAllOnPage, searchPdfDocument } from '../../lib/pdfTextSearch'
import {
  DEFAULT_HIGHLIGHT_COLOR,
  HIGHLIGHT_COLORS,
  highlightColorMeta,
  normalizeHighlightColor,
} from '../../lib/highlightColors'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

/**
 * PDF reader with text-select → highlight note, page jump, and in-document search.
 * Selection is captured relative to the page box so overlays survive zoom changes
 * (rects are stored as fractions of page width/height).
 *
 * Optional `focusQuote`: after the text layer renders, find that snippet, paint a
 * temporary highlight, and scroll it into view (Ask AI cite → jump).
 *
 * Optional `focusHighlightId`: when a notes-panel card asks to locate its
 * highlight, jump the page (caller sets `page`) and pulse/scroll that overlay.
 */
export function PdfViewer({
  file,
  fileName,
  page,
  onPageChange,
  suggestedFile,
  highlights = [],
  onHighlight,
  onSelectHighlight,
  caseId = null,
  focusQuote = '',
  focusHighlightId = null,
  emptyHint = '',
}) {
  const [numPages, setNumPages] = useState(null)
  const [scale, setScale] = useState(1.05)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
  const [pendingColor, setPendingColor] = useState(DEFAULT_HIGHLIGHT_COLOR)
  const [focusRects, setFocusRects] = useState([])
  const [pageDraft, setPageDraft] = useState(String(page || 1))
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatches, setSearchMatches] = useState([])
  const [activeMatch, setActiveMatch] = useState(0)
  const [searchHits, setSearchHits] = useState([])
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [pulseHighlightId, setPulseHighlightId] = useState(null)
  const stageRef = useRef(null)
  const pdfDocRef = useRef(null)
  const searchInputRef = useRef(null)
  const focusKeyRef = useRef('')
  const lastFocusHighlightRef = useRef('')
  const { openBubble } = useAiUi()

  useEffect(() => {
    setNumPages(null)
    setError('')
    setPending(null)
    setFocusRects([])
    focusKeyRef.current = ''
    pdfDocRef.current = null
    clearSearch(true)
  }, [file]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPending(null)
    setFocusRects([])
    focusKeyRef.current = ''
  }, [page, focusQuote])

  useEffect(() => {
    setPageDraft(String(page || 1))
  }, [page])

  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
  }, [searchOpen])

  useEffect(() => {
    function onKey(event) {
      const isFind = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f'
      if (!isFind) return
      const root = stageRef.current?.closest('.pdf-viewer')
      if (!root) return
      // Only steal Cmd/Ctrl+F when focus is inside this viewer.
      if (!root.contains(document.activeElement) && document.activeElement !== document.body) {
        return
      }
      event.preventDefault()
      setSearchOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function clearSearch(resetDraft = false) {
    setSearchQuery('')
    setSearchMatches([])
    setActiveMatch(0)
    setSearchHits([])
    setSearchError('')
    setSearchBusy(false)
    if (resetDraft) setSearchDraft('')
  }

  function jumpToPage(raw) {
    const parsed = Number.parseInt(String(raw).trim(), 10)
    if (!Number.isFinite(parsed)) {
      setPageDraft(String(page || 1))
      return
    }
    const max = numPages || parsed
    const next = Math.min(Math.max(1, parsed), max)
    setPageDraft(String(next))
    if (next !== page) onPageChange(next)
  }

  const pageHighlights = useMemo(
    () => highlights.filter((h) => h.page === page && Array.isArray(h.rects) && h.rects.length),
    [highlights, page]
  )

  useEffect(() => {
    if (!focusHighlightId) {
      lastFocusHighlightRef.current = ''
      return
    }
    const token = `${focusHighlightId}@${page}`
    if (lastFocusHighlightRef.current === token) return

    const target = highlights.find((h) => h.id === focusHighlightId)
    if (!target) return
    // Wait until the parent has switched to the highlight's page.
    if (target.page !== page) return

    lastFocusHighlightRef.current = token
    setPulseHighlightId(focusHighlightId)

    const tryScroll = () => {
      const root = stageRef.current
      if (!root) return false
      const el =
        root.querySelector(`[data-hl-id="${CSS.escape(focusHighlightId)}"]`) ||
        root.querySelector(`[data-hl-id="${focusHighlightId}"]`)
      if (!el) return false
      el.scrollIntoView({ block: 'center', behavior: 'smooth', inline: 'nearest' })
      return true
    }

    // Overlay may paint a frame after page change.
    if (!tryScroll()) {
      requestAnimationFrame(() => {
        if (!tryScroll()) window.setTimeout(tryScroll, 80)
      })
    }

    const clearPulse = window.setTimeout(() => {
      setPulseHighlightId((current) => (current === focusHighlightId ? null : current))
    }, 1800)
    return () => window.clearTimeout(clearPulse)
  }, [focusHighlightId, page, highlights])

  function applyFocusQuote() {
    const needle = String(focusQuote || '').trim()
    if (!needle || !file) return
    const key = `${fileName || ''}|${page}|${needle.slice(0, 80)}`
    if (focusKeyRef.current === key) return

    const pageEl = stageRef.current?.querySelector('.react-pdf__Page')
    if (!pageEl) return

    const found = findQuoteOnPage(pageEl, needle)
    if (!found) return

    focusKeyRef.current = key
    setFocusRects(found.rects)

    try {
      const first = found.range.getBoundingClientRect()
      if (first && (first.height > 0 || first.width > 0)) {
        const scroller = stageRef.current
        if (scroller) {
          const stageBox = scroller.getBoundingClientRect()
          const delta = first.top - stageBox.top - scroller.clientHeight * 0.25
          scroller.scrollTop += delta
        } else {
          found.range.startContainer?.parentElement?.scrollIntoView?.({
            block: 'center',
            behavior: 'smooth',
          })
        }
      }
    } catch {
      // Highlight still paints even if scroll fails.
    }
  }

  function applySearchHighlights() {
    if (!searchQuery.trim() || !searchMatches.length) {
      setSearchHits([])
      return
    }
    const pageEl = stageRef.current?.querySelector('.react-pdf__Page')
    if (!pageEl) return

    const hits = findAllOnPage(pageEl, searchQuery)
    setSearchHits(hits)

    const active = searchMatches[activeMatch]
    if (!active || active.page !== page) return
    const hit = hits[active.occurrence]
    if (!hit?.range) return
    try {
      const box = hit.range.getBoundingClientRect()
      const scroller = stageRef.current
      if (scroller && box.height > 0) {
        const stageBox = scroller.getBoundingClientRect()
        const delta = box.top - stageBox.top - scroller.clientHeight * 0.3
        scroller.scrollTop += delta
      }
    } catch {
      // Still show the painted rects.
    }
  }

  async function runSearch(rawQuery) {
    const query = String(rawQuery || '').trim()
    setSearchDraft(query)
    if (query.length < 2) {
      clearSearch()
      setSearchError(query ? 'Type at least 2 characters.' : '')
      return
    }
    const pdf = pdfDocRef.current
    if (!pdf) {
      setSearchError('PDF is still loading.')
      return
    }

    setSearchBusy(true)
    setSearchError('')
    try {
      const matches = await searchPdfDocument(pdf, query)
      setSearchQuery(query)
      setSearchMatches(matches)
      if (!matches.length) {
        setActiveMatch(0)
        setSearchHits([])
        setSearchError('No matches in this PDF.')
        return
      }
      setActiveMatch(0)
      const first = matches[0]
      if (first.page !== page) onPageChange(first.page)
      else requestAnimationFrame(() => applySearchHighlights())
    } catch (err) {
      console.error('PDF search failed', err)
      setSearchError('Could not search this PDF.')
      setSearchMatches([])
      setSearchHits([])
    } finally {
      setSearchBusy(false)
    }
  }

  function goToMatch(nextIndex) {
    if (!searchMatches.length) return
    const wrapped = ((nextIndex % searchMatches.length) + searchMatches.length) % searchMatches.length
    setActiveMatch(wrapped)
    const target = searchMatches[wrapped]
    if (target.page !== page) onPageChange(target.page)
    else requestAnimationFrame(() => applySearchHighlights())
  }

  useEffect(() => {
    if (!searchQuery || !searchMatches.length) return
    requestAnimationFrame(() => applySearchHighlights())
  }, [page, searchQuery, activeMatch, searchMatches.length, scale]) // eslint-disable-line react-hooks/exhaustive-deps

  function onMouseUp() {
    if (!onHighlight) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const quote = sel.toString().replace(/\s+/g, ' ').trim()
    if (quote.length < 2) return

    const pageEl = stageRef.current?.querySelector('.react-pdf__Page')
    if (!pageEl) return
    const pageRect = pageEl.getBoundingClientRect()
    if (pageRect.width < 1 || pageRect.height < 1) return

    let range
    try {
      range = sel.getRangeAt(0)
    } catch {
      return
    }

    const rects = [...range.getClientRects()]
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({
        top: (r.top - pageRect.top) / pageRect.height,
        left: (r.left - pageRect.left) / pageRect.width,
        width: r.width / pageRect.width,
        height: r.height / pageRect.height,
      }))

    if (!rects.length) return

    const first = range.getBoundingClientRect()
    setPendingColor(DEFAULT_HIGHLIGHT_COLOR)
    setPending({
      quote,
      rects,
      page,
      anchor: {
        top: first.bottom - pageRect.top + 8,
        left: Math.min(Math.max(first.left - pageRect.left, 8), pageRect.width - 180),
      },
    })
  }

  function confirmHighlight() {
    if (!pending) return
    onHighlight({
      page: pending.page,
      quote: pending.quote,
      rects: pending.rects,
      text: '',
      color: normalizeHighlightColor(pendingColor),
    })
    setPending(null)
    window.getSelection()?.removeAllRanges()
  }

  const activeOnPage =
    searchMatches[activeMatch] && searchMatches[activeMatch].page === page
      ? searchMatches[activeMatch].occurrence
      : -1

  if (!file) {
    return (
      <div className="pdf-empty">
        <FileUp size={28} strokeWidth={1.5} />
        <p>
          {emptyHint || (
            <>
              Open the PDF from your machine (browser cannot read your YUMC folder path directly).
              {suggestedFile ? (
                <>
                  {' '}
                  Look for <span className="mono">{suggestedFile}</span>.
                </>
              ) : null}
            </>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="pdf-viewer" tabIndex={-1}>
      <div className="pdf-toolbar">
        <span className="pdf-filename mono" title={fileName}>
          {fileName || 'PDF'}
        </span>
        <span className="pdf-hint mono">Select text → highlight or Ask AI</span>
        <div className="pdf-toolbar-right">
          <button
            type="button"
            className={searchOpen ? 'btn-soft on' : 'btn-soft'}
            onClick={() => {
              setSearchOpen((v) => !v)
              if (searchOpen) clearSearch(true)
            }}
            aria-label="Search in PDF"
            title="Search in PDF (⌘F / Ctrl+F)"
          >
            <Search size={15} />
          </button>
          <button type="button" className="btn-soft" onClick={() => setScale((s) => Math.max(0.7, s - 0.1))}>
            <ZoomOut size={15} />
          </button>
          <span className="mono pdf-scale">{Math.round(scale * 100)}%</span>
          <button type="button" className="btn-soft" onClick={() => setScale((s) => Math.min(1.8, s + 0.1))}>
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            className="btn-soft"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </button>
          <label className="pdf-page-jump">
            <span className="visually-hidden">Go to page</span>
            <input
              className="mono pdf-page-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={numPages || undefined}
              value={pageDraft}
              onChange={(e) => setPageDraft(e.target.value)}
              onBlur={() => jumpToPage(pageDraft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  jumpToPage(pageDraft)
                  e.currentTarget.blur()
                }
              }}
              aria-label={numPages ? `Page number, of ${numPages}` : 'Page number'}
            />
            <span className="mono pdf-page-total">{numPages ? `/ ${numPages}` : ''}</span>
          </label>
          <button
            type="button"
            className="btn-soft"
            disabled={numPages != null && page >= numPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div className="pdf-search-bar">
          <Search size={14} className="pdf-search-icon" aria-hidden />
          <input
            ref={searchInputRef}
            className="pdf-search-input"
            type="search"
            value={searchDraft}
            placeholder="Find words or phrases in this PDF…"
            aria-label="Search PDF"
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (e.shiftKey && searchMatches.length) goToMatch(activeMatch - 1)
                else if (searchQuery === searchDraft.trim() && searchMatches.length) {
                  goToMatch(activeMatch + 1)
                } else {
                  runSearch(searchDraft)
                }
              } else if (e.key === 'Escape') {
                setSearchOpen(false)
                clearSearch(true)
              }
            }}
          />
          <button
            type="button"
            className="btn-soft"
            disabled={searchBusy || searchDraft.trim().length < 2}
            onClick={() => runSearch(searchDraft)}
          >
            {searchBusy ? 'Searching…' : 'Find'}
          </button>
          <button
            type="button"
            className="btn-soft"
            disabled={!searchMatches.length}
            onClick={() => goToMatch(activeMatch - 1)}
            aria-label="Previous match"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            className="btn-soft"
            disabled={!searchMatches.length}
            onClick={() => goToMatch(activeMatch + 1)}
            aria-label="Next match"
          >
            <ChevronDown size={14} />
          </button>
          <span className="mono pdf-search-count">
            {searchBusy
              ? '…'
              : searchMatches.length
                ? `${activeMatch + 1} / ${searchMatches.length}`
                : searchQuery
                  ? '0'
                  : ''}
          </span>
          <button
            type="button"
            className="icon-btn soft"
            aria-label="Close search"
            onClick={() => {
              setSearchOpen(false)
              clearSearch(true)
            }}
          >
            <X size={14} />
          </button>
          {searchError ? <span className="pdf-search-error">{searchError}</span> : null}
        </div>
      ) : null}

      <div className="pdf-stage" ref={stageRef} onMouseUp={onMouseUp}>
        {error ? <p className="pdf-error">{error}</p> : null}
        <div className="pdf-page-wrap">
          <Document
            file={file}
            loading={<p className="pdf-loading mono">Loading PDF…</p>}
            onLoadSuccess={(pdf) => {
              pdfDocRef.current = pdf
              setNumPages(pdf.numPages)
              setError('')
            }}
            onLoadError={(err) => {
              console.error('PDF load error', err)
              setError('Could not open that PDF. Try another file.')
            }}
          >
            <Page
              pageNumber={page}
              scale={scale}
              renderTextLayer
              renderAnnotationLayer
              loading={<p className="pdf-loading mono">Rendering page…</p>}
              onRenderTextLayerSuccess={() => {
                // Text layer paints after this callback; wait one frame so spans exist.
                requestAnimationFrame(() => {
                  applyFocusQuote()
                  applySearchHighlights()
                })
              }}
            />
          </Document>

          <div className="pdf-highlight-layer">
            {pageHighlights.map((h) => {
              const color = highlightColorMeta(h.color)
              const pulsing = pulseHighlightId === h.id
              return (h.rects || []).map((r, i) => (
                <button
                  key={`${h.id}-${i}`}
                  type="button"
                  data-hl-id={i === 0 ? h.id : undefined}
                  className={pulsing ? 'pdf-hl pdf-hl-hit pdf-hl-pulse' : 'pdf-hl pdf-hl-hit'}
                  aria-label={`Open note for highlight: ${(h.quote || '').slice(0, 80)}`}
                  style={{
                    top: `${r.top * 100}%`,
                    left: `${r.left * 100}%`,
                    width: `${r.width * 100}%`,
                    height: `${r.height * 100}%`,
                    background: color.fill,
                  }}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onSelectHighlight?.(h.id)
                  }}
                />
              ))
            })}
            {searchHits.map((hit, hitIndex) =>
              (hit.rects || []).map((r, i) => (
                <span
                  key={`search-${hitIndex}-${i}`}
                  className={
                    hitIndex === activeOnPage ? 'pdf-hl pdf-hl-search pdf-hl-search-active' : 'pdf-hl pdf-hl-search'
                  }
                  style={{
                    top: `${r.top * 100}%`,
                    left: `${r.left * 100}%`,
                    width: `${r.width * 100}%`,
                    height: `${r.height * 100}%`,
                  }}
                />
              ))
            )}
            {focusRects.map((r, i) => (
              <span
                key={`focus-${i}`}
                className="pdf-hl pdf-hl-focus"
                style={{
                  top: `${r.top * 100}%`,
                  left: `${r.left * 100}%`,
                  width: `${r.width * 100}%`,
                  height: `${r.height * 100}%`,
                }}
              />
            ))}
          </div>

          {pending ? (
            <div
              className="pdf-hl-popover"
              style={{ top: pending.anchor.top, left: pending.anchor.left }}
            >
              <p className="pdf-hl-quote">
                “{pending.quote.slice(0, 120)}
                {pending.quote.length > 120 ? '…' : ''}”
              </p>
              <div className="hl-color-row" role="group" aria-label="Highlight color">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={pendingColor === c.id ? 'hl-swatch on' : 'hl-swatch'}
                    style={{ background: c.solid }}
                    aria-label={c.label}
                    aria-pressed={pendingColor === c.id}
                    onClick={() => setPendingColor(c.id)}
                  />
                ))}
              </div>
              <button type="button" className="btn-ink" onClick={confirmHighlight}>
                <Highlighter size={14} /> Save highlight
              </button>
              <button
                type="button"
                className="btn-soft"
                onClick={() => {
                  const rect = stageRef.current?.getBoundingClientRect()
                  openBubble(
                    {
                      surface: 'pdf',
                      selection: pending.quote,
                      case_id: caseId,
                      page: pending.page,
                      side: 'both',
                    },
                    {
                      top: (rect?.top || 0) + pending.anchor.top + 40,
                      left: (rect?.left || 0) + pending.anchor.left,
                    }
                  )
                  setPending(null)
                }}
              >
                <Sparkles size={14} /> Ask AI
              </button>
              <button type="button" className="btn-soft" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
