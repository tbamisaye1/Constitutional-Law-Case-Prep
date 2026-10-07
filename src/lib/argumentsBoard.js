/**
 * Arguments board shape: drafts per side (Main + alternatives).
 * Migrates legacy {outlines, notes}. Does not invent Bronner seed content —
 * Postgres (or an empty Main draft) is the source of truth.
 */

import { normalizePieceScratch } from './pieceScratch'
import {
  buildCategory3LadderDraft,
  CATEGORY3_LADDER_DRAFT_ID,
} from '../data/category3LadderDraft'

/** Blank Main only. No Bronner outline / Category 3 ladder seed. */
const DEFAULT_NOTES = {
  petitioner: '',
  respondent: '',
}

const DEFAULT_OUTLINES = {
  petitioner: [{ id: 'p1', title: 'New section', prongs: [], notes: '' }],
  respondent: [{ id: 'r1', title: 'New section', prongs: [], notes: '' }],
}

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function normalizeFocus(raw) {
  if (!raw || typeof raw !== 'object') return { type: 'side' }
  if (raw.type === 'joined') return { type: 'joined' }
  if (raw.type === 'section' && raw.sectionId) {
    return { type: 'section', sectionId: String(raw.sectionId) }
  }
  if (raw.type === 'prong' && raw.sectionId && raw.prongId) {
    return {
      type: 'prong',
      sectionId: String(raw.sectionId),
      prongId: String(raw.prongId),
    }
  }
  return { type: 'side' }
}

/**
 * Accept v1 section shape, or migrate the original flat `{id, title}` rows.
 */
export function normalizeSections(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((row, index) => {
    if (!row || typeof row !== 'object') {
      return { id: newId('sec'), title: `Section ${index + 1}`, prongs: [], notes: '' }
    }
    const id = typeof row.id === 'string' && row.id ? row.id : newId('sec')
    const title = typeof row.title === 'string' ? row.title : 'Untitled section'
    const notes = typeof row.notes === 'string' ? row.notes : ''
    const prongs = Array.isArray(row.prongs)
      ? row.prongs
          .filter((p) => p && typeof p === 'object')
          .map((p, i) => ({
            id: typeof p.id === 'string' && p.id ? p.id : newId('pr'),
            title: typeof p.title === 'string' ? p.title : `Prong ${i + 1}`,
            notes: typeof p.notes === 'string' ? p.notes : '',
          }))
      : []
    return { id, title, notes, prongs }
  })
}

function loadSideSections(raw, fallback) {
  const sections = normalizeSections(raw)
  return sections.length
    ? sections
    : fallback.map((s) => ({
        ...s,
        notes: typeof s.notes === 'string' ? s.notes : '',
        prongs: (s.prongs || []).map((p) => ({
          ...p,
          notes: typeof p.notes === 'string' ? p.notes : '',
        })),
      }))
}

function makeMainDraft(side, sections, notesHtml) {
  return {
    id: `${side}-main`,
    name: 'Main',
    notes:
      typeof notesHtml === 'string' && notesHtml.trim()
        ? notesHtml
        : DEFAULT_NOTES[side],
    sections: normalizeSections(sections),
  }
}

function normalizeDraft(raw, side, index = 0) {
  if (!raw || typeof raw !== 'object') {
    return makeMainDraft(side, DEFAULT_OUTLINES[side], DEFAULT_NOTES[side])
  }
  const id =
    typeof raw.id === 'string' && raw.id
      ? raw.id
      : index === 0
        ? `${side}-main`
        : newId('draft')
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim()
      : index === 0
        ? 'Main'
        : `Draft ${index + 1}`
  const draft = {
    id,
    name,
    notes:
      typeof raw.notes === 'string' && raw.notes.trim()
        ? raw.notes
        : DEFAULT_NOTES[side],
    sections: normalizeSections(raw.sections),
  }
  // Seeded drafts carry a version so a later rewrite of the seed text can
  // replace an older stored copy. User-created drafts have no version.
  // Coerce strings from JSON so a missing Number() check does not re-run seed
  // merge and restore Opening theme / 3.3 / 4.3.
  const seedVersion = Number(raw.seedVersion)
  if (Number.isFinite(seedVersion)) draft.seedVersion = seedVersion
  // Free-form side notes for this draft (Arguments page scratch pane).
  if (typeof raw.scratch === 'string') draft.scratch = raw.scratch
  // Scratch per section / prong / sub-point, keyed by heading id.
  const pieceScratch = normalizePieceScratch(raw.pieceScratch)
  if (pieceScratch) draft.pieceScratch = pieceScratch
  if (Array.isArray(raw.removedOutlineIds)) {
    draft.removedOutlineIds = uniqueIds(raw.removedOutlineIds)
  }
  return applyRemovedOutlineIds(draft)
}

