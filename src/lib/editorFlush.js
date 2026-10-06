/**
 * Editors flush their last HTML on unmount / blur so a fast navigation does not
 * drop keystrokes. During "Reload from database" that flush would write the
 * stale in-memory document straight back over the fresh pull, so the reload
 * holds this gate shut until the remounted editors are up.
 */
let suppressedUntil = 0

export function suppressEditorFlush(ms = 1500) {
  suppressedUntil = Date.now() + ms
}

export function editorFlushSuppressed() {
  return Date.now() < suppressedUntil
}
