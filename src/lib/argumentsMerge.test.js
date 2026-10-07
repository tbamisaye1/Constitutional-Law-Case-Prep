import { describe, expect, it } from 'vitest'
import { mergeArgumentsBoards, mergeScalar } from './argumentsMerge'

function board(petDrafts, extra = {}) {
  return {
    draftsBySide: {
      petitioner: petDrafts,
      respondent: [{ id: 'respondent-main', name: 'Main', notes: '', sections: [] }],
    },
    activeDraftBySide: { petitioner: petDrafts[0]?.id, respondent: 'respondent-main' },
    ...extra,
  }
}

function draft(sections, fields = {}) {
  return { id: 'd1', name: 'Ladder', notes: '<p>top</p>', sections, ...fields }
}

const clone = (x) => JSON.parse(JSON.stringify(x))

const BASE = board([
  draft([
    {
      id: 's1',
      title: 'Lowest ebb',
      notes: '<p>framework</p>',
      prongs: [
        { id: 'p1', title: 'a. Category 3', notes: '<p>jackson</p>' },
        {
          id: 'p2',
          title: 'b. Silence',
          notes: '<p>keith</p><p>Emergency Detention Act paragraph that is long</p>',
        },
      ],
    },
    { id: 's2', title: 'Statutes', notes: '', prongs: [{ id: 'p3', title: 'ATA', notes: '<p>ata</p>' }] },
  ]),
])

function prong(b, id) {
  for (const s of b.draftsBySide.petitioner[0].sections) {
    const p = s.prongs.find((x) => x.id === id)
    if (p) return p
  }
  return undefined
}

describe('mergeScalar', () => {
  it('takes whichever side changed', () => {
    expect(mergeScalar('a', 'a', 'b')).toEqual({ value: 'b', conflict: false })
    expect(mergeScalar('a', 'b', 'a')).toEqual({ value: 'b', conflict: false })
    expect(mergeScalar('a', 'c', 'c')).toEqual({ value: 'c', conflict: false })
  })
  it('flags a conflict and prefers remote when both changed', () => {
    expect(mergeScalar('a', 'b', 'c')).toEqual({ value: 'c', conflict: true })
  })
  it('treats empty, null and undefined as the same', () => {
    expect(mergeScalar('', undefined, null).conflict).toBe(false)
  })
})

