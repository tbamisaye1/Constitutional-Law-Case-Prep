import { describe, expect, it } from 'vitest'
import { compareAnnotations, isGeneralAnnotation } from './AnnotationPanel'

describe('compareAnnotations', () => {
  it('keeps pinned notes above everything else', () => {
    const pinned = { id: 'p', page: 9, pinned: true, savedAt: 1 }
    const early = {
      id: 'e',
      page: 1,
      rects: [{ top: 0.1, left: 0.1, width: 0.2, height: 0.02 }],
      savedAt: 9,
    }

    expect(compareAnnotations(pinned, early)).toBeLessThan(0)
    expect([early, pinned].sort(compareAnnotations).map((a) => a.id)).toEqual(['p', 'e'])
  })

  it('orders highlights by position on the page, not save time', () => {
    const lower = {
      id: 'lower',
      page: 2,
      rects: [{ top: 0.6, left: 0.1, width: 0.2, height: 0.02 }],
      savedAt: 9_000,
    }
    const upper = {
      id: 'upper',
      page: 2,
      rects: [{ top: 0.2, left: 0.1, width: 0.2, height: 0.02 }],
      savedAt: 1_000,
    }
    const pageNote = { id: 'page', page: 2, savedAt: 5_000 }

    expect([lower, pageNote, upper].sort(compareAnnotations).map((a) => a.id)).toEqual([
      'upper',
      'lower',
      'page',
    ])
  })

  it('puts general article notes before page-linked notes', () => {
    const general = { id: 'g', kind: 'general', page: 0, text: 'themes', savedAt: 1 }
    const page = { id: 'p', kind: 'page', page: 1, text: 'on page', savedAt: 9 }
    expect(isGeneralAnnotation(general)).toBe(true)
    expect([page, general].sort(compareAnnotations).map((a) => a.id)).toEqual(['g', 'p'])
  })
})
