/**
 * Sync translation rules.
 *
 * These cover the cases that are wrong in a way you would not notice until a
 * second device is involved: tombstones that never leave, pulled rows echoing
 * back forever, and edits made while a request is in flight getting dropped.
 */

import { describe, expect, it } from 'vitest'

import {
  applyChanges,
  clearAccepted,
  collectChanges,
  emptySyncMeta,
  markDirty,
  markSeedRowsDirty,
  metaKey,
  pendingCount,
} from './sync'

function store(overrides = {}) {
  return {
    cases: [],
    annotations: [],
    notesByCase: {},
    filesMeta: [],
    opinions: [],
    caseFacts: [],
    cites: [],
    timeline: [],
    syncMeta: emptySyncMeta(),
    ...overrides,
  }
}

function annotation(id, text) {
  return {
    id,
    caseId: 'case-at-bar',
    fileId: 'pdf-1',
    page: 4,
    kind: 'page',
    quote: '',
    text,
    rects: null,
  }
}

describe('collectChanges', () => {
  it('sends only rows that are dirty', () => {
    const base = store({ annotations: [annotation('a-1', 'kept'), annotation('a-2', 'quiet')] })
    const meta = markDirty(base.syncMeta, [metaKey('annotations', 'a-1')], 1_000)

    const { changes, sent } = collectChanges(base, meta)

    expect(changes.annotations.map((row) => row.id)).toEqual(['a-1'])
    expect(Object.keys(sent)).toEqual([metaKey('annotations', 'a-1')])
  })

  it('sends nothing when the store is quiet', () => {
    const base = store({ annotations: [annotation('a-1', 'saved already')] })

    const { changes, sent } = collectChanges(base, base.syncMeta)

    expect(changes).toEqual({})
    expect(sent).toEqual({})
  })

  it('sends a tombstone for a row that is gone from the store', () => {
    // The row has already been removed from the collection, which is what the
    // remove handlers do. Only the meta entry is left to carry the delete.
    const meta = markDirty(emptySyncMeta(), [metaKey('annotations', 'a-1')], 2_000, true)

    const { changes } = collectChanges(store(), meta)

    expect(changes.annotations).toEqual([{ id: 'a-1', updatedAt: 2_000, deleted: true }])
  })

  it('keys notes by case and layer', () => {
    const base = store({ notesByCase: { 'case-at-bar': { overview: '<p>record</p>' } } })
    const meta = markDirty(base.syncMeta, [metaKey('notes', 'case-at-bar', 'overview')], 1_000)

    const { changes } = collectChanges(base, meta)

    expect(changes.notes).toEqual([
      { caseId: 'case-at-bar', layerId: 'overview', html: '<p>record</p>', updatedAt: 1_000, deleted: false },
    ])
  })

  it('maps research collections onto library_records kinds', () => {
    const base = store({
      cites: [{ id: 'cite-1', label: 'Katz' }],
      timeline: [{ id: 'event-1', label: 'Argued' }],
    })
    const meta = markDirty(
      base.syncMeta,
      [metaKey('library_records', 'cites', 'cite-1'), metaKey('library_records', 'timeline', 'event-1')],
      1_000
    )

    const { changes } = collectChanges(base, meta)

    expect(changes.library_records.map((row) => row.kind).sort()).toEqual(['cites', 'timeline'])
  })
})

