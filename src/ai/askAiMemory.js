/**
 * Ask AI conversation memory (persists in this browser).
 * Prior turns are sent with each /chat call so follow-ups stay in context.
 * Prefers localStorage so close/reopen and a new tab can still load the last answer.
 */

export const ASK_AI_MEMORY_KEY = 'case-prep-ask-ai-memory'
/** Last on-screen Q + reply so closing Ask AI does not wipe what you were reading. */
export const ASK_AI_LAST_VIEW_KEY = 'case-prep-ask-ai-last-view'
/** Soft cap: drop oldest turns after this many messages (user + assistant). */
export const ASK_AI_MEMORY_MAX_TURNS = 12
/** Warn the user once memory reaches this many turns. */
export const ASK_AI_MEMORY_WARN_TURNS = 8

/**
 * @typedef {{ role: 'user' | 'assistant', content: string, at?: number, reply?: object }} AskAiTurn
 */

const EVIDENCE_MAX = 16
const PREVIEW_MAX = 400

function sanitizeEvidence(list) {
  if (!Array.isArray(list)) return []
  return list.slice(0, EVIDENCE_MAX).map((ev, i) => {
    const pageNum = Number(ev?.page)
    const item = {
      id: String(ev?.id || `ev-${i}`),
      source: String(ev?.source || '').slice(0, 240),
      page: Number.isFinite(pageNum) && pageNum > 0 ? pageNum : null,
      source_type: typeof ev?.source_type === 'string' ? ev.source_type : '',
      preview: String(ev?.preview || '').slice(0, PREVIEW_MAX),
      notes_path: typeof ev?.notes_path === 'string' ? ev.notes_path : null,
    }
    if (typeof ev?.url === 'string' && ev.url.trim()) item.url = ev.url.trim()
    return item
  })
}

/** Keep the on-screen reply extras (evidence, badges) with a memory turn. */
export function sanitizeAskAiReply(reply, fallbackText = '') {
  if (!reply || typeof reply !== 'object') return null
  const text =
    typeof reply.text === 'string' && reply.text.trim()
      ? reply.text
      : String(fallbackText || '').trim()
  if (!text) return null
  const claimsVerified = Number(reply.claims_verified)
  const claimsTotal = Number(reply.claims_total)
  const notesUsed = Number(reply.notes_used)
  return {
    grounding_status:
      typeof reply.grounding_status === 'string' && reply.grounding_status.trim()
        ? reply.grounding_status.trim()
        : 'grounded',
    grounding_source:
      typeof reply.grounding_source === 'string' && reply.grounding_source.trim()
        ? reply.grounding_source.trim()
        : 'documents',
    model_tier: reply.model_tier === 'advanced' ? 'advanced' : reply.model_tier || undefined,
    text,
    grounding_notes:
      typeof reply.grounding_notes === 'string' ? reply.grounding_notes : '',
    evidence: sanitizeEvidence(reply.evidence),
    claims_verified: Number.isFinite(claimsVerified) ? claimsVerified : undefined,
    claims_total: Number.isFinite(claimsTotal) ? claimsTotal : undefined,
    notes_used: Number.isFinite(notesUsed) ? notesUsed : undefined,
  }
}

function readStorageItem(key) {
  try {
    const fromLocal = localStorage.getItem(key)
    if (fromLocal != null) return fromLocal
  } catch {
    /* ignore */
  }
  try {
    // Older builds used sessionStorage only. Migrate so tab close does not
    // wipe the Recent thread / Open last answer UI.
    const fromSession = sessionStorage.getItem(key)
    if (fromSession == null) return null
    try {
      localStorage.setItem(key, fromSession)
      sessionStorage.removeItem(key)
    } catch {
      /* keep reading from session if local write fails */
    }
    return fromSession
  } catch {
    return null
  }
}

function writeStorageItem(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore quota / private mode */
  }
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function removeStorageItem(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function readAskAiMemory() {
  try {
    const raw = readStorageItem(ASK_AI_MEMORY_KEY)
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
      .map((t) => {
        const turn = {
          role: t.role,
          content: t.content.trim(),
          at: typeof t.at === 'number' ? t.at : Date.now(),
        }
        if (t.role === 'assistant') {
          const reply = sanitizeAskAiReply(t.reply, turn.content)
          if (reply) turn.reply = reply
        }
        return turn
      })
  } catch {
    return []
  }
}

export function writeAskAiMemory(turns) {
  try {
    writeStorageItem(ASK_AI_MEMORY_KEY, JSON.stringify(turns || []))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAskAiMemoryStore() {
  removeStorageItem(ASK_AI_MEMORY_KEY)
  removeStorageItem(ASK_AI_LAST_VIEW_KEY)
}

/**
 * Persist the visible Ask AI answer so close → reopen shows the same Q + reply.
 * Cleared with memory, or when the user starts a new question.
 *
 * @returns {{ prompt: string, reply: object } | null}
 */
export function readAskAiLastView() {
  try {
    const raw = readStorageItem(ASK_AI_LAST_VIEW_KEY)
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
      removeStorageItem(ASK_AI_LAST_VIEW_KEY)
      return
    }
    writeStorageItem(
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
  removeStorageItem(ASK_AI_LAST_VIEW_KEY)
}

/**
 * Rebuild a viewable Q + reply from chat memory when the rich last-view was
 * never saved, or when the user taps an older Ask AI turn.
 *
 * Assistant turns store evidence / grounding extras when the answer was saved
 * after that feature. Older turns still restore the answer text.
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
  const savedReply = sanitizeAskAiReply(assistant.reply, text)
  const statusMatch = text.match(/^STATUS:\s*(\w+)/im)
  return {
    prompt,
    reply: {
      grounding_status:
        savedReply?.grounding_status ||
        (statusMatch ? statusMatch[1].toLowerCase() : 'grounded'),
      grounding_source: savedReply?.grounding_source || 'documents',
      model_tier: savedReply?.model_tier,
      text,
      grounding_notes: savedReply?.grounding_notes || '',
      evidence: savedReply?.evidence || [],
      claims_verified: savedReply?.claims_verified,
      claims_total: savedReply?.claims_total,
      notes_used: savedReply?.notes_used,
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
  const content = String(turn.content || '').trim()
  const nextTurn = {
    role: turn.role,
    content,
    at: turn.at || Date.now(),
  }
  if (turn.role === 'assistant') {
    const reply = sanitizeAskAiReply(turn.reply, content)
    if (reply) nextTurn.reply = reply
  }
  const next = [...(prev || []), nextTurn].filter(
    (t) => t.content && (t.role === 'user' || t.role === 'assistant')
  )
  if (next.length <= ASK_AI_MEMORY_MAX_TURNS) return next
  return next.slice(next.length - ASK_AI_MEMORY_MAX_TURNS)
}

export function memoryIsNearFull(turns) {
  return (turns?.length || 0) >= ASK_AI_MEMORY_WARN_TURNS
}

export function memoryIsFull(turns) {
  return (turns?.length || 0) >= ASK_AI_MEMORY_MAX_TURNS
}