describe('mergeArgumentsBoards', () => {
  it('without a base, the server board wins outright', () => {
    const local = clone(BASE)
    prong(local, 'p2').notes = '<p>much much longer stale local text that used to win</p>'
    const remote = clone(BASE)
    const { board: out } = mergeArgumentsBoards(null, local, remote)
    expect(out).toBe(remote)
  })

  it('a shorter server edit beats an untouched stale local copy (the revert bug)', () => {
    const local = clone(BASE) // this tab never edited p2
    const remote = clone(BASE)
    prong(remote, 'p2').notes = '<p>keith</p>' // MCP removed the long paragraph
    const { board: out, conflicts } = mergeArgumentsBoards(BASE, local, remote)
    expect(prong(out, 'p2').notes).toBe('<p>keith</p>')
    expect(conflicts).toHaveLength(0)
  })

  it('keeps edits to different prongs from both sides', () => {
    const local = clone(BASE)
    prong(local, 'p1').notes = '<p>jackson + my new line</p>'
    const remote = clone(BASE)
    prong(remote, 'p3').notes = '<p>ata fixed by MCP</p>'
    const { board: out, conflicts } = mergeArgumentsBoards(BASE, local, remote)
    expect(prong(out, 'p1').notes).toBe('<p>jackson + my new line</p>')
    expect(prong(out, 'p3').notes).toBe('<p>ata fixed by MCP</p>')
    expect(conflicts).toHaveLength(0)
  })

  it('same prong edited on both sides: remote wins, local text is stashed in scratch', () => {
    const local = clone(BASE)
    prong(local, 'p1').notes = '<p>LOCAL version</p>'
    const remote = clone(BASE)
    prong(remote, 'p1').notes = '<p>REMOTE version</p>'
    const { board: out, conflicts } = mergeArgumentsBoards(BASE, local, remote, { now: 0 })
    expect(prong(out, 'p1').notes).toBe('<p>REMOTE version</p>')
    expect(conflicts).toHaveLength(1)
    const scratch = out.draftsBySide.petitioner[0].scratch
    expect(scratch).toContain('LOCAL version')
    expect(scratch).toContain('a. Category 3')
  })

  it('title conflicts are recorded too, as plain text', () => {
    const local = clone(BASE)
    prong(local, 'p1').title = 'Local <title>'
    const remote = clone(BASE)
    prong(remote, 'p1').title = 'Remote title'
    const { board: out } = mergeArgumentsBoards(BASE, local, remote, { now: 0 })
    expect(prong(out, 'p1').title).toBe('Remote title')
    expect(out.draftsBySide.petitioner[0].scratch).toContain('Local &lt;title&gt;')
  })

  it('a prong deleted on the server stays deleted if this tab did not touch it', () => {
    const local = clone(BASE)
    const remote = clone(BASE)
    remote.draftsBySide.petitioner[0].sections[0].prongs.pop() // delete p2
    const { board: out } = mergeArgumentsBoards(BASE, local, remote)
    expect(prong(out, 'p2')).toBeUndefined()
  })

  it('a prong deleted on the server survives if this tab edited it', () => {
    const local = clone(BASE)
    prong(local, 'p2').notes = '<p>I was writing here</p>'
    const remote = clone(BASE)
    remote.draftsBySide.petitioner[0].sections[0].prongs.pop()
    const { board: out } = mergeArgumentsBoards(BASE, local, remote)
    expect(prong(out, 'p2').notes).toBe('<p>I was writing here</p>')
  })

  it('a prong deleted locally stays deleted when the server did not change it', () => {
    const local = clone(BASE)
    local.draftsBySide.petitioner[0].sections[1].prongs = []
    const remote = clone(BASE)
    const { board: out } = mergeArgumentsBoards(BASE, local, remote)
    expect(prong(out, 'p3')).toBeUndefined()
  })

  it('additions on both sides are kept, in sensible positions', () => {
    const local = clone(BASE)
    local.draftsBySide.petitioner[0].sections[0].prongs.splice(1, 0, {
      id: 'pL',
      title: 'local new',
      notes: '',
    })
    const remote = clone(BASE)
    remote.draftsBySide.petitioner[0].sections[0].prongs.push({ id: 'pR', title: 'remote new', notes: '' })
    const { board: out } = mergeArgumentsBoards(BASE, local, remote)
    const order = out.draftsBySide.petitioner[0].sections[0].prongs.map((p) => p.id)
    expect(order).toEqual(['p1', 'pL', 'p2', 'pR'])
  })

  it('a local reorder survives a remote text edit', () => {
    const local = clone(BASE)
    const secs = local.draftsBySide.petitioner[0].sections
    local.draftsBySide.petitioner[0].sections = [secs[1], secs[0]]
    const remote = clone(BASE)
    prong(remote, 'p1').notes = '<p>remote touch</p>'
    const { board: out } = mergeArgumentsBoards(BASE, local, remote)
    expect(out.draftsBySide.petitioner[0].sections.map((s) => s.id)).toEqual(['s2', 's1'])
    expect(prong(out, 'p1').notes).toBe('<p>remote touch</p>')
  })

  it('a remote reorder wins when local only edited text', () => {
    const local = clone(BASE)
    prong(local, 'p3').notes = '<p>local touch</p>'
    const remote = clone(BASE)
    const secs = remote.draftsBySide.petitioner[0].sections
    remote.draftsBySide.petitioner[0].sections = [secs[1], secs[0]]
    const { board: out } = mergeArgumentsBoards(BASE, local, remote)
    expect(out.draftsBySide.petitioner[0].sections.map((s) => s.id)).toEqual(['s2', 's1'])
    expect(prong(out, 'p3').notes).toBe('<p>local touch</p>')
  })

  it('scratch edits merge like any other field', () => {
    const local = clone(BASE)
    local.draftsBySide.petitioner[0].scratch = '<p>thought</p>'
    const remote = clone(BASE)
    const { board: out } = mergeArgumentsBoards(BASE, local, remote)
    expect(out.draftsBySide.petitioner[0].scratch).toBe('<p>thought</p>')
  })

  it('both sides edited scratch: keep both', () => {
    const local = clone(BASE)
    local.draftsBySide.petitioner[0].scratch = '<p>mine</p>'
    const remote = clone(BASE)
    remote.draftsBySide.petitioner[0].scratch = '<p>theirs</p>'
    const { board: out } = mergeArgumentsBoards(BASE, local, remote, { now: 0 })
    const scratch = out.draftsBySide.petitioner[0].scratch
    expect(scratch).toContain('theirs')
    expect(scratch).toContain('mine')
  })

  it('an id that is back in the outline is no longer in removedOutlineIds', () => {
    const local = clone(BASE)
    local.draftsBySide.petitioner[0].removedOutlineIds = ['p1', 'gone']
    const remote = clone(BASE)
    const { board: out } = mergeArgumentsBoards(BASE, local, remote)
    expect(out.draftsBySide.petitioner[0].removedOutlineIds).toEqual(['gone'])
  })

  it('keeps the local active draft when it still exists', () => {
    const local = clone(BASE)
    local.draftsBySide.petitioner.push({ id: 'd2', name: 'Alt', notes: '', sections: [] })
    local.activeDraftBySide.petitioner = 'd2'
    const remote = clone(BASE)
    const { board: out } = mergeArgumentsBoards(BASE, local, remote)
    expect(out.activeDraftBySide.petitioner).toBe('d2')
    expect(out.draftsBySide.petitioner.map((d) => d.id)).toEqual(['d1', 'd2'])
  })
})

