import { describe, expect, it } from 'vitest'
import { articleDisplayName, articleSearchHaystack } from './articleLabels'

describe('articleDisplayName', () => {
  it('cleans numbered dump filenames', () => {
    expect(articleDisplayName('06b_United_States_v_USDC_Keith.pdf')).toBe(
      'United States v. USDC Keith'
    )
  })

  it('keeps readable case titles', () => {
    expect(articleDisplayName('Ex parte Milligan, 71 U.S. (4 Wall.) 2 (1866).pdf')).toContain(
      'Milligan'
    )
  })

  it('collapses opaque Drive hashes', () => {
    const hashed =
      'ACFrOgAS9b_Udb_HXITuugoCYMQTS8KraNYH7ajFRyKr1hOnjVfPza5bdOiPFa8rK68VfKHpjQhmpAmp3db7WWLnFKzvRRXf5WS4sczQLcDDN_Kbkf@qnj6nEOmfYwbeVcUrMNG_U9o-ZKGo_WiUQtJFEWdkn-NLVFBIA6oG6w==.pdf'
    expect(articleDisplayName(hashed)).toBe('Uploaded PDF (long drive name)')
  })

  it('indexes both display and raw names for search', () => {
    const hay = articleSearchHaystack('07_United_States_v_Jones.pdf')
    expect(hay).toContain('jones')
    expect(hay).toContain('07_united_states')
  })
})
