/**
 * Arguments board shape: drafts per side (Main + alternatives).
 * Migrates legacy {outlines, notes} and seeds the Category 3 ladder once.
 */

import {
  buildCategory3LadderDraft,
  CATEGORY3_LADDER_DRAFT_ID,
} from '../data/category3LadderDraft'

const DEFAULT_NOTES = {
  petitioner: '<h2>Petitioner working notes</h2><p>Quips, corrections, language.</p>',
  respondent: '<h2>Respondent working notes</h2><p>Structure and rebuttal scratch.</p>',
}

const DEFAULT_OUTLINES = {
  petitioner: [
    { id: 'p1', title: 'Opening theme', prongs: [], notes: '' },
    { id: 'p2', title: 'Q1 roadmap — search', prongs: [], notes: '' },
    { id: 'p3', title: 'Q2 roadmap — Youngstown', prongs: [], notes: '' },
    { id: 'p4', title: 'Hinge + close', prongs: [], notes: '' },
  ],
  respondent: [
    { id: 'r1', title: 'Opening theme', prongs: [], notes: '' },
    { id: 'r2', title: 'No search / Tuggle line', prongs: [], notes: '' },
    { id: 'r3', title: 'Category 1 authority', prongs: [], notes: '' },
    { id: 'r4', title: 'Rebuttal points', prongs: [], notes: '' },
  ],
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
  return {
    id,
    name,
    notes:
      typeof raw.notes === 'string' && raw.notes.trim()
        ? raw.notes
        : DEFAULT_NOTES[side],
    sections: normalizeSections(raw.sections),
  }
}

/**
 * Migrate v1 {outlines, notes} → draftsBySide, or normalize an existing drafts board.
 * Ensures the Category 3 ladder draft exists under petitioner.
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

  if (!draftsBySide.petitioner.some((d) => d.id === CATEGORY3_LADDER_DRAFT_ID)) {
    draftsBySide = {
      ...draftsBySide,
      petitioner: [...draftsBySide.petitioner, buildCategory3LadderDraft()],
    }
  }

  return {
    draftsBySide,
    activeDraftBySide,
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

export { DEFAULT_NOTES, DEFAULT_OUTLINES, newId, CATEGORY3_LADDER_DRAFT_ID }
