import { describe, expect, it } from 'vitest'
import { searchPdfDocument } from './pdfTextSearch'

describe('searchPdfDocument', () => {
  it('returns empty for short queries or missing pdf', async () => {
    expect(await searchPdfDocument(null, 'habeas')).toEqual([])
    expect(await searchPdfDocument({ numPages: 1 }, 'a')).toEqual([])
  })

  it('finds matches from pdf.js text content', async () => {
    const pdf = {
      numPages: 2,
      async getPage(pageNum) {
        const text =
          pageNum === 1
            ? 'Rumsfeld v. Padilla left habeas open.'
            : 'Unrelated Fourth Amendment discussion.'
        return {
          async getTextContent() {
            return {
              items: text.split(' ').map((str, i, arr) => ({
                str: i === arr.length - 1 ? str : `${str} `,
                hasEOL: false,
              })),
            }
          },
        }
      },
    }

    const matches = await searchPdfDocument(pdf, 'Padilla')
    expect(matches).toEqual([{ page: 1, occurrence: 0 }])

    const none = await searchPdfDocument(pdf, 'Katz')
    expect(none).toEqual([])
  })
})
