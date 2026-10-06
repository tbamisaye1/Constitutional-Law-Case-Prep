import { describe, expect, it } from 'vitest'
import { mergeNotebookSnapshots } from './notebookMerge'

describe('mergeNotebookSnapshots', () => {
  it('keeps a local-only section that still has pages when remote wiped it', () => {
    const remote = {
      tree: [
        {
          id: 'grp-bronner',
          name: 'Bronner 2026–27',
          kind: 'group',
          children: [{ id: 'sec-issue1', name: 'Issue 1 Notes', kind: 'section', color: '#3D5A80' }],
        },
      ],
      pagesBySection: { 'sec-issue1': [{ id: 'pg-1', title: 'A', html: '<p>x</p>' }] },
    }
    const local = {
      tree: [
        {
          id: 'grp-bronner',
          name: 'Bronner 2026–27',
          kind: 'group',
          children: [
            { id: 'sec-issue1', name: 'Issue 1 Notes', kind: 'section', color: '#3D5A80' },
            { id: 'sec-bg', name: 'Background info', kind: 'section', color: '#17565A' },
          ],
        },
      ],
      pagesBySection: {
        'sec-issue1': [{ id: 'pg-1', title: 'A', html: '<p>x</p>' }],
        'sec-bg': [{ id: 'pg-ndaa', title: 'NDAA', html: '<p>covered person</p>' }],
      },
    }

    const merged = mergeNotebookSnapshots(remote, local)
    const bronner = merged.tree.find((n) => n.id === 'grp-bronner')
    expect(bronner.children.map((c) => c.id)).toContain('sec-bg')
    expect(merged.pagesBySection['sec-bg'][0].html).toContain('covered person')
  })

  it('does not keep empty secondary-only stubs', () => {
    const remote = {
      tree: [{ id: 'sec-1', name: 'Keep', kind: 'section' }],
      pagesBySection: { 'sec-1': [] },
    }
    const local = {
      tree: [
        { id: 'sec-1', name: 'Keep', kind: 'section' },
        { id: 'sec-empty', name: 'New section', kind: 'section' },
      ],
      pagesBySection: { 'sec-1': [], 'sec-empty': [] },
    }
    const merged = mergeNotebookSnapshots(remote, local)
    expect(merged.tree.map((n) => n.id)).toEqual(['sec-1'])
    expect(merged.pagesBySection['sec-empty']).toBeUndefined()
  })
})
