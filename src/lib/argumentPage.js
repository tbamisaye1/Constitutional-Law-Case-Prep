/**
 * One continuous page per draft ⇄ the stored sections / prongs shape.
 *
 * Storage stays exactly what the backend and MCP tools expect
 * (draft.notes, sections[].notes, sections[].prongs[].notes). The page is a
 * view of it: whole-draft notes first, then each section heading followed by
 * its notes, then each prong heading followed by its notes.
 *
 * Everything here is pure and works on TipTap JSON (editor.getJSON()), with
 * HTML serialization injected by the caller so it can be tested without a DOM.
 */

import { OUTLINE_NODE, classifyOutline, dedupeOutline, newOutlineId, outlineRank } from './outlineIds'

function escapeText(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(text) {
  return escapeText(text).replace(/"/g, '&quot;')
}

function heading(kind, id, title) {
  return `<h1 data-outline="${kind}" data-id="${escapeAttr(id)}">${escapeText(title)}</h1>`
}

/** Build the page HTML for a draft. */
export function draftToPageHtml(draft) {
  if (!draft) return '<p></p>'
  let html = draft.notes || ''
  for (const section of draft.sections || []) {
    html += heading('section', section.id, section.title || '')
    html += section.notes || ''
    for (const prong of section.prongs || []) {
      html += heading('prong', prong.id, prong.title || '')
      html += prong.notes || ''
    }
  }
  return html || '<p></p>'
}

function nodeText(node) {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  return (node.content || []).map(nodeText).join('')
}

/** A run of nodes that holds nothing a person typed. */
function isBlankRun(nodes) {
  return nodes.every(
    (n) => n.type === 'paragraph' && !(n.content || []).some((c) => c.type !== 'text' || c.text)
  )
}

/**
 * Split a page document into draft parts.
 *
 * @param {object} docJson editor.getJSON()
 * @param {(nodes: object[]) => string} serialize JSON nodes → HTML
 * @returns {{notes: string, sections: Array<{id, title, notes, prongs}>}}
 */
export function pageJsonToDraftParts(docJson, serialize) {
  const top = Array.isArray(docJson?.content) ? docJson.content : []
  const html = (nodes) => (nodes.length && !isBlankRun(nodes) ? serialize(nodes) : '')

  const intro = []
  const sections = []
  let current = null // { target, nodes }

  const flush = () => {
    if (!current) return
    current.target.notes = html(current.nodes)
  }

  // Same promotion and duplicate rules the editor plugin enforces (see
  // classifyOutline / dedupeOutline), so re-reading the same page always gives
  // the same sections, prongs and ids.
  const headingNodes = top.filter((n) => n.type === OUTLINE_NODE)
  const kinds = classifyOutline(headingNodes.map((n) => n.attrs || {}))
  const ids = dedupeOutline(
    headingNodes.map((n, i) => ({ kind: kinds[i].kind, id: n.attrs?.id, title: nodeText(n) }))
  )
  let headingIndex = 0

  for (const node of top) {
    if (node.type !== OUTLINE_NODE) {
      ;(current ? current.nodes : intro).push(node)
      continue
    }
    const attrs = node.attrs || {}
    const { kind } = kinds[headingIndex]
    const dedupe = ids[headingIndex]
    headingIndex += 1
    // A blank repeat of an earlier heading: its content belongs to that one.
    if (dedupe.action === 'drop') continue
    const id = dedupe.id || newOutlineId(kind)

    // A point is content of its prong: it stays in the prong's notes HTML,
    // carrying its (de-duplicated) id so folds and the outline stay stable.
    if (kind === 'point') {
      current.nodes.push({ ...node, attrs: { ...attrs, kind, id } })
      continue
    }

    flush()
    const title = nodeText(node)
    if (kind === 'section') {
      const section = { id, title, notes: '', prongs: [] }
      sections.push(section)
      current = { target: section, nodes: [] }
    } else {
      const prong = { id, title, notes: '' }
      sections[sections.length - 1].prongs.push(prong)
      current = { target: prong, nodes: [] }
    }
  }
  flush()
  return { notes: html(intro), sections }
}

function outlineIds(sections) {
  const ids = []
  for (const s of sections || []) {
    ids.push(s.id)
    for (const p of s.prongs || []) ids.push(p.id)
  }
  return ids
}

/**
 * Apply page parts to a draft, keeping every other draft field (name, scratch,
 * seedVersion…). Ids that disappeared are remembered in removedOutlineIds so a
 * stale sync cannot bring them back; ids that came back (undo) are forgotten.
 * Returns the same draft object when nothing changed.
 */
export function applyPageToDraft(draft, parts) {
  const before = JSON.stringify({ notes: draft.notes || '', sections: draft.sections || [] })
  const after = JSON.stringify({ notes: parts.notes, sections: parts.sections })
  if (before === after) return draft

  const present = new Set(outlineIds(parts.sections))
  const gone = outlineIds(draft.sections).filter((id) => !present.has(id))
  const removed = new Set([...(draft.removedOutlineIds || []), ...gone])
  for (const id of present) removed.delete(id)

  const next = { ...draft, notes: parts.notes, sections: parts.sections }
  if (removed.size) next.removedOutlineIds = [...removed]
  else delete next.removedOutlineIds
  return next
}

/** Content-only fingerprint of a draft, for "did this change underneath me?". */
export function draftPageKey(draft) {
  return JSON.stringify({ notes: draft?.notes || '', sections: draft?.sections || [] })
}

/**
 * Outline entries for the side panel, from the top-level nodes of the page.
 * `index` is the top-level child index; numbering is 1 / 1.1 style.
 */
export function outlineFromPage(docJson) {
  const top = Array.isArray(docJson?.content) ? docJson.content : []
  const headings = []
  top.forEach((node, index) => {
    if (node.type === OUTLINE_NODE) headings.push({ node, index })
  })
  const classified = classifyOutline(headings.map((h) => h.node.attrs || {}))
  return headings.map(({ node, index }, i) => ({
    id: node.attrs?.id || `idx-${index}`,
    kind: classified[i].kind,
    index,
    number: classified[i].number,
    title: nodeText(node),
  }))
}

/**
 * Range of top-level indexes a heading owns: itself plus everything until the
 * next heading of the same or higher rank (a section owns its prongs, a prong
 * owns its points, a point owns its notes).
 *
 * @param {Array<{type:string, kind?:string}>} kinds top-level nodes, simplified
 * @returns {[number, number]} [start, end) or null
 */
export function blockRange(kinds, index) {
  const node = kinds[index]
  if (!node || node.type !== OUTLINE_NODE) return null
  const rank = outlineRank(node.kind)
  let end = index + 1
  while (end < kinds.length) {
    const n = kinds[end]
    if (n.type === OUTLINE_NODE && outlineRank(n.kind) <= rank) break
    end += 1
  }
  return [index, end]
}

/**
 * For the headings in `order`, their effective kind and parent (the original
 * index of the nearest heading above with a lower rank, or -1).
 */
function structure(kinds, order) {
  const heads = order.filter((i) => kinds[i].type === OUTLINE_NODE)
  const classified = classifyOutline(heads.map((i) => kinds[i]))
  const out = new Map()
  const stack = [] // [{ rank, index }]
  heads.forEach((index, i) => {
    const { kind } = classified[i]
    const rank = outlineRank(kind)
    while (stack.length && stack[stack.length - 1].rank >= rank) stack.pop()
    out.set(index, { kind, parent: stack.length ? stack[stack.length - 1].index : -1 })
    stack.push({ rank, index })
  })
  return out
}

/**
 * Move the block owned by the heading at `from` so it starts where the heading
 * at `before` starts (or to the end when `before` is null). Returns the new
 * order as a list of original indexes, or null for a no-op / invalid move.
 *
 * Only the moved heading may change parent. A move is refused when it would
 * change what any heading is or who owns it, e.g. dropping a section between
 * two prongs (it would steal the later ones) or a point above the first prong
 * of a section (it would become a prong). The outline only offers drops that
 * pass this check (see canMoveBlock).
 */
export function moveBlockOrder(kinds, from, before) {
  const range = blockRange(kinds, from)
  if (!range) return null
  const [start, end] = range
  if (before != null && before >= start && before < end) return null // into itself
  const moving = []
  for (let i = start; i < end; i += 1) moving.push(i)
  const rest = []
  for (let i = 0; i < kinds.length; i += 1) if (i < start || i >= end) rest.push(i)
  const at = before == null ? rest.length : rest.indexOf(before)
  if (at === -1) return null
  const order = [...rest.slice(0, at), ...moving, ...rest.slice(at)]
  if (order.every((v, i) => v === i)) return null

  const was = structure(kinds, kinds.map((_, i) => i))
  const now = structure(kinds, order)
  for (const [index, after] of now) {
    const prior = was.get(index)
    if (after.kind !== prior.kind) return null
    if (index !== from && after.parent !== prior.parent) return null
  }
  return order
}

/** True when moveBlockOrder would accept the move (used to offer drop zones). */
export function canMoveBlock(kinds, from, before) {
  return moveBlockOrder(kinds, from, before) != null
}

/**
 * The editor re-serializes HTML (attribute order, empty tags, entities), so a
 * prong the user never touched can come back as different-but-equivalent
 * markup. Writing that back would make every prong look edited, which turns
 * harmless formatting differences into merge conflicts on other devices.
 *
 * Given parts read from the editor, keep the stored (raw) value for every
 * field whose editor form still equals the editor form of the stored value.
 *
 * @param {{notes, sections}} parts       read from the editor now
 * @param {object} normalized             stored draft as the editor renders it
 * @param {object} raw                    stored draft exactly as saved
 */
export function restoreUntouched(parts, normalized, raw) {
  const pick = (now, norm, original) => (now === norm && original !== undefined ? original : now)
  const normSections = new Map((normalized?.sections || []).map((s) => [s.id, s]))
  const rawSections = new Map((raw?.sections || []).map((s) => [s.id, s]))
  return {
    notes: pick(parts.notes, normalized?.notes || '', raw?.notes ?? ''),
    sections: parts.sections.map((section) => {
      const ns = normSections.get(section.id)
      const rs = rawSections.get(section.id)
      if (!ns || !rs) return section
      const normProngs = new Map((ns.prongs || []).map((p) => [p.id, p]))
      const rawProngs = new Map((rs.prongs || []).map((p) => [p.id, p]))
      return {
        ...section,
        title: pick(section.title, ns.title || '', rs.title ?? ''),
        notes: pick(section.notes, ns.notes || '', rs.notes ?? ''),
        prongs: section.prongs.map((prong) => {
          const np = normProngs.get(prong.id)
          const rp = rawProngs.get(prong.id)
          if (!np || !rp) return prong
          return {
            ...prong,
            title: pick(prong.title, np.title || '', rp.title ?? ''),
            notes: pick(prong.notes, np.notes || '', rp.notes ?? ''),
          }
        }),
      }
    }),
  }
}
