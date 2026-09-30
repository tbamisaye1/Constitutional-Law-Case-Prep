/**
 * Shared highlight colors for PDF overlays and annotation cards.
 * Stored as short ids so the palette can change without rewriting old notes.
 */
export const HIGHLIGHT_COLORS = [
  { id: 'gold', label: 'Gold', fill: 'rgba(156, 122, 34, 0.32)', solid: '#9c7a22' },
  { id: 'green', label: 'Green', fill: 'rgba(46, 125, 70, 0.30)', solid: '#2e7d46' },
  { id: 'blue', label: 'Blue', fill: 'rgba(37, 99, 140, 0.30)', solid: '#25638c' },
  { id: 'rose', label: 'Rose', fill: 'rgba(168, 62, 78, 0.28)', solid: '#a83e4e' },
  { id: 'violet', label: 'Violet', fill: 'rgba(98, 72, 148, 0.30)', solid: '#624894' },
]

export const DEFAULT_HIGHLIGHT_COLOR = 'gold'

const BY_ID = Object.fromEntries(HIGHLIGHT_COLORS.map((c) => [c.id, c]))

export function normalizeHighlightColor(value) {
  if (typeof value === 'string' && BY_ID[value]) return value
  return DEFAULT_HIGHLIGHT_COLOR
}

export function highlightColorMeta(value) {
  return BY_ID[normalizeHighlightColor(value)]
}
