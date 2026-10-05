/**
 * Search the local OneNote-shaped notebook (case-prep-notebook-v3).
 * Used by ⌘K and by Ask AI when "Include my notes" is on.
 * Notes stay in the browser — nothing is uploaded unless Ask AI sends
 * matching chunks with an explicit request.
 */

import { NOTEBOOK_STORAGE_KEY } from './articleTakeaways'
import { readJson } from './persist'
import { mapPages } from './pageTree'

/**
 * @typedef {{
 *   pageId: string,
 *   sectionId: string,
 *   sectionName: string,
 *   title: string,
 *   text: string,
 *   path: string,
 *   score: number,
 *   snippet: string,
 * }} NotebookSearchHit
 */

export function stripHtmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function sectionNameMap(tree) {
  /** @type {Map<string, string>} */
  const map = new Map()
  for (const node of tree || []) {
    if (node.kind === 'section') {
      map.set(node.id, node.name || node.id)
      continue
    }
    for (const child of node.children || []) {
      if (child.kind === 'section') map.set(child.id, child.name || child.id)
    }
  }
  return map
}

/**
 * Flatten every page (including nested subpages) into searchable rows.
 * @param {{ tree?: object[], pagesBySection?: Record<string, object[]> } | null} notebook
 */
export function flattenNotebookPages(notebook) {
  const tree = notebook?.tree || []
  const pagesBySection = notebook?.pagesBySection || {}
  const names = sectionNameMap(tree)
  /** @type {Array<{ pageId: string, sectionId: string, sectionName: string, title: string, text: string, path: string }>} */
  const rows = []

  for (const [sectionId, pages] of Object.entries(pagesBySection)) {
    const sectionName = names.get(sectionId) || sectionId
    mapPages(pages || [], (page) => {
      const title = String(page.title || 'Untitled page').trim() || 'Untitled page'
      const text = stripHtmlToText(page.html)
      rows.push({
        pageId: page.id,
        sectionId,
        sectionName,
        title,
        text,
        path: `/notes?section=${encodeURIComponent(sectionId)}&page=${encodeURIComponent(page.id)}`,
      })
      return page
    })
  }
  return rows
}

export function loadNotebookSnapshot() {
  return readJson(NOTEBOOK_STORAGE_KEY, null)
}

/** Tokens for matching. Length ≥ 2 so short queries like "AI" still work. */
export function tokenize(query) {
  return String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length >= 2)
}

/**
 * Score a title/body/section row for ⌘K / Ask AI.
 * Shared by notebook pages and case-library notes.
 */
/** Soft synonyms so "excluded … consistently" still hits Costanzo-style notes. */
const SCORE_SYNONYMS = {
  intention: ['intent', 'intends', 'intended'],
  intent: ['intention', 'intends', 'intended'],
  intends: ['intention', 'intent', 'intended'],
  congress: ['congressional'],
  consistent: ['consistently', 'consistency'],
  consistently: ['consistent', 'consistency'],
  // Do NOT map excluded → failure: that matched unrelated "Congress failed…" notes.
  excluded: ['exclude', 'omit', 'omitted'],
  exclude: ['excluded', 'omit', 'omitted'],
}

function tokenInHay(token, hay) {
  if (!token || token.length < 2) return false
  if (hay.includes(token)) return true
  const alts = SCORE_SYNONYMS[token]
  if (alts) {
    for (const alt of alts) {
      if (hay.includes(alt)) return true
    }
  }
  // One-edit typos for longer tokens ("consittently" → "consistent").
  if (token.length >= 6) {
    const words = hay.split(/[^a-z0-9]+/)
    for (const w of words) {
      if (w.length < 5) continue
      if (Math.abs(w.length - token.length) > 2) continue
      if (editDistanceAtMost1(token, w) || editDistanceAtMost1(token, w.slice(0, token.length + 1))) {
        return true
      }
    }
  }
  return false
}

