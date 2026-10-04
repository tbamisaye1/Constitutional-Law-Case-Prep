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

  it('formats a study-friendly layout: overview, takeaways, working notes', () => {
    const html = formatArticleTakeawaysHtml({
      title: 'CRS report',
      fileName: 'R42337.pdf',
      exportedAt: Date.parse('2026-10-02T12:00:00Z'),
      annotations: [
        {
          id: 'a2',
          page: 2,
          kind: 'highlight',
          color: 'gold',
          quote: 'enemy belligerents',
          text: 'Key phrase for detention argument.',
          rects: [{ top: 0.2, left: 0.1, width: 0.3, height: 0.02 }],
        },
        {
          id: 'a0',
          page: 0,
          kind: 'general',
          text: 'Overall: Hamdi vs Milligan tension.',
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
    expect(html).toContain('<h3>Overview</h3>')
    expect(html).toContain('<h3>Takeaways</h3>')
    expect(html).toContain('<h3>Working notes</h3>')
    expect(html).toContain('Hamdi vs Milligan')
    expect(html).toContain('enemy belligerents')
    expect(html).toContain('Reading goals')
    expect(html).toContain('<em>p. 2</em>')
    expect(html).not.toContain('<h4>Highlight</h4>')
    expect(html).not.toContain('<h3>Page 1</h3>')
    expect(html).not.toContain('Exported from Articles')
    expect(html.indexOf('Overview')).toBeLessThan(html.indexOf('Takeaways'))
    expect(html.indexOf('Takeaways')).toBeLessThan(html.indexOf('Working notes'))
  })

  it('puts pinned items under Key points and groups multi-color highlights by color', () => {
    const html = formatArticleTakeawaysHtml({
      title: 'Detention memo',
      annotations: [
        {
          id: 'p1',
          page: 3,
          kind: 'highlight',
          color: 'rose',
          pinned: true,
          quote: 'citizen-detainee',
          text: 'Pin this for oral argument.',
        },
        {
          id: 'g1',
          page: 2,
          kind: 'highlight',
          color: 'green',
          quote: 'AUMF',
          text: 'Statutory hook.',
        },
        {
          id: 'b1',
          page: 4,
          kind: 'highlight',
          color: 'blue',
          quote: 'habeas',
          text: 'Procedure track.',
        },
      ],
    })

    expect(html).toContain('<h3>Key points</h3>')
    expect(html).toContain('<h3>Green</h3>')
    expect(html).toContain('<h3>Blue</h3>')
    expect(html).not.toContain('<h3>Takeaways</h3>')
    expect(html.indexOf('Key points')).toBeLessThan(html.indexOf('Green'))
    expect(html.indexOf('Green')).toBeLessThan(html.indexOf('Blue'))
    expect(html.indexOf('citizen-detainee')).toBeLessThan(html.indexOf('AUMF'))
  })

  it('groups tagged highlights by topic and lists extra topics inline', () => {
    const html = formatArticleTakeawaysHtml({
      title: 'Bradley & Goldsmith',
      annotations: [
        {
          id: 't1',
          page: 2,
          kind: 'highlight',
          quote: 'AUMF',
          text: 'Statutory basis.',
          topics: ['AUMF', 'Hamdi'],
        },
        {
          id: 't2',
          page: 5,
          kind: 'highlight',
          quote: 'citizen-detainee',
          text: 'Domestic detention.',
          topics: ['Hamdi'],
        },
        {
          id: 't3',
          page: 8,
          kind: 'highlight',
          quote: 'no tag',
          text: 'Loose note.',
          topics: [],
        },
      ],
    })

    expect(html).toContain('<h3>AUMF</h3>')
    expect(html).toContain('<h3>Hamdi</h3>')
    expect(html).toContain('<h3>Untagged</h3>')
    expect(html).toContain('Also: Hamdi')
    expect(html).not.toContain('<h3>Takeaways</h3>')
    expect(html.indexOf('AUMF')).toBeLessThan(html.indexOf('<h3>Hamdi</h3>'))
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
    expect(saved.pagesBySection[ARTICLES_SECTION_ID][0].html).toContain('Working notes')

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
