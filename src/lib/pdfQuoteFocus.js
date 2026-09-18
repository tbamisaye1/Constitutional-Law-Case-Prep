/**
 * Find an Ask AI quote inside a rendered react-pdf text layer and return
 * fractional rects (same shape as selection highlights) plus a DOM range.
 */

function normalizeWs(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {Element} pageEl `.react-pdf__Page` element
 * @param {string} quote Ask AI preview / snippet
 * @returns {{ rects: Array<{top:number,left:number,width:number,height:number}>, range: Range } | null}
 */
export function findQuoteOnPage(pageEl, quote) {
  if (!pageEl || !quote) return null
  const textLayer =
    pageEl.querySelector('.react-pdf__Page__textContent') || pageEl.querySelector('.textLayer')
  if (!textLayer) return null

  const needleFull = normalizeWs(quote)
  if (needleFull.length < 6) return null
  const probes = [
    needleFull.slice(0, Math.min(100, needleFull.length)),
    needleFull.slice(0, Math.min(60, needleFull.length)),
    needleFull.slice(0, Math.min(36, needleFull.length)),
  ].filter((p, i, arr) => p.length >= 6 && arr.indexOf(p) === i)

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

  const hayLower = haystack.toLowerCase()
  let start = -1
  let end = -1
  for (const probe of probes) {
    const idx = hayLower.indexOf(probe.toLowerCase())
    if (idx >= 0) {
      start = idx
      end = idx + probe.length
      break
    }
  }
  if (start < 0 || end <= start || end > indexMap.length) return null

  const startPoint = indexMap[start]
  const endPoint = indexMap[Math.min(end - 1, indexMap.length - 1)]
  if (!startPoint || !endPoint) return null

  let range
  try {
    range = document.createRange()
    range.setStart(startPoint.node, startPoint.offset)
    range.setEnd(endPoint.node, endPoint.offset + 1)
  } catch {
    return null
  }

  const pageRect = pageEl.getBoundingClientRect()
  if (pageRect.width < 1 || pageRect.height < 1) return null

  const rects = [...range.getClientRects()]
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({
      top: (r.top - pageRect.top) / pageRect.height,
      left: (r.left - pageRect.left) / pageRect.width,
      width: r.width / pageRect.width,
      height: r.height / pageRect.height,
    }))

  if (!rects.length) return null
  return { rects, range }
}
