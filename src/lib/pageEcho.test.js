import { describe, expect, it } from 'vitest'
import { SENT_HISTORY, isOwnEcho, rememberSent } from './pageEcho'

describe('page echo guard', () => {
  it('recognises an older save of this editor coming back', () => {
    let sent = []
    sent = rememberSent(sent, 'v1')
    sent = rememberSent(sent, 'v2')
    expect(isOwnEcho(sent, 'v1')).toBe(true)
    expect(isOwnEcho(sent, 'someone-else')).toBe(false)
  })

  it('keeps a bounded history', () => {
    let sent = []
    for (let i = 0; i < SENT_HISTORY + 5; i += 1) sent = rememberSent(sent, `v${i}`)
    expect(sent).toHaveLength(SENT_HISTORY)
    expect(isOwnEcho(sent, 'v0')).toBe(false)
  })
})
