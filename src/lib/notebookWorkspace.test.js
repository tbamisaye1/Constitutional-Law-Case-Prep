import { beforeEach, describe, expect, it } from 'vitest'
import { NOTEBOOK_STORAGE_KEY } from './articleTakeaways'
import {
  hydrateNotebookFromRemote,
  notebookRowsForLibraryLoad,
  notebookSnapshotsEqual,
  saveNotebookSnapshot,
} from './notebookWorkspace'

function installLocalStorage() {
  const map = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => (map.has(key) ? map.get(key) : null),
      setItem: (key, value) => {
        map.set(key, String(value))
      },
      removeItem: (key) => {
        map.delete(key)
      },
    },
  })
}

describe('notebookWorkspace persistence', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it('prefers the dedicated notes key over a stale library mirror', () => {
    const fresh = {
      tree: [{ id: 'sec-new', name: 'Podcasts', kind: 'section', color: '#8C3226' }],
      pagesBySection: {
        'sec-new': [{ id: 'pg-1', title: 'Episode notes', html: '<p>saved</p>' }],
      },
    }
    localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(fresh))

    const staleMirror = [
      {
        id: 'main',
        tree: [{ id: 'sec-old', name: 'Issue 1 Notes', kind: 'section' }],
        pagesBySection: { 'sec-old': [] },
      },
    ]

    const rows = notebookRowsForLibraryLoad(staleMirror)
    expect(rows[0].tree[0].name).toBe('Podcasts')
    expect(rows[0].pagesBySection['sec-new'][0].html).toContain('saved')
  })

  it('falls back to the library mirror when the dedicated key is empty', () => {
    const mirror = [
      {
        id: 'main',
        tree: [{ id: 'sec-1', name: 'From library', kind: 'section' }],
        pagesBySection: { 'sec-1': [] },
      },
    ]
    const rows = notebookRowsForLibraryLoad(mirror)
    expect(rows[0].tree[0].name).toBe('From library')
  })

  it('does not hydrate when the snapshot already matches local notes', () => {
    const snap = {
      tree: [{ id: 'sec-1', name: 'Articles', kind: 'section' }],
      pagesBySection: { 'sec-1': [{ id: 'pg-1', title: 'A', html: '<p>x</p>' }] },
    }
    saveNotebookSnapshot(snap.tree, snap.pagesBySection, { immediate: true })
    expect(hydrateNotebookFromRemote({ id: 'main', ...snap })).toBe(false)
  })

  it('keeps a local section with pages when a smaller remote notebook hydrates', () => {
    const local = {
      tree: [
        { id: 'sec-1', name: 'Issue 1 Notes', kind: 'section' },
        { id: 'sec-bg', name: 'Background info', kind: 'section' },
      ],
      pagesBySection: {
        'sec-1': [{ id: 'pg-1', title: 'A', html: '<p>x</p>' }],
        'sec-bg': [{ id: 'pg-ndaa', title: 'NDAA', html: '<p>covered person</p>' }],
      },
    }
    saveNotebookSnapshot(local.tree, local.pagesBySection, { immediate: true })

    const remote = {
      id: 'main',
      tree: [{ id: 'sec-1', name: 'Issue 1 Notes', kind: 'section' }],
      pagesBySection: {
        'sec-1': [{ id: 'pg-1', title: 'A', html: '<p>x</p>' }],
      },
    }

    // Local already has Background; hydrate still returns true so sync can
    // push the richer union back up to Postgres.
    expect(hydrateNotebookFromRemote(remote)).toBe(true)
    const saved = JSON.parse(localStorage.getItem(NOTEBOOK_STORAGE_KEY))
    expect(saved.tree.map((n) => n.id)).toContain('sec-bg')
    expect(saved.pagesBySection['sec-bg'][0].html).toContain('covered person')
  })

  it('notebookSnapshotsEqual distinguishes section edits', () => {
    const a = {
      tree: [{ id: 'sec-1', name: 'Fourth Amendment', kind: 'section' }],
      pagesBySection: { 'sec-1': [] },
    }
    const b = {
      tree: [{ id: 'sec-1', name: 'Issue 1 Notes', kind: 'section' }],
      pagesBySection: { 'sec-1': [] },
    }
    expect(notebookSnapshotsEqual(a, a)).toBe(true)
    expect(notebookSnapshotsEqual(a, b)).toBe(false)
  })
})
