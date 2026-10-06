/** Pure helpers for outline headings (no TipTap import, so tests run anywhere). */

export const OUTLINE_NODE = 'outlineHeading'

export function newOutlineId(kind) {
  const prefix = kind === 'prong' ? 'pr' : 'sec'
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Pure check used by the plugin and by tests: which headings need a new id or
 * a kind change. `headings` is [{ pos, kind, id }] in document order.
 */
export function outlineFixes(headings) {
  const fixes = []
  const seen = new Set()
  let sawSection = false
  for (const h of headings) {
    const fix = {}
    if (h.kind === 'prong' && !sawSection) fix.kind = 'section'
    const kind = fix.kind || h.kind
    if (kind === 'section') sawSection = true
    if (!h.id || seen.has(h.id)) fix.id = newOutlineId(kind)
    seen.add(fix.id || h.id)
    if (Object.keys(fix).length) fixes.push({ pos: h.pos, ...fix })
  }
  return fixes
}

