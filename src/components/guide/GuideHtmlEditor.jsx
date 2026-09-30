import { useEffect, useRef, useState } from 'react'
import {
  Bold,
  Highlighter,
  Italic,
  Square,
  Table,
  TriangleAlert,
} from 'lucide-react'

/**
 * Guide section editor that keeps custom HTML (tables, callouts, traps).
 *
 * TipTap's default schema strips those nodes, which is how "Done editing"
 * flattened the posture table into merged words. This surface edits the HTML
 * in place instead of re-parsing it through a narrow schema.
 */
export function GuideHtmlEditor({ html, onChange }) {
  const ref = useRef(null)
  const skipping = useRef(true)
  const [tone, setTone] = useState('note')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement === el) return
    skipping.current = true
    el.innerHTML = html || '<p></p>'
    skipping.current = false
  }, [html])

  function emit() {
    if (skipping.current || !ref.current) return
    onChange?.(ref.current.innerHTML)
  }

  function run(command, value) {
    ref.current?.focus()
    document.execCommand(command, false, value)
    emit()
  }

  function wrapSelection(tagName, className) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const wrapper = document.createElement(tagName)
    if (className) wrapper.className = className
    try {
      range.surroundContents(wrapper)
    } catch {
      // Selection crosses element boundaries — fall back to bold-style command.
      if (tagName === 'mark') run('hiliteColor', '#f5d78e')
      return
    }
    emit()
  }

  function insertHtml(snippet) {
    ref.current?.focus()
    document.execCommand('insertHTML', false, snippet)
    emit()
  }

  function insertCallout(nextTone) {
    const label = nextTone === 'warn' ? 'Watch out' : nextTone === 'good' ? 'Keep this' : 'Note'
    insertHtml(
      `<div class="guide-call ${nextTone}"><span class="lab">${label}</span><p>Write the callout here…</p></div><p></p>`
    )
    setTone(nextTone)
  }

  function insertTable() {
    insertHtml(
      `<div class="guide-table-wrap"><table><tr><th>Column</th><th>Column</th><th>Column</th></tr><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></table></div><p></p>`
    )
  }

  return (
    <div className="guide-html-editor">
      <div className="note-toolbar" role="toolbar" aria-label="Guide formatting">
        <ToolBtn label="Bold" onClick={() => run('bold')}>
          <Bold size={16} />
        </ToolBtn>
        <ToolBtn label="Italic" onClick={() => run('italic')}>
          <Italic size={16} />
        </ToolBtn>
        <ToolBtn label="Highlight" onClick={() => wrapSelection('mark', 'guide-mark')}>
          <Highlighter size={16} />
        </ToolBtn>
        <span className="note-toolbar-gap" />
        <ToolBtn
          label="Insert note callout (orange box)"
          active={tone === 'note'}
          onClick={() => insertCallout('note')}
        >
          <Square size={16} />
        </ToolBtn>
        <ToolBtn label="Insert warning callout" onClick={() => insertCallout('warn')}>
          <TriangleAlert size={16} />
        </ToolBtn>
        <ToolBtn label="Insert table" onClick={insertTable}>
          <Table size={16} />
        </ToolBtn>
      </div>
      <p className="guide-editor-hint mono">
        Highlight text, or insert an orange note box / table. Structured guide layout is kept when
        you leave Edit.
      </p>
      <div
        ref={ref}
        className="guide-prose guide-prose-editable"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Guide section body"
        onInput={emit}
        onBlur={emit}
      />
    </div>
  )
}

function ToolBtn({ label, active, onClick, children }) {
  return (
    <button
      type="button"
      className={active ? 'note-tool on' : 'note-tool'}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
