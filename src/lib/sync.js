/**
 * Translation between the local store and the sync API.
 *
 * Everything here is a pure function on plain objects. The hook owns timing,
 * network calls, and React state; this module only answers two questions:
 * which local rows need pushing, and what does a pulled row change.
 *
 * Row bookkeeping lives in `syncMeta` rather than on the rows themselves, so
 * nothing that renders a case or an annotation had to learn about sync:
 *
 *   syncMeta = {
 *     cursor: 0,                                  // serverTime of last sync
 *     rows:   { 'annotations::a-1': { updatedAt, deleted } },
 *     dirty:  { 'annotations::a-1': true },       // not yet accepted by server
 *   }
 *
 * A deleted row leaves the collection but keeps its `rows` entry with
 * deleted: true. That tombstone is what tells the server, and through it the
 * other device, that the row is gone rather than simply missing.
 */

/** Separator for composite meta keys. Kept out of ids by construction. */
const SEP = '::'

/**
 * Which client collections map to the `library_records` table, and under what
 * `kind`. These are research rows the backend stores as JSONB and does not
 * query, so they travel as opaque data.
 */
const LIBRARY_KINDS = {
  opinions: 'opinions',
  caseFacts: 'case_facts',
  cites: 'cites',
  timeline: 'timeline',
}

export function metaKey(entity, ...parts) {
  return [entity, ...parts].join(SEP)
}

export function emptySyncMeta() {
  return { cursor: 0, rows: {}, dirty: {} }
}

/**
 * Mark rows as locally changed.
 *
 * @param {object} syncMeta Current bookkeeping.
 * @param {string[]} keys Meta keys produced by metaKey().
 * @param {number} at Local clock, epoch ms.
 * @param {boolean} deleted True when these keys are tombstones.
 * @returns {object} New syncMeta. Never mutates the input.
 */
export function markDirty(syncMeta, keys, at, deleted = false) {
  if (!keys.length) return syncMeta

  const rows = { ...syncMeta.rows }
  const dirty = { ...syncMeta.dirty }
  for (const key of keys) {
    rows[key] = { updatedAt: at, deleted }
    dirty[key] = true
  }
  return { ...syncMeta, rows, dirty }
}

function rowMeta(syncMeta, key, fallbackAt) {
  return syncMeta.rows[key] || { updatedAt: fallbackAt, deleted: false }
}

/**
 * Build the push payload for every dirty row.
 *
 * Rows the server has already accepted are left out, so a quiet session sends
 * an empty payload and the request stays cheap enough to run on a timer.
 *
 * @returns {{changes: object, sent: object}} `changes` is the request body's
 *   changes field. `sent` records the updatedAt each key had at snapshot time,
 *   so the caller can tell which keys were re-edited while the request was in
 *   flight and must stay dirty.
 */
