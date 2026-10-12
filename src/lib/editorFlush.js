/**
 * Editors flush their last HTML on unmount / blur so a fast navigation does not
 * drop keystrokes. During "Reload from database" that flush would write the
 * stale in-memory document straight back over the fresh pull, so the reload
 * holds this gate shut until the remounted editors are up.
 */
let suppressedUntil = 0

/**
 * Window event for "Sync now": every open editor hands its unsaved text to the
 * store immediately, the same as it does on blur or pagehide.
 */
export const FLUSH_EDITORS_EVENT = 'case-prep-flush-editors'

export function suppressEditorFlush(ms = 1500) {
  suppressedUntil = Date.now() + ms
}

export function editorFlushSuppressed() {
  return Date.now() < suppressedUntil
}

/** TipTap empty doc / whitespace-only HTML. */
export function isBlankNoteHtml(html) {
  if (typeof html !== 'string') return true
  return !html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * True when the editor holds text the user typed that the parent has not
 * received: it differs from what was last sent AND from what the parent
 * currently holds. An editor that was never typed in has nothing to send.
 */
export function hasUnsentEdits(current, lastSentHtml, parentHtml) {
  if (lastSentHtml == null) return false
  if (current === lastSentHtml) return false
  return current !== (parentHtml ?? '')
}

/**
 * onUpdate already called onChange (lastSent === current), but React has not
 * re-rendered with the new html prop yet — parent is still blank. Blur /
 * tab-hide used to treat that as "in sync" and applyIncoming(''), wiping the
 * paste. Ctrl+Z brought TipTap history back until the next click did it again.
 *
 * A non-blank different parent is a real sync update, not lag.
 */
export function parentStillBehind(current, lastSentHtml, parentHtml) {
  if (lastSentHtml == null) return false
  if (current !== lastSentHtml) return false
  if (current === (parentHtml ?? '')) return false
  return isBlankNoteHtml(parentHtml)
}

/**
 * Blur / tab-hide / Sync-now: push the editor when the parent is behind, and
 * only then apply a newer parent. Never blank out non-empty scratch on flush.
 */
export function flushEditorDecision(current, lastSentHtml, parentHtml) {
  const parent = parentHtml ?? ''
  if (hasUnsentEdits(current, lastSentHtml, parent) || parentStillBehind(current, lastSentHtml, parent)) {
    return 'push'
  }
  // Typed text that never marked lastSent (rare skipped onUpdate): still save.
  if (!isBlankNoteHtml(current) && isBlankNoteHtml(parent)) {
    return 'push'
  }
  if (current === parent) return 'noop'
  return 'apply'
}
