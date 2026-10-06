/**
 * Three-way merge for the Arguments board.
 *
 * Replaces the old "keep the longer note" merge, which let any stale copy in a
 * browser beat a newer, shorter edit made elsewhere (MCP, another device) and
 * then push the stale text back over Postgres.
 *
 * The rule per field is the standard one:
 *   - both sides agree                → that value
 *   - only one side changed from base → the changed side
 *   - both changed, differently       → remote wins, local copy is kept in the
 *                                       draft's scratch so nothing is lost
 *
 * Lists (drafts, sections, prongs) merge by id: deletions on either side stick
 * unless the other side edited that item, additions on either side are kept,
 * and order follows whichever side actually reordered.
 *
 * Pure functions over plain objects. No React, no storage.
 */

const SIDES = ['petitioner', 'respondent']

/** Fields merged as plain values on each level. */
const DRAFT_FIELDS = ['name', 'notes', 'scratch']
const SECTION_FIELDS = ['title', 'notes']
const PRONG_FIELDS = ['title', 'notes']

/** Fields whose losing local value is worth saving into scratch. */
const RICH_FIELDS = new Set(['notes', 'scratch'])

function same(a, b) {
  if (a === b) return true
  // undefined / '' / null are the same "empty" for text fields.
  const ea = a == null || a === ''
  const eb = b == null || b === ''
  return ea && eb
}

