import { useEffect, useRef, useState } from 'react'
import { PanelRightClose } from 'lucide-react'
import { NoteEditor } from '../NoteEditor'

const WIDTH_KEY = 'case-prep-args-scratch-width'
const MIN_W = 240
const MAX_W = 640

function readWidth() {
  try {
    const n = Number(localStorage.getItem(WIDTH_KEY))
    return Number.isFinite(n) && n >= MIN_W && n <= MAX_W ? n : 340
  } catch {
    return 340
  }
}

function escapeText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Messy notes next to the argument: the OneNote side column. One per draft,
 * synced with the board. A one-line capture box at the top drops a timestamped
 * thought without breaking your place; drag or ⌘⇧S moves text across from the
 * page.
 */
export function ScratchPane({ draft, onChange, onAppend, onClose }) {
  const [width, setWidth] = useState(readWidth)
  const [capture, setCapture] = useState('')
  const captureRef = useRef(null)
  const dragging = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(WIDTH_KEY, String(width))
    } catch {
      /* ignore */
    }
  }, [width])

  // ⌘J (Ctrl+J) from anywhere on the page focuses the capture box.
  useEffect(() => {
    function onKey(event) {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && (event.key === 'j' || event.key === 'J')) {
        event.preventDefault()
        captureRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function submitCapture() {
    const text = capture.trim()
    if (!text) return
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    onAppend(`<p><span class="scratch-stamp">${stamp}</span> ${escapeText(text)}</p>`)
    setCapture('')
  }

  function startResize(event) {
    event.preventDefault()
    dragging.current = { x: event.clientX, w: width }
    const move = (e) => {
      if (!dragging.current) return
      const next = dragging.current.w + (dragging.current.x - e.clientX)
      setWidth(Math.max(MIN_W, Math.min(MAX_W, next)))
    }
    const up = () => {
      dragging.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <aside className="argpage-scratch" style={{ width }} aria-label="Scratch notes">
      <div
        className="argpage-scratch-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize scratch"
        onPointerDown={startResize}
        onDoubleClick={() => setWidth(340)}
      />
      <div className="argpage-scratch-head">
        <span className="mono argpage-scratch-label">Scratch · {draft.name}</span>
        <button type="button" className="btn-soft" onClick={onClose} title="Hide scratch">
          <PanelRightClose size={15} /> Hide
        </button>
      </div>
      <input
        ref={captureRef}
        className="argpage-capture"
        value={capture}
        placeholder="Drop a thought and press Enter (⌘J)"
        aria-label="Quick capture to scratch"
        onChange={(e) => setCapture(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submitCapture()
          }
          if (e.key === 'Escape') e.currentTarget.blur()
        }}
      />
      <NoteEditor
        lean
        html={draft.scratch || ''}
        onChange={onChange}
        placeholder="Anything goes: half-thoughts, quotes to place, questions for later. Drag text into the page when it finds a home."
      />
    </aside>
  )
}
