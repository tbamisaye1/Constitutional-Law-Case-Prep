import { describe, expect, it } from 'vitest'
import {
  caseSubstanceScore,
  findCaseNameDuplicates,
  normalizeCaseName,
  preferKeepCaseId,
} from './caseDuplicates'

describe('caseDuplicates', () => {
  it('normalizes names for matching', () => {
    expect(normalizeCaseName('Costanzo v. Tillinghast')).toBe('costanzo v tillinghast')
    expect(normalizeCaseName('Costanzo v. Tillinghast')).toBe(
      normalizeCaseName('Costanzo v Tillinghast')
    )
  })

  it('prefers seeded ids over case- timestamps when substance is equal', () => {
    expect(preferKeepCaseId('costanzo', 'case-123')).toBe('costanzo')
    expect(preferKeepCaseId('case-123', 'costanzo')).toBe('costanzo')
  })

  it('keeps the card with real highlights even when the other is a seed id', () => {
    const library = {
      filesMeta: [{ id: 'pdf-1', caseId: 'case-99' }],
      annotations: [
        { id: 'a-1', caseId: 'case-99', text: 'Facts of the case and holding notes', quote: 'within five years' },
      ],
      notesByCase: {
        costanzo: {
          overview:
            '<h2>Understanding</h2><p>What happened in this case and why it matters.</p><p><em>Costanzo</em></p>',
        },
      },
    }
    expect(preferKeepCaseId('costanzo', 'case-99', library)).toBe('case-99')
    expect(caseSubstanceScore('case-99', library)).toBeGreaterThan(
      caseSubstanceScore('costanzo', library)
    )
  })

  it('finds a manual duplicate of a seeded Costanzo card', () => {
    const cases = [
      { id: 'costanzo', name: 'Costanzo v. Tillinghast' },
      { id: 'case-99', name: 'Costanzo v. Tillinghast' },
      { id: 'hamdi', name: 'Hamdi v. Rumsfeld' },
    ]
    const dups = findCaseNameDuplicates(cases, 'case-99')
    expect(dups).toHaveLength(1)
    expect(dups[0].keepId).toBe('costanzo')
    expect(dups[0].dropId).toBe('case-99')
  })
})
