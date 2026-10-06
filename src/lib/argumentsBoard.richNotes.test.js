import { describe, expect, it } from 'vitest'
import { preferRicherNotes } from './argumentsBoard'

describe('preferRicherNotes', () => {
  it('keeps manual notes when the other side is Category 3 seed', () => {
    const seed =
      '<h2>Hamdi: concede, then confine</h2><ul><li>Hamdi v. Rumsfeld, 542 U.S. 507 (2004)</li></ul>'
    const manual =
      '<p><strong>Look at what Congress woul dhave inteded for his</strong> detention</p>'
    expect(preferRicherNotes(manual, seed, 'prong:c3-s2-a')).toContain(
      'Look at what Congress'
    )
    expect(preferRicherNotes(seed, manual, 'prong:c3-s2-a')).toContain(
      'Look at what Congress'
    )
  })

  it('keeps longer manual Jackson notes over seed', () => {
    const seed = '<h2>Walk the three steps he walked</h2><ol><li>Category 1 out</li></ol>'
    const manual =
      '<h2>The claim in one sentence</h2><p>Where Congress has legislated in an area and the President acts against it</p>'
    expect(preferRicherNotes(seed, manual, 'prong:c3-s1-a')).toContain(
      'The claim in one sentence'
    )
  })
})
