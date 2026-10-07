import { useEffect, useMemo, useRef, useState } from 'react'
import { CornerDownRight, PanelRightClose } from 'lucide-react'
import { NoteEditor } from '../NoteEditor'
import {
  ALL_KEY,
  GENERAL_KEY,
  isBlankHtml,
  orphanPieces,
  scratchPieces,
} from '../../lib/pieceScratch'

const WIDTH_KEY = 'case-prep-args-scratch-width'
const FOLLOW_KEY = 'case-prep-args-scratch-follow'
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

function readFollow() {
  try {
    return localStorage.getItem(FOLLOW_KEY) !== '0'
  } catch {
    return true
  }
}

function escapeText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function pieceLabel(piece) {
  if (piece.kind === 'general') return 'General'
  if (piece.kind === 'orphan') return 'From a deleted piece'
  return `${piece.number} ${piece.title || 'Untitled'}`
}

/**
 * Messy notes next to the argument: the OneNote side column.
 *
 * One scratch box per piece (section, prong, sub-point) plus General, chosen
 * from the menu at the top. "Follow" switches to the piece the cursor is in
 * on the page. "All" shows every box with notes, in outline order, each still
 * editable and saved back to its own piece.
 */
export function ScratchPane({ draft, currentPieceId, onChangePiece, onAppendPiece, onJump, onClose }) {
  const [width, setWidth] = useState(readWidth)
  const [capture, setCapture] = useState('')
  const [follow, setFollow] = useState(readFollow)
  const [selected, setSelected] = useState(currentPieceId || GENERAL_KEY)
  const captureRef = useRef(null)
  const paneRef = useRef(null)
  const dragging = useRef(null)

  const pieces = useMemo(() => scratchPieces(draft), [draft])
  const orphans = useMemo(() => orphanPieces(draft), [draft])
  const byKey = useMemo(() => new Map([...pieces, ...orphans].map((p) => [p.key, p])), [pieces, orphans])

  useEffect(() => {
    try {
      localStorage.setItem(WIDTH_KEY, String(width))
    } catch {
      /* ignore */
    }
  }, [width])

  useEffect(() => {
    try {
      localStorage.setItem(FOLLOW_KEY, follow ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [follow])

  // Follow the cursor on the page, unless the user is typing in the pane.
  useEffect(() => {
    if (!follow || selected === ALL_KEY) return
    if (paneRef.current?.contains(document.activeElement)) return
    const next = currentPieceId && byKey.has(currentPieceId) ? currentPieceId : GENERAL_KEY
    setSelected(next)
  }, [follow, currentPieceId, byKey, selected])

  // A piece that disappeared (deleted heading) falls back to General.
  const current = selected === ALL_KEY ? null : byKey.get(selected) || byKey.get(GENERAL_KEY)
  const currentKey = selected === ALL_KEY ? ALL_KEY : current.key

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
    const target = currentKey === ALL_KEY ? GENERAL_KEY : currentKey
    onAppendPiece(target, `<p><span class="scratch-stamp">${stamp}</span> ${escapeText(text)}</p>`)
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

  function choose(key) {
    setSelected(key)
    // Picking something other than where the cursor is stops following, so
    // the choice sticks.
    const followTarget = currentPieceId && byKey.has(currentPieceId) ? currentPieceId : GENERAL_KEY
    if (key !== followTarget) setFollow(false)
  }

  const joined = [...pieces, ...orphans].filter(
    (p) => p.key === GENERAL_KEY || !isBlankHtml(p.html)
  )

  return (
    <aside ref={paneRef} className="argpage-scratch" style={{ width }} aria-label="Scratch notes">
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
      <div className="argpage-scratch-picker">
        <select
          className="argpage-scratch-select"
          value={currentKey}
          aria-label="Which notes"
          onChange={(e) => choose(e.target.value)}
        >
          <option value={ALL_KEY}>All notes, joined</option>
          {pieces.map((p) => (
            <option key={p.key} value={p.key}>
              {`${p.kind === 'prong' ? ' ' : p.kind === 'point' ? '  ' : ''}${pieceLabel(p)}${
                isBlankHtml(p.html) ? '' : ' •'
              }`}
            </option>
          ))}
          {orphans.map((p) => (
            <option key={p.key} value={p.key}>
              {pieceLabel(p)} •
            </option>
          ))}
        </select>
        <label className="argpage-scratch-follow mono" title="Show the notes for wherever the cursor is on the page">
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> Follow
        </label>
      </div>
      <input
        ref={captureRef}
        className="argpage-capture"
        value={capture}
        placeholder={`Drop a thought into ${currentKey === ALL_KEY ? 'General' : pieceLabel(current)} (⌘J)`}
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
      {currentKey === ALL_KEY ? (
        <div className="argpage-scratch-all">
          {joined.map((p) => (
            <section key={p.key} className="argpage-scratch-block">
              <h4 className={`argpage-scratch-block-head is-${p.kind}`}>
                <button type="button" onClick={() => choose(p.key)} title="Open just these notes">
                  {pieceLabel(p)}
                </button>
                {p.kind !== 'general' && p.kind !== 'orphan' ? (
                  <button
                    type="button"
                    className="argpage-scratch-jump"
                    onClick={() => onJump?.(p.key)}
                    title="Go to this piece on the page"
                    aria-label="Go to this piece on the page"
                  >
                    <CornerDownRight size={13} />
                  </button>
                ) : null}
              </h4>
              <NoteEditor lean html={p.html} onChange={(html) => onChangePiece(p.key, html)} />
            </section>
          ))}
        </div>
      ) : (
        <NoteEditor
          // One editor per piece: switching pieces never carries text across.
          key={currentKey}
          lean
          html={current.html}
          onChange={(html) => onChangePiece(currentKey, html)}
          placeholder={
            current.kind === 'general'
              ? 'Anything goes: half-thoughts, quotes to place, questions for later.'
              : `Notes for ${pieceLabel(current)}. They move with it if you move the heading.`
          }
        />
      )}
    </aside>
  )
}
