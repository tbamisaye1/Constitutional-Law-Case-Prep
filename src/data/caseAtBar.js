/** Reserved library case id for the Bronner / moot record PDF on Instant Case. */
export const CASE_AT_BAR_ID = 'case-at-bar'

/** Display name in the Instant Case room and annotation search labels. */
export const CASE_AT_BAR_LABEL = 'Instant Case [Bronner v. USA]'

/** Phrases that mean Bronner’s record, not a library precedent. */
export const INSTANT_CASE_ALIASES = [
  'instant case',
  'case at bar',
  'bronner v. usa',
  'bronner v united states',
  'bobby bronner',
]

/**
 * True when the user is talking about Instant Case / Bronner’s record.
 */
export function queryMentionsInstantCase(prompt) {
  const q = String(prompt || '').toLowerCase()
  if (!q.trim()) return false
  return (
    /\binstant\s+cases?\b/.test(q) ||
    /\bcase\s+at\s+bar\b/.test(q) ||
    /\bbronner\s+v\.?\s*(usa|united\s+states)\b/.test(q) ||
    /\bbobby\s+bronner\b/.test(q)
  )
}

/**
 * Expand Ask AI / note-search queries so "instant case" retrieves Bronner
 * record annotations and FAISS chunks instead of a random library case.
 */
export function expandInstantCaseQuery(prompt) {
  const raw = String(prompt || '')
  if (!queryMentionsInstantCase(raw)) return raw
  return `${raw} Bronner record Joint Appendix Instant Case case-at-bar Bobby Bronner v. United States`
}
