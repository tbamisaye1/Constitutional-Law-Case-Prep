/**
 * Scratch notes per piece of the argument.
 *
 * A draft keeps its original free-form scratch in `draft.scratch` (shown as
 * "General"), plus one scratch box per section, prong or sub-point in
 * `draft.pieceScratch`, keyed by that heading's id:
 *
 *   draft.pieceScratch = { 'sec-…': '<p>…</p>', 'pr-…': '<p>…</p>', 'pt-…': … }
 *
 * Keyed by id (not position), so moving or renumbering a piece carries its
 * notes with it. Notes for a piece that was deleted are kept and listed as
 * orphans; nothing here ever drops text.
 *
 * Pure functions, no React.
 */

import { classifyOutline } from './outlineIds'

export const GENERAL_KEY = 'general'
export const ALL_KEY = 'all'

/** HTML with no visible text (empty TipTap doc, stray tags). */
export function isBlankHtml(html) {
  if (typeof html !== 'string') return true
  return !html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** Keep only string entries with a non-empty key; undefined when empty. */
export function normalizePieceScratch(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (key && typeof value === 'string') out[key] = value
  }
  return Object.keys(out).length ? out : undefined
}

function decodeText(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

/** Sub-point headings stored inside a prong's notes HTML, in order. */
export function pointsInNotes(html) {
  const out = []
  const re = /<h1\b([^>]*)>([\s\S]*?)<\/h1>/g
  let m
  while ((m = re.exec(String(html || '')))) {
    const attrs = m[1]
    if (!/data-outline="point"/.test(attrs)) continue
    const id = /data-id="([^"]+)"/.exec(attrs)?.[1]
    if (id) out.push({ id, title: decodeText(m[2]) })
  }
  return out
}

/**
 * Every piece that can hold scratch, in outline order, starting with General.
 * @returns {Array<{key, kind, number, title, html}>}
 */
export function scratchPieces(draft) {
  const store = draft?.pieceScratch || {}
  const heads = []
  for (const section of draft?.sections || []) {
    heads.push({ id: section.id, kind: 'section', title: section.title || '' })
    for (const prong of section.prongs || []) {
      heads.push({ id: prong.id, kind: 'prong', title: prong.title || '' })
      for (const point of pointsInNotes(prong.notes)) {
        heads.push({ id: point.id, kind: 'point', title: point.title })
      }
    }
  }
  const numbers = classifyOutline(heads)
  return [
    { key: GENERAL_KEY, kind: 'general', number: '', title: 'General', html: draft?.scratch || '' },
    ...heads.map((h, i) => ({
      key: h.id,
      kind: h.kind,
      number: numbers[i].number,
      title: h.title,
      html: store[h.id] || '',
    })),
  ]
}

/** Scratch saved for pieces that no longer exist (never silently dropped). */
export function orphanPieces(draft) {
  const live = new Set(scratchPieces(draft).map((p) => p.key))
  return Object.entries(draft?.pieceScratch || {})
    .filter(([key, html]) => !live.has(key) && !isBlankHtml(html))
    .map(([key, html]) => ({ key, kind: 'orphan', number: '', title: 'Deleted piece', html }))
}

/** New map with one entry set; blank text removes the entry. */
export function setPieceHtml(map, key, html) {
  const next = { ...(map || {}) }
  if (isBlankHtml(html)) delete next[key]
  else next[key] = html
  return next
}

/** New map with html appended to one entry. */
export function appendPieceHtml(map, key, html) {
  const current = map?.[key]
  const base = isBlankHtml(current) ? '' : current
  return setPieceHtml(map, key, base + html)
}

function sameText(a, b) {
  if (a === b) return true
  return isBlankHtml(a) && isBlankHtml(b)
}

/**
 * Three-way merge of two pieceScratch maps, key by key.
 * Both sides changed one piece differently: remote text first, then this
 * device's copy under a label, so neither is lost.
 */
export function mergePieceScratch(base, local, remote) {
  const keys = new Set([
    ...Object.keys(base || {}),
    ...Object.keys(local || {}),
    ...Object.keys(remote || {}),
  ])
  const out = {}
  for (const key of keys) {
    const b = base?.[key]
    const l = local?.[key]
    const r = remote?.[key]
    let value
    if (sameText(l, r)) value = r ?? l
    else if (sameText(l, b)) value = r
    else if (sameText(r, b)) value = l
    else value = `${r || ''}<p><strong>Unsynced scratch from another device</strong></p>${l || ''}`
    if (!isBlankHtml(value)) out[key] = value
  }
  return Object.keys(out).length ? out : undefined
}
