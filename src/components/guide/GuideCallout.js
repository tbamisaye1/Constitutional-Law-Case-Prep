import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Orange / warn / good callout boxes used in the Bronner guide HTML.
 * TipTap used to strip these on edit; keeping them as a real node preserves
 * the posture naming trap and similar blocks.
 */
export const GuideCallout = Node.create({
  name: 'guideCallout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: 'note',
        parseHTML: (element) => {
          if (element.classList.contains('warn')) return 'warn'
          if (element.classList.contains('good')) return 'good'
          return 'note'
        },
      },
      label: {
        default: 'Note',
        parseHTML: (element) => element.querySelector('.lab')?.textContent?.trim() || 'Note',
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'div.guide-call' },
      { tag: 'div.call' },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const tone = node.attrs.tone || 'note'
    const label = node.attrs.label || 'Note'
    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: `guide-call ${tone}` }),
      ['span', { class: 'lab' }, label],
      ['div', { class: 'guide-call-body' }, 0],
    ]
  },

  addCommands() {
    return {
      setGuideCallout:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              tone: attrs.tone || 'note',
              label: attrs.label || (attrs.tone === 'warn' ? 'Watch out' : 'Note'),
            },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Write the callout here…' }],
              },
            ],
          }),
    }
  },
})
