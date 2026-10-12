import { describe, expect, it } from 'vitest'
import {
  extractCitedEvidenceIds,
  formatReplyForDisplay,
  orderEvidenceForDisplay,
} from './samplePrompts'

describe('Ask AI cite helpers', () => {
  it('strips STATUS and SOURCES for display', () => {
    const text = formatReplyForDisplay(
      'STATUS: grounded\n\nATA is central [ev-1][ev-8].\n\nSOURCES:\n[ev-1] Instant Case — quote'
    )
    expect(text).toContain('[ev-8]')
    expect(text).not.toMatch(/^STATUS:/)
    expect(text).not.toContain('SOURCES:')
  })

  it('extracts unique cited evidence ids', () => {
    expect(
      extractCitedEvidenceIds('AUMF [ev-0] and ATA [ev-8][ev-10] then AUMF again [ev-0].')
    ).toEqual(['ev-0', 'ev-8', 'ev-10'])
  })

  it('orders cited evidence cards first', () => {
    const ordered = orderEvidenceForDisplay(
      [{ id: 'ev-1' }, { id: 'ev-8' }, { id: 'ev-2' }, { id: 'ev-10' }],
      ['ev-8', 'ev-10']
    )
    expect(ordered.map((e) => e.id)).toEqual(['ev-8', 'ev-10', 'ev-1', 'ev-2'])
  })
})
