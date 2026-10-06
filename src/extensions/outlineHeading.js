/**
 * Section / prong headings inside the one-page Arguments editor.
 *
 * They are their own node type, not h1/h2, because the notes under a prong
 * already use ordinary h2/h3 headings ("## Framework") and those must stay
 * content, not become outline structure. Each heading carries the stable id of
 * the section or prong it stands for, so the page round-trips to the
 * draftsBySide → sections → prongs shape the backend and MCP tools use.
 *
 *   <h1 data-outline="section" data-id="c3-s1">Lowest ebb</h1>
 *   <h1 data-outline="prong"   data-id="c3-s1-a">a. Under Youngstown…</h1>
 *
 * Invariants kept by the plugin on every transaction (paste, undo, drag):
 *   - every heading has an id, and no two headings share one
 *   - a prong never comes before the first section (it is promoted)
 */

import { Node, mergeAttributes, textblockTypeInputRule } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

import { OUTLINE_NODE, newOutlineId, outlineFixes } from '../lib/outlineIds'

export { OUTLINE_NODE, newOutlineId, outlineFixes }

const invariantsKey = new PluginKey('outlineHeadingInvariants')

function collectHeadings(doc) {
  const headings = []
  doc.forEach((node, offset) => {
    if (node.type.name === OUTLINE_NODE) {
      headings.push({ pos: offset, kind: node.attrs.kind, id: node.attrs.id })
    }
  })
  return headings
}

export const OutlineHeading = Node.create({
  name: OUTLINE_NODE,
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: 'section',
        parseHTML: (el) => (el.getAttribute('data-outline') === 'prong' ? 'prong' : 'section'),
        renderHTML: (attrs) => ({ 'data-outline': attrs.kind }),
      },
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-id') || null,
        renderHTML: (attrs) => (attrs.id ? { 'data-id': attrs.id } : {}),
      },
    }
  },

  parseHTML() {
    // Beats StarterKit's heading rule for h1 so structure is never demoted.
    return [{ tag: 'h1[data-outline]', priority: 1000 }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'h1',
      mergeAttributes(HTMLAttributes, {
        class: `outline-heading is-${node.attrs.kind}`,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setOutlineHeading:
        (kind = 'section') =>
        ({ commands }) =>
          commands.setNode(this.name, { kind, id: newOutlineId(kind) }),
      toggleOutlineKind:
        () =>
        ({ state, tr, dispatch }) => {
          const { $from } = state.selection
          const node = $from.parent
          if (node.type.name !== this.name) return false
          if (dispatch) {
            const pos = $from.before($from.depth)
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              kind: node.attrs.kind === 'prong' ? 'section' : 'prong',
            })
          }
          return true
        },
      unsetOutlineHeading:
        () =>
        ({ commands }) =>
          commands.setNode('paragraph'),
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-1': () => this.editor.commands.setOutlineHeading('section'),
      'Mod-Alt-2': () => this.editor.commands.setOutlineHeading('prong'),
      // Backspace at the very start of a heading turns it back into text
      // (OneNote "demote") instead of gluing its title onto the line above.
      Backspace: () => {
        const { selection } = this.editor.state
        const { $from, empty } = selection
        if (!empty || $from.parent.type.name !== this.name) return false
        if ($from.parentOffset !== 0) return false
        return this.editor.commands.setNode('paragraph')
      },
      // Enter in the middle of a title must not split it into two headings
      // that would share an id: move to a new paragraph below instead.
      Enter: () => {
        const { state } = this.editor
        const { $from, empty } = state.selection
        if (!empty || $from.parent.type.name !== this.name) return false
        if ($from.parentOffset === $from.parent.content.size) return false
        const after = $from.after($from.depth)
        return this.editor
          .chain()
          .insertContentAt(after, { type: 'paragraph' })
          .command(({ tr }) => {
            tr.setSelection(TextSelection.create(tr.doc, after + 1))
            return true
          })
          .run()
      },
    }
  },

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: /^\/(?:section|sec|s)\s$/,
        type: this.type,
        getAttributes: () => ({ kind: 'section', id: newOutlineId('section') }),
      }),
      textblockTypeInputRule({
        find: /^\/(?:prong|p)\s$/,
        type: this.type,
        getAttributes: () => ({ kind: 'prong', id: newOutlineId('prong') }),
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: invariantsKey,
        appendTransaction: (transactions, _old, state) => {
          if (!transactions.some((tr) => tr.docChanged)) return null
          const fixes = outlineFixes(collectHeadings(state.doc))
          if (!fixes.length) return null
          const tr = state.tr
          for (const fix of fixes) {
            const node = tr.doc.nodeAt(fix.pos)
            if (!node) continue
            tr.setNodeMarkup(fix.pos, undefined, {
              ...node.attrs,
              ...(fix.kind ? { kind: fix.kind } : {}),
              ...(fix.id ? { id: fix.id } : {}),
            })
          }
          tr.setMeta('addToHistory', false)
          return tr
        },
      }),
    ]
  },
})
