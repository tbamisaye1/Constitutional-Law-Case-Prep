import { Extension } from '@tiptap/core'

const MAX_INDENT = 8
const INDENT_TYPES = ['paragraph', 'heading']

function clampIndent(value) {
  const n = Number(value) || 0
  if (n < 0) return 0
  if (n > MAX_INDENT) return MAX_INDENT
  return n
}

function collectIndentTargets(doc, from, to, delta) {
  const updates = []
  doc.nodesBetween(from, to, (node, pos) => {
    if (!INDENT_TYPES.includes(node.type.name)) return
    const current = node.attrs.indent || 0
    const next = clampIndent(current + delta)
    if (next === current) return
    updates.push({ pos, attrs: { ...node.attrs, indent: next } })
  })
  return updates
}

/**
 * Paragraph / heading indent when Tab is not nesting a list item.
 * Stored as data-indent so it round-trips through getHTML().
 */
export const BlockIndent = Extension.create({
  name: 'blockIndent',

  addGlobalAttributes() {
    return [
      {
        types: INDENT_TYPES,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) =>
              clampIndent(element.getAttribute('data-indent') || element.dataset?.indent || 0),
            renderHTML: (attributes) => {
              const indent = clampIndent(attributes.indent)
              if (!indent) return {}
              return {
                'data-indent': String(indent),
                style: `margin-left: ${indent * 1.5}em`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      indentBlocks:
        () =>
        ({ tr, state, dispatch }) => {
          const updates = collectIndentTargets(state.doc, state.selection.from, state.selection.to, 1)
          if (!updates.length) return false
          if (dispatch) {
            for (const { pos, attrs } of updates) {
              tr.setNodeMarkup(pos, undefined, attrs)
            }
            dispatch(tr.scrollIntoView())
          }
          return true
        },
      outdentBlocks:
        () =>
        ({ tr, state, dispatch }) => {
          const updates = collectIndentTargets(
            state.doc,
            state.selection.from,
            state.selection.to,
            -1
          )
          if (!updates.length) return false
          if (dispatch) {
            for (const { pos, attrs } of updates) {
              tr.setNodeMarkup(pos, undefined, attrs)
            }
            dispatch(tr.scrollIntoView())
          }
          return true
        },
    }
  },
})

export { MAX_INDENT, clampIndent }
