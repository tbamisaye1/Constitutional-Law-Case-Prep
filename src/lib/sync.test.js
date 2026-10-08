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
  rebaseAcceptedArguments,
  rejectedArgumentsEcho,
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
    noteTabs: [],
    articleTitles: [],
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

    expect(changes.annotations).toEqual([
      {
        id: 'a-1',
        caseId: '',
        fileId: null,
        page: 1,
        kind: 'page',
        quote: '',
        text: '',
        rects: null,
        pinned: false,
        color: 'gold',
        topics: [],
        updatedAt: 2_000,
        deleted: true,
      },
    ])
  })

  it('round-trips annotation topics through collect and apply', () => {
    const base = store({
      annotations: [{ ...annotation('a-1', 'tagged'), topics: ['AUMF', 'Hamdi'] }],
    })
    const meta = markDirty(base.syncMeta, [metaKey('annotations', 'a-1')], 3_000)
    const { changes } = collectChanges(base, meta)
    expect(changes.annotations[0].topics).toEqual(['AUMF', 'Hamdi'])

    const empty = store()
    const applied = applyChanges(empty, emptySyncMeta(), {
      annotations: [{ ...changes.annotations[0], updatedAt: 3_000 }],
    })
    expect(applied.store.annotations[0].topics).toEqual(['AUMF', 'Hamdi'])
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
      noteTabs: [{ id: 'tab-1', caseId: 'katz', label: 'Hypo', kind: 'text' }],
    })
    const meta = markDirty(
      base.syncMeta,
      [
        metaKey('library_records', 'cites', 'cite-1'),
        metaKey('library_records', 'timeline', 'event-1'),
        metaKey('library_records', 'note_tabs', 'tab-1'),
      ],
      1_000
    )

    const { changes } = collectChanges(base, meta)

    expect(changes.library_records.map((row) => row.kind).sort()).toEqual([
      'cites',
      'note_tabs',
      'timeline',
    ])
  })

  it('pushes the OneNote notebook as library_records kind notebook', () => {
    const base = store({
      notebook: [
        {
          id: 'main',
          tree: [{ id: 'sec-1', name: 'Issue 2', kind: 'section' }],
          pagesBySection: {
            'sec-1': [{ id: 'pg-1', title: 'NDAA', html: '<p>detention</p>' }],
          },
        },
      ],
    })
    const meta = markDirty(base.syncMeta, [metaKey('library_records', 'notebook', 'main')], 1_000)
    const { changes } = collectChanges(base, meta)
    expect(changes.library_records).toHaveLength(1)
    expect(changes.library_records[0].kind).toBe('notebook')
    expect(changes.library_records[0].id).toBe('main')
    expect(changes.library_records[0].data.pagesBySection['sec-1'][0].title).toBe('NDAA')
  })

  it('pushes arguments / guide / facts / openings snapshot docs', () => {
    const base = store({
      argumentsBoard: [{ id: 'main', outlines: { petitioner: [] }, notes: { petitioner: '<p>x</p>' } }],
      guideEdits: [{ id: 'main', edits: { intro: '<p>hi</p>' } }],
      factsBoard: [{ id: 'main', facts: [{ id: 'f1', text: 'Ring cameras' }] }],
      openings: [{ id: 'main', petitioner: '<p>P</p>', respondent: '<p>R</p>' }],
    })
    const meta = markDirty(
      base.syncMeta,
      [
        metaKey('library_records', 'arguments', 'main'),
        metaKey('library_records', 'guide_edits', 'main'),
        metaKey('library_records', 'facts', 'main'),
        metaKey('library_records', 'openings', 'main'),
      ],
      1_000
    )
    const { changes } = collectChanges(base, meta)
    const kinds = changes.library_records.map((r) => r.kind).sort()
    expect(kinds).toEqual(['arguments', 'facts', 'guide_edits', 'openings'])
  })

  it('sends baseUpdatedAt on dirty Arguments pushes', () => {
    const key = metaKey('library_records', 'arguments', 'main')
    const base = store({
      argumentsBoard: [{ id: 'main', notes: { petitioner: '<p>local</p>' } }],
      syncMeta: {
        cursor: 0,
        rows: { [key]: { updatedAt: 5_000, deleted: false, baseUpdatedAt: 5_000 } },
        dirty: {},
      },
    })
    const meta = markDirty(base.syncMeta, [key], 9_000)
    const { changes } = collectChanges(base, meta)
    const args = changes.library_records.find((row) => row.kind === 'arguments')
    expect(args.baseUpdatedAt).toBe(5_000)
    expect(args.updatedAt).toBe(9_000)
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

  it('takes a peer Arguments write over a dirty stale local stamp', () => {
    const key = metaKey('library_records', 'arguments', 'main')
    const base = store({
      argumentsBoard: [{ id: 'main', notes: { petitioner: '<p>stale tab</p>' } }],
    })
    // Loaded server version 5_000, then dirtied with Date.now()-style 9_000.
    let meta = {
      cursor: 0,
      rows: { [key]: { updatedAt: 5_000, deleted: false, baseUpdatedAt: 5_000 } },
      dirty: {},
    }
    meta = markDirty(meta, [key], 9_000)

    const result = applyChanges(base, meta, {
      library_records: [
        {
          kind: 'arguments',
          id: 'main',
          data: { id: 'main', notes: { petitioner: '<p>mcp edit</p>' } },
          // Newer than base, older than dirty stamp — classic MCP race.
          updatedAt: 7_000,
        },
      ],
    })

    expect(result.store.argumentsBoard[0].notes.petitioner).toBe('<p>mcp edit</p>')
    expect(result.syncMeta.dirty[key]).toBeUndefined()
    expect(result.applied).toBe(1)
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

  it('keeps a local stored flag when a pull omits it', () => {
    const base = store({
      filesMeta: [
        {
          id: 'pdf-1',
          caseId: 'corpus-articles',
          name: 'summary.pdf',
          size: 900,
          stored: true,
        },
      ],
    })
    const meta = markDirty(emptySyncMeta(), [metaKey('documents', 'pdf-1')], 1_000)

    const result = applyChanges(base, meta, {
      documents: [
        {
          id: 'pdf-1',
          caseId: 'corpus-articles',
          name: 'summary.pdf',
          size: 900,
          contentType: 'application/pdf',
          updatedAt: 5_000,
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

describe('Arguments stale-base rejection', () => {
  const key = metaKey('library_records', 'arguments', 'main')
  const serverBoard = { id: 'main', notes: { petitioner: '<p>server</p>' } }

  it('stamps the echo with the server row version, not the response time', () => {
    const echo = rejectedArgumentsEcho(
      { id: 'main', data: serverBoard, serverUpdatedAt: 7_000 },
      12_000
    )
    expect(echo.updatedAt).toBe(7_000)
    expect(echo.forceApply).toBe(true)
  })

  it('falls back to serverTime when an older server omits serverUpdatedAt', () => {
    expect(rejectedArgumentsEcho({ data: serverBoard }, 12_000).updatedAt).toBe(12_000)
    expect(rejectedArgumentsEcho({ data: serverBoard, serverUpdatedAt: null }, 12_000).updatedAt).toBe(
      12_000
    )
  })

  it('heals a corrupted base so the next push carries the exact server version', () => {
    // A browser that ran the old code: base is a serverTime (9_500) that is
    // NEWER than the real row (7_000), and the local copy is dirty.
    let meta = {
      cursor: 0,
      rows: { [key]: { updatedAt: 9_500, deleted: false, baseUpdatedAt: 9_500 } },
      dirty: {},
    }
    meta = markDirty(meta, [key], 10_000)
    const base = store({
      argumentsBoard: [{ id: 'main', notes: { petitioner: '<p>local</p>' } }],
    })

    const echo = rejectedArgumentsEcho({ id: 'main', data: serverBoard, serverUpdatedAt: 7_000 }, 12_000)
    const pulled = applyChanges(base, meta, { library_records: [echo] })

    expect(pulled.applied).toBe(1)
    expect(pulled.store.argumentsBoard[0].notes.petitioner).toBe('<p>server</p>')
    expect(pulled.syncMeta.rows[key].baseUpdatedAt).toBe(7_000)

    // The merged board is re-published (marked dirty) and pushed again: the
    // base it carries now matches the server exactly, so it is accepted.
    const again = markDirty(pulled.syncMeta, [key], 13_000)
    const { changes } = collectChanges(pulled.store, again)
    const args = changes.library_records.find((row) => row.kind === 'arguments')
    expect(args.baseUpdatedAt).toBe(7_000)
  })

  it('never sends the client-only forceApply flag into the stored board', () => {
    const echo = rejectedArgumentsEcho({ id: 'main', data: serverBoard, serverUpdatedAt: 7_000 }, 1)
    const pulled = applyChanges(store(), emptySyncMeta(), { library_records: [echo] })
    expect(pulled.store.argumentsBoard[0].forceApply).toBeUndefined()
  })
})

describe('rebaseAcceptedArguments', () => {
  const key = metaKey('library_records', 'arguments', 'main')

  // Typing during an in-flight push: the first edit set base 1_000, the push
  // carried updatedAt 2_000, and a mid-flight keystroke re-stamped 3_000.
  function typedDuringPush() {
    let meta = { ...emptySyncMeta(), rows: { [key]: { updatedAt: 1_000, deleted: false } } }
    meta = markDirty(meta, [key], 2_000)
    const sent = { [key]: 2_000 }
    meta = markDirty(meta, [key], 3_000)
    return clearAccepted(meta, sent, 2_500)
  }

  it('moves the base of a still-dirty board to the version the server stored', () => {
    const meta = typedDuringPush()
    expect(meta.dirty[key]).toBe(true)
    expect(meta.rows[key].baseUpdatedAt).toBe(1_000)

    const { syncMeta, rebasedIds } = rebaseAcceptedArguments(
      meta,
      [{ kind: 'arguments', id: 'main', updatedAt: 2_000 }],
      []
    )
    expect(rebasedIds).toEqual(['main'])
    expect(syncMeta.rows[key].baseUpdatedAt).toBe(2_000)
    expect(syncMeta.rows[key].updatedAt).toBe(3_000)

    const { changes } = collectChanges(
      store({ argumentsBoard: [{ id: 'main', draftsBySide: {} }] }),
      syncMeta
    )
    expect(changes.library_records[0].baseUpdatedAt).toBe(2_000)
  })

  it('leaves the base alone when the server rewrote the board', () => {
    const meta = typedDuringPush()
    const { syncMeta, rebasedIds } = rebaseAcceptedArguments(
      meta,
      [{ kind: 'arguments', id: 'main', updatedAt: 2_000 }],
      [{ kind: 'arguments', id: 'main', reason: 'arguments_rejected_seed_content' }]
    )
    expect(rebasedIds).toEqual([])
    expect(syncMeta).toBe(meta)
  })

  it('ignores rows that are no longer dirty and older servers without accepted', () => {
    const clean = { ...emptySyncMeta(), rows: { [key]: { updatedAt: 2_000, deleted: false } } }
    expect(
      rebaseAcceptedArguments(clean, [{ kind: 'arguments', id: 'main', updatedAt: 2_000 }], [])
        .rebasedIds
    ).toEqual([])
    const meta = typedDuringPush()
    expect(rebaseAcceptedArguments(meta, undefined, undefined).syncMeta).toBe(meta)
  })
})