function editDistanceAtMost1(a, b) {
  if (a === b) return true
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
      continue
    }
    edits += 1
    if (edits > 1) return false
    if (la > lb) i += 1
    else if (lb > la) j += 1
    else {
      i += 1
      j += 1
    }
  }
  if (i < la || j < lb) edits += 1
  return edits <= 1
}

export function scorePage(row, query, tokens) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return 0
  const title = row.title.toLowerCase()
  const body = row.text.toLowerCase()
  const section = (row.sectionName || '').toLowerCase()
  const hay = `${title} ${body} ${section}`

  let score = 0
  if (title === q) score += 120
  else if (title.includes(q)) score += 80
  if (body.includes(q)) score += 50
  if (section.includes(q)) score += 10

  // Whole-query miss: only keep pages that share a real token (len ≥ 3).
  let tokenHits = 0
  for (const t of tokens) {
    if (t.length < 3) continue
    // Prefer word-ish matches over substring noise ("no" inside "note").
    const titleHit = title === t || title.split(/\s+/).includes(t) || tokenInHay(t, title)
    const bodyHit = tokenInHay(t, body)
    if (titleHit) {
      score += title === t || title.split(/\s+/).includes(t) ? 22 : 14
      tokenHits += 1
    }
    if (bodyHit) {
      score += 8
      tokenHits += 1
    }
  }

  if (!hay.includes(q) && tokenHits === 0) return 0
  // Reject weak token-only noise when the full phrase never appears.
  if (!hay.includes(q) && !title.includes(q) && tokenHits > 0 && score < 20) return 0
  return score
}

export function snippetAround(text, query, radius = 70) {
  const raw = String(text || '')
  const q = String(query || '').trim()
  if (!raw) return ''
  if (!q) return raw.slice(0, radius * 2)
  const lower = raw.toLowerCase()
  const idx = lower.indexOf(q.toLowerCase())
  if (idx < 0) {
    const tokens = tokenize(q)
    let best = -1
    for (const t of tokens) {
      const at = lower.indexOf(t)
      if (at >= 0 && (best < 0 || at < best)) best = at
    }
    if (best < 0) return raw.slice(0, radius * 2)
    const start = Math.max(0, best - radius)
    const end = Math.min(raw.length, best + radius)
    return `${start > 0 ? '…' : ''}${raw.slice(start, end)}${end < raw.length ? '…' : ''}`
  }
  const start = Math.max(0, idx - radius)
  const end = Math.min(raw.length, idx + q.length + radius)
  return `${start > 0 ? '…' : ''}${raw.slice(start, end)}${end < raw.length ? '…' : ''}`
}

/**
 * Rank notebook pages for a free-text query (⌘K / Ask AI).
 * Empty query returns titled pages for browse (score 1).
 * @returns {NotebookSearchHit[]}
 */
