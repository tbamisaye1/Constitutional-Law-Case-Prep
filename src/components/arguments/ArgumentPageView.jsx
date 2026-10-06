import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bold,
  Heading2,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import { createDocument, getHTMLFromFragment } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import { baseNoteExtensions, handleNoteKeyDown } from '../NoteEditor'
import { OutlineHeading, OUTLINE_NODE } from '../../extensions/outlineHeading'
import { OutlineFold, foldKey } from '../../extensions/outlineFold'
import {
  applyPageToDraft,
  draftPageKey,
  draftToPageHtml,
  moveBlockOrder,
  pageJsonToDraftParts,
  restoreUntouched,
} from '../../lib/argumentPage'
import { mergeDrafts } from '../../lib/argumentsMerge'
import { editorFlushSuppressed } from '../../lib/editorFlush'
import { indentSelection, outdentSelection, toggleOrCycleOrderedList } from '../../lib/noteEditorIndent'
import { PageOutline } from './PageOutline'
import { ScratchPane } from './ScratchPane'

/** Quiet period before typing turns into a board update. */
const EMIT_MS = 300

const FOLD_KEY = 'case-prep-args-fold-v1'

function readFolds(draftId) {
  try {
    const all = JSON.parse(localStorage.getItem(FOLD_KEY) || '{}')
    return Array.isArray(all[draftId]) ? all[draftId] : []
  } catch {
    return []
  }
}

