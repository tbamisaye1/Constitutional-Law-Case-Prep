/**
 * Structured facts seeded from the Bronner guide (editable).
 * Page/fn cites use guide PDF page numbers for R. (confirm with coach before filing).
 */

import { GUIDE_FACTS } from './bronnerGuideSeed'

export function formatSourceLabel(source) {
  if (!source) return 'No cite'
  const page = String(source.page || '').trim()
  const footnote = String(source.footnote || '').trim()
  if (page && footnote) return `pg ${page} · fn ${footnote}`
  if (page) return `pg ${page}`
  if (footnote) return `fn ${footnote}`
  return 'No cite'
}

export const FACT_SUBSECTIONS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'posture', label: 'Posture' },
  { id: 'q1', label: 'Q1 · Fourth' },
  { id: 'q2', label: 'Q2 · Article II' },
  { id: 'names', label: 'Names & numbers' },
]

export const FACT_SIDES = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'petitioner', label: 'Petitioner' },
  { id: 'respondent', label: 'Respondent' },
]

/** Seed facts appended for Memorise side decks; merge into existing boards once. */
export const APPEND_SEED_FACT_IDS = ['f-charges', 'f-natsec', 'f-material-support']

/**
 * Keep existing edits, but drop in new seed facts the board does not have yet.
 */
export function mergeAppendSeedFacts(facts) {
  if (!Array.isArray(facts)) return structuredClone(SEED_FACTS)
  const have = new Set(facts.map((f) => f.id))
  const missing = SEED_FACTS.filter(
    (f) => APPEND_SEED_FACT_IDS.includes(f.id) && !have.has(f.id)
  )
  return missing.length ? [...facts, ...missing] : facts
}

export const ARGUMENT_TAGS = [
  { id: 'opening', label: 'Opening' },
  { id: 'q1-search', label: 'Q1 · search' },
  { id: 'q1-duration', label: 'Q1 · duration' },
  { id: 'q2-youngstown', label: 'Q2 · Youngstown' },
  { id: 'hinge', label: 'Hinge' },
  { id: 'rebuttal', label: 'Rebuttal' },
  { id: 'memorise', label: 'Memorise cold' },
]

export const SEED_FACTS = GUIDE_FACTS
