/**
 * OneNote-style indent / outdent for TipTap note surfaces.
 *
 * Tab nests a list item when ProseMirror allows it. Otherwise it indents the
 * paragraph or heading. List type (- / 1. / a. / i.) stays on the toolbar and
 * on typing "1. " or "- " at the start of a line.
 */

const ORDERED_TYPES = [null, 'a', 'i']

/**
 * Indent the current block. Returns true when something changed.
 */
export function indentSelection(editor) {
  if (!editor || editor.isDestroyed) return false

  if (editor.can().sinkListItem('listItem')) {
    return editor.chain().focus().sinkListItem('listItem').run()
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
