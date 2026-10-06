import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
})
vi.stubGlobal('window', { dispatchEvent: () => true })
vi.stubGlobal('CustomEvent', class {
  constructor(type, init) {
    this.type = type
    this.detail = init?.detail
  }
})

const {
  ARGUMENTS_BASE_KEY,
  WORKSPACE_DOCS,
  hydrateWorkspaceDocFromRemote,
  readArgumentsBase,
  registerWorkspaceDocPublisher,
  rememberArgumentsBase,
  saveWorkspaceDoc,
} = await import('./workspaceDocs')

const spec = WORKSPACE_DOCS.arguments

function boardWith(prongNotes, extraDraft = {}) {
  return {
    draftsBySide: {
      petitioner: [
        {
          id: 'alt-q2-ladder',
          name: 'Ladder',
          notes: '<p>top</p>',
          sections: [
            {
              id: 'c3-s1',
              title: 'Lowest ebb',
              notes: '',
              prongs: [{ id: 'c3-s1-b', title: 'b. Silence', notes: prongNotes }],
            },
          ],
          ...extraDraft,
        },
      ],
      respondent: [{ id: 'respondent-main', name: 'Main', notes: '', sections: [] }],
    },
    activeDraftBySide: { petitioner: 'alt-q2-ladder', respondent: 'respondent-main' },
  }
}

const notesOf = (b) => b.draftsBySide.petitioner[0].sections[0].prongs[0].notes

const STALE_LONG = '<p>keith</p><p>Emergency Detention Act block that is much longer than the fix</p>'
const SERVER_FIX = '<p>keith</p>'

beforeEach(() => memory.clear())

describe('Arguments pull merge (fromRow)', () => {
  it('server wins when this browser has no merge base', () => {
    memory.set(spec.storageKey, JSON.stringify(boardWith(STALE_LONG)))
    const out = spec.fromRow(boardWith(SERVER_FIX))
    expect(notesOf(out)).toBe(SERVER_FIX)
  })

  it('a stale but unedited local copy loses to a shorter server edit', () => {
    memory.set(spec.storageKey, JSON.stringify(boardWith(STALE_LONG)))
    rememberArgumentsBase(boardWith(STALE_LONG))
    const out = spec.fromRow(boardWith(SERVER_FIX))
    expect(notesOf(out)).toBe(SERVER_FIX)
  })

  it('a real local edit since the base is kept', () => {
    rememberArgumentsBase(boardWith('<p>keith</p>'))
    memory.set(spec.storageKey, JSON.stringify(boardWith('<p>keith + my new line</p>')))
    const out = spec.fromRow(boardWith('<p>keith</p>'))
    expect(notesOf(out)).toBe('<p>keith + my new line</p>')
  })

  it('keeps the scratch field through normalize and merge', () => {
    rememberArgumentsBase(boardWith('<p>a</p>'))
    memory.set(
      spec.storageKey,
      JSON.stringify(boardWith('<p>a</p>', { scratch: '<p>loose thought</p>' }))
    )
    const out = spec.fromRow(boardWith('<p>a</p>'))
    expect(out.draftsBySide.petitioner[0].scratch).toBe('<p>loose thought</p>')
    expect(spec.toRow(out).draftsBySide.petitioner[0].scratch).toBe('<p>loose thought</p>')
  })

  it('forceRemote ignores local entirely', () => {
    rememberArgumentsBase(boardWith('<p>keith</p>'))
    memory.set(spec.storageKey, JSON.stringify(boardWith('<p>local edit</p>')))
    const out = spec.fromRow(boardWith(SERVER_FIX), { forceRemote: true })
    expect(notesOf(out)).toBe(SERVER_FIX)
  })
})

describe('hydrateWorkspaceDocFromRemote', () => {
  it('records the pulled row as the new merge base', () => {
    memory.set(spec.storageKey, JSON.stringify(boardWith('<p>old</p>')))
    hydrateWorkspaceDocFromRemote('arguments', boardWith('<p>new from server</p>'))
    expect(memory.has(ARGUMENTS_BASE_KEY)).toBe(true)
    expect(notesOf(readArgumentsBase())).toBe('<p>new from server</p>')
    expect(notesOf(JSON.parse(memory.get(spec.storageKey)))).toBe('<p>new from server</p>')
  })

  it('merges a pull into a still-debounced local save instead of overwriting either', () => {
    const published = []
    registerWorkspaceDocPublisher('arguments', (data) => published.push(data))
    const start = boardWith('<p>keith</p>')
    rememberArgumentsBase(start)
    memory.set(spec.storageKey, JSON.stringify(start))

    // User is mid-typing in the draft intro (save not flushed yet)...
    const typing = boardWith('<p>keith</p>')
    typing.draftsBySide.petitioner[0].notes = '<p>top + what I am typing</p>'
    saveWorkspaceDoc('arguments', typing)

    // ...when an MCP edit to the prong lands.
    hydrateWorkspaceDocFromRemote('arguments', boardWith('<p>keith + MCP line</p>'))

    const stored = JSON.parse(memory.get(spec.storageKey))
    expect(stored.draftsBySide.petitioner[0].notes).toBe('<p>top + what I am typing</p>')
    expect(notesOf(stored)).toBe('<p>keith + MCP line</p>')
    // The merged board (not the raw pending one) is what gets pushed.
    const last = published.at(-1)
    expect(notesOf(last)).toBe('<p>keith + MCP line</p>')
    expect(last.draftsBySide.petitioner[0].notes).toBe('<p>top + what I am typing</p>')
    registerWorkspaceDocPublisher('arguments', undefined)
  })
})
