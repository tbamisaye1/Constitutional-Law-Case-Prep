/**
 * Ask AI conversation memory (browser session).
 * Prior turns are sent with each /chat call so follow-ups stay in context.
 */

export const ASK_AI_MEMORY_KEY = 'case-prep-ask-ai-memory'
/** Soft cap: drop oldest turns after this many messages (user + assistant). */
export const ASK_AI_MEMORY_MAX_TURNS = 12
/** Warn the user once memory reaches this many turns. */
export const ASK_AI_MEMORY_WARN_TURNS = 8

/**
 * @typedef {{ role: 'user' | 'assistant', content: string, at?: number }} AskAiTurn
 */

export function readAskAiMemory() {
  try {
    const raw = sessionStorage.getItem(ASK_AI_MEMORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (t) =>
          t &&
          (t.role === 'user' || t.role === 'assistant') &&
          typeof t.content === 'string' &&
          t.content.trim()
      )
      .map((t) => ({
        role: t.role,
        content: t.content.trim(),
        at: typeof t.at === 'number' ? t.at : Date.now(),
      }))
  } catch {
    return []
  }
}

export function writeAskAiMemory(turns) {
  try {
    sessionStorage.setItem(ASK_AI_MEMORY_KEY, JSON.stringify(turns || []))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAskAiMemoryStore() {
  try {
    sessionStorage.removeItem(ASK_AI_MEMORY_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Append a turn and trim to the soft cap (drop oldest first).
 * @param {AskAiTurn[]} prev
 * @param {AskAiTurn} turn
 */
export function appendAskAiTurn(prev, turn) {
  const next = [
    ...(prev || []),
    {
      role: turn.role,
      content: String(turn.content || '').trim(),
      at: turn.at || Date.now(),
    },
  ].filter((t) => t.content && (t.role === 'user' || t.role === 'assistant'))
  if (next.length <= ASK_AI_MEMORY_MAX_TURNS) return next
  return next.slice(next.length - ASK_AI_MEMORY_MAX_TURNS)
}

export function memoryIsNearFull(turns) {
  return (turns?.length || 0) >= ASK_AI_MEMORY_WARN_TURNS
}

export function memoryIsFull(turns) {
  return (turns?.length || 0) >= ASK_AI_MEMORY_MAX_TURNS
}
