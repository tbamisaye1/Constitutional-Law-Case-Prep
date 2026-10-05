import { describe, expect, it } from 'vitest'
import {
  annotationChunksForAskAi,
  flattenAnnotations,
  prepNotesForAskAi,
  searchAnnotations,
} from './annotationSearch'

const CASES = [{ id: 'hamdi', name: 'Hamdi v. Rumsfeld' }]
const FILES = [{ id: 'pdf-1', name: 'Hamdi.pdf', caseId: 'hamdi' }]
const ANNOTATIONS = [
  {
    id: 'a-1',
    caseId: 'hamdi',
    fileId: 'pdf-1',
    page: 3,
    kind: 'highlight',
    quote: 'enemy combatant classification',
    text: 'Court requires notice before a neutral decisionmaker.',
  },
  {
    id: 'a-2',
    caseId: 'hamdi',
    fileId: 'pdf-1',
    page: 0,
    kind: 'general',
    quote: '',
    text: 'Remember Padilla was arrested at O’Hare.',
  },
]

describe('annotationSearch', () => {
  it('flattens highlight quote + note text', () => {
    const rows = flattenAnnotations({
      annotations: ANNOTATIONS,
      cases: CASES,
      filesMeta: FILES,
    })
    expect(rows).toHaveLength(2)
    const hit = rows.find((r) => r.id === 'anno:a-1')
    expect(hit.title).toContain('Highlight')
    expect(hit.text).toContain('enemy combatant')
    expect(hit.text).toContain('neutral decisionmaker')
    expect(hit.path).toContain('case=hamdi')
    expect(hit.path).toContain('page=3')
  })

  it('includes topic labels in flattened annotation text for Ask AI', () => {
    const rows = flattenAnnotations({
      annotations: [
        {
          ...ANNOTATIONS[0],
          topics: ['AUMF', 'Hamdi'],
        },
      ],
      cases: CASES,
      filesMeta: FILES,
    })
    expect(rows[0].text).toContain('Topics: AUMF, Hamdi')
    const hits = searchAnnotations('AUMF', {
      annotations: [{ ...ANNOTATIONS[0], topics: ['AUMF', 'Hamdi'] }],
      cases: CASES,
      filesMeta: FILES,
    })
    expect(hits.some((h) => h.id === 'anno:a-1')).toBe(true)
  })

  it('finds Enemy in annotations for Ask AI', () => {
    const hits = searchAnnotations('Enemy', {
      annotations: ANNOTATIONS,
      cases: CASES,
      filesMeta: FILES,
    })
    expect(hits.some((h) => h.id === 'anno:a-1')).toBe(true)
    const chunks = annotationChunksForAskAi('enemy combatant', {
      annotations: ANNOTATIONS,
      cases: CASES,
      filesMeta: FILES,
    })
    expect(chunks[0].source_type).toBe('annotation')
    expect(chunks[0].notes_path).toContain('/library?')
  })

  it('merges annotations into prepNotesForAskAi', () => {
    const chunks = prepNotesForAskAi('enemy combatant', {
      annotations: ANNOTATIONS,
      cases: CASES,
      filesMeta: FILES,
      notesByCase: {
        hamdi: {
          'tab-enemy': '<p>POW vs enemy combatant label in Hamdi.</p>',
        },
      },
      noteTabs: [{ id: 'tab-enemy', caseId: 'hamdi', label: 'Enemy Combatant' }],
      notebookLimit: 0,
    })
    expect(chunks.some((c) => c.source_type === 'annotation')).toBe(true)
    expect(chunks.some((c) => String(c.id).includes('case-note'))).toBe(true)
  })

  it('finds Costanzo Congress-intention note from a messy Ask AI query', () => {
    const annotations = [
      {
        id: 'a-noise',
        caseId: 'case-at-bar',
        page: 3,
        kind: 'highlight',
        text: '',
        quote:
          'Efforts to pass laws expressly forbidding the president to detain Americans indefinitely failed in both houses of Congress',
      },
      {
        id: 'a-costanzo',
        caseId: 'costanzo',
        fileId: 'pdf-c',
        page: 2,
        kind: 'highlight',
        text: 'Here teh court says that if COngress odesnt include/chagne a statue, then you must assume that the way it is written is presumably the particular intention',
        quote:
          'The failure of Congress to alter or amend a statute, notwithstanding a consistent construction by the department charged with its enforcement',
      },
    ]
    const cases = [
      { id: 'costanzo', name: 'Costanzo v. Tillinghast' },
      { id: 'case-at-bar', name: 'Instant Case' },
    ]
    const filesMeta = [{ id: 'pdf-c', name: 'costanzo.pdf', caseId: 'costanzo' }]
    const q =
      'whre in my ntoes do i write about the intention of Congress and how the court sohuld look to that when something is excluded repreately /consittently from law'
    const hits = searchAnnotations(q, { annotations, cases, filesMeta })
    expect(hits[0].id).toBe('anno:a-costanzo')
    expect(hits[0].path).toContain('/library?')
    expect(hits[0].path).toContain('anno=a-costanzo')
    expect(hits[0].path).toContain('case=costanzo')
  })
})