describe('mergeDrafts (page editor)', () => {
  it('merges a typing session with an MCP edit to another prong', async () => {
    const { mergeDrafts } = await import('./argumentsMerge')
    const base = clone(BASE).draftsBySide.petitioner[0]
    const local = clone(base)
    local.sections[0].prongs[0].notes = '<p>typing here</p>'
    const remote = clone(base)
    remote.sections[1].prongs[0].notes = '<p>MCP fix</p>'
    const { draft: out, conflicts } = mergeDrafts(base, local, remote)
    expect(out.sections[0].prongs[0].notes).toBe('<p>typing here</p>')
    expect(out.sections[1].prongs[0].notes).toBe('<p>MCP fix</p>')
    expect(conflicts).toHaveLength(0)
  })

  it('same prong while typing: the typed text stays, the other version is returned for scratch', async () => {
    const { mergeDrafts } = await import('./argumentsMerge')
    const base = clone(BASE).draftsBySide.petitioner[0]
    base.scratch = '<p>my article notes</p>'
    const local = clone(base)
    local.sections[0].prongs[0].notes = '<p>typing here</p>'
    const remote = clone(base)
    remote.sections[0].prongs[0].notes = '<p>other device</p>'
    const { draft: out, stashHtml } = mergeDrafts(base, local, remote, { now: 0, prefer: 'local' })
    expect(out.sections[0].prongs[0].notes).toBe('<p>typing here</p>')
    expect(stashHtml).toContain('other device')
    // Scratch is never rewritten by the page merge.
    expect(out.scratch).toBe('<p>my article notes</p>')
  })

  it('board merge appends conflict copies after the existing scratch', () => {
    const base = clone(BASE)
    base.draftsBySide.petitioner[0].scratch = '<p>my article notes</p>'
    const local = clone(base)
    local.draftsBySide.petitioner[0].sections[0].prongs[0].notes = '<p>mine</p>'
    const remote = clone(base)
    remote.draftsBySide.petitioner[0].sections[0].prongs[0].notes = '<p>theirs</p>'
    const { board } = mergeArgumentsBoards(base, local, remote, { now: 0 })
    const scratch = board.draftsBySide.petitioner[0].scratch
    expect(scratch.startsWith('<p>my article notes</p>')).toBe(true)
    expect(scratch).toContain('mine')
  })
})
