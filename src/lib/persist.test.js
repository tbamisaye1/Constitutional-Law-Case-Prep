import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EVICTABLE_LOCAL_KEYS,
  freeLocalStorageSpace,
  writeJson,
  writeJsonResilient,
} from './persist'

function memoryStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(String(k), String(v))
    },
    removeItem: (k) => {
      map.delete(k)
    },
    _map: map,
  }
}

describe('freeLocalStorageSpace', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })

  it('trims doc revisions and drops other evictable keys', () => {
    localStorage.setItem(
      'case-prep-doc-revisions-v1',
      JSON.stringify({
        byKind: {
          arguments: [
            { at: 1, serialized: '{"a":1}' },
            { at: 2, serialized: '{"a":2}' },
            { at: 3, serialized: '{"a":3}' },
          ],
        },
      })
    )
    localStorage.setItem('case-prep-merge-backup-v1', '{"x":1}')
    localStorage.setItem('case-prep-ask-ai-memory', '[]')
    localStorage.setItem('case-prep-arguments-v1', '{"keep":true}')

    const freed = freeLocalStorageSpace()
    expect(freed).toContain('doc-revisions-trim')
    expect(freed).toContain('case-prep-merge-backup-v1')
    expect(JSON.parse(localStorage.getItem('case-prep-doc-revisions-v1')).byKind.arguments).toHaveLength(
      1
    )
    expect(localStorage.getItem('case-prep-merge-backup-v1')).toBeNull()
    expect(localStorage.getItem('case-prep-arguments-v1')).toBe('{"keep":true}')
    expect(EVICTABLE_LOCAL_KEYS.length).toBeGreaterThan(0)
  })
})

describe('writeJsonResilient', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })

  it('writes on the first try when there is room', () => {
    expect(writeJsonResilient('k', { ok: 1 })).toEqual({ ok: true })
    expect(JSON.parse(localStorage.getItem('k'))).toEqual({ ok: 1 })
  })

  it('frees caches and retries after QuotaExceededError', () => {
    localStorage.setItem('case-prep-merge-backup-v1', 'x'.repeat(100))
    const store = localStorage
    let calls = 0
    store.setItem = (k, v) => {
      calls += 1
      if (calls === 1 && k === 'target') {
        const err = new Error('quota')
        err.name = 'QuotaExceededError'
        throw err
      }
      store._map.set(String(k), String(v))
    }

    const result = writeJsonResilient('target', { saved: true })
    expect(result.ok).toBe(true)
    expect(result.recovered).toBe(true)
    expect(localStorage.getItem('case-prep-merge-backup-v1')).toBeNull()
    expect(JSON.parse(localStorage.getItem('target'))).toEqual({ saved: true })
  })

  it('writeJson still reports failure without retry', () => {
    localStorage.setItem = () => {
      const err = new Error('quota')
      err.name = 'QuotaExceededError'
      throw err
    }
    const result = writeJson('k', { a: 1 })
    expect(result.ok).toBe(false)
    expect(result.error?.name).toBe('QuotaExceededError')
  })
})
