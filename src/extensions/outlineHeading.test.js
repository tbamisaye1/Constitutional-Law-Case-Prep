/**
 * Outline headings must stay at the top level of the Arguments page.
 *
 * Regression: a section heading was wrapped into a bullet list at the end of
 * prong 1.5. The page only reads top-level headings, so section 2 vanished
 * and its prongs were listed under section 1.
 */

import { describe, expect, it } from 'vitest'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Fragment } from '@tiptap/pm/model'
import { findWrapping } from '@tiptap/pm/transform'
import { OutlineHeading } from './outlineHeading'
import { PageDocument } from './pageDocument'
import { ListItemWithBlocks } from './listItemWithBlocks'
import { isSilentHeadingLoss } from '../lib/outlineIds'

const pageSchema = getSchema([
  StarterKit.configure({ listItem: false, document: false }),
  ListItemWithBlocks,
  PageDocument,
  OutlineHeading.configure({ structure: true }),
])

const notesSchema = getSchema([
  StarterKit.configure({ listItem: false }),
  ListItemWithBlocks,
  OutlineHeading.configure({ structure: false }),
])

const heading = (schema, kind = 'section') =>
  schema.nodes.outlineHeading.create({ kind, id: 'x' }, schema.text('2) Twilight zone'))
const para = (schema, text = 'note') => schema.nodes.paragraph.create(null, schema.text(text))

describe('page schema', () => {
  it('accepts headings at the top level', () => {
    const doc = pageSchema.nodes.doc.create(null, [para(pageSchema), heading(pageSchema)])
    expect(() => doc.check()).not.toThrow()
  })

  it('never lets a list item, list or quote hold a heading', () => {
    const { listItem, blockquote } = pageSchema.nodes
    const content = Fragment.from([para(pageSchema), heading(pageSchema)])
    expect(listItem.validContent(content)).toBe(false)
    expect(blockquote.validContent(Fragment.from(heading(pageSchema)))).toBe(false)
  })

  it('refuses to wrap a heading into a bullet list', () => {
    const doc = pageSchema.nodes.doc.create(null, [para(pageSchema), heading(pageSchema)])
    const $from = doc.resolve(1)
    const $to = doc.resolve(doc.content.size - 1)
    const range = $from.blockRange($to)
    expect(findWrapping(range, pageSchema.nodes.bulletList)).toBeNull()
  })
})

describe('notes schema (Outline view)', () => {
  it('still keeps a prong sub-point heading inside notes', () => {
    const point = heading(notesSchema, 'point')
    expect(notesSchema.nodes.listItem.validContent(Fragment.from([para(notesSchema), point]))).toBe(true)
  })
})

describe('isSilentHeadingLoss', () => {
  const base = { beforeCount: 3, beforeTitleChars: 30, beforeText: 'abc', allowed: false }

  it('flags a titled heading turned into plain text', () => {
    expect(isSilentHeadingLoss({ ...base, afterCount: 2, afterTitleChars: 14, afterText: 'abc' })).toBe(true)
  })

  it('allows real deletions, undo / demote, and removing an empty heading', () => {
    expect(isSilentHeadingLoss({ ...base, afterCount: 2, afterTitleChars: 14, afterText: 'ab' })).toBe(false)
    expect(
      isSilentHeadingLoss({ ...base, afterCount: 2, afterTitleChars: 14, afterText: 'abc', allowed: true })
    ).toBe(false)
    expect(isSilentHeadingLoss({ ...base, afterCount: 2, afterTitleChars: 30, afterText: 'abc' })).toBe(false)
    expect(isSilentHeadingLoss({ ...base, afterCount: 3, afterTitleChars: 30, afterText: 'abc' })).toBe(false)
  })
})
