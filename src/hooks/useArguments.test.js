import { describe, expect, it } from 'vitest'
import { CATEGORY3_LADDER_DRAFT_ID } from '../data/category3LadderDraft'
import { moveArrayItem } from '../lib/argumentsBoard'
import { normalizeArgumentsBoard, normalizeSections } from './useArguments'

describe('moveArrayItem', () => {
  it('moves an item to a new index', () => {
    expect(moveArrayItem(['a', 'b', 'c', 'd'], 2, 0)).toEqual(['c', 'a', 'b', 'd'])
    expect(moveArrayItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('returns the same array when the move is a no-op', () => {
    const list = ['a', 'b']
    expect(moveArrayItem(list, 1, 1)).toBe(list)
    expect(moveArrayItem(list, -1, 0)).toBe(list)
  })
})

describe('normalizeSections', () => {
  it('migrates the old flat outline rows into sections with empty prongs', () => {
    const sections = normalizeSections([
      { id: 'p1', title: 'Opening theme' },
      { id: 'p2', title: 'Q1 roadmap' },
    ])
    expect(sections).toHaveLength(2)
    expect(sections[0]).toEqual({
      id: 'p1',
      title: 'Opening theme',
      notes: '',
      prongs: [],
    })
    expect(sections[1].prongs).toEqual([])
  })

  it('keeps nested prongs when already present', () => {
    const sections = normalizeSections([
      {
        id: 'p1',
        title: 'Q1',
        notes: '<p>section</p>',
        prongs: [{ id: 'pr1', title: 'Katz subjective', notes: '<p>prong</p>' }],
      },
    ])
    expect(sections[0].notes).toBe('<p>section</p>')
    expect(sections[0].prongs).toEqual([
      { id: 'pr1', title: 'Katz subjective', notes: '<p>prong</p>' },
    ])
  })
})

describe('normalizeArgumentsBoard', () => {
  it('migrates legacy outlines into Main drafts without inventing a Category 3 ladder', () => {
    const board = normalizeArgumentsBoard({
      outlines: {
        petitioner: [{ id: 'p1', title: 'Opening theme', notes: '', prongs: [] }],
        respondent: [{ id: 'r1', title: 'Opening', notes: '', prongs: [] }],
      },
      notes: {
        petitioner: '<p>Main pet notes</p>',
        respondent: '<p>Main resp notes</p>',
      },
    })

    expect(board.draftsBySide.petitioner).toHaveLength(1)
    expect(board.draftsBySide.petitioner[0].name).toBe('Main')
    expect(board.draftsBySide.petitioner[0].notes).toContain('Main pet notes')
    expect(
      board.draftsBySide.petitioner.some((d) => d.id === CATEGORY3_LADDER_DRAFT_ID)
    ).toBe(false)
  })

  it('empty board is a blank Main draft, not Bronner seed content', () => {
    const board = normalizeArgumentsBoard(null)
    expect(board.draftsBySide.petitioner).toHaveLength(1)
    expect(board.draftsBySide.petitioner[0].id).toBe('petitioner-main')
    expect(board.draftsBySide.petitioner[0].notes).toBe('')
    expect(
      board.draftsBySide.petitioner.some((d) => d.id === CATEGORY3_LADDER_DRAFT_ID)
    ).toBe(false)
  })

  it('keeps a ladder draft that already exists in saved data', () => {
    const board = normalizeArgumentsBoard({
      draftsBySide: {
        petitioner: [
          {
            id: CATEGORY3_LADDER_DRAFT_ID,
            name: 'Alt · Q2 Category 3 ladder',
            notes: '<p>my own edits</p>',
            sections: [{ id: 'c3-s1', title: 'Lowest ebb', notes: '', prongs: [] }],
          },
        ],
        respondent: [{ id: 'respondent-main', name: 'Main', notes: '', sections: [] }],
      },
      activeDraftBySide: {
        petitioner: CATEGORY3_LADDER_DRAFT_ID,
        respondent: 'respondent-main',
      },
    })
    const kept = board.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    expect(kept.notes).toContain('my own edits')
    expect(kept.sections[0].title).toBe('Lowest ebb')
  })

  it('keeps Opening theme deleted when the board-level tombstone map is present', () => {
    const board = normalizeArgumentsBoard({
      draftsBySide: {
        petitioner: [
          {
            id: CATEGORY3_LADDER_DRAFT_ID,
            name: 'Alt',
            notes: '',
            sections: [
              { id: 'c3-s0', title: 'Opening theme', notes: '', prongs: [] },
              { id: 'c3-s1', title: 'Lowest ebb', notes: '', prongs: [] },
            ],
          },
        ],
        respondent: [{ id: 'respondent-main', name: 'Main', notes: '', sections: [] }],
      },
      activeDraftBySide: {
        petitioner: CATEGORY3_LADDER_DRAFT_ID,
        respondent: 'respondent-main',
      },
      removedOutlineIdsByDraft: { [CATEGORY3_LADDER_DRAFT_ID]: ['c3-s0'] },
    })
    const next = board.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    expect(next.sections.map((s) => s.id)).not.toContain('c3-s0')
  })
})