export function searchNotebook(query, { limit = 12, notebook = null } = {}) {
  const snap = notebook || loadNotebookSnapshot()
  if (!snap?.pagesBySection) return []
  const rows = flattenNotebookPages(snap)
  const q = String(query || '').trim()

  if (q.length < 2) {
    return rows.slice(0, Math.min(limit || 8, 8)).map((row) => ({
      ...row,
      score: 1,
      snippet: row.text.slice(0, 90),
    }))
  }

  const tokens = tokenize(q)
  const hits = rows
    .map((row) => {
      const score = scorePage(row, q, tokens)
      if (score <= 0) return null
      return {
        ...row,
        score,
        snippet: snippetAround(row.text || row.title, q),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
  return hits.slice(0, limit)
}

/** Strip note-intent filler so "NDAA in my notes" still ranks NDAA pages. */
export function notesSearchQuery(prompt) {
  const cleaned = String(prompt || '')
    .replace(/\bntoes\b/gi, 'notes')
    .replace(/\b(in|from|according to)\s+my\s+notes?\b/gi, ' ')
    .replace(
      /\b(my notes?|notebook|onenote|what did i (write|note|say)|where (did|do) i write|search|find|look)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim()
  const base = cleaned.length >= 2 ? cleaned : String(prompt || '').trim()
  // Keep "instant case" visible for annotation ranking, and add Bronner aliases.
  if (/\binstant\s+cases?\b|\bcase\s+at\s+bar\b/i.test(String(prompt || ''))) {
    return `${base} Bronner record Instant Case case-at-bar`.trim()
  }
  return base
}

/**
 * Split matching note pages into short chunks for Ask AI evidence.
 * Prefer pages that already scored well for the query.
 */
export function notebookChunksForAskAi(query, { limit = 5, chunkSize = 900, notebook = null } = {}) {
  const q = notesSearchQuery(query)
  // Ask AI only wants real matches. Empty/short queries browse in ⌘K, not here.
  if (q.length < 2) return []
  const matched = searchNotebook(q, { limit: 8, notebook }).filter(
    (p) => p.score > 0 && ((p.text || '').length > 0 || p.title)
  )
  if (!matched.length) return []

  /** @type {Array<object>} */
  const chunks = []
  for (const page of matched) {
    if (chunks.length >= limit) break
    const text = page.text || page.title
    if (!text) continue
    if (text.length <= chunkSize) {
      chunks.push({
        id: `note-${chunks.length}`,
        title: page.title,
        text,
        section_id: page.sectionId,
        section_name: page.sectionName,
        page_id: page.pageId,
        notes_path: page.path,
        source_type: 'notebook',
      })
      continue
    }
    // Prefer the window around the query match.
    const lower = text.toLowerCase()
    const ql = q.toLowerCase()
    let start = Math.max(0, lower.indexOf(ql) - Math.floor(chunkSize / 3))
    if (lower.indexOf(ql) < 0) {
      const tokens = tokenize(q)
      let best = -1
      for (const t of tokens) {
        const at = lower.indexOf(t)
        if (at >= 0 && (best < 0 || at < best)) best = at
      }
      start = best >= 0 ? Math.max(0, best - Math.floor(chunkSize / 3)) : 0
    }
    const piece = text.slice(start, start + chunkSize)
    chunks.push({
      id: `note-${chunks.length}`,
      title: page.title,
      text: `${start > 0 ? '…' : ''}${piece}${start + chunkSize < text.length ? '…' : ''}`,
      section_id: page.sectionId,
      section_name: page.sectionName,
      page_id: page.pageId,
      notes_path: page.path,
      source_type: 'notebook',
    })
  }
  return chunks.slice(0, limit)
}

/** Heuristic: user is asking Ask AI to use their notebook / annotations. */
export function queryWantsNotes(prompt) {
  const q = String(prompt || '')
    .toLowerCase()
    // Common typos so "in my ntoes" still triggers note grounding.
    .replace(/\bntoes\b/g, 'notes')
    .replace(/\bnote\b/g, 'note')
    .replace(/\banotations?\b/g, 'annotations')
    .replace(/\bannotaitons?\b/g, 'annotations')
    .replace(/\bhighlihgts?\b/g, 'highlights')
  if (!q.trim()) return false
  return (
    /\b(my notes?|notebook|onenote|what did i (write|note|say)|where (did|do) i write|from my notes?|in my notes?|according to my notes?|my (highlights?|annotations?)|from my (highlights?|annotations?))\b/.test(
      q
    ) ||
    /\b(search|find|look)\b.{0,40}\b(notes?|highlights?|annotations?)\b/.test(q) ||
    /\b(in|from)\s+my\s+notes?\b/.test(q) ||
    /\b(my|the|this)\s+arguments?\b/.test(q) ||
    /\bprongs?\b/.test(q) ||
    /\b(first|1st|second|2nd)\s+arg(ument)?\b/.test(q) ||
    /\bwhole\s+argument\b/.test(q)
  )
}
