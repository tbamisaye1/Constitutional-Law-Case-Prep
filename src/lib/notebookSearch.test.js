import { describe, expect, it } from 'vitest'
import {
  flattenNotebookPages,
  notebookChunksForAskAi,
  queryWantsNotes,
  searchNotebook,
  snippetAround,
  stripHtmlToText,
} from './notebookSearch'

const SAMPLE = {
  tree: [
    {
      id: 'grp',
      name: 'Bronner',
      kind: 'group',
      children: [{ id: 'sec-issue2', name: 'Issue 2 Notes', kind: 'section', color: '#8C3226' }],
    },
  ],
  pagesBySection: {
    'sec-issue2': [
      {
        id: 'pg-ndaa',
        title: 'NDAA detention',
        html: '<h2>NDAA</h2><p>The 2012 NDAA affirms AUMF detention authority for persons captured in hostilities.</p>',
        children: [
          {
            id: 'pg-ndaa-sub',
            title: 'Standing note',
            html: '<p>Padilla was reversed on appeal on the basis of standing.</p>',
          },
        ],
      },
      {
        id: 'pg-katz',
        title: 'Katz booth',
        html: '<p>Katz protects people, not places.</p>',
      },
    ],
  },
}

describe('notebookSearch', () => {
  it('strips html to plain text', () => {
    expect(stripHtmlToText('<p>Hello <b>NDAA</b></p>')).toContain('NDAA')
    expect(stripHtmlToText('<p>Hello <b>NDAA</b></p>')).not.toContain('<')
  })

  it('flattens nested pages', () => {
    const rows = flattenNotebookPages(SAMPLE)
    expect(rows.map((r) => r.pageId).sort()).toEqual(['pg-katz', 'pg-ndaa', 'pg-ndaa-sub'].sort())
    expect(rows.find((r) => r.pageId === 'pg-ndaa').path).toContain('section=sec-issue2')
    expect(rows.find((r) => r.pageId === 'pg-ndaa').path).toContain('page=pg-ndaa')
  })

  it('finds NDAA across title and body', () => {
    const hits = searchNotebook('NDAA', { notebook: SAMPLE })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].title.toLowerCase()).toContain('ndaa')
    expect(hits[0].snippet.toLowerCase()).toContain('ndaa')
  })

  it('browses titled pages when the query is empty', () => {
    const hits = searchNotebook('', { notebook: SAMPLE, limit: 8 })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((h) => h.path.startsWith('/notes?'))).toBe(true)
  })

  it('does not dump the whole notebook for Ask AI on a miss', () => {
    expect(notebookChunksForAskAi('zzzz-no-match-phrase', { notebook: SAMPLE })).toEqual([])
  })

  it('finds standing in a nested subpage', () => {
    const hits = searchNotebook('standing', { notebook: SAMPLE })
    expect(hits.some((h) => h.pageId === 'pg-ndaa-sub')).toBe(true)
  })

  it('builds ask-ai chunks with notes_path', () => {
    const chunks = notebookChunksForAskAi('NDAA detention', { notebook: SAMPLE })
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0].notes_path).toMatch(/^\/notes\?/)
    expect(chunks[0].source_type).toBe('notebook')
    expect(chunks[0].text.toLowerCase()).toContain('ndaa')
  })

  it('strips note-intent filler before matching', () => {
    const chunks = notebookChunksForAskAi('what did I write about NDAA in my notes', {
      notebook: SAMPLE,
    })
    expect(chunks.some((c) => c.page_id === 'pg-ndaa')).toBe(true)
  })

  it('detects note-grounding intent', () => {
    expect(queryWantsNotes('what did I write about NDAA in my notes')).toBe(true)
    expect(queryWantsNotes('define AUMF from the article')).toBe(false)
    expect(
      queryWantsNotes(
        'whre in my ntoes do i write about the intention of Congress'
      )
    ).toBe(true)
    expect(queryWantsNotes('where did i write about consistent construction')).toBe(true)
  })

  it('snippetAround marks the match', () => {
    const snip = snippetAround('xxxx the 2012 NDAA affirms yyyy', 'NDAA', 10)
    expect(snip.toLowerCase()).toContain('ndaa')
  })
})
