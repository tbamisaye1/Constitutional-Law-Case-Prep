import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, FileUp, Highlighter, Sparkles, ZoomIn, ZoomOut } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useAiUi } from '../../ai/AiUiContext'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

/**
 * PDF reader with text-select → highlight note.
 * Selection is captured relative to the page box so overlays survive zoom changes
 * (rects are stored as fractions of page width/height).
 */
export function PdfViewer({
  file,
  fileName,
  page,
  onPageChange,
  suggestedFile,
  highlights = [],
  onHighlight,
  caseId = null,
}) {
  const [numPages, setNumPages] = useState(null)
  const [scale, setScale] = useState(1.05)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
  const stageRef = useRef(null)
  const { openBubble } = useAiUi()

  useEffect(() => {
    setNumPages(null)
    setError('')
    setPending(null)
  }, [file])

  useEffect(() => {
    setPending(null)
  }, [page])

  const pageHighlights = useMemo(
    () => highlights.filter((h) => h.page === page && Array.isArray(h.rects) && h.rects.length),
    [highlights, page]
  )

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
    })
    setPending(null)
    window.getSelection()?.removeAllRanges()
  }

  if (!file) {
    return (
      <div className="pdf-empty">
        <FileUp size={28} strokeWidth={1.5} />
        <p>
          Open the PDF from your machine (browser cannot read your YUMC folder path directly).
          {suggestedFile ? (
            <>
              {' '}
              Look for <span className="mono">{suggestedFile}</span>.
            </>
          ) : null}
        </p>
      </div>
    )
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-toolbar">
        <span className="pdf-filename mono" title={fileName}>
          {fileName || 'PDF'}
        </span>
        <span className="pdf-hint mono">Select text → highlight or Ask AI</span>
        <div className="pdf-toolbar-right">
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
          >
            <ChevronLeft size={15} />
          </button>
          <span className="mono pdf-page">
            {page}
            {numPages ? ` / ${numPages}` : ''}
          </span>
          <button
            type="button"
            className="btn-soft"
            disabled={numPages != null && page >= numPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="pdf-stage" ref={stageRef} onMouseUp={onMouseUp}>
        {error ? <p className="pdf-error">{error}</p> : null}
        <div className="pdf-page-wrap">
          <Document
            file={file}
            loading={<p className="pdf-loading mono">Loading PDF…</p>}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n)
              setError('')
            }}
            onLoadError={(err) => {
              console.error('PDF load error', err)
              setError('Could not open this PDF. Remove it and add it again.')
            }}
          >
            <Page
              pageNumber={page}
              scale={scale}
              renderTextLayer
              renderAnnotationLayer
              loading={<p className="pdf-loading mono">Rendering page…</p>}
            />
          </Document>

          <div className="pdf-highlight-layer" aria-hidden>
            {pageHighlights.map((h) =>
              (h.rects || []).map((r, i) => (
                <span
                  key={`${h.id}-${i}`}
                  className="pdf-hl"
                  style={{
                    top: `${r.top * 100}%`,
                    left: `${r.left * 100}%`,
                    width: `${r.width * 100}%`,
                    height: `${r.height * 100}%`,
                  }}
                />
              ))
            )}
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
