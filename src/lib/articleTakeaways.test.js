import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  ARTICLES_SECTION_ID,
  articleNotesPageId,
  exportArticleTakeawaysToNotes,
  formatArticleTakeawaysHtml,
  NOTEBOOK_STORAGE_KEY,
} from './articleTakeaways'

function installMemoryStorage() {
  const map = new Map()
  const storage = {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(String(key), String(value))
    },
    removeItem: (key) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  })
  return storage
}

describe('articleTakeaways', () => {
  beforeEach(() => {
    installMemoryStorage()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('builds a stable page id from the file id', () => {
    expect(articleNotesPageId('pdf-123', 'x.pdf')).toBe('pg-article-pdf-123')
  })

  it('formats highlights and notes by page', () => {
    const html = formatArticleTakeawaysHtml({
      title: 'CRS report',
      fileName: 'R42337.pdf',
      exportedAt: Date.parse('2026-10-02T12:00:00Z'),
      annotations: [
        {
          id: 'a2',
          page: 2,
          kind: 'highlight',
          quote: 'enemy belligerents',
          text: 'Key phrase for detention argument.',
          rects: [{ top: 0.2, left: 0.1, width: 0.3, height: 0.02 }],
        },
        {
          id: 'a1',
          page: 1,
          kind: 'page',
          text: 'Reading goals:\n- map statutes\n- note Hamdi cites',
        },
      ],
    })

    expect(html).toContain('<h2>CRS report</h2>')
    expect(html).toContain('<h3>Page 1</h3>')
    expect(html).toContain('<h3>Page 2</h3>')
    expect(html).toContain('enemy belligerents')
    expect(html).toContain('Reading goals')
  })

  it('upserts an Articles section page in the notebook store', () => {
    const first = exportArticleTakeawaysToNotes({
      fileId: 'pdf-abc',
      fileName: 'milligan.pdf',
      title: 'Ex parte Milligan',
      annotations: [{ id: 'n1', page: 1, kind: 'page', text: 'First takeaway' }],
    })

    expect(first.sectionId).toBe(ARTICLES_SECTION_ID)
    expect(first.pageId).toBe('pg-article-pdf-abc')
    expect(first.notesPath).toContain('/notes?')

    const saved = JSON.parse(localStorage.getItem(NOTEBOOK_STORAGE_KEY))
    expect(saved.pagesBySection[ARTICLES_SECTION_ID][0].html).toContain('First takeaway')

    exportArticleTakeawaysToNotes({
      fileId: 'pdf-abc',
      fileName: 'milligan.pdf',
      title: 'Ex parte Milligan',
      annotations: [{ id: 'n1', page: 1, kind: 'page', text: 'Updated takeaway' }],
    })

    const again = JSON.parse(localStorage.getItem(NOTEBOOK_STORAGE_KEY))
    expect(again.pagesBySection[ARTICLES_SECTION_ID]).toHaveLength(1)
    expect(again.pagesBySection[ARTICLES_SECTION_ID][0].html).toContain('Updated takeaway')
    expect(again.pagesBySection[ARTICLES_SECTION_ID][0].html).not.toContain('First takeaway')
  })
})
