/**
 * localStorage helpers that never throw into React (quota / private mode).
 * Flush on hide so a refresh does not beat an in-flight debounce.
 *
 * When the ~5MB quota is hit, free recoverable caches (rolling doc backups,
 * merge leftovers) and retry. The workspace database is still the source of
 * truth — localStorage is only a fast cache.
 */

/** Keys safe to drop when Chrome refuses another write. */
export const EVICTABLE_LOCAL_KEYS = [
  'case-prep-doc-revisions-v1',
  'case-prep-merge-backup-v1',
  'case-prep-ask-ai-memory',
  'case-prep-ask-ai-last-view',
]

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch (error) {
    console.error(`Could not save ${key}`, error)
    return { ok: false, error }
  }
}

/**
 * Drop or shrink local-only caches so a QuotaExceededError can clear.
 * Never removes the live Arguments / notebook / library keys.
 * @returns {string[]} What was cleared (for logs / tests).
 */
export function freeLocalStorageSpace() {
  const freed = []
  if (typeof localStorage === 'undefined') return freed

  // Prefer trimming revision history before deleting it entirely.
  try {
    const raw = localStorage.getItem('case-prep-doc-revisions-v1')
    if (raw) {
      const parsed = JSON.parse(raw)
      const byKind = parsed?.byKind && typeof parsed.byKind === 'object' ? parsed.byKind : null
      if (byKind) {
        const slim = { byKind: {} }
        for (const [kind, list] of Object.entries(byKind)) {
          if (Array.isArray(list) && list.length) slim.byKind[kind] = list.slice(0, 1)
        }
        try {
          localStorage.setItem('case-prep-doc-revisions-v1', JSON.stringify(slim))
          freed.push('doc-revisions-trim')
        } catch {
          localStorage.removeItem('case-prep-doc-revisions-v1')
          freed.push('case-prep-doc-revisions-v1')
        }
      }
    }
  } catch {
    try {
      localStorage.removeItem('case-prep-doc-revisions-v1')
      freed.push('case-prep-doc-revisions-v1')
    } catch {
      /* ignore */
    }
  }

  for (const key of EVICTABLE_LOCAL_KEYS) {
    if (key === 'case-prep-doc-revisions-v1' && freed.includes('doc-revisions-trim')) continue
    try {
      if (localStorage.getItem(key) != null) {
        localStorage.removeItem(key)
        if (!freed.includes(key)) freed.push(key)
      }
    } catch {
      /* ignore */
    }
  }
  return freed
}

/**
 * Write JSON; on QuotaExceeded, free recoverable caches and retry once.
 * Callers should treat `{ ok: true, recovered: true }` as success (no banner).
 */
export function writeJsonResilient(key, value) {
  const first = writeJson(key, value)
  if (first.ok) return first
  if (first.error?.name !== 'QuotaExceededError') return first
  freeLocalStorageSpace()
  const second = writeJson(key, value)
  if (second.ok) return { ok: true, recovered: true }
  return second
}

export function onPageHide(flush) {
  const hide = () => {
    if (document.visibilityState === 'hidden') flush()
  }
  window.addEventListener('beforeunload', flush)
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', hide)
  return () => {
    window.removeEventListener('beforeunload', flush)
    window.removeEventListener('pagehide', flush)
    document.removeEventListener('visibilitychange', hide)
  }
}