function uniqueIds(ids) {
  return [...new Set((ids || []).map((id) => String(id || '')).filter(Boolean))]
}

export function rememberRemovedOutlineIds(draft, ids) {
  return applyRemovedOutlineIds({
    ...draft,
    removedOutlineIds: uniqueIds([...(draft?.removedOutlineIds || []), ...(ids || [])]),
  })
}

/** Drop sections/prongs the user trashed, even if seed or a stale sync still has them. */
export function applyRemovedOutlineIds(draft) {
  if (!draft || typeof draft !== 'object') return draft
  const removed = new Set(uniqueIds(draft.removedOutlineIds))
  if (!removed.size) return draft
  return {
    ...draft,
    removedOutlineIds: [...removed],
    sections: (draft.sections || [])
      .filter((section) => !removed.has(section.id))
      .map((section) => ({
        ...section,
        prongs: (section.prongs || []).filter((prong) => !removed.has(prong.id)),
      })),
  }
}

export function removedOutlineIdsByDraft(draftsBySide) {
  const map = {}
  for (const side of ['petitioner', 'respondent']) {
    for (const draft of draftsBySide?.[side] || []) {
      if (!draft?.id) continue
      const ids = uniqueIds(draft.removedOutlineIds)
      if (ids.length) map[draft.id] = ids
    }
  }
  return map
}

function applyBoardRemovedIds(draftsBySide, saved) {
  const extra =
    saved?.removedOutlineIdsByDraft && typeof saved.removedOutlineIdsByDraft === 'object'
      ? saved.removedOutlineIdsByDraft
      : {}
  const next = { ...draftsBySide }
  for (const side of ['petitioner', 'respondent']) {
    next[side] = (next[side] || []).map((draft) => {
      const more = extra[draft.id]
      if (!Array.isArray(more) || !more.length) return applyRemovedOutlineIds(draft)
      return rememberRemovedOutlineIds(draft, more)
    })
  }
  return next
}

