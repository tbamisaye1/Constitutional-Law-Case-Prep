import { ListItem } from '@tiptap/extension-list'

/**
 * Default TipTap list items must start with a paragraph (`paragraph block*`),
 * so toggleBlockquote cannot wrap the line while you stay inside the indent.
 * Allow any block first (paragraph, blockquote, heading, nested list, …).
 */
export const ListItemWithBlocks = ListItem.extend({
  name: 'listItem',
  content: 'block+',
})
