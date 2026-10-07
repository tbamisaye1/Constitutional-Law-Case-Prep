/**
 * Recognise the page editor's own saves when sync hands them back.
 *
 * The editor saves every ~300ms while the user types. A sync that lands
 * mid-sentence can return an OLDER save of this same editor. Merging that as
 * if it were someone else's edit reverted the user's newest text. Keeping the
 * content keys of the last few saves lets the editor ignore those echoes.
 */

export const SENT_HISTORY = 30

/** New list with `key` added, newest last, capped at SENT_HISTORY. */
export function rememberSent(list, key) {
  const next = (list || []).filter((k) => k !== key)
  next.push(key)
  return next.length > SENT_HISTORY ? next.slice(next.length - SENT_HISTORY) : next
}

/** True when `key` is one of this editor's own recent saves. */
export function isOwnEcho(list, key) {
  return (list || []).includes(key)
}