function normNotes(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fingerprints of the old bundled Category 3 seed. Used only so a leftover
 * seed body loses to real notes during a local/remote merge. The seed is never
 * injected into the board anymore.
 */
const SEED_NOTE_PREFIXES = (() => {
  const draft = buildCategory3LadderDraft()
  const map = new Map()
  map.set(`draft:${draft.id}`, normNotes(draft.notes).slice(0, 160))
  for (const section of draft.sections || []) {
    map.set(`section:${section.id}`, normNotes(section.notes).slice(0, 160))
    for (const prong of section.prongs || []) {
      map.set(`prong:${prong.id}`, normNotes(prong.notes).slice(0, 160))
      map.set(`title:${prong.id}`, String(prong.title || '').trim())
    }
  }
  return map
})()

function looksLikeSeedNotes(kindKey, notes) {
  const prefix = SEED_NOTE_PREFIXES.get(kindKey)
  if (!prefix) return false
  const norm = normNotes(notes)
  if (!norm) return false
  if (norm === prefix || norm.startsWith(prefix.slice(0, 80))) return true
  const heading = prefix.split(' ').slice(0, 8).join(' ')
  return heading.length >= 12 && norm.includes(heading)
}

function looksLikeSeedTitle(prongId, title) {
  const seed = SEED_NOTE_PREFIXES.get(`title:${prongId}`)
  if (!seed) return false
  return String(title || '').trim() === seed
}

/**
 * Pick the note body that is not a leftover seed wipe. Seed loses to any
 * divergent text; otherwise keep the longer body.
 */
export function preferRicherNotes(aNotes, bNotes, seedKey = '') {
  const a = typeof aNotes === 'string' ? aNotes : ''
  const b = typeof bNotes === 'string' ? bNotes : ''
  if (!a.trim()) return b
  if (!b.trim()) return a
  if (a === b) return a
  const aSeed = seedKey && looksLikeSeedNotes(seedKey, a)
  const bSeed = seedKey && looksLikeSeedNotes(seedKey, b)
  if (aSeed && !bSeed) return b
  if (bSeed && !aSeed) return a
  return a.length >= b.length ? a : b
}

function preferRicherTitle(aTitle, bTitle, prongId = '') {
  const a = typeof aTitle === 'string' ? aTitle.trim() : ''
  const b = typeof bTitle === 'string' ? bTitle.trim() : ''
  if (!a) return b || aTitle || ''
  if (!b) return aTitle || ''
  if (a === b) return aTitle || a
  const aSeed = prongId && looksLikeSeedTitle(prongId, a)
  const bSeed = prongId && looksLikeSeedTitle(prongId, b)
  if (aSeed && !bSeed) return bTitle || b
  if (bSeed && !aSeed) return aTitle || a
  return a.length >= b.length ? aTitle || a : bTitle || b
}

/**
 * When a stale sync still has seed prongs this browser already deleted, keep
 * the local outline for that draft (same id, fewer prongs/sections).
 */
export function preferLocalArgumentDeletions(remoteDraftsBySide, localDraftsBySide) {
  if (!remoteDraftsBySide || !localDraftsBySide) return remoteDraftsBySide
  const next = { ...remoteDraftsBySide }
  for (const side of ['petitioner', 'respondent']) {
    const remoteList = Array.isArray(remoteDraftsBySide[side]) ? remoteDraftsBySide[side] : []
    const localList = Array.isArray(localDraftsBySide[side]) ? localDraftsBySide[side] : []
    if (!localList.length) {
      next[side] = remoteList
      continue
    }
    const localById = Object.fromEntries(localList.map((d) => [d.id, d]))
    next[side] = remoteList.map((remoteDraft) => {
      const localDraft = localById[remoteDraft.id]
      if (!localDraft) return applyRemovedOutlineIds(remoteDraft)
      const remoteCount = countOutlineNodes(remoteDraft)
      const localCount = countOutlineNodes(localDraft)
      let chosen
      // Local deleted prongs the remote still has — keep the trimmed local outline.
      if (localCount < remoteCount && outlineIsSubset(localDraft, remoteDraft)) {
        chosen = mergeDraftNotesPreferRicher({
          ...remoteDraft,
          name: localDraft.name || remoteDraft.name,
          sections: localDraft.sections,
          seedVersion: Math.max(
            Number(localDraft.seedVersion) || 0,
            Number(remoteDraft.seedVersion) || 0
          ),
        }, localDraft)
      } else if (remoteCount < localCount && outlineIsSubset(remoteDraft, localDraft)) {
        // Remote has fewer nodes. Two cases look the same by count:
        // (1) this tab added a prong that has not been pushed yet — keep local.
        // (2) another device deleted seed prongs — take the trimmed remote.
        // User-created ids (pr-…, p-<timestamp>) mean (1). Seed leftovers mean (2).
        const extras = extraOutlineIds(localDraft, remoteDraft)
        if (extras.some(isUserCreatedOutlineId)) {
          chosen = mergeDraftNotesPreferRicher(
            {
              ...remoteDraft,
              name: localDraft.name || remoteDraft.name,
              sections: localDraft.sections,
              seedVersion: Math.max(
                Number(localDraft.seedVersion) || 0,
                Number(remoteDraft.seedVersion) || 0
              ),
            },
            localDraft
          )
        } else {
          chosen = mergeDraftNotesPreferRicher(remoteDraft, localDraft)
        }
      } else if (remoteCount === localCount) {
        chosen = mergeDraftNotesPreferRicher(remoteDraft, localDraft)
      } else {
        chosen = remoteDraft
      }
      return applyRemovedOutlineIds({
        ...chosen,
        removedOutlineIds: uniqueIds([
          ...(localDraft.removedOutlineIds || []),
          ...(remoteDraft.removedOutlineIds || []),
          ...(chosen.removedOutlineIds || []),
        ]),
      })
    })
    // Keep local-only drafts the remote never saw.
    for (const localDraft of localList) {
      if (!remoteList.some((d) => d.id === localDraft.id)) {
        next[side] = [...next[side], localDraft]
      }
    }
  }
  return next
}

/**
 * Merge notes/titles across local + remote for the same outline.
 * Never let Category 3 seed text beat a divergent manual edit, even if the
 * seed copy is longer (that is what wiped Jackson / ATA / Mathews notes).
 */
function mergeDraftNotesPreferRicher(remoteDraft, localDraft) {
  const localSections = Object.fromEntries(
    (localDraft.sections || []).map((s) => [s.id, s])
  )
  const draftKey = `draft:${remoteDraft.id || localDraft.id || ''}`
  return {
    ...remoteDraft,
    name: preferRicherTitle(localDraft.name, remoteDraft.name),
    notes: preferRicherNotes(localDraft.notes, remoteDraft.notes, draftKey),
    sections: (remoteDraft.sections || []).map((remoteSection) => {
      const localSection = localSections[remoteSection.id]
      if (!localSection) return remoteSection
      const localProngs = Object.fromEntries(
        (localSection.prongs || []).map((p) => [p.id, p])
      )
      const sectionKey = `section:${remoteSection.id}`
      return {
        ...remoteSection,
        title: preferRicherTitle(localSection.title, remoteSection.title),
        notes: preferRicherNotes(localSection.notes, remoteSection.notes, sectionKey),
        prongs: (remoteSection.prongs || []).map((remoteProng) => {
          const localProng = localProngs[remoteProng.id]
          if (!localProng) return remoteProng
          const prongKey = `prong:${remoteProng.id}`
          return {
            ...remoteProng,
            title: preferRicherTitle(
              localProng.title,
              remoteProng.title,
              remoteProng.id
            ),
            notes: preferRicherNotes(localProng.notes, remoteProng.notes, prongKey),
          }
        }),
      }
    }),
  }
}

function countOutlineNodes(draft) {
  const sections = draft?.sections || []
  return sections.reduce((n, s) => n + 1 + (s.prongs || []).length, 0)
}

function outlineIdList(draft) {
  const ids = []
  for (const section of draft?.sections || []) {
    if (section?.id) ids.push(section.id)
    for (const prong of section?.prongs || []) {
      if (prong?.id) ids.push(prong.id)
    }
  }
  return ids
}

function extraOutlineIds(localDraft, remoteDraft) {
  const remote = new Set(outlineIdList(remoteDraft))
  return outlineIdList(localDraft).filter((id) => !remote.has(id))
}

/** addProng uses pr-<time>; addSection uses p-<time> / r-<time>. Seed uses c3-* / p1. */
function isUserCreatedOutlineId(id) {
  const value = String(id || '')
  if (value.startsWith('pr-')) return true
  if (/^[pr]-\d{12,}/.test(value)) return true
  return false
}

function outlineIsSubset(localDraft, remoteDraft) {
  const remoteSections = Object.fromEntries(
    (remoteDraft.sections || []).map((s) => [s.id, s])
  )
  for (const section of localDraft.sections || []) {
    const remoteSection = remoteSections[section.id]
    if (!remoteSection) return false
    const remoteProngIds = new Set((remoteSection.prongs || []).map((p) => p.id))
    for (const prong of section.prongs || []) {
      if (!remoteProngIds.has(prong.id)) return false
    }
  }
  return true
}

/**
 * Migrate v1 {outlines, notes} → draftsBySide, or normalize an existing drafts board.
 * Never invents the Category 3 ladder or Bronner outline seed.
 */
export function normalizeArgumentsBoard(saved) {
  const empty = !saved || typeof saved !== 'object'
  let draftsBySide
  let activeDraftBySide

  if (!empty && Array.isArray(saved.draftsBySide?.petitioner)) {
    draftsBySide = {
      petitioner: saved.draftsBySide.petitioner.map((d, i) =>
        normalizeDraft(d, 'petitioner', i)
      ),
      respondent: (Array.isArray(saved.draftsBySide?.respondent)
        ? saved.draftsBySide.respondent
        : []
      ).map((d, i) => normalizeDraft(d, 'respondent', i)),
    }
    if (!draftsBySide.respondent.length) {
      draftsBySide.respondent = [
        makeMainDraft('respondent', DEFAULT_OUTLINES.respondent, DEFAULT_NOTES.respondent),
      ]
    }
    if (!draftsBySide.petitioner.length) {
      draftsBySide.petitioner = [
        makeMainDraft('petitioner', DEFAULT_OUTLINES.petitioner, DEFAULT_NOTES.petitioner),
      ]
    }
    activeDraftBySide = {
      petitioner:
        saved.activeDraftBySide?.petitioner &&
        draftsBySide.petitioner.some((d) => d.id === saved.activeDraftBySide.petitioner)
          ? saved.activeDraftBySide.petitioner
          : draftsBySide.petitioner[0].id,
      respondent:
        saved.activeDraftBySide?.respondent &&
        draftsBySide.respondent.some((d) => d.id === saved.activeDraftBySide.respondent)
          ? saved.activeDraftBySide.respondent
          : draftsBySide.respondent[0].id,
    }
  } else {
    const petSections = empty
      ? DEFAULT_OUTLINES.petitioner
      : loadSideSections(saved.outlines?.petitioner, DEFAULT_OUTLINES.petitioner)
    const respSections = empty
      ? DEFAULT_OUTLINES.respondent
      : loadSideSections(saved.outlines?.respondent, DEFAULT_OUTLINES.respondent)
    draftsBySide = {
      petitioner: [
        makeMainDraft(
          'petitioner',
          petSections,
          empty ? DEFAULT_NOTES.petitioner : saved.notes?.petitioner
        ),
      ],
      respondent: [
        makeMainDraft(
          'respondent',
          respSections,
          empty ? DEFAULT_NOTES.respondent : saved.notes?.respondent
        ),
      ],
    }
    activeDraftBySide = {
      petitioner: draftsBySide.petitioner[0].id,
      respondent: draftsBySide.respondent[0].id,
    }
  }

  draftsBySide = applyBoardRemovedIds(draftsBySide, empty ? null : saved)

  return {
    draftsBySide,
    activeDraftBySide,
    removedOutlineIdsByDraft: removedOutlineIdsByDraft(draftsBySide),
    activeSectionBySide: {
      petitioner: empty ? null : saved.activeSectionBySide?.petitioner || null,
      respondent: empty ? null : saved.activeSectionBySide?.respondent || null,
    },
    activeFocusBySide: {
      petitioner: normalizeFocus(empty ? null : saved.activeFocusBySide?.petitioner),
      respondent: normalizeFocus(empty ? null : saved.activeFocusBySide?.respondent),
    },
  }
}

/**
 * Reorder one item in a list by index. Returns the same array reference when
 * the move is a no-op so callers can skip a state write.
 */
export function moveArrayItem(list, fromIndex, toIndex) {
  if (!Array.isArray(list)) return list
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list
  }
  const next = list.slice()
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

export { DEFAULT_NOTES, DEFAULT_OUTLINES, newId, CATEGORY3_LADDER_DRAFT_ID }
