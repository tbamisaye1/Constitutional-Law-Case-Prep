import { Extension, InputRule } from '@tiptap/core'
import { canJoin, findWrapping } from '@tiptap/pm/transform'

/** "a" → 1, "b" → 2, … "z" → 26 */
export function letterToStart(letter) {
  if (typeof letter !== 'string' || letter.length !== 1) return null
  const lower = letter.toLowerCase()
  if (lower < 'a' || lower > 'z') return null
  return lower.charCodeAt(0) - 96
}

/** Nearest bullet/ordered list wrapping the position (the current marker cycle). */
export function findWrappingList($pos) {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth)
    if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
      return { node, depth, pos: $pos.before(depth) }
    }
  }
  return null
}

function listAttrsFromLetter(match, upper) {
  return {
    type: upper ? 'A' : 'a',
    start: letterToStart(match[1]),
  }
}

/**
 * OneNote-style marker override:
 * - Outside a list: wrap the line in an a./A. ordered list
 * - Inside dots / wrong cycle: convert the current list level to a./b./c. (or A./B.)
 *   so indenting under bullets then typing "a. " switches that nest to letters
 */
function createLetterListRule({ find, upper }) {
  return new InputRule({
    find,
    handler: ({ state, range, match }) => {
      const attrs = listAttrsFromLetter(match, upper)
      if (attrs.start == null) return null

      const orderedList = state.schema.nodes.orderedList
      if (!orderedList) return null

      const tr = state.tr
      const wrapping = findWrappingList(state.doc.resolve(range.from))

      tr.delete(range.from, range.to)

      if (wrapping) {
        // Override the current bullet/number cycle at this indent level.
        tr.setNodeMarkup(wrapping.pos, orderedList, {
          start: attrs.start,
          type: attrs.type,
        })
        return
      }

      // Fresh line: start an alphabetical list (same as wrappingInputRule).
      const $start = tr.doc.resolve(range.from)
      const blockRange = $start.blockRange()
      const wrap = blockRange && findWrapping(blockRange, orderedList, attrs)
      if (!wrap) return null

      tr.wrap(blockRange, wrap)

      const before = tr.doc.resolve(range.from - 1).nodeBefore
      if (
        before &&
        before.type === orderedList &&
        before.attrs.type === attrs.type &&
        canJoin(tr.doc, range.from - 1) &&
        before.childCount + (before.attrs.start || 1) === attrs.start
      ) {
        tr.join(range.from - 1)
      }
    },
  })
}

/**
 * Typing "1. " inside a bullet list should flip that level to numbered,
 * not leave "1." as text under a dot.
 */
function createDecimalOverrideRule() {
  return new InputRule({
    find: /^(\d+)\.\s$/,
    handler: ({ state, range, match }) => {
      const orderedList = state.schema.nodes.orderedList
      if (!orderedList) return null

      const wrapping = findWrappingList(state.doc.resolve(range.from))
      // Outside a list, StarterKit's own 1. rule handles wrapping.
      if (!wrapping) return null
      // Already a plain numbered list continuing correctly — let default join work.
      if (
        wrapping.node.type === orderedList &&
        (!wrapping.node.attrs.type || wrapping.node.attrs.type === '1')
      ) {
        return null
      }

      const tr = state.tr
      tr.delete(range.from, range.to)
      tr.setNodeMarkup(wrapping.pos, orderedList, {
        start: parseInt(match[1], 10) || 1,
        type: null,
      })
    },
  })
}

/**
 * Typing "- " inside an ordered list flips that level back to dots.
 */
function createBulletOverrideRule() {
  return new InputRule({
    find: /^[-*]\s$/,
    handler: ({ state, range }) => {
      const bulletList = state.schema.nodes.bulletList
      if (!bulletList) return null

      const wrapping = findWrappingList(state.doc.resolve(range.from))
      if (!wrapping || wrapping.node.type === bulletList) return null

      const tr = state.tr
      tr.delete(range.from, range.to)
      tr.setNodeMarkup(wrapping.pos, bulletList, {})
    },
  })
}

export const AlphaListInput = Extension.create({
  name: 'alphaListInput',

  addInputRules() {
    if (!this.editor.schema.nodes.orderedList) return []

    return [
      createLetterListRule({ find: /^([a-z])\.\s$/, upper: false }),
      createLetterListRule({ find: /^([A-Z])\.\s$/, upper: true }),
      createDecimalOverrideRule(),
      createBulletOverrideRule(),
    ]
  },
})
