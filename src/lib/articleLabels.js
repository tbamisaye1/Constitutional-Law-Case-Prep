/**
 * Turn dump filenames into short labels for the Articles shelf.
 *
 * Ask AI / Drive / Classroom uploads often arrive as numbered dumps
 * (`06b_United_States_v_…`) or opaque hashed names. The shelf shows a readable
 * title; the raw filename stays on hover via title=.
 */

export function articleDisplayName(filename) {
  const raw = String(filename || '').trim()
  if (!raw) return 'Untitled PDF'

  const base = raw.replace(/\.pdf$/i, '')

  // Google Drive / Classroom style opaque tokens.
  if (
    /^ACF/i.test(base) ||
    base.includes('==') ||
    (/^[A-Za-z0-9_@+=-]{70,}$/.test(base) && !/\sv\.?\s/i.test(base))
  ) {
    return 'Uploaded PDF (long drive name)'
  }

  let label = base
    .replace(/^\d+[a-z]?[_-]+/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  label = label.replace(/\bv\b/gi, 'v.')

  if (!label) return raw
  if (label.length > 72) return `${label.slice(0, 69)}…`
  return label
}

export function articleSearchHaystack(filename) {
  return `${articleDisplayName(filename)} ${filename}`.toLowerCase()
}
