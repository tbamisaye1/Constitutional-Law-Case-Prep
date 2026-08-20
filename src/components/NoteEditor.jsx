import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef } from 'react'
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

/**
 * TipTap note surface (https://github.com/ueberdosis/tiptap).
 * Tab / Shift+Tab sink and lift list items (OneNote-style indents).
 *
 * immediatelyRender: false is required for React 19 Strict Mode so the editor
 * does not mount twice and write an empty doc over saved notes.
 */
export function NoteEditor({ html, onChange, editable = true }) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const skipping = useRef(true)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write like OneNote: holdings, nested bullets (Tab to indent)…',
      }),
    ],
    content: html || '<p></p>',
    editable,
    onUpdate: ({ editor: ed }) => {
      if (skipping.current) return
      onChangeRef.current?.(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'note-prose',
      },
    },
  })

  useEffect(() => {
    if (!editor) return undefined
    skipping.current = false
    return () => {
      skipping.current = true
      if (!editor.isDestroyed) {
        onChangeRef.current?.(editor.getHTML())
      }
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

  useEffect(() => {
    if (!editor) return undefined
    const onKey = (event) => {
      if (event.key !== 'Tab') return
      if (!editor.isFocused) return
      event.preventDefault()
      if (event.shiftKey) {
        editor.chain().focus().liftListItem('listItem').run()
      } else {
        editor.chain().focus().sinkListItem('listItem').run()
      }
    }
    const dom = editor.view.dom
    dom.addEventListener('keydown', onKey)
    return () => dom.removeEventListener('keydown', onKey)
  }, [editor])

  if (!editor) return null

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
        <ToolBtn
          label="Heading"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </ToolBtn>
        <ToolBtn
          label="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolBtn>
        <ToolBtn
          label="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </ToolBtn>
        <ToolBtn
          label="Indent"
          onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
        >
          <IndentIncrease size={16} />
        </ToolBtn>
        <ToolBtn
          label="Outdent"
          onClick={() => editor.chain().focus().liftListItem('listItem').run()}
        >
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
