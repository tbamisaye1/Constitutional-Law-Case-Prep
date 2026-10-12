import { describe, expect, it } from 'vitest'
import { mergePracticeLogs } from './argumentsMerge'

describe('mergePracticeLogs', () => {
  it('keeps entries from both sides and prefers the newer same id', () => {
    const base = [{ id: 'a', at: 1, side: 'petitioner', argued: 'old', feedback: '', from: '' }]
    const local = [
      { id: 'a', at: 3, side: 'petitioner', argued: 'local newer', feedback: 'f', from: '' },
      { id: 'b', at: 2, side: 'respondent', argued: 'only local', feedback: '', from: '' },
    ]
    const remote = [
      { id: 'a', at: 2, side: 'petitioner', argued: 'remote', feedback: '', from: '' },
      { id: 'c', at: 4, side: 'petitioner', argued: 'only remote', feedback: '', from: 'coach' },
    ]
    const out = mergePracticeLogs(base, local, remote)
    expect(out.map((e) => e.id)).toEqual(['c', 'a', 'b'])
    expect(out.find((e) => e.id === 'a').argued).toBe('local newer')
  })
})
