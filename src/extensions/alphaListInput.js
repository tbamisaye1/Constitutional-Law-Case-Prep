import { Extension, wrappingInputRule } from '@tiptap/core'

/** "a" → 1, "b" → 2, … "z" → 26 */
export function letterToStart(letter) {
  if (typeof letter !== 'string' || letter.length !== 1) return null
  const lower = letter.toLowerCase()
  if (lower < 'a' || lower > 'z') return null
  return lower.charCodeAt(0) - 96
}

/**
 * Typing "a. " / "b. " … "z. " (or uppercase) at the start of a line wraps
 * the block in an ordered list with alphabetic markers that keep incrementing.
 */
export const AlphaListInput = Extension.create({
  name: 'alphaListInput',

  addInputRules() {
    const orderedList = this.editor.schema.nodes.orderedList
    if (!orderedList) return []

    const lower = wrappingInputRule({
      find: /^([a-z])\.\s$/,
      type: orderedList,
      getAttributes: (match) => ({
        type: 'a',
        start: letterToStart(match[1]),
      }),
      joinPredicate: (match, node) => {
        if (node.attrs.type !== 'a') return false
        const start = letterToStart(match[1])
        if (start == null) return false
        return node.childCount + (node.attrs.start || 1) === start
      },
    })

    const upper = wrappingInputRule({
      find: /^([A-Z])\.\s$/,
      type: orderedList,
      getAttributes: (match) => ({
        type: 'A',
        start: letterToStart(match[1]),
      }),
      joinPredicate: (match, node) => {
        if (node.attrs.type !== 'A') return false
        const start = letterToStart(match[1])
        if (start == null) return false
        return node.childCount + (node.attrs.start || 1) === start
      },
    })

    return [lower, upper]
  },
})
