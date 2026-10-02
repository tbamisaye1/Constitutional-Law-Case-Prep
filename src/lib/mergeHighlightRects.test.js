import { describe, expect, it } from 'vitest'
import { mergeHighlightRects } from './mergeHighlightRects'

describe('mergeHighlightRects', () => {
  it('merges same-line fragments into one band', () => {
    const merged = mergeHighlightRects([
      { top: 0.1, left: 0.1, width: 0.05, height: 0.02 },
      { top: 0.101, left: 0.16, width: 0.08, height: 0.02 },
      { top: 0.102, left: 0.25, width: 0.1, height: 0.019 },
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].left).toBeCloseTo(0.1)
    expect(merged[0].width).toBeCloseTo(0.25)
  })

  it('keeps separate lines separate', () => {
    const merged = mergeHighlightRects([
      { top: 0.1, left: 0.1, width: 0.4, height: 0.02 },
      { top: 0.14, left: 0.1, width: 0.35, height: 0.02 },
    ])
    expect(merged).toHaveLength(2)
  })

  it('drops crumb-sized rects', () => {
    const merged = mergeHighlightRects([
      { top: 0.1, left: 0.1, width: 0.0005, height: 0.02 },
      { top: 0.1, left: 0.2, width: 0.3, height: 0.02 },
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].left).toBeCloseTo(0.2)
  })
})