function writeFolds(draftId, ids) {
  try {
    const all = JSON.parse(localStorage.getItem(FOLD_KEY) || '{}')
    all[draftId] = ids
    localStorage.setItem(FOLD_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

function serializeWith(schema) {
  return (nodes) =>
    getHTMLFromFragment(Fragment.fromArray(nodes.map((n) => schema.nodeFromJSON(n))), schema)
}

/** Top-level headings with their positions, read straight from the doc. */
export function readOutline(doc) {
  const items = []
  let s = 0
  let p = 0
  let index = 0
  doc.forEach((node, offset) => {
    if (node.type.name === OUTLINE_NODE) {
      const kind = node.attrs.kind === 'prong' && s > 0 ? 'prong' : 'section'
      if (kind === 'section') {
        s += 1
        p = 0
      } else p += 1
      items.push({
        id: node.attrs.id,
        kind,
        index,
        pos: offset,
        end: offset + node.nodeSize,
        number: kind === 'section' ? `${s}` : `${s}.${p}`,
        title: node.textContent,
      })
    }
    index += 1
  })
  return items
}

/** Where the cursor sits, as "heading id + offset into that block". */
function anchorOf(editor) {
  const head = editor.state.selection.head
  const outline = readOutline(editor.state.doc)
  let owner = null
  for (const item of outline) if (item.pos <= head) owner = item
  return owner ? { id: owner.id, offset: head - owner.pos } : { id: null, offset: head }
}

function restoreAnchor(editor, anchor) {
  if (!anchor) return
  const outline = readOutline(editor.state.doc)
  const owner = anchor.id ? outline.find((i) => i.id === anchor.id) : null
  const size = editor.state.doc.content.size
  const target = Math.max(1, Math.min(size, (owner ? owner.pos : 0) + anchor.offset))
  try {
    const tr = editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(target)))
    tr.setMeta('addToHistory', false)
    editor.view.dispatch(tr)
  } catch {
    /* selection restore is best effort */
  }
}

/**
 * The Arguments board as one page: outline on the left (generated from the
 * headings), the draft as a single document in the middle, scratch on the
 * right. Storage is still draft → sections → prongs; see lib/argumentPage.
 */
export function ArgumentPageView({ args, scratchOpen, setScratchOpen, expanded }) {
  const draft = args.activeDraft
  if (!draft) return <p className="args-empty">No draft yet.</p>
  return (
    <PageEditorForDraft
      // Remount per draft: undo history and folds belong to one draft.
      key={`${args.side}:${draft.id}`}
      args={args}
      draft={draft}
      scratchOpen={scratchOpen}
      setScratchOpen={setScratchOpen}
      expanded={expanded}
    />
  )
}

function PageEditorForDraft({ args, draft, scratchOpen, setScratchOpen, expanded }) {
  const draftId = draft.id
  const argsRef = useRef(args)
  argsRef.current = args

  // What the editor last agreed with storage on, in two forms:
  //   rawRef  - the draft exactly as stored (what we compare storage against)
  //   normRef - the same draft as the editor renders it (what we compare the
  //             editor against, and the base of the in-editor merge)
  // Keeping both stops harmless re-serialization from counting as an edit.
  const rawRef = useRef(draft)
  const normRef = useRef(null)
  const emitTimer = useRef(0)
  const editorRef = useRef(null)
  const [outline, setOutline] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [notice, setNotice] = useState('')
  const [, bump] = useState(0)

  const refreshOutline = useCallback((ed) => {
    if (!ed || ed.isDestroyed) return
    const items = readOutline(ed.state.doc)
    setOutline((prev) => (JSON.stringify(prev) === JSON.stringify(items) ? prev : items))
    const head = ed.state.selection.head
    let owner = null
    for (const item of items) if (item.pos <= head) owner = item
    setActiveId(owner?.id || null)
  }, [])

  /** Push the editor's content into the board now. */
  const emitNow = useCallback(() => {
    window.clearTimeout(emitTimer.current)
    emitTimer.current = 0
    const ed = editorRef.current
    if (!ed || ed.isDestroyed || editorFlushSuppressed() || !normRef.current) return
    const parts = pageJsonToDraftParts(ed.getJSON(), serializeWith(ed.schema))
    const nextNorm = applyPageToDraft(normRef.current, parts)
    if (nextNorm === normRef.current) return
    const stored = restoreUntouched(parts, normRef.current, rawRef.current)
    normRef.current = nextNorm
    rawRef.current = applyPageToDraft(rawRef.current, stored)
    argsRef.current.replaceDraftPage(draftId, stored)
  }, [draftId])

  const scheduleEmit = useCallback(() => {
    window.clearTimeout(emitTimer.current)
    emitTimer.current = window.setTimeout(emitNow, EMIT_MS)
  }, [emitNow])

  const sendSelectionToScratch = useCallback(() => {
    const ed = editorRef.current
    if (!ed || ed.state.selection.empty) return false
    const slice = ed.state.selection.content()
    const html = getHTMLFromFragment(slice.content, ed.schema)
    const items = readOutline(ed.state.doc)
    let owner = null
    for (const item of items) if (item.pos <= ed.state.selection.from) owner = item
    const label = owner ? `${owner.number} ${owner.title}`.trim() : 'whole-draft notes'
    const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    argsRef.current.appendDraftScratch(
      draftId,
      `<p><em>↳ from ${safe}</em></p>${html.replace(/<h1 data-outline[^>]*>/g, '<h3>').replace(/<\/h1>/g, '</h3>')}`
    )
    setScratchOpen(true)
    setNotice('Sent to scratch')
    return true
  }, [draftId, setScratchOpen])

  const initialFolds = useMemo(() => readFolds(draftId), [draftId])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...baseNoteExtensions({
        placeholder:
          'Write the argument. Type "/section " or ⌘⌥1 for a section, "/prong " or ⌘⌥2 for a prong.',
      }),
      OutlineHeading,
      OutlineFold.configure({
        initial: initialFolds,
        onChange: (ids) => writeFolds(draftId, ids),
      }),
    ],
    content: draftToPageHtml(draft),
    onCreate: ({ editor: ed }) => refreshOutline(ed),
    onUpdate: ({ editor: ed, transaction }) => {
      refreshOutline(ed)
      bump((n) => n + 1)
      if (transaction.docChanged && !transaction.getMeta('fromStorage')) scheduleEmit()
    },
    onSelectionUpdate: ({ editor: ed }) => {
      refreshOutline(ed)
      bump((n) => n + 1)
    },
    editorProps: {
      attributes: { class: 'note-prose arg-page-prose', spellcheck: 'true' },
      handleKeyDown: (_view, event) => {
        const ed = editorRef.current
        if (!ed) return false
        const mod = event.metaKey || event.ctrlKey
        if (mod && event.shiftKey && (event.key === 's' || event.key === 'S')) {
          event.preventDefault()
          return sendSelectionToScratch()
        }
        // Tab on a heading: section ⇄ prong, like demoting a OneNote title.
        if (event.key === 'Tab' && ed.state.selection.$from.parent.type.name === OUTLINE_NODE) {
          event.preventDefault()
          const kind = ed.state.selection.$from.parent.attrs.kind
          if ((event.shiftKey && kind === 'prong') || (!event.shiftKey && kind === 'section')) {
            ed.commands.toggleOutlineKind()
          }
          return true
        }
        return handleNoteKeyDown(ed, event)
      },
    },
  })
  editorRef.current = editor

  // Flush on blur / tab hide / unmount so nothing typed is lost.
  useEffect(() => {
    if (!editor) return undefined
    const flushIfPending = () => {
      if (emitTimer.current) emitNow()
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushIfPending()
    }
    editor.on('blur', flushIfPending)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flushIfPending)
    return () => {
      flushIfPending()
      editor.off('blur', flushIfPending)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flushIfPending)
    }
  }, [editor, emitNow])

  /** A stored draft as the editor would render it (schema round-trip). */
  const normalize = useCallback((stored) => {
    const ed = editorRef.current
    if (!ed) return stored
    const doc = createDocument(draftToPageHtml(stored), ed.schema)
    return applyPageToDraft(stored, pageJsonToDraftParts(doc.toJSON(), serializeWith(ed.schema)))
  }, [])

  // First render of the editor: record the normalized baseline.
  useEffect(() => {
    if (!editor || normRef.current) return
    normRef.current = normalize(rawRef.current)
  }, [editor, normalize])

  // Storage changed underneath us (sync pull, MCP, another tab, Outline view).
  useEffect(() => {
    if (!editor || editor.isDestroyed || !normRef.current) return
    if (draftPageKey(draft) === draftPageKey(rawRef.current)) return

    const remoteNorm = normalize(draft)
    const localParts = pageJsonToDraftParts(editor.getJSON(), serializeWith(editor.schema))
    const localNorm = applyPageToDraft(normRef.current, localParts)
    const hasLocalEdits = localNorm !== normRef.current

    if (!hasLocalEdits && draftPageKey(remoteNorm) === draftPageKey(normRef.current)) {
      // Same content, different markup (e.g. our own save echoed back).
      rawRef.current = draft
      normRef.current = remoteNorm
      return
    }

    let shownNorm = remoteNorm
    let storedParts = null
    if (hasLocalEdits) {
      const merged = mergeDrafts(
        normRef.current,
        { ...localNorm, scratch: draft.scratch },
        { ...remoteNorm, scratch: draft.scratch }
      ).draft
      shownNorm = merged
      storedParts = restoreUntouched(
        { notes: merged.notes || '', sections: merged.sections || [] },
        remoteNorm,
        draft
      )
      if ((merged.scratch || '') !== (draft.scratch || '')) {
        argsRef.current.setDraftScratch(draftId, merged.scratch)
      }
    }

    window.clearTimeout(emitTimer.current)
    emitTimer.current = 0
    const anchor = anchorOf(editor)
    // One transaction, kept out of undo history: ⌘Z must undo the user's own
    // typing, not silently revert a change that came from the database.
    const nextDoc = createDocument(draftToPageHtml(shownNorm), editor.schema)
    const tr = editor.state.tr
      .replaceWith(0, editor.state.doc.content.size, nextDoc.content)
      .setMeta('addToHistory', false)
      .setMeta('fromStorage', true)
    editor.view.dispatch(tr)
    if (editor.isFocused) restoreAnchor(editor, anchor)
    normRef.current = shownNorm
    refreshOutline(editor)

    if (storedParts) {
      rawRef.current = applyPageToDraft(draft, storedParts)
      argsRef.current.replaceDraftPage(draftId, storedParts)
      setNotice(
        (shownNorm.scratch || '') !== (draft.scratch || '')
          ? 'Merged with a change from elsewhere · your clashing text is in Scratch'
          : 'Merged with a change from elsewhere'
      )
    } else {
      rawRef.current = draft
      setNotice('Updated from the database')
    }
  }, [draft, editor, draftId, normalize, refreshOutline])

  useEffect(() => {
    if (!notice) return undefined
    const t = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(t)
  }, [notice])

  // Outline actions -------------------------------------------------------

  const jumpTo = useCallback((id) => {
    const ed = editorRef.current
    if (!ed) return
    const item = readOutline(ed.state.doc).find((i) => i.id === id)
    if (!item) return
    const folded = foldKey.getState(ed.state)?.folded
    const chain = ed.chain().focus()
    // Put the cursor at the end of the heading's title.
    chain.setTextSelection(item.end - 1).run()
    if (folded?.has(id)) ed.commands.toggleFold(id)
    const dom = ed.view.nodeDOM(item.pos)
    if (dom && typeof dom.scrollIntoView === 'function') {
      dom.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [])

  const moveBlock = useCallback((fromId, beforeId) => {
    const ed = editorRef.current
    if (!ed) return
    const doc = ed.state.doc
    const nodes = []
    doc.forEach((n) => nodes.push(n))
    const kinds = nodes.map((n) => ({ type: n.type.name, kind: n.attrs?.kind }))
    const items = readOutline(doc)
    const from = items.find((i) => i.id === fromId)
    const before = beforeId ? items.find((i) => i.id === beforeId) : null
    if (!from || (beforeId && !before)) return
    const order = moveBlockOrder(kinds, from.index, before ? before.index : null)
    if (!order) return
    const tr = ed.state.tr.replaceWith(0, doc.content.size, Fragment.fromArray(order.map((i) => nodes[i])))
    ed.view.dispatch(tr)
    jumpTo(fromId)
  }, [jumpTo])

  const insertHeading = useCallback((kind, afterId = null) => {
    const ed = editorRef.current
    if (!ed) return
    const doc = ed.state.doc
    const items = readOutline(doc)
    let at = doc.content.size
    if (afterId) {
      const nodes = []
      doc.forEach((n) => nodes.push(n))
      const kinds = nodes.map((n) => ({ type: n.type.name, kind: n.attrs?.kind }))
      const owner = items.find((i) => i.id === afterId)
      if (owner) {
        // End of the owner's whole block (a section's last prong included).
        let end = owner.index + 1
        const rank = owner.kind === 'prong' ? 1 : 0
        while (end < kinds.length) {
          const k = kinds[end]
          if (k.type === OUTLINE_NODE && (k.kind === 'prong' ? 1 : 0) <= rank) break
          end += 1
        }
        at = 0
        for (let i = 0; i < end; i += 1) at += nodes[i].nodeSize
      }
    }
    ed.chain()
      .focus()
      .insertContentAt(at, [
        { type: OUTLINE_NODE, attrs: { kind, id: null } },
        { type: 'paragraph' },
      ])
      .setTextSelection(at + 1)
      .run()
  }, [])

  const deleteBlock = useCallback((id) => {
    const ed = editorRef.current
    if (!ed) return
    const doc = ed.state.doc
    const nodes = []
    doc.forEach((n) => nodes.push(n))
    const items = readOutline(doc)
    const item = items.find((i) => i.id === id)
    if (!item) return
    const kinds = nodes.map((n) => ({ type: n.type.name, kind: n.attrs?.kind }))
    let end = item.index + 1
    const rank = item.kind === 'prong' ? 1 : 0
    while (end < kinds.length) {
      const k = kinds[end]
      if (k.type === OUTLINE_NODE && (k.kind === 'prong' ? 1 : 0) <= rank) break
      end += 1
    }
    let from = 0
    for (let i = 0; i < item.index; i += 1) from += nodes[i].nodeSize
    let to = from
    for (let i = item.index; i < end; i += 1) to += nodes[i].nodeSize
    const what = item.kind === 'section' ? 'this section and everything under it' : 'this prong and its notes'
    if (!window.confirm(`Delete ${what}? (Undo with ⌘Z.)`)) return
    ed.chain().focus().deleteRange({ from, to }).run()
  }, [])

  if (!editor) return null

  const inHeading = editor.state.selection.$from.parent.type.name === OUTLINE_NODE
  const headingKind = inHeading ? editor.state.selection.$from.parent.attrs.kind : null

  return (
    <div
      className={[
        'argpage',
        expanded ? 'is-expanded' : '',
        scratchOpen ? 'has-scratch' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!expanded ? (
        <PageOutline
          args={args}
          outline={outline}
          activeId={activeId}
          onJump={jumpTo}
          onMove={moveBlock}
          onAdd={insertHeading}
          onDelete={deleteBlock}
        />
      ) : null}

      <div className="argpage-main">
        <div className="argpage-toolbar note-toolbar" role="toolbar" aria-label="Formatting">
          <Tool label="Bold (⌘B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={16} />
          </Tool>
          <Tool label="Italic (⌘I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={16} />
          </Tool>
          <Tool
            label="Heading inside notes (## )"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 size={16} />
          </Tool>
          <Tool label="Bullets (- )" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List size={16} />
          </Tool>
          <Tool label="Numbered (1. / a. / i.)" active={editor.isActive('orderedList')} onClick={() => toggleOrCycleOrderedList(editor)}>
            <ListOrdered size={16} />
          </Tool>
          <Tool label="Indent (Tab)" onClick={() => indentSelection(editor)}>
            <IndentIncrease size={16} />
          </Tool>
          <Tool label="Outdent (⇧Tab)" onClick={() => outdentSelection(editor)}>
            <IndentDecrease size={16} />
          </Tool>
          <Tool label="Quote (> )" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote size={16} />
          </Tool>
          <span className="argpage-tool-sep" />
          <button
            type="button"
            className={headingKind === 'section' ? 'note-tool argpage-struct on' : 'note-tool argpage-struct'}
            title="Make this line a section heading (⌘⌥1, or type /section )"
            onClick={() => editor.chain().focus().setOutlineHeading('section').run()}
          >
            Section
          </button>
          <button
            type="button"
            className={headingKind === 'prong' ? 'note-tool argpage-struct on' : 'note-tool argpage-struct'}
            title="Make this line a prong heading (⌘⌥2, or type /prong )"
            onClick={() => editor.chain().focus().setOutlineHeading('prong').run()}
          >
            Prong
          </button>
          {inHeading ? (
            <button
              type="button"
              className="note-tool argpage-struct"
              title="Turn this heading back into text (Backspace at its start)"
              onClick={() => editor.chain().focus().unsetOutlineHeading().run()}
            >
              Text
            </button>
          ) : null}
          <span className="note-toolbar-gap" />
          {notice ? <span className="argpage-notice mono">{notice}</span> : null}
          <button
            type="button"
            className="note-tool argpage-struct"
            disabled={editor.state.selection.empty}
            title="Send the selected text to Scratch (⌘⇧S)"
            onClick={sendSelectionToScratch}
          >
            → Scratch
          </button>
          <Tool label="Undo (⌘Z)" onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 size={16} />
          </Tool>
          <Tool label="Redo (⌘⇧Z)" onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 size={16} />
          </Tool>
        </div>
        <EditorContent editor={editor} className="argpage-editor" />
      </div>

      {scratchOpen ? (
        <ScratchPane
          draft={draft}
          onChange={(html) => args.setDraftScratch(draftId, html)}
          onAppend={(html) => args.appendDraftScratch(draftId, html)}
          onClose={() => setScratchOpen(false)}
        />
      ) : null}
    </div>
  )
}

function Tool({ label, active, onClick, children }) {
  return (
    <button
      type="button"
      className={active ? 'note-tool on' : 'note-tool'}
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
