import { describe, expect, it } from 'vitest'
import { blurbFor } from './caseBlurb'

describe('blurbFor', () => {
  it('prefers headline note over holding', () => {
    expect(
      blurbFor({
        headlineNote: 'Useful for statutory interpretation.',
        holding: 'It did not.',
      })
    ).toBe('Useful for statutory interpretation.')
  })

  it('does not truncate at v. in a case name', () => {
    const headline =
      'Costanzo v. Tillinghast (Dec. 5, 1932) is a Supreme Court decision about deportation under the Immigration Act of 1917 §19. The Court was considering whether the statute limits deportation.'
    const blurb = blurbFor({ headlineNote: headline })
    expect(blurb.startsWith('Costanzo v. Tillinghast (Dec. 5, 1932)')).toBe(true)
    expect(blurb).not.toBe('Costanzo v.')
    expect(blurb.includes('deportation')).toBe(true)
  })

  it('falls back to holding when headline is empty', () => {
    expect(blurbFor({ holding: 'It did not. Deportation may occur later.' })).toBe(
      'It did not. Deportation may occur later.'
    )
  })
})
