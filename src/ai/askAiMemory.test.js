import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ASK_AI_MEMORY_MAX_TURNS,
  appendAskAiTurn,
  clearAskAiLastView,
  clearAskAiMemoryStore,
  lastViewFromMemory,
  memoryIsNearFull,
  readAskAiLastView,
  resolveAskAiLastView,
  writeAskAiLastView,
} from './askAiMemory'

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
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: storage,
    configurable: true,
    writable: true,
  })
  return storage
}

describe('askAiMemory', () => {
  beforeEach(() => {
    installMemoryStorage()
  })

  afterEach(() => {
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

    expect(resolveAskAiLastView(turns).reply.text).toContain('enemy combatant')
  })
})
