import { describe, expect, it } from 'vitest'

import { emptySyncMeta, keepNewerLocalEdits, markDirty, metaKey } from './sync'

const ARGS = metaKey('library_records', 'arguments', 'main')

function boardStore(title, syncMeta = emptySyncMeta()) {
  return {
    cases: [],
    annotations: [],
    filesMeta: [],
    notesByCase: {},
    argumentsBoard: [{ id: 'main', draftsBySide: { petitioner: [{ id: 'd1', title }] } }],
    syncMeta,
  }
}

function synced(updatedAt) {
  return { ...emptySyncMeta(), rows: { [ARGS]: { updatedAt, deleted: false, baseUpdatedAt: updatedAt } } }
}

function title(store) {
  return store.argumentsBoard[0].draftsBySide.petitioner[0].title
}

describe('keepNewerLocalEdits', () => {
  it('keeps this tab\'s edit when the other tab wrote a store that never saw it', () => {
    // Both tabs last saw the server board at 1000. This tab then typed.
    const local = boardStore('Not Category 2', markDirty(synced(1000), [ARGS], 2000))
    const incoming = boardStore('Not Category 3', synced(1000))

    const adopted = keepNewerLocalEdits(local, incoming)

    expect(title(adopted)).toBe('Not Category 2')
    expect(adopted.syncMeta.dirty[ARGS]).toBe(true)
    expect(adopted.syncMeta.rows[ARGS].updatedAt).toBe(2000)
  })

  it('lets a server version written after our edit win', () => {
    const local = boardStore('Old edit', markDirty(synced(1000), [ARGS], 2000))
    const incoming = boardStore('Server board', synced(2500))

    const adopted = keepNewerLocalEdits(local, incoming)

    expect(adopted).toBe(incoming)
    expect(title(adopted)).toBe('Server board')
  })

  it('keeps typing made after the leader pushed this tab\'s earlier save', () => {
    // Saved "Not Category" at 2000, the leader pushed it, then typed "2" at 2300.
    const savedThenTyped = markDirty(markDirty(synced(1000), [ARGS], 2000), [ARGS], 2300)
    const local = boardStore('Not Category 2', savedThenTyped)
    const pushed = { ...emptySyncMeta(), rows: { [ARGS]: { updatedAt: 2000, deleted: false, baseUpdatedAt: 1000 } } }
    const incoming = boardStore('Not Category', pushed)

    const adopted = keepNewerLocalEdits(local, incoming)

    expect(title(adopted)).toBe('Not Category 2')
    expect(adopted.syncMeta.dirty[ARGS]).toBe(true)
  })

  it('takes the other tab\'s pending edit when it is newer than ours', () => {
    const local = boardStore('Mine', markDirty(synced(1000), [ARGS], 2000))
    const incoming = boardStore('Theirs', markDirty(synced(1000), [ARGS], 3000))

    expect(keepNewerLocalEdits(local, incoming)).toBe(incoming)
  })

  it('keeps ours when the other tab holds an older pending edit of the same row', () => {
    const local = boardStore('Mine', markDirty(synced(1000), [ARGS], 3000))
    const incoming = boardStore('Theirs', markDirty(synced(1000), [ARGS], 2000))

    expect(title(keepNewerLocalEdits(local, incoming))).toBe('Mine')
  })

  it('adopts the other tab\'s store as-is when this tab has nothing unsent', () => {
    const local = boardStore('Mine', synced(1000))
    const incoming = boardStore('Theirs', synced(1500))

    expect(keepNewerLocalEdits(local, incoming)).toBe(incoming)
  })

  it('keeps a local tombstone instead of resurrecting the row', () => {
    const key = metaKey('annotations', 'a-1')
    const local = {
      ...boardStore('x'),
      annotations: [],
      syncMeta: markDirty(
        { ...emptySyncMeta(), rows: { [key]: { updatedAt: 1000, deleted: false, baseUpdatedAt: 1000 } } },
        [key],
        2000,
        true
      ),
    }
    const incoming = {
      ...boardStore('x'),
      annotations: [{ id: 'a-1', text: 'still here' }],
      syncMeta: { ...emptySyncMeta(), rows: { [key]: { updatedAt: 1000, deleted: false, baseUpdatedAt: 1000 } } },
    }

    const adopted = keepNewerLocalEdits(local, incoming)

    expect(adopted.annotations).toEqual([])
    expect(adopted.syncMeta.rows[key].deleted).toBe(true)
  })

  it('keeps a newer local note layer', () => {
    const key = metaKey('notes', 'case-1', 'layer-1')
    const local = {
      ...boardStore('x'),
      notesByCase: { 'case-1': { 'layer-1': '<p>new</p>' } },
      syncMeta: markDirty(emptySyncMeta(), [key], 2000),
    }
    const incoming = {
      ...boardStore('x'),
      notesByCase: { 'case-1': { 'layer-1': '<p>old</p>', 'layer-2': '<p>other</p>' } },
      syncMeta: emptySyncMeta(),
    }

    const adopted = keepNewerLocalEdits(local, incoming)

    expect(adopted.notesByCase['case-1']).toEqual({
      'layer-1': '<p>new</p>',
      'layer-2': '<p>other</p>',
    })
  })
})
