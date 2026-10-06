import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
})

const {
  DOC_REVISIONS_KEY,
  listDocRevisions,
  snapshotDocRevision,
  findDocRevision,
  resetDocRevisionSaveThrottleForTests,
} = await import('./docRevisions')

describe('docRevisions', () => {
  beforeEach(() => {
    memory.clear()
    resetDocRevisionSaveThrottleForTests()
  })

  it('keeps a rolling history and skips identical consecutive saves', () => {
    expect(snapshotDocRevision('arguments', { a: 1 }, 'save')).toBe(true)
    expect(snapshotDocRevision('arguments', { a: 1 }, 'save')).toBe(false)
    expect(snapshotDocRevision('arguments', { a: 2 }, 'hydrate')).toBe(true)
    const list = listDocRevisions('arguments')
    expect(list).toHaveLength(2)
    expect(list[0].reason).toBe('hydrate')
    expect(JSON.parse(list[0].serialized)).toEqual({ a: 2 })
    expect(JSON.parse(list[1].serialized)).toEqual({ a: 1 })
    expect(memory.get(DOC_REVISIONS_KEY)).toBeTruthy()
  })

  it('finds a prior revision by predicate', () => {
    snapshotDocRevision('arguments', { notes: 'force turned inward' }, 'save')
    // hydrate always snapshots; ordinary save is throttled mid-typing burst
    snapshotDocRevision('arguments', { notes: 'use of force here is domestic' }, 'hydrate')
    const hit = findDocRevision('arguments', (data) =>
      String(data.notes || '').includes('domestic')
    )
    expect(hit?.data.notes).toContain('domestic')
  })

  it('throttles ordinary save snapshots during a typing burst', () => {
    expect(snapshotDocRevision('arguments', { a: 1 }, 'save')).toBe(true)
    expect(snapshotDocRevision('arguments', { a: 2 }, 'save')).toBe(false)
    expect(listDocRevisions('arguments')).toHaveLength(1)
  })
})
