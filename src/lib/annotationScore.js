/**
 * Rank PDF annotations for Ask AI / ⌘K when the user is hunting a specific note.
 *
 * Builds on ordinary token scoring, then adds concept/phrase boosts so
 * "Congress intention / consistent exclusion" prefers Costanzo over any
 * loose "Congress failed / declined" highlight.
 */

import { notesSearchQuery, scorePage, tokenize } from './notebookSearch'
import { CASE_AT_BAR_ID, queryMentionsInstantCase } from '../data/caseAtBar'

const CONCEPT_GROUPS = [
  {
    id: 'intention',
    terms: ['intention', 'intent', 'intends', 'intended', 'intentino'],
  },
  {
    id: 'congress',
    terms: ['congress', 'congressional'],
  },
  {
    id: 'consistent',
    terms: ['consistent', 'consistently', 'consistency', 'construction', 'consittently'],
  },
  {
    id: 'statute',
    terms: ['statute', 'statutory', 'amend', 'alter', 'include', 'statue'],
  },
]

const PHRASE_BOOSTS = [
  { re: /consistent\s+construction/i, points: 45 },
  { re: /particular\s+intention/i, points: 40 },
  { re: /failure\s+of\s+congress/i, points: 40 },
  { re: /alter\s+or\s+amend/i, points: 35 },
  { re: /intention\s+of\s+congress|congress.{0,40}intention/i, points: 30 },
  { re: /administrative\s+interpretation/i, points: 25 },
]

function hayHasAny(hay, terms) {
  return terms.some((t) => hay.includes(t))
}

/**
 * @param {{ title?: string, text?: string, sectionName?: string }} row
 * @param {string} query
 * @returns {number}
 */
export function scoreAnnotationRow(row, query) {
  const cleaned = notesSearchQuery(query)
  const q = cleaned.toLowerCase()
  if (!q) return 0

  const title = String(row.title || '').toLowerCase()
  const body = String(row.text || '').toLowerCase()
  const section = String(row.sectionName || '').toLowerCase()
  const hay = `${title} ${body} ${section}`
  const tokens = tokenize(q)

  // Floor: ordinary token scoring so "Enemy" / "AUMF" still work.
  let score = scorePage(
    { title: row.title || '', text: row.text || '', sectionName: row.sectionName || '' },
    cleaned,
    tokens
  )

  let conceptHits = 0
  for (const group of CONCEPT_GROUPS) {
    const inQuery = hayHasAny(q, group.terms)
    const inDoc = hayHasAny(hay, group.terms)
    if (inQuery && inDoc) {
      conceptHits += 1
      score += group.id === 'intention' || group.id === 'consistent' ? 28 : 18
    }
  }

  const queryWantsConstruction =
    /congress|intention|intent|consistent|exclu|statute|amend|alter|construct/i.test(q)

  if (queryWantsConstruction) {
    for (const boost of PHRASE_BOOSTS) {
      if (boost.re.test(hay)) score += boost.points
    }
    // Soft penalty for "Congress failed/declined" noise when the query is
    // about intention / consistent construction, not detention statutes.
    if (
      conceptHits <= 1 &&
      /\bfailed\b|\bdeclined\b|\brejected\b/.test(hay) &&
      !/consistent|intention|alter or amend|administrative interpretation/i.test(hay)
    ) {
      score -= 20
    }
  }

  // Prefer notes that include your own writing, not quote-only marks.
  if (/here |court says|suggests|important|finding|assume/i.test(body)) {
    score += 12
  }

  // "Instant case" in Ask AI always means Bronner’s record (case-at-bar).
  if (queryMentionsInstantCase(query)) {
    const isInstant =
      section.includes('instant case') ||
      section.includes('bronner') ||
      section.includes('case at bar') ||
      hay.includes(CASE_AT_BAR_ID) ||
      String(row.path || '').includes('view=record') ||
      String(row.path || '').includes('/facts')
    if (isInstant) score += 55
    else score -= 12
  }

  return score > 0 ? score : 0
}
