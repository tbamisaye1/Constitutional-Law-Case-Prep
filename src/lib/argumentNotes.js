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

/**
 * @param {object} board
 * @returns {Array<{id:string,title:string,sectionName:string,path:string,text:string,side:string,focusType:string}>}
 */
export function flattenArgumentNotes(board) {
  if (!board || typeof board !== 'object') return []
  const outlines = board.outlines || {}
  const sideNotes = board.notes || {}
  const rows = []

  for (const side of ['petitioner', 'respondent']) {
    const sideLabel = side === 'petitioner' ? 'Petitioner' : 'Respondent'
    const whole = stripHtml(sideNotes[side])
    if (whole) {
      rows.push({
        id: `args-${side}-whole`,
        title: `${sideLabel} · whole argument notes`,
        sectionName: `Arguments · ${sideLabel}`,
        path: `/arguments?side=${side}&focus=whole`,
        text: whole,
        side,
        focusType: 'side',
      })
    }

    const sections = Array.isArray(outlines[side]) ? outlines[side] : []
    sections.forEach((section, sectionIdx) => {
      if (!section || typeof section !== 'object') return
      const sectionTitle = String(section.title || `Section ${sectionIdx + 1}`).trim()
      const sectionNum = sectionIdx + 1
      const sectionHtml = stripHtml(section.notes)
      if (sectionHtml) {
        rows.push({
          id: `args-${side}-sec-${section.id}`,
          title: `${sectionNum}. ${sectionTitle}`,
          sectionName: `Arguments · ${sideLabel} · section ${sectionNum}`,
          path: `/arguments?side=${side}&focus=section&section=${encodeURIComponent(section.id)}`,
          text: sectionHtml,
          side,
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
          id: `args-${side}-pr-${prong.id}`,
          title: `${sectionNum}.${prongIdx + 1} ${prongTitle}`,
          sectionName: `Arguments · ${sideLabel} · ${sectionNum}. ${sectionTitle}`,
          path: `/arguments?side=${side}&focus=prong&section=${encodeURIComponent(section.id)}&prong=${encodeURIComponent(prong.id)}`,
          text: prongHtml,
          side,
          focusType: 'prong',
          sectionId: section.id,
          prongId: prong.id,
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
 * Rank argument notes for a prompt. Boosts whole-argument vs prong when asked.
 */
export function searchArgumentNotes(query, board, { limit = 6 } = {}) {
  const q = notesSearchQuery(query)
  const tokens = tokenize(q)
  const rows = flattenArgumentNotes(board)
  if (!rows.length) return []

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
      return { ...row, score }
    })
    .filter((row) => row.score > 0 || wantsWhole || wantsProng)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))

  // If the user clearly asked about arguments but tokens missed, still return top rows.
  const picked =
    scored.length > 0
      ? scored
      : wantsWhole || wantsProng || /\barguments?\b/.test(String(query || '').toLowerCase())
        ? rows
        : []

  return picked.slice(0, limit)
}

export function argumentChunksForAskAi(query, board, { limit = 4, chunkSize = 900 } = {}) {
  const hits = searchArgumentNotes(query, board, { limit: Math.max(limit, 4) })
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
    /\b(petitioner|respondent)\s+(argument|notes?|outline)\b/.test(q) ||
    /\bwhole\s+argument\b/.test(q)
  )
}
