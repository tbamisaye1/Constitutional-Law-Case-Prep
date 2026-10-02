/**
 * Collapse fragmented PDF text-layer client rects into clean highlight bands.
 * react-pdf / pdf.js often returns one tiny rect per glyph run; painting each
 * as its own overlay looks like a barcode of black boxes when outlines show.
 */

/**
 * @param {Array<{ top: number, left: number, width: number, height: number }>} rects
 *   Fractional page coords (0–1), already normalized.
 * @returns {typeof rects}
 */
export function mergeHighlightRects(rects) {
  if (!Array.isArray(rects) || rects.length <= 1) {
    return (rects || []).filter(isUsableRect)
  }

  const usable = rects.filter(isUsableRect)
  if (usable.length <= 1) return usable

  // Sort top-to-bottom, then left-to-right.
  const sorted = [...usable].sort((a, b) => a.top - b.top || a.left - b.left)
  const lines = []

  for (const rect of sorted) {
    const line = lines[lines.length - 1]
    if (!line) {
      lines.push({ ...rect })
      continue
    }
    const lineMid = line.top + line.height / 2
    const rectMid = rect.top + rect.height / 2
    // Same visual line if midpoints are close relative to line height.
    const sameLine = Math.abs(lineMid - rectMid) <= Math.max(line.height, rect.height) * 0.55
    if (!sameLine) {
      lines.push({ ...rect })
      continue
    }
    const right = Math.max(line.left + line.width, rect.left + rect.width)
    const bottom = Math.max(line.top + line.height, rect.top + rect.height)
    line.left = Math.min(line.left, rect.left)
    line.top = Math.min(line.top, rect.top)
    line.width = right - line.left
    line.height = bottom - line.top
  }

  return lines.filter(isUsableRect)
}

function isUsableRect(r) {
  if (!r) return false
  // Drop glyph-crumb noise (and anything that would paint as a vertical bar).
  return r.width >= 0.004 && r.height >= 0.004 && r.width * r.height >= 0.00002
}
