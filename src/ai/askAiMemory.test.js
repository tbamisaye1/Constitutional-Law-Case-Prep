import { describe, expect, it } from 'vitest'
import {
  ASK_AI_MEMORY_MAX_TURNS,
  appendAskAiTurn,
  memoryIsNearFull,
} from './askAiMemory'

describe('askAiMemory', () => {
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
})
