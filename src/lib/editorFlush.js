/**
 * Pure rule for when a note editor may push its content on blur, tab hide,
 * page close or unmount (see NoteEditor).
 */

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