export function collectChanges(store, syncMeta) {
  const changes = {}
  const sent = {}

  const add = (entity, row, key) => {
    const meta = rowMeta(syncMeta, key, row.updatedAt || 0)
    if (!syncMeta.dirty[key]) return
    const list = changes[entity] || (changes[entity] = [])
    list.push({ ...row, updatedAt: meta.updatedAt, deleted: meta.deleted })
    sent[key] = meta.updatedAt
  }

  for (const row of store.cases) {
    add(
      'cases',
      {
        id: row.id,
        name: row.name || '',
        cite: row.cite || '',
        year: row.year == null ? '' : String(row.year),
        issue: row.issue ?? null,
        tag: row.tag ?? null,
        usefulness: row.usefulness || 'background',
        holding: row.holding || '',
        rule: row.rule || '',
        usePetitioner: row.usePetitioner || '',
        useRespondent: row.useRespondent || '',
        suggestedFile: row.suggestedFile || '',
      },
      metaKey('cases', row.id)
    )
  }

  for (const row of store.filesMeta) {
    add(
      'documents',
      {
        id: row.id,
        caseId: row.caseId,
        name: row.name || '',
        size: row.size || 0,
        contentType: row.contentType || 'application/pdf',
      },
      metaKey('documents', row.id)
    )
  }

  for (const row of store.annotations) {
    add(
      'annotations',
      {
        id: row.id,
        caseId: row.caseId,
        fileId: row.fileId || null,
        page: row.page || 1,
        kind: row.kind || 'page',
        quote: row.quote || '',
        text: row.text || '',
        rects: row.rects || null,
      },
      metaKey('annotations', row.id)
    )
  }

  for (const [caseId, layers] of Object.entries(store.notesByCase)) {
    for (const [layerId, html] of Object.entries(layers || {})) {
      add('notes', { caseId, layerId, html: html || '' }, metaKey('notes', caseId, layerId))
    }
  }

  for (const [collection, kind] of Object.entries(LIBRARY_KINDS)) {
    for (const row of store[collection] || []) {
      add(
        'library_records',
        { kind, id: row.id, data: row },
        metaKey('library_records', kind, row.id)
      )
    }
  }

  // Tombstones have no row left in the store, so sweep the meta table for
  // dirty keys nothing above produced.
  for (const [key, meta] of Object.entries(syncMeta.rows)) {
    if (!syncMeta.dirty[key] || !meta.deleted || sent[key] !== undefined) continue
    const [entity, ...rest] = key.split(SEP)
    const tombstone = { updatedAt: meta.updatedAt, deleted: true }

    if (entity === 'notes') {
      Object.assign(tombstone, { caseId: rest[0], layerId: rest[1] })
    } else if (entity === 'library_records') {
      Object.assign(tombstone, { kind: rest[0], id: rest[1], data: {} })
    } else {
      Object.assign(tombstone, { id: rest[0] })
    }

    const list = changes[entity] || (changes[entity] = [])
    list.push(tombstone)
    sent[key] = meta.updatedAt
  }

  return { changes, sent }
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id)
  if (index === -1) return [row, ...list]
  const next = [...list]
  next[index] = { ...next[index], ...row }
  return next
}

function removeById(list, id) {
  return list.filter((item) => item.id !== id)
}

/**
 * Fold pulled server rows into the local store.
 *
 * A pulled row is applied only when it is strictly newer than what we hold.
 * Equal timestamps are skipped, which is what stops the echo of rows we just
 * pushed from bouncing back and forth forever.
 *
 * @returns {{store: object, syncMeta: object, applied: number}}
 */
