/**
 * localStorage helpers that never throw into React (quota / private mode).
 * Flush on hide so a refresh does not beat an in-flight debounce.
 */

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
