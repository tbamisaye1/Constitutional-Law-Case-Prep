import { describe, expect, it } from 'vitest'
import { bookmarkChipLabel } from './bookmarkChipLabel'

describe('bookmarkChipLabel', () => {
  it('shows page only when there is no custom name', () => {
    expect(bookmarkChipLabel({ page: 21 })).toBe('p. 21')
    expect(bookmarkChipLabel({ page: 3, label: 'Page 3' })).toBe('p. 3')
    expect(bookmarkChipLabel({ page: 3, label: '  ' })).toBe('p. 3')
  })

  it('keeps page number and custom name together', () => {
    expect(bookmarkChipLabel({ page: 21, label: 'NDAA §1021' })).toBe(
      'p. 21 · NDAA §1021'
    )
    expect(
      bookmarkChipLabel({ page: 18, label: 'citizens must be detained in USA' })
    ).toBe('p. 18 · citizens must be detained in USA')
  })
})
