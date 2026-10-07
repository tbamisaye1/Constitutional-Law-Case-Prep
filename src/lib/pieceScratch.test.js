import { describe, expect, it } from 'vitest'
import {
  appendPieceHtml,
  mergePieceScratch,
  orphanPieces,
  pointsInNotes,
  scratchPieces,
  setPieceHtml,
} from './pieceScratch'
import { mergeArgumentsBoards } from './argumentsMerge'
import { normalizeArgumentsBoard } from './argumentsBoard'

const draft = {
  id: 'd1',
  name: 'Main',
  notes: '',
  scratch: '<p>general</p>',
  pieceScratch: { p2: '<p>art ii notes</p>', gone: '<p>old piece</p>' },
  sections: [
    { id: 's1', title: 'One', notes: '', prongs: [{ id: 'p1', title: 'a', notes: '' }] },
    {
      id: 's2',
      title: 'Two',
      notes: '',
      prongs: [
        {
          id: 'p2',
          title: 'Article II appropriateness',
          notes:
            '<p>x</p><h1 data-outline="point" data-id="q1" class="outline-heading is-point">Domestic &amp; inward</h1><p>y</p>',
        },
      ],
    },
  ],
}

describe('scratchPieces', () => {
  it('lists General then every section, prong and sub-point with outline numbers', () => {
    expect(scratchPieces(draft).map((p) => `${p.number}|${p.kind}|${p.title}`)).toEqual([
      '|general|General',
      '1|section|One',
      '1.1|prong|a',
      '2|section|Two',
      '2.1|prong|Article II appropriateness',
      '2.1.1|point|Domestic & inward',
    ])
    expect(scratchPieces(draft).find((p) => p.key === 'p2').html).toBe('<p>art ii notes</p>')
  })

  it('reads sub-point ids from prong notes', () => {
    expect(pointsInNotes(draft.sections[1].prongs[0].notes)).toEqual([
      { id: 'q1', title: 'Domestic & inward' },
    ])
  })

  it('keeps notes of deleted pieces as orphans instead of dropping them', () => {
    expect(orphanPieces(draft).map((p) => p.key)).toEqual(['gone'])
  })
})

describe('setPieceHtml / appendPieceHtml', () => {
  it('removes an entry when it becomes blank and appends to empty boxes cleanly', () => {
    expect(setPieceHtml({ a: '<p>x</p>' }, 'a', '<p></p>')).toEqual({})
    expect(appendPieceHtml({ a: '<p></p>' }, 'a', '<p>y</p>')).toEqual({ a: '<p>y</p>' })
    expect(appendPieceHtml({ a: '<p>x</p>' }, 'a', '<p>y</p>')).toEqual({ a: '<p>x</p><p>y</p>' })
  })
})

describe('mergePieceScratch', () => {
  it('takes whichever side changed each piece', () => {
    expect(
      mergePieceScratch({ a: '1', b: '1' }, { a: '2', b: '1' }, { a: '1', b: '3', c: '4' })
    ).toEqual({ a: '2', b: '3', c: '4' })
  })

  it('keeps both copies when both sides changed the same piece', () => {
    const out = mergePieceScratch({ a: '<p>1</p>' }, { a: '<p>local</p>' }, { a: '<p>remote</p>' })
    expect(out.a).toContain('<p>remote</p>')
    expect(out.a).toContain('<p>local</p>')
  })
})

describe('board sync keeps scratch', () => {
  const board = (d) =>
    normalizeArgumentsBoard({
      draftsBySide: { petitioner: [d], respondent: [] },
      activeDraftBySide: { petitioner: d.id },
    })

  it('normalizing keeps scratch and pieceScratch', () => {
    const d = board(draft).draftsBySide.petitioner[0]
    expect(d.scratch).toBe('<p>general</p>')
    expect(d.pieceScratch.p2).toBe('<p>art ii notes</p>')
  })

  it('a device that never had scratch does not wipe it from the server', () => {
    const { scratch: _s, pieceScratch: _p, ...bare } = draft
    const base = board(bare)
    const local = board(bare)
    const remote = board(draft)
    const merged = mergeArgumentsBoards(base, local, remote).board.draftsBySide.petitioner[0]
    expect(merged.scratch).toBe('<p>general</p>')
    expect(merged.pieceScratch.p2).toBe('<p>art ii notes</p>')
  })
})

describe('clearing piece scratch reaches the server', () => {
  it('keeps an empty object instead of dropping the field', () => {
    const d = normalizeArgumentsBoard({
      draftsBySide: { petitioner: [{ ...draft, pieceScratch: {} }], respondent: [] },
    }).draftsBySide.petitioner[0]
    expect(d.pieceScratch).toEqual({})
    expect(mergePieceScratch({ a: '<p>1</p>' }, {}, { a: '<p>1</p>' })).toEqual({})
  })
})
