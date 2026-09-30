/**
 * Turn dump filenames into short labels for the Articles shelf.
 *
 * Ask AI / Drive / Classroom uploads often arrive as numbered dumps
 * (`06b_United_States_v_…`) or opaque hashed names. The shelf shows a readable
 * title; the raw filename stays on hover via title=. Custom titles (rename)
 * win over the auto label.
 */

export function articleDisplayName(filename, customTitle = '') {
  const custom = String(customTitle || '').trim()
  if (custom) return custom.length > 72 ? `${custom.slice(0, 69)}…` : custom

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

  // CRS / GAO style report ids (R42337.17) — keep the id but label it.
  if (/^R\d{4,}(\.\d+)?$/i.test(base)) {
    return `CRS report ${base}`
  }

  let label = base
    .replace(/^\d+[a-z]?[_-]+/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Only turn bare " v " into " v. " — do not touch an existing "v.".
  label = label.replace(/(^|\s)v(\s|$)/gi, '$1v.$2')

  if (!label) return raw
  if (label.length > 72) return `${label.slice(0, 69)}…`
  return label
}

export function articleSearchHaystack(filename, customTitle = '') {
  return `${articleDisplayName(filename, customTitle)} ${customTitle || ''} ${filename}`.toLowerCase()
}
