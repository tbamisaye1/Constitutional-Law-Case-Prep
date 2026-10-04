/**
 * Format article annotations as study-friendly HTML and upsert them into the
 * OneNote-shaped notebook under an Articles section (one page per PDF).
 *
 * Layout (meant for reading / revision, not PDF page dump):
 *   1. Overview — article-level notes
 *   2. Key points — pinned items
 *   3. Color / topic groups — highlights (Gold, Green, …) when you used
 *      more than one color; otherwise a single Takeaways section
 *   4. Working notes — page notes without a quoted passage
 */

import { SEED_PAGES, SEED_TREE, SECTION_COLORS } from '../data/notebookSeed'
import { readJson } from './persist'
import { compareAnnotations, isGeneralAnnotation } from '../components/library/AnnotationPanel'
import { HIGHLIGHT_COLORS, normalizeHighlightColor } from './highlightColors'
import { findPage, mapPages } from './pageTree'
import { saveNotebookSnapshot } from './notebookWorkspace'

export const NOTEBOOK_STORAGE_KEY = 'case-prep-notebook-v3'
export const ARTICLES_SECTION_ID = 'sec-articles'
export const ARTICLES_SECTION_NAME = 'Articles'
export const ARTICLES_GROUP_ID = 'grp-bronner'

const COLOR_ORDER = HIGHLIGHT_COLORS.map((c) => c.id)
const COLOR_LABEL = Object.fromEntries(HIGHLIGHT_COLORS.map((c) => [c.id, c.label]))

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function paragraphsFromText(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return ''
  return trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function pageCite(row) {
  if (isGeneralAnnotation(row)) return ''
  const page = Number(row.page)
  if (!Number.isFinite(page) || page < 1) return ''
  return `<p><em>p. ${page}</em></p>`
}

/**
 * One study card: quote (if any) + note body + page cite.
 * Skips empty "(no note text)" noise when the quote alone is enough.
 */
function renderTakeawayCard(row) {
  const parts = []
  if (row.quote) {
    parts.push(`<blockquote><p>“${escapeHtml(row.quote)}”</p></blockquote>`)
  }
  const body = paragraphsFromText(row.text)
  if (body) {
    parts.push(body)
  } else if (!row.quote) {
    parts.push('<p><em>(empty note)</em></p>')
  }
  const cite = pageCite(row)
  if (cite) parts.push(cite)
  return parts.join('')
}

function isHighlightRow(row) {
  if (isGeneralAnnotation(row)) return false
  return row.kind === 'highlight' || Boolean(row.quote)
}

function readingOrder(a, b) {
  if (a.page !== b.page) return (Number(a.page) || 0) - (Number(b.page) || 0)
  return compareAnnotations(a, b)
}

function colorSectionTitle(colorId) {
  return COLOR_LABEL[colorId] || 'Takeaways'
}

export function articleNotesPageId(fileId, fileName = '') {
  if (fileId) return `pg-article-${fileId}`
  const slug = String(fileName || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `pg-article-${slug || 'untitled'}`
}

/**
 * Build TipTap-friendly HTML for one article's highlights and page notes.
 */
export function formatArticleTakeawaysHtml({
  title,
  fileName,
  annotations = [],
  exportedAt = Date.now(),
}) {
  void exportedAt
  const parts = [`<h2>${escapeHtml(title || fileName || 'Article takeaways')}</h2>`]

  if (!annotations.length) {
    parts.push('<p>No highlights or notes yet.</p>')
    return parts.join('')
  }

  const overview = []
  const keyPoints = []
  const highlights = []
  const working = []

  for (const row of annotations) {
    if (row.pinned) {
      keyPoints.push(row)
      continue
    }
    if (isGeneralAnnotation(row)) {
      overview.push(row)
      continue
    }
    if (isHighlightRow(row)) {
      highlights.push(row)
      continue
    }
    working.push(row)
  }

  overview.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
  keyPoints.sort(compareAnnotations)
  highlights.sort(readingOrder)
  working.sort(readingOrder)

  if (overview.length) {
    parts.push('<h3>Overview</h3>')
    for (const row of overview) parts.push(renderTakeawayCard(row))
  }

  if (keyPoints.length) {
    parts.push('<h3>Key points</h3>')
    for (const row of keyPoints) parts.push(renderTakeawayCard(row))
  }

  if (highlights.length) {
    const colorsUsed = new Set(highlights.map((r) => normalizeHighlightColor(r.color)))
    const multiTopic = colorsUsed.size > 1

    if (multiTopic) {
      for (const colorId of COLOR_ORDER) {
        if (!colorsUsed.has(colorId)) continue
        const group = highlights.filter((r) => normalizeHighlightColor(r.color) === colorId)
        parts.push(`<h3>${escapeHtml(colorSectionTitle(colorId))}</h3>`)
        for (const row of group) parts.push(renderTakeawayCard(row))
      }
    } else {
      parts.push('<h3>Takeaways</h3>')
      for (const row of highlights) parts.push(renderTakeawayCard(row))
    }
  }

  if (working.length) {
    parts.push('<h3>Working notes</h3>')
    for (const row of working) parts.push(renderTakeawayCard(row))
  }

  return parts.join('')
}

function loadNotebook() {
  const saved = readJson(NOTEBOOK_STORAGE_KEY, null)
  if (saved?.tree && saved?.pagesBySection) return saved
  return { tree: structuredClone(SEED_TREE), pagesBySection: structuredClone(SEED_PAGES) }
}

function ensureArticlesSection(tree) {
  const next = structuredClone(tree)
  const existing = findNode(next, ARTICLES_SECTION_ID)
  if (existing) return next

  const section = {
    id: ARTICLES_SECTION_ID,
    name: ARTICLES_SECTION_NAME,
    kind: 'section',
    color: SECTION_COLORS[2] || '#9C7A22',
  }

  const group = findNode(next, ARTICLES_GROUP_ID)
  if (group) {
    group.children = [...(group.children || []), section]
    return next
  }

  next.push(section)
  return next
}

function findNode(nodes, id) {
  for (const n of nodes || []) {
    if (n.id === id) return n
    if (n.children?.length) {
      const hit = findNode(n.children, id)
      if (hit) return hit
    }
  }
  return null
}

/**
 * Upsert a notebook page for this article and return deep-link ids.
 */
export function exportArticleTakeawaysToNotes({
  fileId,
  fileName,
  title,
  annotations,
}) {
  const notebook = loadNotebook()
  const tree = ensureArticlesSection(notebook.tree)
  const pageId = articleNotesPageId(fileId, fileName)
  const html = formatArticleTakeawaysHtml({
    title: title || fileName,
    fileName,
    annotations,
  })
  const pageTitle = title || fileName || 'Article takeaways'
  const existingList = notebook.pagesBySection[ARTICLES_SECTION_ID] || []
  const found = findPage(existingList, pageId)

  let pages
  if (found) {
    pages = mapPages(existingList, (p) =>
      p.id === pageId ? { ...p, title: pageTitle, html } : p
    )
  } else {
    pages = [{ id: pageId, title: pageTitle, html }, ...existingList]
  }

  const pagesBySection = {
    ...notebook.pagesBySection,
    [ARTICLES_SECTION_ID]: pages,
  }

  saveNotebookSnapshot(tree, pagesBySection)

  return {
    sectionId: ARTICLES_SECTION_ID,
    pageId,
    notesPath: `/notes?section=${encodeURIComponent(ARTICLES_SECTION_ID)}&page=${encodeURIComponent(pageId)}`,
  }
}
