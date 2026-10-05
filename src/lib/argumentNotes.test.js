import { describe, expect, it } from 'vitest'
import {
  argumentChunksForAskAi,
  flattenArgumentNotes,
  queryWantsArgumentNotes,
  searchArgumentNotes,
} from './argumentNotes'

const BOARD = {
  notes: {
    petitioner: '<p>Full petitioner flowing draft about Katz.</p>',
    respondent:
      '<p>Whole respondent draft: Youngstown Category Two ebb authorises detention.</p>',
  },
  outlines: {
    petitioner: [],
    respondent: [
      {
        id: 'r1',
        title: 'Youngstown 2nd Ebb',
        notes: '<p>Section notes: we are in the second ebb because Congress authorised.</p>',
        prongs: [
          {
            id: 'pr1',
            title: 'We are in the 2nd Ebb',
            notes: '<p>Prong notes: NDAA and ATA place the President with Congress.</p>',
          },
          {
            id: 'pr2',
            title: '2nd Ebb Authorises this',
            notes: '',
          },
        ],
      },
    ],
  },
}

describe('argumentNotes', () => {
  it('flattens whole, section, and prong notes', () => {
    const rows = flattenArgumentNotes(BOARD)
    expect(rows.some((r) => r.focusType === 'side' && r.side === 'respondent')).toBe(true)
    expect(rows.some((r) => r.focusType === 'section')).toBe(true)
    expect(rows.some((r) => r.focusType === 'prong' && r.title.includes('2nd Ebb'))).toBe(
      true
    )
  })

  it('boosts whole-argument asks and section/prong asks', () => {
    const whole = searchArgumentNotes('summarise my whole argument for respondent', BOARD)
    expect(whole[0].focusType).toBe('side')

    const prong = searchArgumentNotes('focus on prong notes for 2nd Ebb', BOARD)
    expect(prong[0].focusType === 'prong' || prong[0].focusType === 'section').toBe(true)
  })

  it('packs Ask AI chunks', () => {
    const chunks = argumentChunksForAskAi('Youngstown second ebb', BOARD, { limit: 3 })
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0].notes_path).toContain('/arguments')
  })

  it('detects argument note intent', () => {
    expect(queryWantsArgumentNotes('look at my argument notes on Youngstown')).toBe(true)
    expect(queryWantsArgumentNotes('first arg section notes')).toBe(true)
    expect(queryWantsArgumentNotes('define AUMF from the article')).toBe(false)
  })
})
