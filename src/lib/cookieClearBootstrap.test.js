/**
 * Cookie / site-data clear practice: empty localStorage must not invent a
 * "saved" push of seed Arguments over Postgres.
 */

import { describe, expect, it } from 'vitest'

import {
  applyChanges,
  collectChanges,
  emptySyncMeta,
  metaKey,
  pendingCount,
} from './sync'
import { DOC_ROW_ID } from './workspaceDocs'

const ARGS_KEY = metaKey('library_records', 'arguments', DOC_ROW_ID)

function emptyAfterCookieClear() {
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
    argumentsBoard: [],
    syncMeta: emptySyncMeta(),
  }
}

function remoteArgumentsRow(notesHtml, title) {
  return {
    id: DOC_ROW_ID,
    kind: 'arguments',
    data: {
      activeSide: 'petitioner',
      draftsBySide: {
        petitioner: [
          {
            id: 'cat3',
            title: 'Category 3',
            notes: notesHtml,
            sections: [
              {
                id: 'c3-s1',
                title: 'I.',
                notes: '',
                prongs: [{ id: 'c3-s1-a', title, notes: '<p>prong</p>' }],
              },
            ],
          },
        ],
      },
    },
    updatedAt: 1_700_000_000_000,
    deleted: false,
  }
}

describe('cookie clear bootstrap (sync rules)', () => {
  it('pulling Postgres arguments into an empty browser keeps pending at zero', () => {
    const base = emptyAfterCookieClear()
    const next = applyChanges(base, base.syncMeta, {
      library_records: [
        remoteArgumentsRow(
          '<p>2nd Ebb considerations:</p><p><strong>For H</strong></p>',
          'a. Jackson’s method, not just his labels'
        ),
      ],
    })

    // applyChanges stores library_records as { ...data, id }
    expect(next.store.argumentsBoard?.[0]?.draftsBySide?.petitioner?.[0]?.notes).toContain(
      '2nd Ebb'
    )
    expect(pendingCount(next.syncMeta)).toBe(0)

    const { changes } = collectChanges(next.store, next.syncMeta)
    expect(changes.library_records || []).toEqual([])
  })

  it('newer Postgres row replaces a seed board left only in memory', () => {
    const seedBoard = {
      id: DOC_ROW_ID,
      activeSide: 'petitioner',
      draftsBySide: {
        petitioner: [
          {
            id: 'cat3',
            notes: '<h2>Introduction</h2><p>We ask this court to reverse for 3 reasons.</p>',
            sections: [],
          },
        ],
      },
      updatedAt: 1,
    }
    const base = {
      ...emptyAfterCookieClear(),
      argumentsBoard: [seedBoard],
      syncMeta: {
        ...emptySyncMeta(),
        dirty: { [ARGS_KEY]: 1 },
        rows: { [ARGS_KEY]: { updatedAt: 1 } },
      },
    }

    expect(pendingCount(base.syncMeta)).toBe(1)

    const next = applyChanges(base, base.syncMeta, {
      library_records: [
        remoteArgumentsRow(
          '<p>2nd Ebb considerations:</p>',
          'a. Jackson’s method, not just his labels'
        ),
      ],
    })

    expect(next.store.argumentsBoard[0].draftsBySide.petitioner[0].notes).toContain('2nd Ebb')
  })
})
