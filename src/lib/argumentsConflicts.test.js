import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
})

const {
  applyConflictChoices,
  clearPendingConflicts,
  conflictLabel,
  conflictPreview,
  readPendingConflicts,
  recordConflicts,
  setBoardField,
} = await import('./argumentsConflicts')

const board = {
  draftsBySide: {
    petitioner: [
      {
        id: 'petitioner-main',
        name: 'Main',
        notes: '<p>whole</p>',
        sections: [
          {
            id: 's1',
            title: 'Youngstown',
            notes: '',
            prongs: [{ id: 'p1', title: 'Not Category 1', notes: '<p>local</p>' }],
          },
        ],
      },
    ],
    respondent: [],
  },
  activeDraftBySide: { petitioner: 'petitioner-main', respondent: null },
  practiceLog: [],
}

beforeEach(() => {
  memory.clear()
  clearPendingConflicts()
})

describe('argumentsConflicts', () => {
  it('labels a prong conflict with the prong title', () => {
    expect(
      conflictLabel(
        { path: '/petitioner/petitioner-main/s1/p1.notes', field: 'notes' },
        board
      )
    ).toContain('Not Category 1')
  })

  it('strips html for previews', () => {
    expect(conflictPreview('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
    expect(conflictPreview('')).toBe('(empty)')
  })

  it('records and reads pending conflicts', () => {
    const conflicts = [
      {
        path: '/petitioner/petitioner-main/s1/p1.notes',
        field: 'notes',
        local: '<p>LOCAL</p>',
        remote: '<p>REMOTE</p>',
        lost: '<p>LOCAL</p>',
      },
    ]
    recordConflicts({
      conflicts,
      local: board,
      remote: board,
      merged: board,
      at: 1,
    })
    const pending = readPendingConflicts()
    expect(pending.conflicts).toHaveLength(1)
    expect(pending.conflicts[0].local).toContain('LOCAL')
    clearPendingConflicts()
    expect(readPendingConflicts()).toBeNull()
  })

  it('setBoardField writes a prong notes field', () => {
    const next = setBoardField(
      board,
      '/petitioner/petitioner-main/s1/p1.notes',
      '<p>chosen</p>'
    )
    expect(next.draftsBySide.petitioner[0].sections[0].prongs[0].notes).toBe('<p>chosen</p>')
  })

  it('applyConflictChoices prefers local when chosen', () => {
    const conflicts = [
      {
        path: '/petitioner/petitioner-main/s1/p1.notes',
        field: 'notes',
        local: '<p>LOCAL</p>',
        remote: '<p>REMOTE</p>',
      },
    ]
    const merged = setBoardField(board, conflicts[0].path, '<p>REMOTE</p>')
    const out = applyConflictChoices(merged, conflicts, {
      [conflicts[0].path]: 'local',
    })
    expect(out.draftsBySide.petitioner[0].sections[0].prongs[0].notes).toBe('<p>LOCAL</p>')
  })
})
