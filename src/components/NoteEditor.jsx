import { useEffect, useReducer, useRef } from 'react'
import { hasUnsentEdits } from '../lib/editorFlush'
import { OutlineHeading } from '../extensions/outlineHeading'
import { PageDocument } from '../extensions/pageDocument'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo2,
  Redo2,
  IndentIncrease,
  IndentDecrease,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontSize } from '@tiptap/extension-text-style/font-size'
import { AlphaListInput } from '../extensions/alphaListInput'
import { BlockIndent } from '../extensions/blockIndent'
import { ListItemWithBlocks } from '../extensions/listItemWithBlocks'
import {
  deleteEmptyListItem,
  exitBlockquoteOnEnter,
  indentSelection,
  outdentSelection,
  toggleOrCycleOrderedList,
} from '../lib/noteEditorIndent'
import {
  NOTE_FONT_SIZES,
  applyFontSizeToAll,
  applyFontSizeToSelection,
  currentFontSize,
} from '../lib/noteFontSize'
import { editorFlushSuppressed } from '../lib/editorFlush'

/**
 * Extensions every note surface shares (Arguments page, scratch, case notes).
 * Kept in one place so Tab-nesting, quotes-in-lists and a./1. lists behave the
 * same wherever the user is typing.
 */
/**
 * @param {object} [options]
 * @param {string} [options.placeholder]
 * @param {boolean} [options.outlineStructure] true only for the Arguments page
 *   editor (sections / prongs / points are editable structure there). Every
 *   other note editor still parses outline headings, so a prong's sub-points
 *   survive being edited in the Outline view.
 */
export function baseNoteExtensions({ placeholder, outlineStructure = false } = {}) {
  return [
    StarterKit.configure({
      // Replace default listItem so quotes can wrap a line inside an indent.
      listItem: false,
      // The Arguments page needs a document that also accepts outline
      // headings, which are kept out of lists and quotes (see outlineHeading).
      ...(outlineStructure ? { document: false } : {}),
    }),
    ...(outlineStructure ? [PageDocument] : []),
    ListItemWithBlocks,
    TextStyle,
    FontSize,
    BlockIndent,
    AlphaListInput,
    OutlineHeading.configure({ structure: outlineStructure }),
    Placeholder.configure({
      placeholder:
        placeholder || 'Write like OneNote: "a. " for letters, "1. " for numbers, Tab to nest…',
    }),
  ]
}

/**
 * OneNote-style keys shared by every note surface. Returns true when handled.
 */
export function handleNoteKeyDown(ed, event) {
  if (!ed || ed.isDestroyed) return false

  // Empty line inside a quote: Enter exits the quote and stays on the
  // same list item so the next Enter can continue 3. 4. …
  if (event.key === 'Enter' && !event.shiftKey && exitBlockquoteOnEnter(ed)) {
    return true
  }

  // Empty 3. under A.: delete that sub-indent only. TipTap's default
  // Backspace lifts it into a blank top-level item between A. and B.
  if (
    (event.key === 'Backspace' || event.key === 'Delete') &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    deleteEmptyListItem(ed)
  ) {
    return true
  }

  if (event.key !== 'Tab') return false
  // Always consume Tab so focus stays in the note. At the indent bound
  // the command is a no-op, which is better than jumping to the next control.
  // Shift+Tab inside a quote lifts out of the quote before leaving the list.
  if (event.shiftKey) outdentSelection(ed)
  else indentSelection(ed)
  return true
}

/** Replace the editor content with the parent's version without echoing it back. */
function applyIncoming(editor, html, skipping) {
  if (html == null || editor.isDestroyed) return
  if (html === editor.getHTML()) return
  skipping.current = true
  editor.commands.setContent(html, { emitUpdate: false })
  skipping.current = false
}

/**
 * TipTap note surface (https://github.com/ueberdosis/tiptap).
 * Tab / Shift+Tab nest lists, start a list, or indent the block (OneNote-style).
 * Numbered-list button cycles 1. → a. → i. while already in an ordered list.
 * Font size applies to the selection (or current block), or to the whole note.
 *
 * immediatelyRender: false is required for React 19 Strict Mode so the editor
 * does not mount twice and write an empty doc over saved notes.
 *
 * Do not write getHTML() on unmount. That used to re-serialize through the
 * schema and wipe custom guide markup when the user only opened Edit / Done.
 */
