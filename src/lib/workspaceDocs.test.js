import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
})

const {
  WORKSPACE_DOCS,
  hasPersistedArgumentsSave,
  workspaceDocRowsFromLocal,
} = await import('./workspaceDocs')

describe('hasPersistedArgumentsSave', () => {
  it('is false for empty localStorage / seed-shaped absence', () => {
    expect(hasPersistedArgumentsSave(null)).toBe(false)
    expect(hasPersistedArgumentsSave(undefined)).toBe(false)
    expect(hasPersistedArgumentsSave({})).toBe(false)
  })

  it('is true when drafts or legacy outlines were actually saved', () => {
    expect(
      hasPersistedArgumentsSave({
        draftsBySide: { petitioner: [{ id: 'petitioner-main', sections: [] }] },
      })
    ).toBe(true)
    expect(
      hasPersistedArgumentsSave({
        outlines: { petitioner: [{ id: 'p1', title: 'Opening' }] },
      })
    ).toBe(true)
  })
})

describe('workspaceDocRowsFromLocal', () => {
  beforeEach(() => {
    memory.clear()
  })

  it('does not invent arguments / facts / openings rows with no local save', () => {
    expect(workspaceDocRowsFromLocal('arguments')).toEqual([])
    expect(workspaceDocRowsFromLocal('facts')).toEqual([])
    expect(workspaceDocRowsFromLocal('openings')).toEqual([])
    expect(workspaceDocRowsFromLocal('guide_edits')).toEqual([])
  })
})

describe('arguments fromRow', () => {
  beforeEach(() => {
    memory.clear()
  })

  it('takes Postgres as-is when this browser has no saved arguments', () => {
    const remote = {
      id: 'main',
      draftsBySide: {
        petitioner: [
          {
            id: 'alt-q2-ladder',
            name: 'Alt · Q2 Category 3 ladder',
            notes: '<p>Manual Hamdi notes from Postgres</p>',
            sections: [
              {
                id: 'c3-s1',
                title: '1) Lowest ebb',
                notes: '<p>Server section</p>',
                prongs: [],
              },
            ],
          },
        ],
        respondent: [
          {
            id: 'respondent-main',
            name: 'Main',
            notes: '',
            sections: [],
          },
        ],
      },
      activeDraftBySide: { petitioner: 'alt-q2-ladder', respondent: 'respondent-main' },
    }

    const board = WORKSPACE_DOCS.arguments.fromRow(remote)
    expect(board.draftsBySide.petitioner[0].name).toBe('Alt · Q2 Category 3 ladder')
    expect(board.draftsBySide.petitioner[0].notes).toContain('Manual Hamdi notes from Postgres')
    expect(board.draftsBySide.petitioner[0].sections[0].title).toBe('1) Lowest ebb')
    // Seed upgrade must not rewrite Postgres titles on a fresh browser.
    expect(board.draftsBySide.petitioner[0].sections[0].notes).toContain('Server section')
  })

  it('forceRemote ignores a leftover local seed board', () => {
    memory.set(
      'case-prep-arguments-v1',
      JSON.stringify({
        draftsBySide: {
          petitioner: [
            {
              id: 'alt-q2-ladder',
              notes: '<h2>Introduction</h2><p>We ask this court to reverse for 3 reasons.</p>',
              sections: [],
            },
          ],
          respondent: [{ id: 'respondent-main', notes: '', sections: [] }],
        },
      })
    )
    const remote = {
      draftsBySide: {
        petitioner: [
          {
            id: 'alt-q2-ladder',
            notes: '<p>2nd Ebb considerations:</p>',
            sections: [],
          },
        ],
        respondent: [{ id: 'respondent-main', notes: '', sections: [] }],
      },
    }
    const board = WORKSPACE_DOCS.arguments.fromRow(remote, { forceRemote: true })
    expect(board.draftsBySide.petitioner[0].notes).toContain('2nd Ebb')
    expect(board.draftsBySide.petitioner[0].notes).not.toContain('Introduction')
  })
})
