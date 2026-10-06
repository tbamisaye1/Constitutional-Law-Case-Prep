/**
 * Fold a section or prong on the Arguments page, OneNote-style.
 *
 * Folding is view state only: the hidden blocks stay in the document (and in
 * storage); they just get display:none. Each outline heading gets a small
 * chevron widget to toggle it. Moving the cursor into folded content unfolds
 * it, so arrow keys never type into something you cannot see.
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { OUTLINE_NODE } from '../lib/outlineIds'
import { blockRange } from '../lib/argumentPage'

export const foldKey = new PluginKey('outlineFold')

function topLevel(doc) {
  const nodes = []
  doc.forEach((node, offset) => {
    nodes.push({
      type: node.type.name,
      kind: node.attrs?.kind,
      id: node.attrs?.id,
      pos: offset,
      size: node.nodeSize,
    })
  })
  return nodes
}

/** [{ id, from, to }] document ranges hidden by the folded headings. */
export function hiddenRanges(doc, folded) {
  if (!folded?.size) return []
  const nodes = topLevel(doc)
  const ranges = []
  nodes.forEach((n, index) => {
    if (n.type !== OUTLINE_NODE || !folded.has(n.id)) return
    const range = blockRange(nodes, index)
    if (!range || range[1] - range[0] <= 1) return
    const first = nodes[range[0] + 1]
    const last = nodes[range[1] - 1]
    ranges.push({ id: n.id, from: first.pos, to: last.pos + last.size })
  })
  return ranges
}

function chevron(view, id, isFolded, headingEnd) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = isFolded ? 'outline-fold-toggle is-folded' : 'outline-fold-toggle'
  button.contentEditable = 'false'
  button.setAttribute('aria-label', isFolded ? 'Expand' : 'Collapse')
  button.title = isFolded ? 'Expand' : 'Collapse'
  button.textContent = '▸'
  button.addEventListener('mousedown', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const tr = view.state.tr.setMeta(foldKey, { toggle: id })
    // Folding with the cursor inside the body: park it on the heading so the
    // next keystroke does not land in hidden text (and instantly unfold).
    if (!isFolded) {
      const head = view.state.selection.head
      const body = hiddenRanges(view.state.doc, new Set([id]))[0]
      if (body && head >= body.from && head <= body.to) {
        const safe = Math.min(headingEnd, tr.doc.content.size)
        tr.setSelection(TextSelection.near(tr.doc.resolve(safe), -1))
      }
    }
    view.dispatch(tr)
  })
  return button
}

function buildDecorations(doc, folded) {
  const decos = []
  const nodes = topLevel(doc)
  nodes.forEach((n, index) => {
    if (n.type !== OUTLINE_NODE || !n.id) return
    const isFolded = folded.has(n.id)
    const range = blockRange(nodes, index)
    const hasBody = range && range[1] - range[0] > 1
    decos.push(
      Decoration.widget(n.pos + 1, (view) => chevron(view, n.id, isFolded, n.pos + n.size - 1), {
        side: -1,
        ignoreSelection: true,
        key: `fold-${n.id}-${isFolded ? 1 : 0}-${hasBody ? 1 : 0}`,
        stopEvent: () => true,
      })
    )
    if (isFolded && hasBody) {
      decos.push(Decoration.node(n.pos, n.pos + n.size, { class: 'is-folded' }))
      for (let i = range[0] + 1; i < range[1]; i += 1) {
        const hidden = nodes[i]
        decos.push(Decoration.node(hidden.pos, hidden.pos + hidden.size, { class: 'fold-hidden' }))
      }
    }
  })
  return DecorationSet.create(doc, decos)
}

export const OutlineFold = Extension.create({
  name: 'outlineFold',

  addOptions() {
    return {
      initial: [],
      onChange: null,
    }
  },

  addCommands() {
    return {
      toggleFold:
        (id) =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(foldKey, { toggle: id })
          return true
        },
      setFolded:
        (ids) =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(foldKey, { set: ids })
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const { initial, onChange } = this.options
    return [
      new Plugin({
        key: foldKey,
        state: {
          init: (_config, state) => {
            const folded = new Set(initial || [])
            return { folded, decorations: buildDecorations(state.doc, folded) }
          },
          apply: (tr, value, _old, state) => {
            const meta = tr.getMeta(foldKey)
            let folded = value.folded
            if (meta?.toggle) {
              folded = new Set(folded)
              if (folded.has(meta.toggle)) folded.delete(meta.toggle)
              else folded.add(meta.toggle)
            } else if (meta?.unfold) {
              folded = new Set([...folded].filter((id) => !meta.unfold.includes(id)))
            } else if (Array.isArray(meta?.set)) {
              folded = new Set(meta.set)
            }
            if (folded === value.folded && !tr.docChanged) return value
            return { folded, decorations: buildDecorations(state.doc, folded) }
          },
        },
        props: {
          decorations: (state) => foldKey.getState(state)?.decorations,
        },
        // Cursor moved into folded content (arrow keys, search, undo): unfold.
        appendTransaction: (transactions, _oldState, state) => {
          if (!transactions.some((tr) => tr.selectionSet || tr.docChanged)) return null
          const current = foldKey.getState(state)
          if (!current?.folded.size) return null
          const head = state.selection.head
          const inside = hiddenRanges(state.doc, current.folded)
            .filter((r) => head >= r.from && head <= r.to)
            .map((r) => r.id)
          if (!inside.length) return null
          return state.tr.setMeta(foldKey, { unfold: inside }).setMeta('addToHistory', false)
        },
        view: () => ({
          update: (view, prevState) => {
            const now = foldKey.getState(view.state)
            const before = foldKey.getState(prevState)
            if (now?.folded !== before?.folded && typeof onChange === 'function') {
              onChange([...now.folded])
            }
          },
        }),
      }),
    ]
  },
})
