/**
 * Section / prong / point headings inside the one-page Arguments editor.
 *
 * They are their own node type, not h1/h2, because the notes under a prong
 * already use ordinary h2/h3 headings ("## Framework") and those must stay
 * content, not become outline structure. Each heading carries the stable id of
 * the section or prong it stands for, so the page round-trips to the
 * draftsBySide → sections → prongs shape the backend and MCP tools use.
 *
 *   <h1 data-outline="section" data-id="c3-s1">Lowest ebb</h1>
 *   <h1 data-outline="prong"   data-id="c3-s1-a">a. Under Youngstown…</h1>
 *   <h1 data-outline="point"   data-id="pt-…">Why we are in Category 3</h1>
 *
 * Points (1.1.1) are stored inside their prong's notes (see lib/outlineIds).
 *
 * Invariants kept by the plugin on every transaction (paste, undo, drag):
 *   - every heading has an id, and no two headings share one
 *   - nothing floats without a parent: a prong before any section, or a
 *     point before any prong in its section, is promoted one level
 *
 * Option `structure` (default true) turns on the editing behaviour: invariant
 * plugin, shortcuts, "/section" input rules, and reading a bare <h1> as a
 * point (how MCP / markdown "# Title" inside a prong arrives). With
 * structure: false the node only parses and re-renders outline headings, so
 * the other note editors (the Outline view) keep a prong's points intact
 * instead of flattening them into ordinary headings.
 */

import { Node, mergeAttributes, textblockTypeInputRule } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

import {
  OUTLINE_KINDS,
  OUTLINE_NODE,
  newOutlineId,
  normalizeKind,
  outlineFixes,
} from '../lib/outlineIds'

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

  addOptions() {
    return { structure: true }
  },

  addAttributes() {
    return {
      kind: {
        default: 'section',
        // A bare <h1> only reaches this node through the structure-mode rule
        // below, and there it means a sub-point.
        parseHTML: (el) =>
          el.hasAttribute('data-outline') ? normalizeKind(el.getAttribute('data-outline')) : 'point',
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
    const rules = [{ tag: 'h1[data-outline]', priority: 1000 }]
    if (this.options.structure) rules.push({ tag: 'h1', priority: 900 })
    return rules
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
      /** Move the heading under the cursor one level: +1 demotes, -1 promotes. */
      shiftOutlineLevel:
        (step) =>
        ({ state, tr, dispatch }) => {
          const { $from } = state.selection
          const node = $from.parent
          if (node.type.name !== this.name) return false
          const level = OUTLINE_KINDS.indexOf(normalizeKind(node.attrs.kind)) + step
          if (level < 0 || level >= OUTLINE_KINDS.length) return false
          if (dispatch) {
            tr.setNodeMarkup($from.before($from.depth), undefined, {
              ...node.attrs,
              kind: OUTLINE_KINDS[level],
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
    if (!this.options.structure) return {}
    return {
      'Mod-Alt-1': () => this.editor.commands.setOutlineHeading('section'),
      'Mod-Alt-2': () => this.editor.commands.setOutlineHeading('prong'),
      'Mod-Alt-3': () => this.editor.commands.setOutlineHeading('point'),
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
    if (!this.options.structure) return []
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
      textblockTypeInputRule({
        find: /^\/(?:point|sub)\s$/,
        type: this.type,
        getAttributes: () => ({ kind: 'point', id: newOutlineId('point') }),
      }),
    ]
  },

  addProseMirrorPlugins() {
    if (!this.options.structure) return []
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
