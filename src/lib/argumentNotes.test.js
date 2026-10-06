import { describe, expect, it } from 'vitest'
import {
  argumentChunksForAskAi,
  flattenArgumentNotes,
  joinArgumentOutlineBlocks,
  notePreview,
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

  it('builds a plain-text note preview for the scratch jump list', () => {
    expect(notePreview('')).toBe('')
    expect(notePreview('<p>Short working note.</p>')).toBe('Short working note.')
    const long = notePreview(`<p>${'word '.repeat(80)}</p>`, 40)
    expect(long.endsWith('…')).toBe(true)
    expect(long.length).toBeLessThanOrEqual(42)
    expect(long.includes('<')).toBe(false)
  })

  it('joins sections and prongs in outline order for the read-through', () => {
    const blocks = joinArgumentOutlineBlocks(BOARD.outlines.respondent)
    expect(blocks.map((b) => b.label)).toEqual(['1.', '1.1', '1.2'])
    expect(blocks[0].kind).toBe('section')
    expect(blocks[0].title).toBe('Youngstown 2nd Ebb')
    expect(blocks[0].empty).toBe(false)
    expect(blocks[1].kind).toBe('prong')
    expect(blocks[2].empty).toBe(true)
  })

  it('flattens notes from every draft when draftsBySide is present', () => {
    const board = {
      draftsBySide: {
        petitioner: [
          {
            id: 'petitioner-main',
            name: 'Main',
            notes: '<p>Main whole notes</p>',
            sections: [],
          },
          {
            id: 'alt-q2-ladder',
            name: 'Alt · Q2 Category 3 ladder',
            notes: '<p>Ladder whole notes about Youngstown Category Three.</p>',
            sections: [
              {
                id: 'c3-s2',
                title: 'Lowest Ebb',
                notes: '<p>Section notes on lowest ebb.</p>',
                prongs: [
                  {
                    id: 'c3-p21',
                    title: 'Legal framework',
                    notes: '<p>Prong notes citing Youngstown Jackson.</p>',
                  },
                ],
              },
            ],
          },
        ],
        respondent: [],
      },
    }
    const rows = flattenArgumentNotes(board)
    expect(rows.some((r) => r.title.includes('Main') && r.focusType === 'side')).toBe(true)
    expect(rows.some((r) => r.draftId === 'alt-q2-ladder' && r.focusType === 'prong')).toBe(
      true
    )
  })
})
