/**
 * OneNote-style indent / outdent for TipTap note surfaces.
 *
 * Tab nests a list item, then flips only that nested level to the next marker
 * cycle (A.B.C → 1.2.3 → a.b.c) so the outer list keeps its own sequence when
 * you later outdent.
 *
 * Quotes inside a list: Shift+Tab / Enter on an empty quoted line lifts out of
 * the quote first so the numbered cycle continues instead of starting a new 1.
 *
 * Backspace on an empty sub-indent deletes that list item (or the whole nested
 * list when it was the only child) instead of TipTap's default lift, which
 * promotes a blank line between A. and B.
 */

import { TextSelection } from '@tiptap/pm/state'

const ORDERED_TYPES = [null, 'a', 'i']

/** Marker attrs for a brand-new nest under this parent list. */
export function nestedAttrsForParent(parentNode) {
  if (!parentNode) return null
  if (parentNode.type.name === 'bulletList') {
    return { type: null, start: 1 }
  }
  if (parentNode.type.name !== 'orderedList') return null
  const t = parentNode.attrs?.type
  if (!t || t === '1') return { type: 'a', start: 1 }
  if (t === 'a' || t === 'A') return { type: null, start: 1 }
  if (t === 'i' || t === 'I') return { type: 'a', start: 1 }
  return { type: 'a', start: 1 }
}

function sameOrderedAttrs(attrs, next) {
  const a = attrs?.type ?? null
  const b = next?.type ?? null
  const startA = attrs?.start || 1
  const startB = next?.start || 1
  return a === b && startA === startB
}

/**
 * After sinkListItem, TipTap copies a default nested list. Set that nest's
 * marker cycle from the parent so A. → Tab → 1. and 1. → Tab → a., without
 * touching the outer list.
 */
export function applyNestedListCycle(editor) {
  if (!editor || editor.isDestroyed) return false
  const { state } = editor
  const $from = state?.selection?.$from
  if (!$from) return false
  const lists = []
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
      lists.push({ node, pos: $from.before(depth) })
    }
  }
  if (lists.length < 2) return false

  const [current, parent] = lists
  const nextAttrs = nestedAttrsForParent(parent.node)
  if (!nextAttrs) return false

  const orderedList = state.schema.nodes.orderedList
  if (!orderedList) return false

  if (current.node.type === orderedList && sameOrderedAttrs(current.node.attrs, nextAttrs)) {
    return false
  }

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      tr.setNodeMarkup(current.pos, orderedList, nextAttrs)
      if (dispatch) dispatch(tr.scrollIntoView())
      return true
    })
    .run()
}

/** True when the caret is in an empty textblock (e.g. blank line under a quote). */
export function isEmptyTextblockSelection(editor) {
  const selection = editor?.state?.selection
  if (!selection?.empty) return false
  const parent = selection.$from?.parent
  return Boolean(parent?.isTextblock && parent.content.size === 0)
}

/** List item with no visible text (blank 3. under A. is the usual case). */
export function isEmptyListItemNode(node) {
  if (!node || node.type?.name !== 'listItem') return false
  return !String(node.textContent || '').trim()
}

function endOfLastTextblock(doc, nodePos, node) {
  let best = null
  node.descendants((child, rel) => {
    if (child.isTextblock) {
      const abs = nodePos + 1 + rel
      best = abs + child.content.size
    }
  })
  if (best != null) return best
  return nodePos + node.nodeSize - 1
}

/**
 * Backspace on an empty list line deletes that sub-indent only.
 * TipTap's default lifts the blank item into the outer A./B. sequence.
 */
