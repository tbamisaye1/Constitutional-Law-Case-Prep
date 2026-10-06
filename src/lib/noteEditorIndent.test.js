import { describe, expect, it, vi } from 'vitest'
import {
  indentSelection,
  outdentSelection,
  toggleOrCycleOrderedList,
} from './noteEditorIndent'

function mockEditor({
  canSink = false,
  canLift = false,
  inOrdered = false,
  orderedType = null,
  indentOk = true,
  outdentOk = true,
} = {}) {
  const run = vi.fn((..._args) => {
    // Last chained command decides the result via closures below.
    return run._result
  })
  run._result = true

  const chainApi = {
    focus: () => chainApi,
    sinkListItem: vi.fn(() => {
      run._result = true
      return chainApi
    }),
    liftListItem: vi.fn(() => {
      run._result = true
      return chainApi
    }),
    toggleOrderedList: vi.fn(() => {
      run._result = true
      return chainApi
    }),
    updateAttributes: vi.fn(() => {
      run._result = true
      return chainApi
    }),
    indentBlocks: vi.fn(() => {
      run._result = indentOk
      return chainApi
    }),
    outdentBlocks: vi.fn(() => {
      run._result = outdentOk
      return chainApi
    }),
    run,
  }

  return {
    isDestroyed: false,
    can: () => ({
      sinkListItem: () => canSink,
      liftListItem: () => canLift,
    }),
    isActive: (name) => name === 'orderedList' && inOrdered,
    getAttributes: () => ({ type: orderedType }),
    chain: () => chainApi,
    _chain: chainApi,
  }
}

describe('indentSelection', () => {
  it('nests a list item when sink is available', () => {
    const editor = mockEditor({ canSink: true })
    expect(indentSelection(editor)).toBe(true)
    expect(editor._chain.sinkListItem).toHaveBeenCalledWith('listItem')
  })

  it('indents the paragraph when sink is not available', () => {
    const editor = mockEditor({ canSink: false, indentOk: true })
    expect(indentSelection(editor)).toBe(true)
    expect(editor._chain.indentBlocks).toHaveBeenCalled()
  })

  it('returns false at the indent bound', () => {
    const editor = mockEditor({ canSink: false, indentOk: false })
    expect(indentSelection(editor)).toBe(false)
  })
})

describe('outdentSelection', () => {
  it('lifts a nested list item when possible', () => {
    const editor = mockEditor({ canLift: true })
    expect(outdentSelection(editor)).toBe(true)
    expect(editor._chain.liftListItem).toHaveBeenCalledWith('listItem')
  })

  it('outdents the block when lift is unavailable', () => {
    const editor = mockEditor({ canLift: false, outdentOk: true })
    expect(outdentSelection(editor)).toBe(true)
    expect(editor._chain.outdentBlocks).toHaveBeenCalled()
  })
})

describe('toggleOrCycleOrderedList', () => {
  it('starts an ordered list when not already in one', () => {
    const editor = mockEditor({ inOrdered: false })
    expect(toggleOrCycleOrderedList(editor)).toBe(true)
    expect(editor._chain.toggleOrderedList).toHaveBeenCalled()
  })

  it('cycles 1 → a → i → 1 while inside an ordered list', () => {
    const first = mockEditor({ inOrdered: true, orderedType: null })
    toggleOrCycleOrderedList(first)
    expect(first._chain.updateAttributes).toHaveBeenCalledWith('orderedList', { type: 'a' })

    const second = mockEditor({ inOrdered: true, orderedType: 'a' })
    toggleOrCycleOrderedList(second)
    expect(second._chain.updateAttributes).toHaveBeenCalledWith('orderedList', { type: 'i' })

    const third = mockEditor({ inOrdered: true, orderedType: 'i' })
    toggleOrCycleOrderedList(third)
    expect(third._chain.updateAttributes).toHaveBeenCalledWith('orderedList', { type: null })
  })
})
