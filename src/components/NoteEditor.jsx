import { useEffect, useReducer, useRef } from 'react'
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
export function NoteEditor({ html, onChange, editable = true }) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const skipping = useRef(true)
  const editorRef = useRef(null)
  const [, bumpToolbar] = useReducer((n) => n + 1, 0)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Replace default listItem so quotes can wrap a line inside an indent.
        listItem: false,
      }),
      ListItemWithBlocks,
      TextStyle,
      FontSize,
      BlockIndent,
      AlphaListInput,
      Placeholder.configure({
        placeholder: 'Write like OneNote: "a. " for letters, "1. " for numbers, Tab to nest…',
      }),
    ],
    content: html || '<p></p>',
    editable,
    onUpdate: ({ editor: ed }) => {
      if (skipping.current) return
      onChangeRef.current?.(ed.getHTML())
      bumpToolbar()
    },
    onSelectionUpdate: () => bumpToolbar(),
    editorProps: {
      attributes: {
        class: 'note-prose',
      },
      handleKeyDown: (_view, event) => {
        const ed = editorRef.current
        if (!ed || ed.isDestroyed) return false

        // Empty line inside a quote: Enter exits the quote and stays on the
        // same list item so the next Enter can continue 3. 4. …
        if (event.key === 'Enter' && !event.shiftKey && exitBlockquoteOnEnter(ed)) {
          return true
        }

        if (event.key !== 'Tab') return false
        // Always consume Tab so focus stays in the note. At the indent bound
        // the command is a no-op, which is better than jumping to the next control.
        // Shift+Tab inside a quote lifts out of the quote before leaving the list.
        if (event.shiftKey) outdentSelection(ed)
        else indentSelection(ed)
        return true
      },
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
      if (!skipping.current && !editor.isDestroyed) {
        try {
          const nextHtml = editor.getHTML()
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
      if (skipping.current || editor.isDestroyed) return
      onChangeRef.current?.(editor.getHTML())
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
    const current = editor.getHTML()
    if (html != null && html !== current) {
      skipping.current = true
      editor.commands.setContent(html, { emitUpdate: false })
      skipping.current = false
    }
  }, [html, editor])

  if (!editor) return null

  const orderedType = editor.isActive('orderedList')
    ? editor.getAttributes('orderedList').type || '1'
    : null
  const fontSize = currentFontSize(editor)

  return (
    <div className="note-editor">
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
        <span className="note-toolbar-gap" />
        <ToolBtn label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={16} />
        </ToolBtn>
        <ToolBtn label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={16} />
        </ToolBtn>
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
