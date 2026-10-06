import { describe, expect, it } from 'vitest'
import { letterToStart } from './alphaListInput'

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
