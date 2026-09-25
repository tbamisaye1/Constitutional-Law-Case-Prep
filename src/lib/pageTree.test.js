import { describe, expect, it } from 'vitest'
import {
  findPage,
  firstPageId,
  insertAfter,
  movePages,
  pickPageAfterDelete,
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
      { id: 'b2', title: 'B2', html: '<p>b2</p>' },
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
    expect([...removedIds].sort()).toEqual(['b', 'b1', 'b2'])
  })

  it('picks the next sibling after delete', () => {
    expect(pickPageAfterDelete(sample, 'a')).toBe('b')
    expect(firstPageId(sample)).toBe('a')
  })
})