export function deleteEmptyListItem(editor) {
  if (!editor || editor.isDestroyed) return false
  const { state } = editor
  const selection = state?.selection
  if (!selection?.empty) return false

  const $from = selection.$from
  if (!$from?.parent?.isTextblock) return false

  let itemDepth = null
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === 'listItem') {
      itemDepth = depth
      break
    }
  }
  if (itemDepth == null) return false

  const itemNode = $from.node(itemDepth)
  if (!isEmptyListItemNode(itemNode)) return false

  const listDepth = itemDepth - 1
  if (listDepth < 1) return false
  const listNode = $from.node(listDepth)
  if (listNode.type.name !== 'orderedList' && listNode.type.name !== 'bulletList') {
    return false
  }

  const itemPos = $from.before(itemDepth)
  const indexInList = $from.index(listDepth)

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      let deleteFrom
      let deleteTo
      let preferPos = null

      if (listNode.childCount === 1) {
        // Blank sole child of a nest: drop the whole nested list (keep A./B.).
        deleteFrom = $from.before(listDepth)
        deleteTo = deleteFrom + listNode.nodeSize
        const parentDepth = listDepth - 1
        if (parentDepth >= 0) {
          const parent = $from.node(parentDepth)
          const listIndex = $from.index(parentDepth)
          if (listIndex > 0) {
            const prev = parent.child(listIndex - 1)
            const prevPos = deleteFrom - prev.nodeSize
            preferPos = endOfLastTextblock(tr.doc, prevPos, prev)
          }
        }
      } else {
        deleteFrom = itemPos
        deleteTo = itemPos + itemNode.nodeSize
        if (indexInList > 0) {
          const prev = listNode.child(indexInList - 1)
          const prevPos = itemPos - prev.nodeSize
          preferPos = endOfLastTextblock(tr.doc, prevPos, prev)
        }
      }

      tr.delete(deleteFrom, deleteTo)

      try {
        if (preferPos != null) {
          const mapped = tr.mapping.map(preferPos, -1)
          tr.setSelection(TextSelection.near(tr.doc.resolve(mapped), -1))
        } else {
          const mapped = tr.mapping.map(deleteFrom, 1)
          tr.setSelection(TextSelection.near(tr.doc.resolve(mapped), 1))
        }
      } catch {
        /* selection fallback: leave whatever delete left */
      }

      if (dispatch) dispatch(tr.scrollIntoView())
      return true
    })
    .run()
}

/**
 * Lift out of a blockquote. Used by outdent and by Enter on an empty quoted line
 * so the surrounding list item / number cycle stays intact.
 */
export function exitBlockquote(editor) {
  if (!editor || editor.isDestroyed) return false
  if (!editor.isActive('blockquote')) return false
  if (editor.can().lift('blockquote')) {
    return editor.chain().focus().lift('blockquote').run()
  }
  if (typeof editor.commands.unsetBlockquote === 'function') {
    return editor.chain().focus().unsetBlockquote().run()
  }
  return editor.chain().focus().toggleBlockquote().run()
}

/**
 * Enter on an empty line inside a quote exits the quote (OneNote-style) instead
 * of keeping you trapped in the quote or spawning a fresh 1. list.
 */
export function exitBlockquoteOnEnter(editor) {
  if (!editor || editor.isDestroyed) return false
  if (!editor.isActive('blockquote')) return false
  if (!isEmptyTextblockSelection(editor)) return false
  return exitBlockquote(editor)
}

/**
 * Indent the current block. Returns true when something changed.
 */
export function indentSelection(editor) {
  if (!editor || editor.isDestroyed) return false

  if (editor.can().sinkListItem('listItem')) {
    const sunk = editor.chain().focus().sinkListItem('listItem').run()
    if (sunk) applyNestedListCycle(editor)
    return sunk
  }

  return editor.chain().focus().indentBlocks().run()
}

/**
 * Outdent the current block. Returns true when something changed.
 * Quote → list item → outer list → paragraph indent, in that order.
 */
export function outdentSelection(editor) {
  if (!editor || editor.isDestroyed) return false

  if (editor.isActive('blockquote') && exitBlockquote(editor)) {
    return true
  }

  if (editor.can().liftListItem('listItem')) {
    return editor.chain().focus().liftListItem('listItem').run()
  }

  return editor.chain().focus().outdentBlocks().run()
}

/**
 * Cycle ordered-list marker style: 1. → a. → i. → 1.
 * When not in an ordered list, start one.
 */
export function toggleOrCycleOrderedList(editor) {
  if (!editor || editor.isDestroyed) return false

  if (!editor.isActive('orderedList')) {
    return editor.chain().focus().toggleOrderedList().run()
  }

  const current = editor.getAttributes('orderedList').type ?? null
  const index = ORDERED_TYPES.findIndex((t) => t === current)
  const next = ORDERED_TYPES[(index + 1) % ORDERED_TYPES.length]
  return editor.chain().focus().updateAttributes('orderedList', { type: next }).run()
}

export { ORDERED_TYPES }
