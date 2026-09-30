/**
 * In-PDF text search: index a rendered text layer, find every match, paint rects.
 * Mirrors findQuoteOnPage so Ask AI jumps and toolbar search share one approach.
 */

function normalizeWs(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build a whitespace-normalized haystack over the text layer with a map back to DOM.
 * @param {Element} pageEl
 * @returns {{ hayLower: string, indexMap: Array<{ node: Text, offset: number }> } | null}
 */
function buildPageIndex(pageEl) {
  if (!pageEl) return null
  const textLayer =
    pageEl.querySelector('.react-pdf__Page__textContent') || pageEl.querySelector('.textLayer')
  if (!textLayer) return null

  const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT)
  const nodes = []
  let node
  while ((node = walker.nextNode())) nodes.push(node)
  if (!nodes.length) return null

  let haystack = ''
  /** @type {Array<{ node: Text, offset: number }>} */
  const indexMap = []
  for (const textNode of nodes) {
    const raw = textNode.textContent || ''
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i]
      if (/\s/.test(ch)) {
        if (haystack.endsWith(' ') || haystack.length === 0) continue
        haystack += ' '
        indexMap.push({ node: textNode, offset: i })
      } else {
        haystack += ch
        indexMap.push({ node: textNode, offset: i })
      }
    }
  }

  return { hayLower: haystack.toLowerCase(), indexMap }
}

function rangeToRects(range, pageEl) {
  const pageRect = pageEl.getBoundingClientRect()
  if (pageRect.width < 1 || pageRect.height < 1) return []
  return [...range.getClientRects()]
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({
      top: (r.top - pageRect.top) / pageRect.height,
      left: (r.left - pageRect.left) / pageRect.width,
      width: r.width / pageRect.width,
      height: r.height / pageRect.height,
    }))
}

/**
 * Every occurrence of `query` on the currently rendered page.
 * @returns {Array<{ rects: object[], range: Range }>}
 */
export function findAllOnPage(pageEl, query) {
  const needle = normalizeWs(query).toLowerCase()
  if (!pageEl || needle.length < 2) return []

  const indexed = buildPageIndex(pageEl)
  if (!indexed) return []
  const { hayLower, indexMap } = indexed

  const hits = []
  let from = 0
  while (from < hayLower.length) {
    const start = hayLower.indexOf(needle, from)
    if (start < 0) break
    const end = start + needle.length
    if (end > indexMap.length) break

    const startPoint = indexMap[start]
    const endPoint = indexMap[Math.min(end - 1, indexMap.length - 1)]
    if (!startPoint || !endPoint) break

    let range
    try {
      range = document.createRange()
      range.setStart(startPoint.node, startPoint.offset)
      range.setEnd(endPoint.node, endPoint.offset + 1)
    } catch {
      from = start + 1
      continue
    }

    const rects = rangeToRects(range, pageEl)
    if (rects.length) hits.push({ rects, range })
    from = start + Math.max(1, needle.length)
  }

  return hits
}

/**
 * Scan every page of a pdf.js document for the query (no DOM needed).
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdf
 * @param {string} query
 * @returns {Promise<Array<{ page: number, occurrence: number }>>}
 */
export async function searchPdfDocument(pdf, query) {
  const needle = normalizeWs(query).toLowerCase()
  if (!pdf || needle.length < 2) return []

  const matches = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    let text = ''
    for (const item of content.items || []) {
      if (!item || typeof item.str !== 'string') continue
      text += item.str
      if (item.hasEOL) text += '\n'
    }
    const hay = normalizeWs(text).toLowerCase()
    let from = 0
    let occurrence = 0
    while (from < hay.length) {
      const idx = hay.indexOf(needle, from)
      if (idx < 0) break
      matches.push({ page: pageNum, occurrence })
      occurrence += 1
      from = idx + Math.max(1, needle.length)
    }
  }
  return matches
}
