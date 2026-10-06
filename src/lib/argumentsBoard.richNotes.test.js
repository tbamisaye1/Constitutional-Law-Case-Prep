import { describe, expect, it } from 'vitest'
import { preferLocalArgumentDeletions, preferRicherNotes } from './argumentsBoard'

describe('preferRicherNotes', () => {
  it('keeps manual notes when the other side is Category 3 seed', () => {
    const seed =
      '<h2>Hamdi: concede, then confine</h2><ul><li>Hamdi v. Rumsfeld, 542 U.S. 507 (2004)</li></ul>'
    const manual =
      '<p><strong>Look at what Congress woul dhave inteded for his</strong> detention</p>'
    expect(preferRicherNotes(manual, seed, 'prong:c3-s2-a')).toContain(
      'Look at what Congress'
    )
    expect(preferRicherNotes(seed, manual, 'prong:c3-s2-a')).toContain(
      'Look at what Congress'
    )
  })

  it('keeps longer manual Jackson notes over seed', () => {
    const seed = '<h2>Walk the three steps he walked</h2><ol><li>Category 1 out</li></ol>'
    const manual =
      '<h2>The claim in one sentence</h2><p>Where Congress has legislated in an area and the President acts against it</p>'
    expect(preferRicherNotes(seed, manual, 'prong:c3-s1-a')).toContain(
      'The claim in one sentence'
    )
  })
})

describe('preferLocalArgumentDeletions', () => {
  const side = (sections) => ({
    petitioner: [{ id: 'alt-q2', name: 'Alt', sections }],
    respondent: [],
  })

  const seedSection = {
    id: 'c3-s2',
    title: 'Lowest ebb',
    notes: '',
    prongs: [
      { id: 'c3-s2-a', title: 'a', notes: '' },
      { id: 'c3-s2-b', title: 'b', notes: '' },
    ],
  }

  it('keeps a prong this browser just added when a stale remote pull is smaller', () => {
    const remote = side([seedSection])
    const local = side([
      {
        ...seedSection,
        prongs: [
          ...seedSection.prongs,
          { id: 'pr-1770000000000-abc', title: 'New prong', notes: '<p>cite</p>' },
        ],
      },
    ])
    const merged = preferLocalArgumentDeletions(remote, local)
    const prongs = merged.petitioner[0].sections[0].prongs
    expect(prongs.map((p) => p.id)).toContain('pr-1770000000000-abc')
    expect(prongs.find((p) => p.id === 'pr-1770000000000-abc').title).toBe('New prong')
  })

  it('still takes a trimmed remote when local extras are leftover seed prongs', () => {
    const remote = side([
      {
        ...seedSection,
        prongs: [{ id: 'c3-s2-a', title: 'a', notes: '' }],
      },
    ])
    const local = side([seedSection])
    const merged = preferLocalArgumentDeletions(remote, local)
    expect(merged.petitioner[0].sections[0].prongs.map((p) => p.id)).toEqual(['c3-s2-a'])
  })
})
