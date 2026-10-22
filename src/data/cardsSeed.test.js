import { describe, expect, it } from 'vitest'
import {
  LEGACY_SEED_CARD_IDS,
  mergeSeedCards,
  SEED_CARDS,
} from './cardsSeed'

describe('mergeSeedCards', () => {
  it('returns a full seed deck for empty or missing boards', () => {
    expect(mergeSeedCards([])).toHaveLength(SEED_CARDS.length)
    expect(mergeSeedCards(null)).toHaveLength(SEED_CARDS.length)
  })

  it('replaces legacy seed cards with the learning rewrite', () => {
    const legacy = LEGACY_SEED_CARD_IDS.map((id) => ({
      id,
      kind: 'case_ref',
      side: 'either',
      label: 'old',
      front: 'Cite the pin?',
      back: 'old',
      tags: [],
    }))
    const merged = mergeSeedCards(legacy)
    for (const id of LEGACY_SEED_CARD_IDS) {
      expect(merged.some((c) => c.id === id)).toBe(false)
    }
    expect(merged.some((c) => c.id === 'c-which-carpenter-csli')).toBe(true)
    expect(merged.some((c) => c.id === 'c-facts-costanzo')).toBe(true)
    expect(merged.some((c) => c.id === 'c-inst-ndaa-1022-page')).toBe(true)
    expect(merged).toHaveLength(SEED_CARDS.length)
  })

  it('keeps user-authored cards and refreshes seed ids', () => {
    const custom = {
      id: 'c-my-custom',
      kind: 'judge_qa',
      side: 'petitioner',
      label: 'Mine',
      front: 'Custom prompt',
      back: 'Custom answer',
      tags: [],
    }
    const staleSeed = {
      ...SEED_CARDS[0],
      front: 'Stale question that should be overwritten',
    }
    const merged = mergeSeedCards([custom, staleSeed])
    expect(merged.find((c) => c.id === 'c-my-custom')?.front).toBe('Custom prompt')
    expect(merged.find((c) => c.id === SEED_CARDS[0].id)?.front).toBe(SEED_CARDS[0].front)
    expect(merged).toHaveLength(SEED_CARDS.length + 1)
  })

  it('covers every library case with facts/holding/reasoning and Instant page drills', () => {
    expect(SEED_CARDS.length).toBeGreaterThan(100)
    expect(SEED_CARDS.some((c) => c.id === 'c-facts-banyee')).toBe(true)
    expect(SEED_CARDS.some((c) => c.id === 'c-why-costanzo')).toBe(true)
    expect(SEED_CARDS.some((c) => c.id === 'c-use-hamdi')).toBe(true)
    const instant = SEED_CARDS.filter((c) => c.kind === 'instant')
    expect(instant.length).toBeGreaterThan(30)
    expect(instant.some((c) => /1022/i.test(c.front) || /1022/i.test(c.back))).toBe(true)
    expect(instant.some((c) => /fentanyl|dirty-bomb/i.test(c.front + c.back))).toBe(true)
    expect(SEED_CARDS.filter((c) => c.kind !== 'instant').every((c) => !/\bon what page\b/i.test(c.front))).toBe(
      true
    )
  })

  it('pulls Case Summaries sheet quotes and side-use notes', () => {
    expect(SEED_CARDS.some((c) => c.id === 'c-sheet-said-milligan-1')).toBe(true)
    expect(SEED_CARDS.some((c) => c.id === 'c-sheet-brief-what-costanzo')).toBe(true)
    expect(SEED_CARDS.some((c) => c.id === 'c-sheet-q-prize-cases')).toBe(true)
    expect(SEED_CARDS.some((c) => c.tags?.includes('bank'))).toBe(true)
    // Sheet facts should win over thinner guide text for Costanzo.
    const costanzo = SEED_CARDS.find((c) => c.id === 'c-facts-costanzo')
    expect(costanzo?.back?.toLowerCase()).toContain('section 19')
  })
})