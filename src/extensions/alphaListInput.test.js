import { describe, expect, it } from 'vitest'
import { findWrappingList, letterToStart } from './alphaListInput'

describe('letterToStart', () => {
  it('maps a–z to 1–26', () => {
    expect(letterToStart('a')).toBe(1)
    expect(letterToStart('b')).toBe(2)
    expect(letterToStart('z')).toBe(26)
  })

  it('accepts uppercase as the same start index', () => {
    expect(letterToStart('A')).toBe(1)
    expect(letterToStart('C')).toBe(3)
  })

  it('rejects non-letters', () => {
    expect(letterToStart('1')).toBeNull()
    expect(letterToStart('')).toBeNull()
    expect(letterToStart('ab')).toBeNull()
  })
})

describe('findWrappingList', () => {
  it('returns the nearest list ancestor', () => {
    const bullet = { type: { name: 'bulletList' }, attrs: {} }
    const item = { type: { name: 'listItem' }, attrs: {} }
    const paragraph = { type: { name: 'paragraph' }, attrs: {} }
    const nodes = [null, bullet, item, paragraph]
    const $pos = {
      depth: 3,
      node: (d) => nodes[d],
      before: (d) => d * 10,
    }
    expect(findWrappingList($pos)).toEqual({ node: bullet, depth: 1, pos: 10 })
  })

  it('returns null when the cursor is not in a list', () => {
    const doc = { type: { name: 'doc' } }
    const paragraph = { type: { name: 'paragraph' } }
    const $pos = {
      depth: 1,
      node: (d) => (d === 0 ? doc : paragraph),
      before: () => 0,
    }
    expect(findWrappingList($pos)).toBeNull()
  })
})
