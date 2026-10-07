/**
 * Pure helpers for outline headings (no TipTap import, so tests run anywhere).
 *
 * Three levels, each owning everything under it until the next heading of the
 * same or a higher level:
 *
 *   section  1        stored as draft.sections[]
 *   prong    1.1      stored as section.prongs[]
 *   point    1.1.1    stored INSIDE the prong's notes HTML as
 *                     <h1 data-outline="point" data-id="pt-…">title</h1>
 *
 * Points live in the notes so the stored shape (draftsBySide → sections →
 * prongs) that the backend, MCP tools, merge and older clients rely on does not
 * change. Anything that reads notes as text still sees the title.
 */

export const OUTLINE_NODE = 'outlineHeading'

export const OUTLINE_KINDS = ['section', 'prong', 'point']

const ID_PREFIX = { section: 'sec', prong: 'pr', point: 'pt' }

/** Unknown kinds (older data, bad paste) are treated as sections. */
export function normalizeKind(kind) {
  return OUTLINE_KINDS.includes(kind) ? kind : 'section'
}

/** 0 = section, 1 = prong, 2 = point. Lower rank owns higher rank. */
export function outlineRank(kind) {
  return OUTLINE_KINDS.indexOf(normalizeKind(kind))
}

export function newOutlineId(kind) {
  const prefix = ID_PREFIX[normalizeKind(kind)]
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Effective kind and number of each heading, in document order.
 *
 * A heading cannot float without a parent: a prong before any section is read
 * as a section, and a point with no prong above it in its section is read as a
 * prong (and so on up). The editor plugin writes these promotions back; the
 * page parser and the outline apply the same rule, so all three always agree.
 *
 * @param {Array<{kind?: string}>} headings
 * @returns {Array<{kind: string, number: string}>}
 */
export function classifyOutline(headings) {
  let s = 0
  let p = 0
  let q = 0
  return headings.map((h) => {
    let kind = normalizeKind(h?.kind)
    if (kind === 'point' && p === 0) kind = 'prong'
    if (kind === 'prong' && s === 0) kind = 'section'
    if (kind === 'section') {
      s += 1
      p = 0
      q = 0
      return { kind, number: `${s}` }
    }
    if (kind === 'prong') {
      p += 1
      q = 0
      return { kind, number: `${s}.${p}` }
    }
    q += 1
    return { kind, number: `${s}.${p}.${q}` }
  })
}

/**
 * Pure check used by the plugin and by tests: which headings need a new id or
 * a kind change. `headings` is [{ pos, kind, id }] in document order.
 */
export function outlineFixes(headings) {
  const fixes = []
  const seen = new Set()
  const classified = classifyOutline(headings)
  headings.forEach((h, i) => {
    const fix = {}
    const kind = classified[i].kind
    if (kind !== h.kind) fix.kind = kind
    if (!h.id || seen.has(h.id)) fix.id = newOutlineId(kind)
    seen.add(fix.id || h.id)
    if (Object.keys(fix).length) fixes.push({ pos: h.pos, ...fix })
  })
  return fixes
}

/** Schema group for outline headings on the Arguments page (top level only). */
export const OUTLINE_GROUP = 'outline'

/** Content expression for the Arguments page document. */
export const PAGE_DOC_CONTENT = `(block | ${OUTLINE_GROUP})+`

/** Transaction meta that marks a deliberate "turn this heading into text". */
export const OUTLINE_DEMOTE_META = 'outlineDemote'

/**
 * Did an edit make outline headings disappear while keeping every character?
 *
 * That is the signature of a heading being converted into something else
 * (e.g. the bullet-list button running clearNodes on it): the title text is
 * still there but it is no longer structure, so the section's prongs silently
 * slide under the previous section. Real deletions change the text, undo and
 * the explicit demote command are allowed through.
 */
export function isSilentHeadingLoss({
  beforeCount,
  afterCount,
  beforeTitleChars,
  afterTitleChars,
  beforeText,
  afterText,
  allowed,
}) {
  if (allowed) return false
  if (afterCount >= beforeCount) return false
  // Only empty headings went away (deleting a blank "Untitled" line): fine.
  if (afterTitleChars >= beforeTitleChars) return false
  return beforeText === afterText
}
