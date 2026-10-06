import { describe, expect, it } from 'vitest'
import {
  applyPageToDraft,
  blockRange,
  draftToPageHtml,
  moveBlockOrder,
  outlineFromPage,
  pageJsonToDraftParts,
  restoreUntouched,
} from './argumentPage'
import { outlineFixes } from './outlineIds'

const H = (kind, id, title) => ({
  type: 'outlineHeading',
  attrs: { kind, id },
  content: title ? [{ type: 'text', text: title }] : [],
})
const P = (text) => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] })
const doc = (...content) => ({ type: 'doc', content })

// Stand-in for TipTap's serializer: enough to see which nodes went where.
const serialize = (nodes) =>
  nodes
    .map((n) => `<p>${(n.content || []).map((c) => c.text || '').join('')}</p>`)
    .join('')

describe('pageJsonToDraftParts', () => {
  it('splits intro, sections and prongs in order', () => {
    const parts = pageJsonToDraftParts(
      doc(
        P('theme'),
        H('section', 's1', 'Lowest ebb'),
        P('framework'),
        H('prong', 'p1', 'a. Category 3'),
        P('jackson'),
        P('more'),
        H('prong', 'p2', 'b. Silence'),
        H('section', 's2', 'Statutes')
      ),
      serialize
    )
    expect(parts.notes).toBe('<p>theme</p>')
    expect(parts.sections.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(parts.sections[0].notes).toBe('<p>framework</p>')
    expect(parts.sections[0].prongs).toEqual([
      { id: 'p1', title: 'a. Category 3', notes: '<p>jackson</p><p>more</p>' },
      { id: 'p2', title: 'b. Silence', notes: '' },
    ])
    expect(parts.sections[1]).toEqual({ id: 's2', title: 'Statutes', notes: '', prongs: [] })
  })

  it('stores empty paragraphs as no notes at all', () => {
    const parts = pageJsonToDraftParts(doc(P(''), H('section', 's1', 'One'), P(''), P('')), serialize)
    expect(parts.notes).toBe('')
    expect(parts.sections[0].notes).toBe('')
  })

  it('promotes a prong that comes before any section', () => {
    const parts = pageJsonToDraftParts(doc(H('prong', 'p0', 'stray'), P('x')), serialize)
    expect(parts.sections).toHaveLength(1)
    expect(parts.sections[0].id).toBe('p0')
    expect(parts.sections[0].notes).toBe('<p>x</p>')
  })

  it('gives a duplicated heading (copy-paste) a fresh id', () => {
    const parts = pageJsonToDraftParts(
      doc(H('section', 's1', 'A'), H('section', 's1', 'A copy')),
      serialize
    )
    expect(parts.sections[0].id).toBe('s1')
    expect(parts.sections[1].id).not.toBe('s1')
    expect(parts.sections[1].id).toMatch(/^sec-/)
  })

  it('handles an empty document', () => {
    expect(pageJsonToDraftParts(doc(), serialize)).toEqual({ notes: '', sections: [] })
    expect(pageJsonToDraftParts(null, serialize)).toEqual({ notes: '', sections: [] })
  })
})

describe('draftToPageHtml', () => {
  it('writes headings with ids and escapes titles', () => {
    const html = draftToPageHtml({
      notes: '<p>intro</p>',
      sections: [
        {
          id: 's"1',
          title: 'A < B & C',
          notes: '<p>n</p>',
          prongs: [{ id: 'p1', title: 'prong', notes: '' }],
        },
      ],
    })
    expect(html).toBe(
      '<p>intro</p><h1 data-outline="section" data-id="s&quot;1">A &lt; B &amp; C</h1><p>n</p><h1 data-outline="prong" data-id="p1">prong</h1>'
    )
  })

  it('never returns an empty string', () => {
    expect(draftToPageHtml({ notes: '', sections: [] })).toBe('<p></p>')
    expect(draftToPageHtml(null)).toBe('<p></p>')
  })
})

describe('applyPageToDraft', () => {
  const draft = {
    id: 'd1',
    name: 'Ladder',
    notes: '<p>i</p>',
    scratch: '<p>loose</p>',
    seedVersion: 7,
    sections: [
      { id: 's1', title: 'One', notes: '', prongs: [{ id: 'p1', title: 'a', notes: '' }] },
    ],
  }

  it('returns the same object when nothing changed', () => {
    expect(applyPageToDraft(draft, { notes: draft.notes, sections: draft.sections })).toBe(draft)
  })

  it('keeps scratch and other fields, and remembers deleted ids', () => {
    const next = applyPageToDraft(draft, {
      notes: '<p>i</p>',
      sections: [{ id: 's1', title: 'One', notes: '', prongs: [] }],
    })
    expect(next.scratch).toBe('<p>loose</p>')
    expect(next.seedVersion).toBe(7)
    expect(next.removedOutlineIds).toEqual(['p1'])
  })

  it('forgets a removed id once it is back (undo)', () => {
    const removed = { ...draft, removedOutlineIds: ['p1', 'old'] }
    const next = applyPageToDraft(removed, {
      notes: '<p>changed</p>',
      sections: draft.sections,
    })
    expect(next.removedOutlineIds).toEqual(['old'])
  })
})

describe('outline helpers', () => {
  const page = doc(
    P('intro'),
    H('section', 's1', 'One'),
    P('x'),
    H('prong', 'p1', 'a'),
    P('y'),
    H('prong', 'p2', 'b'),
    H('section', 's2', 'Two'),
    H('prong', 'p3', 'c')
  )
  const kinds = page.content.map((n) => ({ type: n.type, kind: n.attrs?.kind }))

  it('numbers sections and prongs', () => {
    expect(outlineFromPage(page).map((i) => `${i.number} ${i.title}`)).toEqual([
      '1 One',
      '1.1 a',
      '1.2 b',
      '2 Two',
      '2.1 c',
    ])
  })

  it('a section owns its prongs; a prong owns its notes only', () => {
    expect(blockRange(kinds, 1)).toEqual([1, 6])
    expect(blockRange(kinds, 3)).toEqual([3, 5])
    expect(blockRange(kinds, 0)).toBeNull()
  })

  it('moves a whole section with its prongs', () => {
    // Move section 2 (index 6..7) before section 1 (index 1).
    expect(moveBlockOrder(kinds, 6, 1)).toEqual([0, 6, 7, 1, 2, 3, 4, 5])
  })

  it('moves a prong into another section', () => {
    // Prong p1 (3..4) to the end of the page, i.e. under section 2.
    expect(moveBlockOrder(kinds, 3, null)).toEqual([0, 1, 2, 5, 6, 7, 3, 4])
  })

  it('refuses no-op and into-itself moves', () => {
    expect(moveBlockOrder(kinds, 1, 3)).toBeNull()
    expect(moveBlockOrder(kinds, 3, 5)).toBeNull()
  })
})

describe('outlineFixes', () => {
  it('assigns missing and duplicate ids and promotes a leading prong', () => {
    const fixes = outlineFixes([
      { pos: 0, kind: 'prong', id: 'a' },
      { pos: 5, kind: 'section', id: null },
      { pos: 9, kind: 'prong', id: 'a' },
    ])
    expect(fixes[0]).toEqual({ pos: 0, kind: 'section' })
    expect(fixes[1].pos).toBe(5)
    expect(fixes[1].id).toMatch(/^sec-/)
    expect(fixes[2].pos).toBe(9)
    expect(fixes[2].id).toMatch(/^pr-/)
  })

  it('leaves a valid outline alone', () => {
    expect(
      outlineFixes([
        { pos: 0, kind: 'section', id: 's' },
        { pos: 3, kind: 'prong', id: 'p' },
      ])
    ).toEqual([])
  })
})

describe('restoreUntouched', () => {
  const raw = {
    notes: '<p>intro</p>',
    sections: [
      {
        id: 's1',
        title: 'One',
        notes: '<p data-x="1">raw form</p>',
        prongs: [{ id: 'p1', title: 'a', notes: '<p>raw prong</p>' }],
      },
    ],
  }
  const normalized = {
    notes: '<p>intro</p>',
    sections: [
      {
        id: 's1',
        title: 'One',
        notes: '<p>raw form</p>',
        prongs: [{ id: 'p1', title: 'a', notes: '<p>raw prong</p>' }],
      },
    ],
  }

  it('keeps the stored markup for fields the user did not touch', () => {
    const parts = { notes: normalized.notes, sections: JSON.parse(JSON.stringify(normalized.sections)) }
    parts.sections[0].prongs[0].notes = '<p>edited</p>'
    const out = restoreUntouched(parts, normalized, raw)
    expect(out.sections[0].notes).toBe('<p data-x="1">raw form</p>')
    expect(out.sections[0].prongs[0].notes).toBe('<p>edited</p>')
  })

  it('passes new sections and prongs through unchanged', () => {
    const parts = {
      notes: '<p>intro</p>',
      sections: [
        ...JSON.parse(JSON.stringify(normalized.sections)),
        { id: 's2', title: 'Two', notes: '<p>n</p>', prongs: [] },
      ],
    }
    const out = restoreUntouched(parts, normalized, raw)
    expect(out.sections[1]).toEqual({ id: 's2', title: 'Two', notes: '<p>n</p>', prongs: [] })
  })
})