function deepSame(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/**
 * Merge one scalar.
 * @returns {{value: any, conflict: boolean}}
 */
export function mergeScalar(base, local, remote) {
  if (same(local, remote)) return { value: remote ?? local, conflict: false }
  if (same(local, base)) return { value: remote, conflict: false }
  if (same(remote, base)) return { value: local, conflict: false }
  return { value: remote, conflict: true }
}

function byId(list) {
  const map = new Map()
  for (const item of list || []) {
    if (item && typeof item.id === 'string') map.set(item.id, item)
  }
  return map
}

function ids(list) {
  return (list || []).filter((x) => x && typeof x.id === 'string').map((x) => x.id)
}

/**
 * Order the merged ids. If remote kept base order for the shared ids, local's
 * order is the deliberate one; otherwise remote's. Items only one side has are
 * placed after their nearest predecessor in that side's list.
 */
function mergeOrder(baseIds, localIds, remoteIds, keep) {
  const common = (list) => list.filter((id) => keep.has(id))
  const baseCommon = common(baseIds).filter(
    (id) => localIds.includes(id) && remoteIds.includes(id)
  )
  const remoteCommon = common(remoteIds).filter(
    (id) => localIds.includes(id) && baseIds.includes(id)
  )
  const remoteReordered = !deepSame(baseCommon, remoteCommon)
  const primary = remoteReordered ? remoteIds : localIds
  const secondary = remoteReordered ? localIds : remoteIds

  const out = primary.filter((id) => keep.has(id))
  for (let i = 0; i < secondary.length; i += 1) {
    const id = secondary[i]
    if (!keep.has(id) || out.includes(id)) continue
    let insertAt = 0
    for (let j = i - 1; j >= 0; j -= 1) {
      const at = out.indexOf(secondary[j])
      if (at !== -1) {
        insertAt = at + 1
        break
      }
    }
    out.splice(insertAt, 0, id)
  }
  return out
}

/**
 * Generic id-keyed list merge.
 *
 * @param {Function} mergeItem (base, local, remote, path) => merged item
 * @param {Function} changedFrom (base, item) => true when item differs from base
 */
function mergeList(baseList, localList, remoteList, mergeItem, changedFrom, path, conflicts) {
  const base = byId(baseList)
  const local = byId(localList)
  const remote = byId(remoteList)
  const all = new Set([...base.keys(), ...local.keys(), ...remote.keys()])
  const keep = new Set()
  const merged = new Map()

  for (const id of all) {
    const b = base.get(id)
    const l = local.get(id)
    const r = remote.get(id)
    if (l && r) {
      keep.add(id)
      merged.set(id, mergeItem(b, l, r, `${path}/${id}`, conflicts))
      continue
    }
    if (!b) {
      // Added on exactly one side.
      keep.add(id)
      merged.set(id, l || r)
      continue
    }
    // Present in base, deleted on one side. Keep it only if the surviving side
    // edited it after base: an edit beats a blind delete.
    const survivor = l || r
    if (survivor && changedFrom(b, survivor)) {
      keep.add(id)
      merged.set(id, survivor)
    }
  }

  const order = mergeOrder(ids(baseList), ids(localList), ids(remoteList), keep)
  return order.map((id) => merged.get(id))
}

function mergeFields(fields, base, local, remote, path, conflicts) {
  const out = { ...remote }
  for (const field of fields) {
    const { value, conflict } = mergeScalar(base?.[field], local?.[field], remote?.[field])
    if (value === undefined) delete out[field]
    else out[field] = value
    if (conflict) {
      conflicts.push({ path: `${path}.${field}`, field, local: local?.[field], remote: remote?.[field] })
    }
  }
  return out
}

function prongChanged(base, item) {
  return !deepSame(
    PRONG_FIELDS.map((f) => base?.[f] ?? ''),
    PRONG_FIELDS.map((f) => item?.[f] ?? '')
  )
}

function sectionChanged(base, item) {
  if (prongChanged(base, item)) return true
  return !deepSame(base?.prongs || [], item?.prongs || [])
}

function draftChanged(base, item) {
  return !deepSame(base, item)
}

function mergeProng(base, local, remote, path, conflicts) {
  return mergeFields(PRONG_FIELDS, base, local, remote, path, conflicts)
}

function mergeSection(base, local, remote, path, conflicts) {
  const out = mergeFields(SECTION_FIELDS, base, local, remote, path, conflicts)
  out.prongs = mergeList(
    base?.prongs,
    local?.prongs,
    remote?.prongs,
    mergeProng,
    prongChanged,
    path,
    conflicts
  )
  return out
}

function mergeDraft(base, local, remote, path, conflicts) {
  const out = mergeFields(DRAFT_FIELDS, base, local, remote, path, conflicts)
  out.sections = mergeList(
    base?.sections,
    local?.sections,
    remote?.sections,
    mergeSection,
    sectionChanged,
    path,
    conflicts
  )
  const removed = new Set([
    ...(local?.removedOutlineIds || []),
    ...(remote?.removedOutlineIds || []),
  ])
  // An id that is present in the merged outline cannot also be "removed"
  // (undo / re-add after delete).
  for (const section of out.sections) {
    removed.delete(section.id)
    for (const prong of section.prongs || []) removed.delete(prong.id)
  }
  if (removed.size) out.removedOutlineIds = [...removed]
  else delete out.removedOutlineIds
  const seed = Math.max(Number(local?.seedVersion) || 0, Number(remote?.seedVersion) || 0)
  if (seed) out.seedVersion = seed
  return out
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function labelForConflict(conflict, draft) {
  // Paths look like /side/draftId[/sectionId[/prongId]].field
  const lastId = conflict.path.split('/').pop().split('.')[0]
  const section = (draft.sections || []).find((s) => s.id === lastId)
  if (section) return `section "${section.title || lastId}"`
  for (const s of draft.sections || []) {
    const prong = (s.prongs || []).find((p) => p.id === lastId)
    if (prong) return `prong "${prong.title || lastId}"`
  }
  return 'whole-draft notes'
}

/**
 * Put the losing local text of every conflict at the top of the draft scratch,
 * so a double edit never silently drops words.
 */
function stashConflicts(draft, conflicts, at) {
  const mine = conflicts.filter((c) => c.path.startsWith(`/${draft.__side}/${draft.id}`))
  if (!mine.length) return draft
  const stamp = new Date(at).toISOString().slice(0, 16).replace('T', ' ')
  const blocks = mine
    .filter((c) => c.field !== 'scratch')
    .map((c) => {
      const label = labelForConflict(c, draft)
      const body = RICH_FIELDS.has(c.field)
        ? c.local || '<p></p>'
        : `<p>${escapeHtml(c.local)}</p>`
      return `<blockquote><p><strong>Unsynced copy · ${escapeHtml(label)} · ${c.field} · ${stamp}</strong></p>${body}</blockquote>`
    })
  // Scratch itself conflicted: keep both, local below remote.
  const scratchConflict = mine.find((c) => c.field === 'scratch')
  let scratch = draft.scratch || ''
  if (scratchConflict && scratchConflict.local) {
    scratch = `${scratch}<p><strong>Unsynced scratch from this device · ${stamp}</strong></p>${scratchConflict.local}`
  }
  if (blocks.length) scratch = `${blocks.join('')}${scratch}`
  return { ...draft, scratch }
}

/**
 * Merge three normalized boards.
 *
 * @param {object|null} base   Last server board this device saw/acknowledged.
 * @param {object} local       This device's board.
 * @param {object} remote      Board just pulled from the server.
 * @param {{now?: number}} options
 * @returns {{board: object, conflicts: object[]}} board has draftsBySide +
 *   activeDraftBySide; everything else is taken from remote.
 */
export function mergeArgumentsBoards(base, local, remote, { now = Date.now() } = {}) {
  if (!base || !local) return { board: remote, conflicts: [] }
  const conflicts = []
  const draftsBySide = {}
  for (const side of SIDES) {
    const merged = mergeList(
      base.draftsBySide?.[side],
      local.draftsBySide?.[side],
      remote.draftsBySide?.[side],
      mergeDraft,
      draftChanged,
      `/${side}`,
      conflicts
    )
    draftsBySide[side] = merged.map((draft) => {
      const stashed = stashConflicts({ ...draft, __side: side }, conflicts, now)
      delete stashed.__side
      return stashed
    })
    if (!draftsBySide[side].length) {
      draftsBySide[side] = remote.draftsBySide?.[side] || local.draftsBySide?.[side] || []
    }
  }
  const activeDraftBySide = {}
  for (const side of SIDES) {
    const wanted = local.activeDraftBySide?.[side] ?? remote.activeDraftBySide?.[side]
    activeDraftBySide[side] = draftsBySide[side].some((d) => d.id === wanted)
      ? wanted
      : draftsBySide[side][0]?.id ?? null
  }
  return {
    board: { ...remote, draftsBySide, activeDraftBySide },
    conflicts,
  }
}

/** Only the content that syncs: used to compare boards and store bases. */
export function boardContent(board) {
  return {
    draftsBySide: board?.draftsBySide || { petitioner: [], respondent: [] },
    activeDraftBySide: board?.activeDraftBySide || {},
  }
}

/**
 * Three-way merge of a single draft. Used by the page editor when the stored
 * draft changes underneath text the user is still typing.
 *
 * @returns {{draft: object, conflicts: object[]}}
 */
export function mergeDrafts(base, local, remote, { now = Date.now() } = {}) {
  if (!base) return { draft: remote, conflicts: [] }
  const conflicts = []
  const merged = mergeDraft(base, local, remote, `/page/${remote.id}`, conflicts)
  const stashed = stashConflicts({ ...merged, __side: 'page' }, conflicts, now)
  delete stashed.__side
  return { draft: stashed, conflicts }
}
