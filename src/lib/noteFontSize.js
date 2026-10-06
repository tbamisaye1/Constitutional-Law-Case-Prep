/**
 * Font-size presets for TipTap notes.
 * Empty string = body default (unset mark, inherits .note-prose).
 */
export const NOTE_FONT_SIZES = [
  { value: '', label: 'Default' },
  { value: '13px', label: 'S' },
  { value: '15px', label: 'M' },
  { value: '17px', label: 'Body' },
  { value: '20px', label: 'L' },
  { value: '24px', label: 'XL' },
  { value: '28px', label: 'XXL' },
]

/**
 * Apply font size to the current selection. If the caret is collapsed, expand
 * to the whole textblock first so one click still hits a clear subgroup.
 */
export function applyFontSizeToSelection(editor, fontSize) {
  if (!editor || editor.isDestroyed) return false
  const { empty, $from } = editor.state.selection
  let chain = editor.chain().focus()
  if (empty && $from.parent?.isTextblock) {
    chain = chain.setTextSelection({ from: $from.start(), to: $from.end() })
  }
  if (!fontSize) return chain.unsetFontSize().run()
  return chain.setFontSize(fontSize).run()
}

/** Apply font size to every text node in the note. */
export function applyFontSizeToAll(editor, fontSize) {
  if (!editor || editor.isDestroyed) return false
  const size = editor.state.doc.content.size
  if (size < 1) return false
  let chain = editor.chain().focus().setTextSelection({ from: 1, to: size })
  if (!fontSize) return chain.unsetFontSize().run()
  return chain.setFontSize(fontSize).run()
}

export function currentFontSize(editor) {
  if (!editor || editor.isDestroyed) return ''
  return editor.getAttributes('textStyle')?.fontSize || ''
}
