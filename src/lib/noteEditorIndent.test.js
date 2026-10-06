import { describe, expect, it, vi } from 'vitest'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import {
  deleteEmptyListItem,
  exitBlockquoteOnEnter,
  indentSelection,
  isEmptyListItemNode,
  nestedAttrsForParent,
  outdentSelection,
  toggleOrCycleOrderedList,
} from './noteEditorIndent'
import { ListItemWithBlocks } from '../extensions/listItemWithBlocks'

const noteSchema = getSchema([
  StarterKit.configure({ listItem: false }),
  ListItemWithBlocks,
])

function p(text) {
  return noteSchema.node('paragraph', null, text ? [noteSchema.text(text)] : [])
}
function li(...blocks) {
  return noteSchema.node('listItem', null, blocks)
}
function ol(attrs, ...items) {
  return noteSchema.node('orderedList', attrs || {}, items)
}

function paragraphsOf(doc) {
  const out = []
  doc.descendants((node) => {
    if (node.type.name === 'paragraph') out.push(node.textContent)
  })
  return out
}

function emptyParagraphPos(doc) {
  let found = null
  doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' && node.content.size === 0) found = pos + 1
  })
  return found
}

/** Thin TipTap-shaped wrapper around a live ProseMirror state. */
function liveEditor(doc, cursorPos) {
  let state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, cursorPos),
  })
  const editor = {
    isDestroyed: false,
    get state() {
      return state
    },
    chain() {
      const api = {
        focus: () => api,
        command: (fn) => {
          api._fn = fn
          return api
        },
        run: () => {
          let ok = false
          const result = api._fn({
            tr: state.tr,
            state,
            dispatch: (tr) => {
              state = state.apply(tr)
              ok = true
            },
          })
          return result !== false && ok
        },
      }
      return api
    },
  }
  return editor
}

function mockEditor({
  canSink = false,
  canLift = false,
  inOrdered = false,
  orderedType = null,
  indentOk = true,
  outdentOk = true,
} = {}) {
  const run = vi.fn((..._args) => {
    // Last chained command decides the result via closures below.
    return run._result
  })
  run._result = true

  const chainApi = {
    focus: () => chainApi,
    sinkListItem: vi.fn(() => {
      run._result = true
      return chainApi
    }),
    liftListItem: vi.fn(() => {
      run._result = true
      return chainApi
    }),
    toggleOrderedList: vi.fn(() => {
      run._result = true
      return chainApi
    }),
    updateAttributes: vi.fn(() => {
      run._result = true
      return chainApi
    }),
    indentBlocks: vi.fn(() => {
      run._result = indentOk
      return chainApi
    }),
    outdentBlocks: vi.fn(() => {
      run._result = outdentOk
      return chainApi
    }),
    run,
  }

  return {
    isDestroyed: false,
    can: () => ({
      sinkListItem: () => canSink,
      liftListItem: () => canLift,
      lift: () => false,
    }),
    isActive: (name) => name === 'orderedList' && inOrdered,
    getAttributes: () => ({ type: orderedType }),
    chain: () => chainApi,
    _chain: chainApi,
  }
}

describe('indentSelection', () => {
  it('nests a list item when sink is available', () => {
    const editor = mockEditor({ canSink: true })
    expect(indentSelection(editor)).toBe(true)
    expect(editor._chain.sinkListItem).toHaveBeenCalledWith('listItem')
  })

  it('indents the paragraph when sink is not available', () => {
    const editor = mockEditor({ canSink: false, indentOk: true })
    expect(indentSelection(editor)).toBe(true)
    expect(editor._chain.indentBlocks).toHaveBeenCalled()
  })

  it('returns false at the indent bound', () => {
    const editor = mockEditor({ canSink: false, indentOk: false })
    expect(indentSelection(editor)).toBe(false)
  })
})

describe('outdentSelection', () => {
  it('exits a blockquote before lifting the list item', () => {
    const lift = vi.fn(() => true)
    const editor = {
      isDestroyed: false,
      isActive: (name) => name === 'blockquote',
      can: () => ({
        lift: (name) => name === 'blockquote',
        liftListItem: () => true,
      }),
      chain: () => {
        const api = {
          focus: () => api,
          lift: (name) => {
            lift(name)
            return api
          },
          run: () => true,
        }
        return api
      },
    }
    expect(outdentSelection(editor)).toBe(true)
    expect(lift).toHaveBeenCalledWith('blockquote')
  })

  it('lifts a nested list item when possible', () => {
    const editor = mockEditor({ canLift: true })
    expect(outdentSelection(editor)).toBe(true)
    expect(editor._chain.liftListItem).toHaveBeenCalledWith('listItem')
  })

  it('outdents the block when lift is unavailable', () => {
    const editor = mockEditor({ canLift: false, outdentOk: true })
    expect(outdentSelection(editor)).toBe(true)
    expect(editor._chain.outdentBlocks).toHaveBeenCalled()
  })
})

