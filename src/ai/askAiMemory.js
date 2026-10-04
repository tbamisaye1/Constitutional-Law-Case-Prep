/**
 * Ask AI conversation memory (browser session).
 * Prior turns are sent with each /chat call so follow-ups stay in context.
 */

export const ASK_AI_MEMORY_KEY = 'case-prep-ask-ai-memory'
/** Last on-screen Q + reply so closing Ask AI does not wipe what you were reading. */
export const ASK_AI_LAST_VIEW_KEY = 'case-prep-ask-ai-last-view'
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
    sessionStorage.removeItem(ASK_AI_LAST_VIEW_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Persist the visible Ask AI answer so close → reopen shows the same Q + reply.
 * Cleared with memory, or when the user starts a new question.
 *
 * @returns {{ prompt: string, reply: object } | null}
 */
export function readAskAiLastView() {
  try {
    const raw = sessionStorage.getItem(ASK_AI_LAST_VIEW_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const prompt = typeof parsed.prompt === 'string' ? parsed.prompt : ''
    const reply = parsed.reply && typeof parsed.reply === 'object' ? parsed.reply : null
    if (!reply || typeof reply.text !== 'string' || !reply.text.trim()) return null
    return { prompt, reply }
  } catch {
    return null
  }
}

export function writeAskAiLastView(prompt, reply) {
  try {
    if (!reply || typeof reply.text !== 'string' || !reply.text.trim()) {
      sessionStorage.removeItem(ASK_AI_LAST_VIEW_KEY)
      return
    }
    sessionStorage.setItem(
      ASK_AI_LAST_VIEW_KEY,
      JSON.stringify({
        prompt: typeof prompt === 'string' ? prompt : '',
        reply,
      })
    )
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAskAiLastView() {
  try {
    sessionStorage.removeItem(ASK_AI_LAST_VIEW_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Rebuild a viewable Q + reply from chat memory when the rich last-view was
 * never saved (answers from before that feature, or a wiped reply state).
 *
 * Evidence / grounding badges are not in memory, so this restores the full
 * answer text and the matching user question.
 *
 * @param {AskAiTurn[]} turns
 * @param {number} [atIndex] Index of the assistant turn to restore. Defaults
 *   to the latest assistant message.
 * @returns {{ prompt: string, reply: object } | null}
 */
export function lastViewFromMemory(turns, atIndex = -1) {
  const list = Array.isArray(turns) ? turns : []
  if (!list.length) return null

  let assistantIndex = atIndex
  if (assistantIndex < 0 || assistantIndex >= list.length) {
    assistantIndex = -1
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].role === 'assistant') {
        assistantIndex = i
        break
      }
    }
  }
  if (assistantIndex < 0) return null
  const assistant = list[assistantIndex]
  if (!assistant?.content?.trim()) return null

  let prompt = ''
  for (let i = assistantIndex - 1; i >= 0; i -= 1) {
    if (list[i].role === 'user' && list[i].content?.trim()) {
      prompt = list[i].content.trim()
      break
    }
  }

  const text = assistant.content.trim()
  const statusMatch = text.match(/^STATUS:\s*(\w+)/im)

  return {
    prompt,
    reply: {
      // Memory stores answer text (often with a STATUS line). Evidence cards
      // from the original call are not available after restore.
      grounding_status: statusMatch ? statusMatch[1].toLowerCase() : 'grounded',
      grounding_source: 'documents',
      text,
      restored_from_memory: true,
    },
  }
}

/** Prefer the rich last-view; fall back to rebuilding from memory turns. */
export function resolveAskAiLastView(turns = readAskAiMemory()) {
  return readAskAiLastView() || lastViewFromMemory(turns)
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
