/**
 * OneNote-style indent / outdent for TipTap note surfaces.
 *
 * Tab nests a list item, then flips only that nested level to the next marker
 * cycle (A.B.C → 1.2.3 → a.b.c) so the outer list keeps its own sequence when
 * you later outdent.
 */

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
 */
export function outdentSelection(editor) {
  if (!editor || editor.isDestroyed) return false

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