describe('exitBlockquoteOnEnter', () => {
  it('lifts an empty quoted line out of the blockquote', () => {
    const lift = vi.fn(() => true)
    const editor = {
      isDestroyed: false,
      isActive: (name) => name === 'blockquote',
      can: () => ({ lift: () => true }),
      state: {
        selection: {
          empty: true,
          $from: { parent: { isTextblock: true, content: { size: 0 } } },
        },
      },
      chain: () => {
        const api = {
          focus: () => api,
          lift: (name) => {
            lift(name)
            return api
          },
          run: () => true,
        }
        return api
      },
    }
    expect(exitBlockquoteOnEnter(editor)).toBe(true)
    expect(lift).toHaveBeenCalledWith('blockquote')
  })

  it('does nothing when the quoted line still has text', () => {
    const editor = {
      isDestroyed: false,
      isActive: () => true,
      state: {
        selection: {
          empty: true,
          $from: { parent: { isTextblock: true, content: { size: 12 } } },
        },
      },
    }
    expect(exitBlockquoteOnEnter(editor)).toBe(false)
  })
})

describe('nestedAttrsForParent', () => {
  it('puts numbers under an A./a. parent so the outer alphabet keeps going', () => {
    expect(
      nestedAttrsForParent({ type: { name: 'orderedList' }, attrs: { type: 'A' } })
    ).toEqual({ type: null, start: 1 })
    expect(
      nestedAttrsForParent({ type: { name: 'orderedList' }, attrs: { type: 'a' } })
    ).toEqual({ type: null, start: 1 })
  })

  it('puts letters under a numbered parent', () => {
    expect(
      nestedAttrsForParent({ type: { name: 'orderedList' }, attrs: { type: null } })
    ).toEqual({ type: 'a', start: 1 })
  })

  it('puts numbers under a bullet parent', () => {
    expect(nestedAttrsForParent({ type: { name: 'bulletList' }, attrs: {} })).toEqual({
      type: null,
      start: 1,
    })
  })
})

describe('toggleOrCycleOrderedList', () => {
  it('starts an ordered list when not already in one', () => {
    const editor = mockEditor({ inOrdered: false })
    expect(toggleOrCycleOrderedList(editor)).toBe(true)
    expect(editor._chain.toggleOrderedList).toHaveBeenCalled()
  })

  it('cycles 1 → a → i → 1 while inside an ordered list', () => {
    const first = mockEditor({ inOrdered: true, orderedType: null })
    toggleOrCycleOrderedList(first)
    expect(first._chain.updateAttributes).toHaveBeenCalledWith('orderedList', { type: 'a' })

    const second = mockEditor({ inOrdered: true, orderedType: 'a' })
    toggleOrCycleOrderedList(second)
    expect(second._chain.updateAttributes).toHaveBeenCalledWith('orderedList', { type: 'i' })

    const third = mockEditor({ inOrdered: true, orderedType: 'i' })
    toggleOrCycleOrderedList(third)
    expect(third._chain.updateAttributes).toHaveBeenCalledWith('orderedList', { type: null })
  })
})

describe('deleteEmptyListItem', () => {
  it('recognizes a blank list item node', () => {
    expect(isEmptyListItemNode(li(p('')))).toBe(true)
    expect(isEmptyListItemNode(li(p('kept')))).toBe(false)
  })

  it('removes a blank nested 3. without promoting it between A. and B.', () => {
    const doc = noteSchema.node('doc', null, [
      ol(
        { type: 'A' },
        li(
          p('Hamdi rejected'),
          ol(null, li(p('in 1971')), li(p('This was not')), li(p('')))
        ),
        li(p('The Hamdi rejection'), ol(null, li(p('Congress repeal'))))
      ),
    ])
    const editor = liveEditor(doc, emptyParagraphPos(doc))
    expect(deleteEmptyListItem(editor)).toBe(true)
    expect(paragraphsOf(editor.state.doc)).toEqual([
      'Hamdi rejected',
      'in 1971',
      'This was not',
      'The Hamdi rejection',
      'Congress repeal',
    ])
    // Still one outer list with two top-level items (A then B).
    expect(editor.state.doc.firstChild.childCount).toBe(2)
  })

  it('drops a sole blank nested list under A. and keeps B. intact', () => {
    const doc = noteSchema.node('doc', null, [
      ol({ type: 'A' }, li(p('Hamdi'), ol(null, li(p('')))), li(p('B text'))),
    ])
    const editor = liveEditor(doc, emptyParagraphPos(doc))
    expect(deleteEmptyListItem(editor)).toBe(true)
    expect(paragraphsOf(editor.state.doc)).toEqual(['Hamdi', 'B text'])
    expect(editor.state.doc.firstChild.childCount).toBe(2)
  })

  it('does not delete a list item that still has text', () => {
    const doc = noteSchema.node('doc', null, [
      ol(null, li(p('kept')), li(p('also'))),
    ])
    let pos = 1
    doc.descendants((node, p) => {
      if (node.type.name === 'paragraph' && node.textContent === 'kept') pos = p + 1
    })
    const editor = liveEditor(doc, pos)
    expect(deleteEmptyListItem(editor)).toBe(false)
    expect(paragraphsOf(editor.state.doc)).toEqual(['kept', 'also'])
  })
})
