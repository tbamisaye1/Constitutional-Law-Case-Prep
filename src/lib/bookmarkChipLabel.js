/** Chip text: page number plus a custom name when you set one. */
export function bookmarkChipLabel(bm) {
  const page = Number(bm?.page) || 1
  const label = String(bm?.label || '').trim()
  if (!label || /^page\s+\d+$/i.test(label)) return `p. ${page}`
  return `p. ${page} · ${label}`
}
