import { describe, expect, it } from 'vitest'
import {
  CATEGORY3_LADDER_DRAFT_ID,
  CATEGORY3_LADDER_SEED_VERSION,
} from '../data/category3LadderDraft'
import { normalizeArgumentsBoard, normalizeSections } from './useArguments'

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
  it('migrates legacy outlines into Main drafts and seeds the Category 3 ladder', () => {
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

    expect(board.draftsBySide.petitioner[0].name).toBe('Main')
    expect(board.draftsBySide.petitioner[0].notes).toContain('Main pet notes')
    expect(
      board.draftsBySide.petitioner.some((d) => d.id === CATEGORY3_LADDER_DRAFT_ID)
    ).toBe(true)
    const ladder = board.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    expect(ladder.sections.length).toBeGreaterThanOrEqual(4)
    expect(ladder.sections[1].prongs.length).toBe(3)
  })

  it('does not duplicate the Category 3 ladder when already present', () => {
    const first = normalizeArgumentsBoard(null)
    const second = normalizeArgumentsBoard(first)
    const ladderCount = second.draftsBySide.petitioner.filter(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    ).length
    expect(ladderCount).toBe(1)
  })

  it('replaces a seeded ladder draft saved before the current seed version', () => {
    const stale = normalizeArgumentsBoard(null)
    const staleLadder = stale.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    staleLadder.notes = '<p>old cryptic shorthand</p>'
    staleLadder.sections = []
    delete staleLadder.seedVersion

    const refreshed = normalizeArgumentsBoard(stale)
    const ladder = refreshed.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    expect(ladder.seedVersion).toBe(CATEGORY3_LADDER_SEED_VERSION)
    expect(ladder.notes).not.toContain('old cryptic shorthand')
    expect(ladder.sections.length).toBeGreaterThanOrEqual(4)
  })

  it('keeps a ladder draft that is already on the current seed version', () => {
    const board = normalizeArgumentsBoard(null)
    const ladder = board.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    ladder.notes = '<p>my own edits</p>'

    const again = normalizeArgumentsBoard(board)
    const kept = again.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    expect(kept.notes).toContain('my own edits')
  })
})
