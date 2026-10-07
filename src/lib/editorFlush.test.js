import { describe, expect, it } from 'vitest'
import { hasUnsentEdits } from './editorFlush'

describe('hasUnsentEdits', () => {
  it('never sends from an editor the user has not typed in (stale copy)', () => {
    // Scratch pane still showing an empty copy while the server has notes.
    expect(hasUnsentEdits('<p></p>', null, '<p>restored notes</p>')).toBe(false)
  })

  it('does not resend what was already sent', () => {
    expect(hasUnsentEdits('<p>typed</p>', '<p>typed</p>', '<p>newer from server</p>')).toBe(false)
  })

  it('sends typed text the parent has not received', () => {
    expect(hasUnsentEdits('<p>typed more</p>', '<p>typed</p>', '<p>typed</p>')).toBe(true)
  })

  it('skips when the parent already holds the same text', () => {
    expect(hasUnsentEdits('<p>x</p>', '<p>y</p>', '<p>x</p>')).toBe(false)
  })
})
