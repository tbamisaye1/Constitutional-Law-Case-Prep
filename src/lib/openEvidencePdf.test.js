import { describe, expect, it } from 'vitest'
import {
  findAttachedPdfForOyezSource,
  findCaseForSource,
  findFileBySourceName,
  isBootstrapOyezSource,
  normalizePdfName,
  pathForLibraryFile,
  scoreNameMatch,
  stripOyezSummaryLabel,
} from './openEvidencePdf'

describe('openEvidencePdf matching', () => {
  it('strips numbered corpus prefixes', () => {
    expect(normalizePdfName('06b_United_States_v_USDC_Keith.pdf')).toContain('keith')
  })

  it('flags bootstrap Oyez summaries as non-PDF sources', () => {
    expect(isBootstrapOyezSource('Youngstown Sheet & Tube Company v. Sawyer (Oyez summary)')).toBe(
      true
    )
    expect(isBootstrapOyezSource('Youngstown Sheet & Tube Co. v. Sawyer.pdf')).toBe(false)
    expect(stripOyezSummaryLabel('Ex parte Milligan (Oyez summary)')).toBe('Ex parte Milligan')
  })

  it('opens an already-attached Milligan PDF when Ask AI cites the Oyez summary', () => {
    const hit = findAttachedPdfForOyezSource(
      [
        {
          id: 'pdf-milligan',
          caseId: 'milligan',
          name: 'Ex parte Milligan, 71 U.S. (4 Wall.) 2 (1866).pdf',
        },
      ],
      [
        {
          id: 'milligan',
          name: 'Ex parte Milligan',
          suggestedFile: 'Ex parte Milligan.pdf',
          cite: '71 U.S. 2 (1866)',
        },
      ],
      'Ex parte Milligan (Oyez summary)'
    )
    expect(hit?.file.id).toBe('pdf-milligan')
  })

  it('matches Keith upload name to suggested library file', () => {
    const score = scoreNameMatch(
      '06b_United_States_v_USDC_Keith.pdf',
      'United States v. U.S. District Court (Keith).pdf'
    )
    expect(score).toBeGreaterThanOrEqual(35)
  })

  it('finds library file by source name', () => {
    const hit = findFileBySourceName(
      [{ id: 'pdf-1', caseId: 'keith', name: 'United States v. U.S. District Court (Keith).pdf' }],
      '06b_United_States_v_USDC_Keith.pdf'
    )
    expect(hit?.file.id).toBe('pdf-1')
  })

  it('routes Instant Case files to /facts', () => {
    expect(
      pathForLibraryFile({ id: 'f1', caseId: 'case-at-bar' }, { page: 3, quote: 'AUMF' })
    ).toMatch(/^\/facts\?/)
  })

  it('routes corpus articles to /articles', () => {
    expect(pathForLibraryFile({ id: 'f2', caseId: 'corpus-articles' }, { page: 1 })).toMatch(
      /^\/articles\?/
    )
  })

  it('picks best case card for a source', () => {
    const hit = findCaseForSource(
      [
        { id: 'katz', name: 'Katz v. United States', suggestedFile: 'Katz v. United States.pdf' },
        {
          id: 'keith',
          name: 'United States v. U.S. District Court',
          suggestedFile: 'United States v. U.S. District Court (Keith).pdf',
        },
      ],
      '06b_United_States_v_USDC_Keith.pdf'
    )
    expect(hit?.caseItem.id).toBe('keith')
  })
})
