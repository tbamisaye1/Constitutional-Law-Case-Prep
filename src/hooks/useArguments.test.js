import { describe, expect, it } from 'vitest'
import { normalizeSections } from './useArguments'

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
