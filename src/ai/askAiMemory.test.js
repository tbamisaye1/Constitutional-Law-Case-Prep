import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ASK_AI_MEMORY_MAX_TURNS,
  appendAskAiTurn,
  clearAskAiLastView,
  clearAskAiMemoryStore,
  lastViewFromMemory,
  memoryIsNearFull,
  readAskAiLastView,
  readAskAiMemory,
  resolveAskAiLastView,
  writeAskAiLastView,
  writeAskAiMemory,
} from './askAiMemory'

function makeStorage() {
  const map = new Map()
  return {
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
}

function installMemoryStorage() {
  const local = makeStorage()
  const session = makeStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    value: local,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: session,
    configurable: true,
    writable: true,
  })
  return { local, session }
}

describe('askAiMemory', () => {
  beforeEach(() => {
    installMemoryStorage()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
    Reflect.deleteProperty(globalThis, 'sessionStorage')
  })

  it('appends turns and trims to the soft cap', () => {
    let turns = []
    for (let i = 0; i < ASK_AI_MEMORY_MAX_TURNS + 3; i += 1) {
      turns = appendAskAiTurn(turns, {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `msg-${i}`,
      })
    }
    expect(turns).toHaveLength(ASK_AI_MEMORY_MAX_TURNS)
    expect(turns[0].content).toBe('msg-3')
    expect(turns.at(-1).content).toBe(`msg-${ASK_AI_MEMORY_MAX_TURNS + 2}`)
  })

  it('flags near-full memory', () => {
    expect(memoryIsNearFull([])).toBe(false)
    expect(memoryIsNearFull(Array.from({ length: 8 }, () => ({ role: 'user', content: 'x' })))).toBe(
      true
    )
  })

  it('persists the last on-screen reply for close → reopen', () => {
    writeAskAiLastView('What is Hamdi?', {
      grounding_status: 'grounded',
      text: 'Hamdi concerned detention of a U.S. citizen.',
      evidence: [{ id: 'e1', source: 'Hamdi' }],
    })
    const saved = readAskAiLastView()
    expect(saved.prompt).toBe('What is Hamdi?')
    expect(saved.reply.text).toContain('detention')
    expect(saved.reply.evidence).toHaveLength(1)

    clearAskAiLastView()
    expect(readAskAiLastView()).toBeNull()
  })

  it('clears the last view when chat memory is cleared', () => {
    writeAskAiLastView('Q', { text: 'A', grounding_status: 'grounded' })
    clearAskAiMemoryStore()
    expect(readAskAiLastView()).toBeNull()
  })

  it('rebuilds the last Q + full answer from memory turns', () => {
    const turns = [
      { role: 'user', content: 'What is Hamdi?' },
      {
        role: 'assistant',
        content:
          'Short rundown (direct answer first) - Facts: Yaser Hamdi, a U.S. citizen captured in Afghanistan in 2001, was designated an enemy combatant.',
      },
    ]
    const view = lastViewFromMemory(turns)
    expect(view.prompt).toBe('What is Hamdi?')
    expect(view.reply.text).toContain('enemy combatant')
    expect(view.reply.restored_from_memory).toBe(true)
    expect(view.reply.evidence).toEqual([])

    expect(resolveAskAiLastView(turns).reply.text).toContain('enemy combatant')
  })

  it('restores evidence when reopening a past assistant turn', () => {
    const turns = appendAskAiTurn(
      appendAskAiTurn([], { role: 'user', content: 'What did Keith hold?' }),
      {
        role: 'assistant',
        content: 'Keith treated the disclaimer as not a grant of power.',
        reply: {
          grounding_status: 'grounded',
          grounding_source: 'documents',
          text: 'Keith treated the disclaimer as not a grant of power.',
          grounding_notes: 'Matched 1 note/annotation chunk(s) in this browser.',
          evidence: [
            {
              id: 'note-local-0',
              source: 'Keith (Annotation · p.12)',
              page: 12,
              source_type: 'annotation',
              preview: 'disclaimer is not a grant',
              notes_path: '/library?case=keith&page=12',
            },
            {
              id: 'e2',
              source: 'United_States_v_US_District_Court.pdf',
              page: 4,
              source_type: 'corpus',
              preview: 'merely a disclaimer of congressional intent',
            },
          ],
          claims_verified: 2,
          claims_total: 2,
          notes_used: 1,
        },
      }
    )
    writeAskAiMemory(turns)
    const stored = readAskAiMemory()
    expect(stored[1].reply.evidence).toHaveLength(2)

    const view = lastViewFromMemory(stored, 1)
    expect(view.prompt).toBe('What did Keith hold?')
    expect(view.reply.evidence.map((e) => e.source)).toEqual([
      'Keith (Annotation · p.12)',
      'United_States_v_US_District_Court.pdf',
    ])
    expect(view.reply.evidence[0].notes_path).toContain('keith')
    expect(view.reply.claims_verified).toBe(2)
    expect(view.reply.grounding_notes).toContain('Matched 1')
  })

  it('migrates sessionStorage memory into localStorage', () => {
    const { local, session } = installMemoryStorage()
    session.setItem(
      'case-prep-ask-ai-memory',
      JSON.stringify([{ role: 'user', content: 'old tab Q' }, { role: 'assistant', content: 'old tab A' }])
    )
    const turns = readAskAiMemory()
    expect(turns).toHaveLength(2)
    expect(turns[1].content).toBe('old tab A')
    expect(local.getItem('case-prep-ask-ai-memory')).toContain('old tab A')
    expect(session.getItem('case-prep-ask-ai-memory')).toBeNull()
  })
})
