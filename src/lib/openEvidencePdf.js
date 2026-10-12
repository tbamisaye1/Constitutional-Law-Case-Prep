import { CASE_AT_BAR_ID } from '../data/caseAtBar'
import { CORPUS_ARTICLES_ID } from '../data/corpusArticles'

/**
 * Normalize PDF / case names so Ask AI sources like
 * `06b_United_States_v_USDC_Keith.pdf` can match library rows and suggested files.
 */
export function normalizePdfName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/^[0-9]+[a-z]?[_-]+/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Score how well an Ask AI `source` filename matches a library file or case label.
 * Higher is better. Below 35 is usually not worth opening.
 */
export function scoreNameMatch(a, b) {
  const na = normalizePdfName(a)
  const nb = normalizePdfName(b)
  if (!na || !nb) return 0
  if (na === nb) return 100
  if (na.includes(nb) || nb.includes(na)) return 85

  const ta = new Set(na.split(' ').filter((t) => t.length > 1))
  const tb = new Set(nb.split(' ').filter((t) => t.length > 1))
  if (!ta.size || !tb.size) return 0

  let overlap = 0
  for (const t of ta) {
    if (tb.has(t)) overlap += 1
  }
  const ratio = overlap / Math.max(ta.size, tb.size)
  let score = Math.round(ratio * 70)

  // Distinctive short tokens (Keith, Katz, Hamdi) weigh more than "united" / "states".
  const stop = new Set(['united', 'states', 'v', 'vs', 'the', 'of', 'and', 'court', 'us', 'u'])
  for (const t of ta) {
    if (stop.has(t) || t.length < 4) continue
    if (tb.has(t)) score += 12
  }
  return Math.min(score, 99)
}

/**
 * Find the best library filesMeta row for an Ask AI source filename.
 * @returns {{ file: object, score: number } | null}
 */
export function findFileBySourceName(filesMeta, source) {
  if (!source || !filesMeta?.length) return null
  let best = null
  for (const file of filesMeta) {
    const score = scoreNameMatch(source, file.name)
    if (!best || score > best.score) best = { file, score }
  }
  if (!best || best.score < 35) return null
  return best
}

/**
 * Pick the best case card for an Ask AI source (name / suggestedFile / cite).
 * @returns {{ caseItem: object, score: number } | null}
 */
export function findCaseForSource(cases, source) {
  if (!source || !cases?.length) return null
  let best = null
  for (const caseItem of cases) {
    if (caseItem.id === CASE_AT_BAR_ID || caseItem.id === CORPUS_ARTICLES_ID) continue
    const score = Math.max(
      scoreNameMatch(source, caseItem.name),
      scoreNameMatch(source, caseItem.suggestedFile),
      scoreNameMatch(source, caseItem.cite)
    )
    if (!best || score > best.score) best = { caseItem, score }
  }
  if (!best || best.score < 35) return null
  return best
}

function buildSearch(params) {
  const next = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    next.set(key, String(value))
  }
  const qs = next.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Build the in-app path for an already-attached library PDF.
 */
export function pathForLibraryFile(file, { page, quote } = {}) {
  const common = {
    file: file.id,
    page: page || 1,
    q: quote || '',
  }
  if (file.caseId === CASE_AT_BAR_ID) {
    return `/facts${buildSearch({ ...common, view: 'record' })}`
  }
  if (file.caseId === CORPUS_ARTICLES_ID) {
    return `/articles${buildSearch(common)}`
  }
  return `/library${buildSearch({ case: file.caseId, ...common })}`
}

/**
 * Bootstrap Oyez summaries live in the FAISS index as text, not as PDFs.
 * /ingest/file will 404 for them, which used to look like a broken library.
 */
export function isBootstrapOyezSource(source) {
  return /\(Oyez summary\)\s*$/i.test(String(source || ''))
}

/** Strip the "(Oyez summary)" suffix for matching against real case / file names. */
export function stripOyezSummaryLabel(source) {
  return String(source || '')
    .replace(/\s*\(Oyez summary\)\s*$/i, '')
    .trim()
}

/**
 * When Ask AI cites a bootstrap Oyez row, prefer a PDF already attached to that
 * case card (Milligan / Youngstown / etc.) instead of nagging to re-attach.
 *
 * @returns {{ file: object, score: number, caseItem: object } | null}
 */
export function findAttachedPdfForOyezSource(filesMeta, cases, source) {
  if (!isBootstrapOyezSource(source)) return null
  const caseMatch = findCaseForSource(cases, stripOyezSummaryLabel(source) || source)
  if (!caseMatch) return null
  const caseId = caseMatch.caseItem.id
  const attached = (filesMeta || []).filter((f) => f && f.caseId === caseId)
  if (!attached.length) return null

  const labels = [
    stripOyezSummaryLabel(source),
    caseMatch.caseItem.name,
    caseMatch.caseItem.suggestedFile,
  ].filter(Boolean)

  let best = null
  for (const file of attached) {
    const score = Math.max(...labels.map((label) => scoreNameMatch(label, file.name)), 1)
    if (!best || score > best.score) best = { file, score, caseItem: caseMatch.caseItem }
  }
  return best
}

