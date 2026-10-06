import { describe, expect, it } from 'vitest'
import { groupMemoryExchanges } from './AiSelectionBubble'

describe('groupMemoryExchanges', () => {
  it('pairs You → Ask AI into one exchange', () => {
    const turns = [
      { role: 'user', content: 'Q1', at: 1 },
      { role: 'assistant', content: 'A1', at: 2 },
      { role: 'user', content: 'Q2', at: 3 },
      { role: 'assistant', content: 'A2', at: 4 },
    ]
    const groups = groupMemoryExchanges(turns, 10)
    expect(groups).toHaveLength(2)
    expect(groups[0].turns.map((t) => t.turn.content)).toEqual(['Q1', 'A1'])
    expect(groups[0].turns.map((t) => t.index)).toEqual([10, 11])
    expect(groups[1].turns.map((t) => t.index)).toEqual([12, 13])
  })

  it('keeps an orphan assistant as its own exchange', () => {
    const groups = groupMemoryExchanges([{ role: 'assistant', content: 'alone', at: 9 }], 0)
    expect(groups).toHaveLength(1)
    expect(groups[0].turns).toHaveLength(1)
    expect(groups[0].turns[0].index).toBe(0)
  })
})
