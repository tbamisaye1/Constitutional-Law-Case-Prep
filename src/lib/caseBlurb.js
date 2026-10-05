/**
 * Short card blurb from a case's headline note (preferred) or holding.
 *
 * Do not sentence-split on ". " — legal text is full of "v.", "U.S.", "Dec.",
 * and initials, which used to leave TOA cards showing only "Costanzo v."
 */
export function blurbFor(caseItem, { maxLen = 180 } = {}) {
  if (!caseItem) return ''
  const raw = String(caseItem.headlineNote || caseItem.holding || '').trim()
  if (!raw) return ''
  if (raw.length <= maxLen) return raw

  const cut = raw.slice(0, maxLen - 1)
  const atWord = cut.lastIndexOf(' ')
  const clipped = (atWord > 40 ? cut.slice(0, atWord) : cut).trim()
  return `${clipped}…`
}
