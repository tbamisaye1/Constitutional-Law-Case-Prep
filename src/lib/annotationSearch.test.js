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
})
