/**
 * Format article annotations as readable HTML and upsert them into the
 * OneNote-shaped notebook under an Articles section (one page per PDF).
 */

import { SEED_PAGES, SEED_TREE, SECTION_COLORS } from '../data/notebookSeed'
import { readJson, writeJson } from './persist'
import { compareAnnotations } from '../components/library/AnnotationPanel'
import { findPage, mapPages } from './pageTree'

export const NOTEBOOK_STORAGE_KEY = 'case-prep-notebook-v3'
export const ARTICLES_SECTION_ID = 'sec-articles'
export const ARTICLES_SECTION_NAME = 'Articles'
export const ARTICLES_GROUP_ID = 'grp-bronner'

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
  const sorted = [...annotations].sort(compareAnnotations)
  const when = new Date(exportedAt).toLocaleString()
  const parts = [
    `<h2>${escapeHtml(title || fileName || 'Article takeaways')}</h2>`,
    `<p><em>Exported from Articles · ${escapeHtml(when)}</em></p>`,
  ]

  if (fileName && fileName !== title) {
    parts.push(`<p class="mono"><code>${escapeHtml(fileName)}</code></p>`)
  }

  if (!sorted.length) {
    parts.push('<p>No highlights or page notes yet.</p>')
    return parts.join('')
  }

  let lastPage = null
  for (const row of sorted) {
    const page = Number(row.page) || 1
    if (page !== lastPage) {
      parts.push(`<h3>Page ${page}</h3>`)
      lastPage = page
    }

    const isHighlight = row.kind === 'highlight' || Boolean(row.quote)
    const label = row.pinned
      ? isHighlight
        ? 'Pinned highlight'
        : 'Pinned page note'
      : isHighlight
        ? 'Highlight'
        : 'Page note'

    parts.push(`<h4>${label}</h4>`)
    if (row.quote) {
      parts.push(`<blockquote><p>“${escapeHtml(row.quote)}”</p></blockquote>`)
    }
    const body = paragraphsFromText(row.text)
    parts.push(body || '<p><em>(no note text)</em></p>')
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

  writeJson(NOTEBOOK_STORAGE_KEY, { tree, pagesBySection })

  return {
    sectionId: ARTICLES_SECTION_ID,
    pageId,
    notesPath: `/notes?section=${encodeURIComponent(ARTICLES_SECTION_ID)}&page=${encodeURIComponent(pageId)}`,
  }
}
