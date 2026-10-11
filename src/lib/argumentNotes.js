/**
 * Flatten Arguments board notes (whole-side + section + prong) for Ask AI.
 */

import { notesSearchQuery, scorePage, tokenize } from './notebookSearch'

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Plain-text preview of TipTap / HTML notes for the scratch jump list.
 * Empty string when there is nothing useful to show.
 *
 * @param {string} html
 * @param {number} [maxLen]
 */
export function notePreview(html, maxLen = 220) {
  const plain = stripHtml(html)
  if (!plain) return ''
  const limit = Number.isFinite(maxLen) && maxLen > 0 ? Math.floor(maxLen) : 220
  if (plain.length <= limit) return plain
  const cut = plain.slice(0, limit)
  const atWord = cut.lastIndexOf(' ')
  const trimmed = atWord > Math.floor(limit * 0.6) ? cut.slice(0, atWord) : cut
  return `${trimmed.trimEnd()}…`
}

function chunkText(text, size = 900) {
  const raw = String(text || '').trim()
  if (!raw) return []
  if (raw.length <= size) return [raw]
  const parts = []
  for (let i = 0; i < raw.length && parts.length < 3; i += size) {
    parts.push(raw.slice(i, i + size))
  }
  return parts
}

function draftsForSide(board, side) {
  const list = board?.draftsBySide?.[side]
  if (Array.isArray(list) && list.length) return list
  // Legacy board: one implied Main draft from outlines + notes.
  const sections = Array.isArray(board?.outlines?.[side]) ? board.outlines[side] : []
  const notes = typeof board?.notes?.[side] === 'string' ? board.notes[side] : ''
  if (!sections.length && !notes.trim()) return []
  return [{ id: `${side}-main`, name: 'Main', notes, sections }]
}

/**
 * @param {object} board
 * @returns {Array<{id:string,title:string,sectionName:string,path:string,text:string,side:string,focusType:string}>}
 */
export function flattenArgumentNotes(board) {
  if (!board || typeof board !== 'object') return []
  const rows = []

  for (const side of ['petitioner', 'respondent']) {
    const sideLabel = side === 'petitioner' ? 'Petitioner' : 'Respondent'
    const drafts = draftsForSide(board, side)

    drafts.forEach((draft) => {
      if (!draft || typeof draft !== 'object') return
      const draftId = String(draft.id || `${side}-main`)
      const draftName = String(draft.name || 'Draft').trim() || 'Draft'
      const draftPath = `/arguments?side=${side}&draft=${encodeURIComponent(draftId)}`
      const whole = stripHtml(draft.notes)
      if (whole) {
        rows.push({
          id: `args-${side}-${draftId}-whole`,
          title: `${sideLabel} · ${draftName} · whole notes`,
          sectionName: `Arguments · ${sideLabel} · ${draftName}`,
          path: `${draftPath}&focus=whole`,
          text: whole,
          side,
          draftId,
          focusType: 'side',
        })
      }

      const sections = Array.isArray(draft.sections) ? draft.sections : []
      sections.forEach((section, sectionIdx) => {
        if (!section || typeof section !== 'object') return
        const sectionTitle = String(section.title || `Section ${sectionIdx + 1}`).trim()
        const sectionNum = sectionIdx + 1
        const sectionHtml = stripHtml(section.notes)
        if (sectionHtml) {
          rows.push({
            id: `args-${side}-${draftId}-sec-${section.id}`,
            title: `${draftName} · ${sectionNum}. ${sectionTitle}`,
            sectionName: `Arguments · ${sideLabel} · ${draftName} · section ${sectionNum}`,
            path: `${draftPath}&focus=section&section=${encodeURIComponent(section.id)}`,
            text: sectionHtml,
            side,
            draftId,
            focusType: 'section',
            sectionId: section.id,
          })
        }

        const prongs = Array.isArray(section.prongs) ? section.prongs : []
        prongs.forEach((prong, prongIdx) => {
          if (!prong || typeof prong !== 'object') return
          const prongTitle = String(prong.title || `Prong ${prongIdx + 1}`).trim()
          const prongHtml = stripHtml(prong.notes)
          if (!prongHtml) return
          rows.push({
            id: `args-${side}-${draftId}-pr-${prong.id}`,
            title: `${draftName} · ${sectionNum}.${prongIdx + 1} ${prongTitle}`,
            sectionName: `Arguments · ${sideLabel} · ${draftName} · ${sectionNum}. ${sectionTitle}`,
            path: `${draftPath}&focus=prong&section=${encodeURIComponent(section.id)}&prong=${encodeURIComponent(prong.id)}`,
            text: prongHtml,
            side,
            draftId,
            focusType: 'prong',
            sectionId: section.id,
            prongId: prong.id,
          })
        })
      })
    })
  }

  return rows
}

