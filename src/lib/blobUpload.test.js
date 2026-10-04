import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  blobPutUrl,
  isNetworkFailure,
  pdfContentType,
  putPdfToBlob,
  withNetworkRetries,
} from './blobUpload'

describe('blobUpload helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('forces application/pdf for PDF names even when the Blob type is wrong', () => {
    expect(pdfContentType({ type: 'application/octet-stream' }, 'memo.pdf')).toBe(
      'application/pdf'
    )
    expect(pdfContentType({ type: '' }, 'report.PDF')).toBe('application/pdf')
    expect(pdfContentType({ type: 'application/pdf', name: 'x.pdf' })).toBe('application/pdf')
  })

  it('encodes pathname segments for the Blob PUT URL', () => {
    expect(blobPutUrl('case-law-agent/ingest/a b.pdf')).toBe(
      'https://blob.vercel-storage.com/case-law-agent/ingest/a%20b.pdf'
    )
  })

  it('detects bare network failures', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true)
    expect(isNetworkFailure(new Error('Blob PUT failed: 400'))).toBe(false)
  })

  it('retries network failures then succeeds', async () => {
    let calls = 0
    const result = await withNetworkRetries(
      'Blob PUT',
      async () => {
        calls += 1
        if (calls < 3) throw new TypeError('Failed to fetch')
        return 'ok'
      },
      { attempts: 3, delayMs: 1 }
    )
    expect(result).toBe('ok')
    expect(calls).toBe(3)
  })

  it('labels the step when retries are exhausted', async () => {
    await expect(
      withNetworkRetries('Backend storage token', async () => {
        throw new TypeError('Failed to fetch')
      }, { attempts: 2, delayMs: 1 })
    ).rejects.toThrow(/Backend storage token failed: Failed to fetch/)
  })

  it('PUTs with application/pdf even when the File type is octet-stream', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      async json() {
        return { url: 'https://example.public.blob.vercel-storage.com/x.pdf' }
      },
      async text() {
        return ''
      },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const file = new File([new Uint8Array([1, 2, 3])], '36528 report.pdf', {
      type: 'application/octet-stream',
    })
    await putPdfToBlob('tok', 'case-law-agent/ingest/abc.pdf', file, file.name)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://blob.vercel-storage.com/case-law-agent/ingest/abc.pdf')
    expect(init.headers['x-content-type']).toBe('application/pdf')
    expect(init.headers['x-content-length']).toBe('3')
  })
})