describe('applyChanges', () => {
  it('adds a row the server knows about', () => {
    const result = applyChanges(store(), emptySyncMeta(), {
      annotations: [{ ...annotation('a-1', 'from the iPad'), updatedAt: 5_000 }],
    })

    expect(result.store.annotations).toHaveLength(1)
    expect(result.store.annotations[0].text).toBe('from the iPad')
    expect(result.applied).toBe(1)
  })

  it('ignores a row that is older than the local copy', () => {
    const base = store({ annotations: [annotation('a-1', 'my newer edit')] })
    const meta = markDirty(base.syncMeta, [metaKey('annotations', 'a-1')], 9_000)

    const result = applyChanges(base, meta, {
      annotations: [{ ...annotation('a-1', 'stale server copy'), updatedAt: 1_000 }],
    })

    expect(result.store.annotations[0].text).toBe('my newer edit')
    expect(result.applied).toBe(0)
  })

  it('ignores an echo of a row we just pushed', () => {
    // The server hands back what it accepted. Applying it again would re-dirty
    // the row and push it once more, which is an endless loop.
    const base = store({ annotations: [annotation('a-1', 'mine')] })
    const meta = markDirty(base.syncMeta, [metaKey('annotations', 'a-1')], 4_000)

    const result = applyChanges(base, meta, {
      annotations: [{ ...annotation('a-1', 'mine'), updatedAt: 4_000 }],
    })

    expect(result.applied).toBe(0)
  })

  it('removes a row when the server sends a tombstone', () => {
    const base = store({ annotations: [annotation('a-1', 'deleted elsewhere')] })
    const meta = markDirty(base.syncMeta, [metaKey('annotations', 'a-1')], 1_000)

    const result = applyChanges(base, meta, {
      annotations: [{ id: 'a-1', updatedAt: 2_000, deleted: true }],
    })

    expect(result.store.annotations).toEqual([])
  })

  it('records that a document has bytes on the backend', () => {
    const result = applyChanges(store(), emptySyncMeta(), {
      documents: [
        {
          id: 'pdf-1',
          caseId: 'case-at-bar',
          name: 'record.pdf',
          size: 900,
          contentType: 'application/pdf',
          stored: true,
          updatedAt: 3_000,
        },
      ],
    })

    expect(result.store.filesMeta[0].stored).toBe(true)
  })

  it('folds a pulled note into the right case and layer', () => {
    const base = store({ notesByCase: { 'case-at-bar': { holding: '<p>keep me</p>' } } })

    const result = applyChanges(base, emptySyncMeta(), {
      notes: [{ caseId: 'case-at-bar', layerId: 'overview', html: '<p>synced</p>', updatedAt: 2_000 }],
    })

    expect(result.store.notesByCase['case-at-bar']).toEqual({
      holding: '<p>keep me</p>',
      overview: '<p>synced</p>',
    })
  })

  it('skips library_records of a kind this client does not know', () => {
    const result = applyChanges(store(), emptySyncMeta(), {
      library_records: [{ kind: 'argument_chains', id: 'x-1', data: {}, updatedAt: 1_000 }],
    })

    expect(result.applied).toBe(0)
  })
})

describe('clearAccepted', () => {
  it('clears the flag for rows the server took', () => {
    const meta = markDirty(emptySyncMeta(), [metaKey('annotations', 'a-1')], 1_000)

    const cleared = clearAccepted(meta, { [metaKey('annotations', 'a-1')]: 1_000 }, 7_000)

    expect(pendingCount(cleared)).toBe(0)
    expect(cleared.cursor).toBe(7_000)
  })

  it('keeps a row dirty when it was edited mid-request', () => {
    // Otherwise the edit made while the push was in flight is silently lost:
    // it is in the local store but nothing will ever send it.
    const key = metaKey('annotations', 'a-1')
    let meta = markDirty(emptySyncMeta(), [key], 1_000)
    const sent = { [key]: 1_000 }
    meta = markDirty(meta, [key], 2_000)

    const cleared = clearAccepted(meta, sent, 7_000)

    expect(pendingCount(cleared)).toBe(1)
  })
})

describe('markSeedRowsDirty', () => {
  it('offers rows the workspace has never seen', () => {
    const base = store({ cases: [{ id: 'katz' }], cites: [{ id: 'cite-1' }] })

    const meta = markSeedRowsDirty(base, base.syncMeta, 1_000)

    expect(pendingCount(meta)).toBe(2)
  })

  it('leaves rows the server already sent alone', () => {
    // This is what stops a fresh browser's seed data from overwriting real
    // edits pulled from another device moments earlier.
    const base = store({ cases: [{ id: 'katz', name: 'Edited on the iPad' }] })
    const pulled = applyChanges(base, emptySyncMeta(), {
      cases: [{ id: 'katz', name: 'Edited on the iPad', updatedAt: 5_000 }],
    })

    const meta = markSeedRowsDirty(pulled.store, pulled.syncMeta, 9_000)

    expect(pendingCount(meta)).toBe(0)
  })
})
