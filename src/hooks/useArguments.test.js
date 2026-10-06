import { describe, expect, it } from 'vitest'
import {
  CATEGORY3_LADDER_DRAFT_ID,
  CATEGORY3_LADDER_SEED_VERSION,
} from '../data/category3LadderDraft'
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

  it('restores missing ladder structure on seed upgrade but keeps local note edits', () => {
    const stale = normalizeArgumentsBoard(null)
    const staleLadder = stale.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    staleLadder.notes = '<p>old cryptic shorthand</p>'
    const firstProng = staleLadder.sections[1].prongs[0]
    firstProng.title = 'a. Jackson’s method, not just his labels'
    firstProng.notes = '<p>my rewritten Youngstown prong</p>'
    staleLadder.sections = []
    delete staleLadder.seedVersion

    const refreshed = normalizeArgumentsBoard(stale)
    const ladder = refreshed.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    expect(ladder.seedVersion).toBe(CATEGORY3_LADDER_SEED_VERSION)
    // Draft-level notes the user already had are not wiped by a seed bump.
    expect(ladder.notes).toContain('old cryptic shorthand')
    expect(ladder.sections.length).toBeGreaterThanOrEqual(4)
  })

  it('keeps a rewritten prong when the seed version bumps', () => {
    const stale = normalizeArgumentsBoard(null)
    const staleLadder = stale.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    const prong = staleLadder.sections.find((s) => s.id === 'c3-s1').prongs[0]
    prong.title = 'a. Jackson’s method, not just his labels'
    prong.notes = '<p>my rewritten Youngstown prong</p>'
    staleLadder.seedVersion = 0

    const refreshed = normalizeArgumentsBoard(stale)
    const ladder = refreshed.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    const kept = ladder.sections.find((s) => s.id === 'c3-s1').prongs[0]
    expect(ladder.seedVersion).toBe(CATEGORY3_LADDER_SEED_VERSION)
    expect(kept.title).toBe('a. Jackson’s method, not just his labels')
    expect(kept.notes).toContain('my rewritten Youngstown prong')
  })

  it('does not resurrect seed prongs the user deleted when the seed version bumps', () => {
    const board = normalizeArgumentsBoard(null)
    const ladder = board.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    const section1 = ladder.sections.find((s) => s.id === 'c3-s1')
    const section2 = ladder.sections.find((s) => s.id === 'c3-s2')
    section1.prongs = section1.prongs.filter((p) => p.id !== 'c3-s1-c')
    section2.prongs = section2.prongs.filter((p) => p.id !== 'c3-s2-c')
    ladder.seedVersion = 0

    const refreshed = normalizeArgumentsBoard(board)
    const next = refreshed.draftsBySide.petitioner.find(
      (d) => d.id === CATEGORY3_LADDER_DRAFT_ID
    )
    const prongIds = next.sections.flatMap((s) => (s.prongs || []).map((p) => p.id))
    expect(prongIds).not.toContain('c3-s1-c')
    expect(prongIds).not.toContain('c3-s2-c')
    expect(next.seedVersion).toBe(CATEGORY3_LADDER_SEED_VERSION)
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
