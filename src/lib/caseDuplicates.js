/**
 * Helpers for spotting / merging duplicate case cards in the library.
 * Seed cards (e.g. id "costanzo") and manually Add-case rows can share a name.
 */

/** Collapse "Costanzo v. Tillinghast" / "Costanzo" style names for matching. */
export function normalizeCaseName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * How much real user work sits on a case card. Used so merge never keeps an
 * empty seed card over the duplicate that actually has PDFs / highlights.
 */
export function caseSubstanceScore(caseId, library = {}) {
  if (!caseId) return 0
  const files = (library.filesMeta || []).filter((f) => f.caseId === caseId).length
  const annos = (library.annotations || []).filter((a) => a.caseId === caseId)
  const annoWeight = annos.reduce((sum, a) => {
    const body = String(a.text || '').trim().length
    const quote = String(a.quote || '').trim().length
    return sum + 10 + Math.min(body, 400) + Math.min(quote, 200)
  }, 0)
  const layers = library.notesByCase?.[caseId] || {}
  const noteWeight = Object.values(layers).reduce((sum, html) => {
    const text = String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    // Ignore the empty Understanding template so it does not beat real notes.
    if (text.length < 40) return sum
    return sum + text.length
  }, 0)
  return files * 100 + annoWeight + noteWeight
}

/**
 * Prefer the card with more substance. Seed ids win only as a tiebreaker so
 * Costanzo's guide id is kept when both sides are equally empty / full.
 */
export function preferKeepCaseId(a, b, library) {
  if (library) {
    const scoreA = caseSubstanceScore(a, library)
    const scoreB = caseSubstanceScore(b, library)
    if (scoreA !== scoreB) return scoreA > scoreB ? a : b
  }
  const aSeed = a && !String(a).startsWith('case-')
  const bSeed = b && !String(b).startsWith('case-')
  if (aSeed && !bSeed) return a
  if (bSeed && !aSeed) return b
  return a
}

/**
 * Find other cases that look like the same name as `caseId`.
 * @param {object} [library] filesMeta / annotations / notesByCase for scoring
 * @returns {Array<{ keepId: string, dropId: string, name: string }>}
 */
export function findCaseNameDuplicates(cases, caseId, library) {
  const target = (cases || []).find((c) => c.id === caseId)
  if (!target) return []
  const key = normalizeCaseName(target.name)
  if (key.length < 4) return []

  const others = (cases || []).filter((c) => c.id !== caseId && normalizeCaseName(c.name) === key)
  return others.map((other) => {
    const keepId = preferKeepCaseId(caseId, other.id, library)
    const dropId = keepId === caseId ? other.id : caseId
    return { keepId, dropId, name: target.name }
  })
}
