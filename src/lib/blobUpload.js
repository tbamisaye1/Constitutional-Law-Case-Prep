/**
 * Shared helpers for browser → Vercel Blob PDF uploads.
 *
 * Two failure modes this module hardens against:
 * 1. MIME mismatch — tokens allow application/pdf, but some browsers hand
 *    empty or octet-stream types. Blob then rejects the PUT; Safari/Chrome
 *    often surface that as a CORS-looking "Failed to fetch".
 * 2. Transient network blips on token mint / PUT / complete.
 */

export function isNetworkFailure(error) {
  const message = error?.message || String(error || '')
  return (
    error?.name === 'TypeError' ||
    /failed to fetch|networkerror|network request failed|load failed/i.test(message)
  )
}

/** Always send application/pdf for .pdf uploads so the client token accepts them. */
export function pdfContentType(file, fileName = '') {
  const name = String(fileName || file?.name || '').toLowerCase()
  const type = String(file?.type || '').toLowerCase()
  if (name.endsWith('.pdf') || type.includes('pdf') || !type) {
    return 'application/pdf'
  }
  return type || 'application/pdf'
}

/** Encode each path segment so spaces / unicode in pathnames cannot break the PUT URL. */
export function blobPutUrl(pathname) {
  const cleaned = String(pathname || '')
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `https://blob.vercel-storage.com/${cleaned}`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a step a few times when the browser reports a bare network failure.
 *
 * @template T
 * @param {string} step Label for the error message (token, Blob PUT, …).
 * @param {() => Promise<T>} run
 * @param {{ attempts?: number, delayMs?: number }} [options]
 */
export async function withNetworkRetries(step, run, options = {}) {
  const attempts = options.attempts ?? 3
  const delayMs = options.delayMs ?? 400
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await run()
    } catch (error) {
      lastError = error
      if (!isNetworkFailure(error) || i === attempts - 1) {
        const detail = (error?.message || String(error || 'unknown error')).trim()
        throw new Error(`${step} failed: ${detail}`)
      }
      await sleep(delayMs * (i + 1))
    }
  }
  throw lastError
}

/**
 * PUT PDF bytes to Blob with a short-lived client token.
 *
 * @param {string} clientToken
 * @param {string} pathname
 * @param {Blob|File} file
 * @param {string} [fileName]
 * @returns {Promise<{url: string, downloadUrl?: string, pathname?: string}>}
 */
export async function putPdfToBlob(clientToken, pathname, file, fileName = '') {
  const contentType = pdfContentType(file, fileName)
  const putRes = await fetch(blobPutUrl(pathname), {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${clientToken}`,
      'x-api-version': '7',
      'x-content-type': contentType,
      'x-content-length': String(file.size),
      'x-add-random-suffix': '0',
    },
    body: file,
  })
  if (!putRes.ok) {
    const detail = (await putRes.text()) || `HTTP ${putRes.status}`
    throw new Error(detail)
  }
  let stored = {}
  try {
    stored = await putRes.json()
  } catch {
    stored = {}
  }
  const blobUrl = stored.url || stored.downloadUrl || ''
  if (!blobUrl) {
    throw new Error('Blob accepted the upload but returned no URL.')
  }
  return stored
}