/**
 * Open an Ask AI corpus evidence hit in the PDF viewer at page + quote.
 *
 * Resolves library attachments first. If Ask AI indexed the file via Upload but
 * Case library has no blob yet, downloads from /ingest/file and attaches it to
 * the best-matching case (or Articles).
 *
 * @returns {Promise<{ ok: boolean, path?: string, error?: string }>}
 */
export async function openEvidencePdf({ evidence, lib, navigate, downloadIngestFile }) {
  const source = evidence?.source
  if (!source || evidence?.source_type === 'web') {
    return { ok: false, error: 'Not a corpus PDF cite.' }
  }

  const page = evidence.page != null && evidence.page > 0 ? evidence.page : 1
  const quote = (evidence.preview || evidence.text || '').trim()

  if (isBootstrapOyezSource(source)) {
    // Case library already has the opinion PDF — open that instead of the
    // "attach from YUMC" alert. Ask AI may still have cited the seeded Oyez
    // text because that row is always in FAISS.
    const attached = findAttachedPdfForOyezSource(lib.filesMeta, lib.cases, source)
    if (attached?.file) {
      const file = attached.file
      if (!lib.blobs[file.id] && downloadIngestFile) {
        try {
          const blob = await downloadIngestFile(file.name || source)
          await lib.attachBlob?.(file.caseId, file.name || source, blob)
        } catch {
          // Still navigate; empty state will ask the user to re-attach.
        }
      }
      lib.setActiveFileId(file.id)
      // Oyez rows have no real PDF page — jump to p.1 and let quote search run.
      lib.setPage(file.id, 1)
      const path = pathForLibraryFile(file, { page: 1, quote })
      navigate(path)
      return { ok: true, path }
    }

    const caseMatch = findCaseForSource(lib.cases, source)
    if (caseMatch) {
      const path = `/library${buildSearch({
        case: caseMatch.caseItem.id,
        page,
        q: quote,
        missing: caseMatch.caseItem.suggestedFile || source,
      })}`
      navigate(path)
      return {
        ok: false,
        path,
        error: `Ask AI used a short Oyez summary for “${source}”, not a PDF. Attach the opinion under Case library (your YUMC Cases folder has it for Youngstown and the other seeded summaries).`,
      }
    }
    return {
      ok: false,
      error: `Ask AI used a short Oyez summary for “${source}”, not a PDF. Attach the full opinion under Case library or Articles.`,
    }
  }

  const existing = findFileBySourceName(lib.filesMeta, source)
  if (existing?.file) {
    if (!lib.blobs[existing.file.id] && downloadIngestFile) {
      try {
        const blob = await downloadIngestFile(existing.file.name || source)
        await lib.attachBlob?.(existing.file.caseId, existing.file.name || source, blob)
      } catch {
        // Still navigate; empty state will ask the user to attach.
      }
    }
    lib.setActiveFileId(existing.file.id)
    lib.setPage(existing.file.id, page)
    const path = pathForLibraryFile(existing.file, { page, quote })
    navigate(path)
    return { ok: true, path }
  }

  if (!downloadIngestFile || !lib.attachBlob) {
    const caseMatch = findCaseForSource(lib.cases, source)
    if (caseMatch) {
      const path = `/library${buildSearch({
        case: caseMatch.caseItem.id,
        page,
        q: quote,
        missing: source,
      })}`
      navigate(path)
      return { ok: true, path }
    }
    navigate(`/articles${buildSearch({ missing: source, page, q: quote })}`)
    return { ok: false, error: `PDF “${source}” is not attached yet.` }
  }

  try {
    const blob = await downloadIngestFile(source)
    const caseMatch = findCaseForSource(lib.cases, source)
    const caseId = caseMatch?.caseItem?.id || CORPUS_ARTICLES_ID
    const meta = await lib.attachBlob(caseId, source, blob)
    if (!meta?.id) {
      return { ok: false, error: `Could not attach “${source}”.` }
    }
    lib.setActiveFileId(meta.id)
    lib.setPage(meta.id, page)
    const path = pathForLibraryFile(meta, { page, quote })
    navigate(path)
    return { ok: true, path }
  } catch (error) {
    const caseMatch = findCaseForSource(lib.cases, source)
    if (caseMatch) {
      const path = `/library${buildSearch({
        case: caseMatch.caseItem.id,
        page,
        q: quote,
        missing: source,
      })}`
      navigate(path)
      return {
        ok: false,
        path,
        error: error?.message || `Could not load “${source}” from the Ask AI upload store.`,
      }
    }
    navigate(`/articles${buildSearch({ missing: source, page, q: quote })}`)
    return {
      ok: false,
      error: error?.message || `Could not load “${source}”. Attach it under Articles or Case library.`,
    }
  }
}
