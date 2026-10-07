/**
 * Top node for the Arguments page editor: ordinary blocks plus outline
 * headings. Outline headings are in their own group (see outlineHeading.js), so
 * only this document accepts them, and only at the top level.
 */

import { Node } from '@tiptap/core'
import { PAGE_DOC_CONTENT } from '../lib/outlineIds'

export const PageDocument = Node.create({
  name: 'doc',
  topNode: true,
  content: PAGE_DOC_CONTENT,
})
