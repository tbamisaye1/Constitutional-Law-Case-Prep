import { describe, expect, it } from 'vitest'
import {
  flushEditorDecision,
  hasUnsentEdits,
  isBlankNoteHtml,
  parentStillBehind,
} from './editorFlush'

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

describe('parentStillBehind', () => {
  it('is true right after onUpdate, before React re-renders the html prop', () => {
    // Paste → onChange scheduled → blur/tab before setState lands.
    expect(parentStillBehind('<p>pasted</p>', '<p>pasted</p>', '')).toBe(true)
    expect(parentStillBehind('<p>pasted</p>', '<p>pasted</p>', '<p></p>')).toBe(true)
  })

  it('is false once the parent caught up', () => {
    expect(parentStillBehind('<p>pasted</p>', '<p>pasted</p>', '<p>pasted</p>')).toBe(false)
  })

  it('is false when a non-blank parent differs (real sync, not lag)', () => {
    expect(
      parentStillBehind('<p>typed</p>', '<p>typed</p>', '<p>from another device</p>')
    ).toBe(false)
  })

  it('is false when the user has not typed in this editor', () => {
    expect(parentStillBehind('<p></p>', null, '<p>restored</p>')).toBe(false)
  })
})

describe('flushEditorDecision', () => {
  it('pushes again instead of applying a stale empty parent (scratch wipe bug)', () => {
    // This is the Arguments scratch failure mode: paste, click away or change
    // tab, applyIncoming('') wiped the doc; Ctrl+Z brought TipTap history back.
    expect(flushEditorDecision('<p>pasted notes</p>', '<p>pasted notes</p>', '')).toBe('push')
    expect(flushEditorDecision('<p>pasted notes</p>', '<p>pasted notes</p>', '<p></p>')).toBe(
      'push'
    )
  })

  it('applies a real newer parent after the editor sent its current text', () => {
    expect(
      flushEditorDecision('<p>typed</p>', '<p>typed</p>', '<p>from another device</p>')
    ).toBe('apply')
  })

  it('does not blank out non-empty scratch when lastSent is still null', () => {
    expect(flushEditorDecision('<p>still here</p>', null, '')).toBe('push')
    expect(flushEditorDecision('<p>still here</p>', null, '<p></p>')).toBe('push')
  })

  it('is a no-op when already in sync', () => {
    expect(flushEditorDecision('<p>x</p>', '<p>x</p>', '<p>x</p>')).toBe('noop')
  })

  it('applies restored parent notes into an empty editor the user never typed in', () => {
    expect(flushEditorDecision('<p></p>', null, '<p>restored notes</p>')).toBe('apply')
  })
})

describe('isBlankNoteHtml', () => {
  it('treats empty TipTap docs as blank', () => {
    expect(isBlankNoteHtml('')).toBe(true)
    expect(isBlankNoteHtml('<p></p>')).toBe(true)
    expect(isBlankNoteHtml('<p><br></p>')).toBe(true)
    expect(isBlankNoteHtml('<p>hi</p>')).toBe(false)
  })
})