export function NoteEditor({ html, onChange, editable = true, placeholder, lean = false }) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const skipping = useRef(true)
  const editorRef = useRef(null)
  // What this editor last handed to onChange. A flush (blur, tab hidden, page
  // closed, unmount) only re-sends content the user typed that has not been
  // sent yet. Without this, an editor still showing an old copy (focused when
  // a newer version arrived, so setContent was skipped) wrote that old copy
  // back over the newer one the moment the user clicked away or closed the
  // tab. That is how restored scratch notes were wiped.
  const lastSent = useRef(null)
  const latestHtml = useRef(html)
  latestHtml.current = html
  const [, bumpToolbar] = useReducer((n) => n + 1, 0)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: baseNoteExtensions({ placeholder }),
    content: html || '<p></p>',
    editable,
    onUpdate: ({ editor: ed }) => {
      if (skipping.current) return
      const next = ed.getHTML()
      lastSent.current = next
      onChangeRef.current?.(next)
      bumpToolbar()
    },
    onSelectionUpdate: () => bumpToolbar(),
    editorProps: {
      attributes: {
        class: 'note-prose',
      },
      handleKeyDown: (_view, event) => handleNoteKeyDown(editorRef.current, event),
    },
  })

  editorRef.current = editor

  useEffect(() => {
    if (!editor) return undefined
    skipping.current = false
    return () => {
      // Flush the open doc before TipTap tears down so a quick section/page
      // switch cannot drop the last keystrokes before React state updates.
      // Never flush a near-empty doc: Strict Mode remounts and case switches
      // used to write "<p></p>" over real notes for the previous case.
      if (!skipping.current && !editor.isDestroyed && !editorFlushSuppressed()) {
        try {
          const nextHtml = editor.getHTML()
          if (!hasUnsentEdits(nextHtml, lastSent.current, latestHtml.current)) return
          const plain = nextHtml
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          if (plain.length > 0) onChangeRef.current?.(nextHtml)
        } catch {
          /* ignore */
        }
      }
      skipping.current = true
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return undefined
    const flush = () => {
      if (skipping.current || editor.isDestroyed || editorFlushSuppressed()) return
      const current = editor.getHTML()
      if (hasUnsentEdits(current, lastSent.current, latestHtml.current)) {
        lastSent.current = current
        onChangeRef.current?.(current)
        return
      }
      // Nothing unsent: if a newer version arrived while focused, show it now.
      applyIncoming(editor, latestHtml.current, skipping)
    }
    const dom = editor.view.dom
    dom.addEventListener('blur', flush)
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      dom.removeEventListener('blur', flush)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
    }
  }, [editor])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (editor.isFocused) return
    applyIncoming(editor, html, skipping)
  }, [html, editor])

  if (!editor) return null

  const orderedType = editor.isActive('orderedList')
    ? editor.getAttributes('orderedList').type || '1'
    : null
  const fontSize = currentFontSize(editor)

  return (
    <div className={lean ? 'note-editor is-lean' : 'note-editor'}>
      <div className="note-toolbar" role="toolbar" aria-label="Formatting">
        <ToolBtn
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolBtn>
        <ToolBtn
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolBtn>
        {!lean ? (
          <>
        <label className="note-font-size">
          <span className="note-font-size-label mono">Size</span>
          <select
            aria-label="Font size for selection or current block"
            title="Font size for the selection (or current block if nothing is selected)"
            value={fontSize}
            onChange={(event) => applyFontSizeToSelection(editor, event.target.value)}
          >
            {NOTE_FONT_SIZES.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
                {opt.value ? ` (${opt.value})` : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="note-tool note-font-all"
          title="Apply the selected size to the whole note"
          aria-label="Apply font size to whole note"
          onClick={() => applyFontSizeToAll(editor, fontSize)}
        >
          All
        </button>
        <ToolBtn
          label="Heading"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </ToolBtn>
          </>
        ) : null}
        <ToolBtn
          label="Bullet list (-)"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolBtn>
        <ToolBtn
          label={
            orderedType
              ? `Numbered list (now ${orderedType}. — click to cycle 1/a/i)`
              : 'Numbered list (1. / a. / i.)'
          }
          active={editor.isActive('orderedList')}
          onClick={() => toggleOrCycleOrderedList(editor)}
        >
          <ListOrdered size={16} />
        </ToolBtn>
        <ToolBtn label="Indent" onClick={() => indentSelection(editor)}>
          <IndentIncrease size={16} />
        </ToolBtn>
        <ToolBtn label="Outdent" onClick={() => outdentSelection(editor)}>
          <IndentDecrease size={16} />
        </ToolBtn>
        <ToolBtn
          label="Quote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={16} />
        </ToolBtn>
        {!lean ? (
          <>
        <span className="note-toolbar-gap" />
        <ToolBtn label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={16} />
        </ToolBtn>
        <ToolBtn label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={16} />
        </ToolBtn>
          </>
        ) : null}
      </div>
      <EditorContent editor={editor} />
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