export function applyChanges(store, syncMeta, changes) {
  let nextStore = store
  const rows = { ...syncMeta.rows }
  let applied = 0

  const isNewer = (key, incoming) => {
    const current = rows[key]
    if (!current) return true
    return incoming.updatedAt > current.updatedAt
  }

  const note = (key, incoming) => {
    rows[key] = { updatedAt: incoming.updatedAt, deleted: Boolean(incoming.deleted) }
    applied += 1
  }

  for (const row of changes.cases || []) {
    const key = metaKey('cases', row.id)
    if (!isNewer(key, row)) continue
    nextStore = {
      ...nextStore,
      cases: row.deleted
        ? removeById(nextStore.cases, row.id)
        : upsertById(nextStore.cases, {
            id: row.id,
            name: row.name,
            cite: row.cite,
            year: row.year,
            issue: row.issue,
            tag: row.tag,
            usefulness: row.usefulness,
            holding: row.holding,
            rule: row.rule,
            usePetitioner: row.usePetitioner,
            useRespondent: row.useRespondent,
            suggestedFile: row.suggestedFile,
          }),
    }
    note(key, row)
  }

  for (const row of changes.documents || []) {
    const key = metaKey('documents', row.id)
    if (!isNewer(key, row)) continue
    nextStore = {
      ...nextStore,
      filesMeta: row.deleted
        ? removeById(nextStore.filesMeta, row.id)
        : upsertById(nextStore.filesMeta, {
            id: row.id,
            caseId: row.caseId,
            name: row.name,
            size: row.size,
            contentType: row.contentType,
            // Tells the reader it can fetch bytes from the backend when this
            // browser has no IndexedDB copy of the PDF.
            stored: Boolean(row.stored),
          }),
    }
    note(key, row)
  }

  for (const row of changes.annotations || []) {
    const key = metaKey('annotations', row.id)
    if (!isNewer(key, row)) continue
    nextStore = {
      ...nextStore,
      annotations: row.deleted
        ? removeById(nextStore.annotations, row.id)
        : upsertById(nextStore.annotations, {
            id: row.id,
            caseId: row.caseId,
            fileId: row.fileId,
            page: row.page,
            kind: row.kind,
            quote: row.quote,
            text: row.text,
            rects: row.rects,
            savedAt: row.updatedAt,
          }),
    }
    note(key, row)
  }

  for (const row of changes.notes || []) {
    const key = metaKey('notes', row.caseId, row.layerId)
    if (!isNewer(key, row)) continue
    const layers = { ...(nextStore.notesByCase[row.caseId] || {}) }
    if (row.deleted) {
      delete layers[row.layerId]
    } else {
      layers[row.layerId] = row.html
    }
    nextStore = {
      ...nextStore,
      notesByCase: { ...nextStore.notesByCase, [row.caseId]: layers },
    }
    note(key, row)
  }

  const collectionByKind = Object.fromEntries(
    Object.entries(LIBRARY_KINDS).map(([collection, kind]) => [kind, collection])
  )

  for (const row of changes.library_records || []) {
    const collection = collectionByKind[row.kind]
    if (!collection) continue
    const key = metaKey('library_records', row.kind, row.id)
    if (!isNewer(key, row)) continue
    const current = nextStore[collection] || []
    nextStore = {
      ...nextStore,
      [collection]: row.deleted
        ? removeById(current, row.id)
        : upsertById(current, { ...row.data, id: row.id }),
    }
    note(key, row)
  }

  return { store: nextStore, syncMeta: { ...syncMeta, rows }, applied }
}

/**
 * Clear the dirty flags the server accepted, keeping anything re-edited since.
 *
 * @param {object} syncMeta Bookkeeping, possibly changed while the request ran.
 * @param {object} sent Snapshot from collectChanges().
 * @param {number} cursor serverTime from the response, the next pull cursor.
 */
export function clearAccepted(syncMeta, sent, cursor) {
  const dirty = { ...syncMeta.dirty }
  for (const [key, updatedAt] of Object.entries(sent)) {
    const current = syncMeta.rows[key]
    // Re-edited mid-flight: leave it dirty so the next push carries the newer
    // version instead of dropping the edit.
    if (current && current.updatedAt !== updatedAt) continue
    delete dirty[key]
  }
  return { ...syncMeta, dirty, cursor }
}

/**
 * Meta entries for rows that came from the seed files and have never synced.
 *
 * A brand new browser holds a full seeded library. Without this, none of it is
 * dirty, so a fresh workspace would sync nothing and the second device would
 * open empty.
 */
export function markSeedRowsDirty(store, syncMeta, at) {
  const keys = []

  for (const row of store.cases) keys.push(metaKey('cases', row.id))
  for (const row of store.annotations) keys.push(metaKey('annotations', row.id))
  for (const row of store.filesMeta) keys.push(metaKey('documents', row.id))
  for (const [caseId, layers] of Object.entries(store.notesByCase)) {
    for (const layerId of Object.keys(layers || {})) keys.push(metaKey('notes', caseId, layerId))
  }
  for (const [collection, kind] of Object.entries(LIBRARY_KINDS)) {
    for (const row of store[collection] || []) keys.push(metaKey('library_records', kind, row.id))
  }

  const unseen = keys.filter((key) => !syncMeta.rows[key])
  return markDirty(syncMeta, unseen, at)
}

export function pendingCount(syncMeta) {
  return Object.keys(syncMeta.dirty).length
}

export const SYNC_ENTITY_KEYS = { LIBRARY_KINDS, SEP }