/**
 * Ordered blocks for the "Full argument (joined)" read-through: every section
 * and its prongs in outline order, with HTML notes kept as written.
 *
 * @param {Array} sections
 * @returns {Array<{
 *   key: string,
 *   kind: 'section' | 'prong',
 *   sectionId: string,
 *   prongId?: string,
 *   label: string,
 *   title: string,
 *   html: string,
 *   empty: boolean
 * }>}
 */
export function joinArgumentOutlineBlocks(sections) {
  const list = Array.isArray(sections) ? sections : []
  const blocks = []

  list.forEach((section, sectionIdx) => {
    if (!section || typeof section !== 'object') return
    const sectionId = String(section.id || '')
    if (!sectionId) return
    const sectionTitle = String(section.title || `Section ${sectionIdx + 1}`).trim()
    const sectionNum = sectionIdx + 1
    const sectionHtml = typeof section.notes === 'string' ? section.notes.trim() : ''
    blocks.push({
      key: `sec-${sectionId}`,
      kind: 'section',
      sectionId,
      label: `${sectionNum}.`,
      title: sectionTitle,
      html: sectionHtml,
      empty: !stripHtml(sectionHtml),
    })

    const prongs = Array.isArray(section.prongs) ? section.prongs : []
    prongs.forEach((prong, prongIdx) => {
      if (!prong || typeof prong !== 'object') return
      const prongId = String(prong.id || '')
      if (!prongId) return
      const prongTitle = String(prong.title || `Prong ${prongIdx + 1}`).trim()
      const prongHtml = typeof prong.notes === 'string' ? prong.notes.trim() : ''
      blocks.push({
        key: `pr-${prongId}`,
        kind: 'prong',
        sectionId,
        prongId,
        label: `${sectionNum}.${prongIdx + 1}`,
        title: prongTitle,
        html: prongHtml,
        empty: !stripHtml(prongHtml),
      })
    })
  })

  return blocks
}

/**
 * Infer petitioner / respondent from the Ask AI prompt when the toggle is "both".
 * @param {string} prompt
 * @returns {'petitioner' | 'respondent' | null}
 */
export function inferAdvocacySideFromQuery(prompt) {
  const q = String(prompt || '').toLowerCase()
  if (!q.trim()) return null
  const wantsRespondent =
    /\bfor\s+respondent\b/.test(q) ||
    /\brespondent'?s?\s+(argument|case|outline|notes?|side|brief)\b/.test(q) ||
    /\b(evaluate|analyse|analyze|fill|strengthen|critique)\b.{0,40}\brespondent\b/.test(q) ||
    /\brespondent\b.{0,40}\b(argument|outline|structure|notes?)\b/.test(q)
  const wantsPetitioner =
    /\bfor\s+petitioner\b/.test(q) ||
    /\bpetitioner'?s?\s+(argument|case|outline|notes?|side|brief)\b/.test(q) ||
    /\b(evaluate|analyse|analyze|fill|strengthen|critique)\b.{0,40}\bpetitioner\b/.test(q) ||
    /\bpetitioner\b.{0,40}\b(argument|outline|structure|notes?)\b/.test(q)
  if (wantsRespondent && !wantsPetitioner) return 'respondent'
  if (wantsPetitioner && !wantsRespondent) return 'petitioner'
  return null
}

/**
 * @param {string | null | undefined} side
 * @returns {'both' | 'petitioner' | 'respondent'}
 */
export function normalizeAdvocacySide(side) {
  const raw = String(side || '').trim().toLowerCase()
  if (raw === 'petitioner' || raw === 'respondent') return raw
  return 'both'
}

