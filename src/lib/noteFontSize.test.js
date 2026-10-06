import { describe, expect, it, vi } from 'vitest'
import {
  applyFontSizeToAll,
  applyFontSizeToSelection,
  currentFontSize,
} from './noteFontSize'

function mockEditor({ empty = true, fontSize = '', docSize = 40 } = {}) {
  const run = vi.fn(() => true)
  const chainApi = {
    focus: () => chainApi,
    setTextSelection: vi.fn(() => chainApi),
    setFontSize: vi.fn(() => chainApi),
    unsetFontSize: vi.fn(() => chainApi),
    run,
  }
  return {
    isDestroyed: false,
    state: {
      selection: {
        empty,
        $from: {
          parent: { isTextblock: true },
          start: () => 2,
          end: () => 10,
        },
      },
      doc: { content: { size: docSize } },
    },
    getAttributes: () => ({ fontSize }),
    chain: () => chainApi,
    _chain: chainApi,
  }
}

describe('applyFontSizeToSelection', () => {
  it('expands a collapsed caret to the current textblock then sets size', () => {
    const editor = mockEditor({ empty: true })
    expect(applyFontSizeToSelection(editor, '20px')).toBe(true)
    expect(editor._chain.setTextSelection).toHaveBeenCalledWith({ from: 2, to: 10 })
    expect(editor._chain.setFontSize).toHaveBeenCalledWith('20px')
  })

  it('unsets size for Default', () => {
    const editor = mockEditor({ empty: false })
    applyFontSizeToSelection(editor, '')
    expect(editor._chain.unsetFontSize).toHaveBeenCalled()
  })
})

describe('applyFontSizeToAll', () => {
  it('selects the whole document then sets size', () => {
    const editor = mockEditor({ docSize: 55 })
    expect(applyFontSizeToAll(editor, '13px')).toBe(true)
    expect(editor._chain.setTextSelection).toHaveBeenCalledWith({ from: 1, to: 55 })
    expect(editor._chain.setFontSize).toHaveBeenCalledWith('13px')
  })
})

describe('currentFontSize', () => {
  it('reads the textStyle mark', () => {
    expect(currentFontSize(mockEditor({ fontSize: '24px' }))).toBe('24px')
    expect(currentFontSize(mockEditor({ fontSize: '' }))).toBe('')
  })
})
