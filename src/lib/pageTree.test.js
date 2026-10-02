import { describe, expect, it } from 'vitest'
import {
  findPage,
  findPath,
  firstPageId,
  insertAfter,
  insertAsChild,
  movePages,
  pickPageAfterDelete,
  promotePage,
  removePage,
} from './pageTree'

const sample = [
  { id: 'a', title: 'A', html: '<p>a</p>' },
  {
    id: 'b',
    title: 'B',
    html: '<p>b</p>',
    children: [
      { id: 'b1', title: 'B1', html: '<p>b1</p>' },
      {
        id: 'b2',
        title: 'B2',
        html: '<p>b2</p>',
        children: [{ id: 'b2a', title: 'B2a', html: '<p>b2a</p>' }],
      },
    ],
  },
  { id: 'c', title: 'C', html: '<p>c</p>' },
]

describe('pageTree', () => {
  it('inserts below the current page at the same level', () => {
    const next = insertAfter(sample, 'a', { id: 'x', title: 'X', html: '<p></p>' })
    expect(next.map((p) => p.id)).toEqual(['a', 'x', 'b', 'c'])
  })

  it('inserts below a nested page among its siblings', () => {
    const next = insertAfter(sample, 'b1', { id: 'x', title: 'X', html: '<p></p>' })
    expect(next[1].children.map((p) => p.id)).toEqual(['b1', 'x', 'b2'])
  })

  it('prepends when nothing is selected', () => {
    const next = insertAfter(sample, null, { id: 'x', title: 'X', html: '<p></p>' })
    expect(next[0].id).toBe('x')
  })

  it('inserts a subpage under a parent', () => {
    const next = insertAsChild(sample, 'a', { id: 'x', title: 'X', html: '<p></p>' })
    expect(findPage(next, 'a').children.map((p) => p.id)).toEqual(['x'])
    expect(next.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('inserts a subpage under a page that already has children', () => {
    const next = insertAsChild(sample, 'b', { id: 'x', title: 'X', html: '<p></p>' })
    expect(findPage(next, 'b').children.map((p) => p.id)).toEqual(['x', 'b1', 'b2'])
  })

  it('nests a page under another via move', () => {
    const next = movePages(sample, ['c'], 'a', 0)
    expect(findPage(next, 'a').children.map((p) => p.id)).toEqual(['c'])
    expect(next.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('reorders siblings', () => {
    const next = movePages(sample, ['c'], null, 0)
    expect(next.map((p) => p.id)).toEqual(['c', 'a', 'b'])
  })

  it('removes a page and its subpages', () => {
    const { tree, removedIds } = removePage(sample, 'b')
    expect(tree.map((p) => p.id)).toEqual(['a', 'c'])
    expect([...removedIds].sort()).toEqual(['b', 'b1', 'b2', 'b2a'])
  })

  it('picks the next sibling after delete', () => {
    expect(pickPageAfterDelete(sample, 'a')).toBe('b')
    expect(firstPageId(sample)).toBe('a')
  })

  it('promotes a subpage to the root after its top-level ancestor', () => {
    const next = promotePage(sample, 'b1')
    expect(next.map((p) => p.id)).toEqual(['a', 'b', 'b1', 'c'])
    expect(findPage(next, 'b').children.map((p) => p.id)).toEqual(['b2'])
    expect(findPage(next, 'b1').children || []).toEqual([])
  })

  it('promotes a deeply nested page and keeps its children', () => {
    const next = promotePage(sample, 'b2')
    expect(next.map((p) => p.id)).toEqual(['a', 'b', 'b2', 'c'])
    expect(findPage(next, 'b2').children.map((p) => p.id)).toEqual(['b2a'])
    expect(findPage(next, 'b').children.map((p) => p.id)).toEqual(['b1'])
  })

  it('does nothing when promoting a top-level page', () => {
    expect(promotePage(sample, 'a')).toEqual(sample)
  })

  it('finds the path from root to a nested page', () => {
    expect(findPath(sample, 'b2a')).toEqual(['b', 'b2', 'b2a'])
    expect(findPath(sample, 'missing')).toBeNull()
  })
})