/**
 * Rank argument notes for a prompt. Boosts whole-argument vs prong when asked.
 * Prefer one side when the Arguments tab / Ask AI toggle / query names it.
 */
export function searchArgumentNotes(query, board, { limit = 6, preferredSide = 'both' } = {}) {
  const q = notesSearchQuery(query)
  const tokens = tokenize(q)
  const rows = flattenArgumentNotes(board)
  if (!rows.length) return []

  const sideHint =
    normalizeAdvocacySide(preferredSide) !== 'both'
      ? normalizeAdvocacySide(preferredSide)
      : inferAdvocacySideFromQuery(query)

  const wantsWhole =
    /\b(whole|full|entire|overall)\b.{0,24}\b(argument|notes?|outline)\b/.test(
      String(query || '').toLowerCase()
    ) || /\b(my|the)\s+argument\b/.test(String(query || '').toLowerCase())
  const wantsProng = /\bprongs?\b|\b1\.\d|\bsection\s*\d|\bfirst arg|\b1st arg/.test(
    String(query || '').toLowerCase()
  )

  const scored = rows
    .map((row) => {
      let score = scorePage(
        {
          title: row.title,
          sectionName: row.sectionName,
          text: row.text,
        },
        q,
        tokens
      )
      if (wantsWhole && row.focusType === 'side') score += 35
      if (wantsProng && (row.focusType === 'prong' || row.focusType === 'section')) score += 25
      // Light structure signal so Ask AI can see the outline even without prose.
      if (tokens.some((t) => row.title.toLowerCase().includes(t))) score += 8
      if (sideHint && row.side === sideHint) score += 45
      if (sideHint && row.side && row.side !== sideHint) score -= 20
      return { ...row, score }
    })
    .filter((row) => {
      if (sideHint && row.side && row.side !== sideHint) {
        // Keep opposite-side rows only when they still score highly on content.
        return row.score > 40
      }
      return row.score > 0 || wantsWhole || wantsProng || Boolean(sideHint)
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))

  // If the user clearly asked about arguments but tokens missed, still return top rows.
  const fallbackRows = sideHint ? rows.filter((r) => r.side === sideHint) : rows
  const picked =
    scored.length > 0
      ? scored
      : wantsWhole ||
          wantsProng ||
          Boolean(sideHint) ||
          /\barguments?\b/.test(String(query || '').toLowerCase())
        ? fallbackRows.length
          ? fallbackRows
          : rows
        : []

  return picked.slice(0, limit)
}

export function argumentChunksForAskAi(
  query,
  board,
  { limit = 4, chunkSize = 900, preferredSide = 'both' } = {}
) {
  const hits = searchArgumentNotes(query, board, {
    limit: Math.max(limit, 4),
    preferredSide,
  })
  const chunks = []
  for (const hit of hits) {
    if (chunks.length >= limit) break
    for (const part of chunkText(hit.text, chunkSize)) {
      if (chunks.length >= limit) break
      chunks.push({
        id: `${hit.id}-${chunks.length}`,
        title: hit.title,
        text: part,
        section_name: hit.sectionName,
        page_id: hit.id,
        notes_path: hit.path,
        source_type: 'user_note',
      })
    }
  }
  return chunks
}

/** True when the prompt is about Arguments board notes / prongs / sections. */
export function queryWantsArgumentNotes(prompt) {
  const q = String(prompt || '').toLowerCase()
  if (!q.trim()) return false
  return (
    /\b(my|the|this)\s+arguments?\b/.test(q) ||
    /\bargument\s+(notes?|outline|board|structure)\b/.test(q) ||
    /\b(working notes?)\b/.test(q) ||
    /\bprongs?\b/.test(q) ||
    /\b(first|1st|second|2nd)\s+arg(ument)?\b/.test(q) ||
    /\bsection\s*\d+\b/.test(q) ||
    /\b(petitioner|respondent)\s+(argument|notes?|outline|structure|case|side)\b/.test(q) ||
    /\bfor\s+(petitioner|respondent)\b/.test(q) ||
    /\bwhole\s+argument\b/.test(q) ||
    Boolean(inferAdvocacySideFromQuery(prompt))
  )
}
