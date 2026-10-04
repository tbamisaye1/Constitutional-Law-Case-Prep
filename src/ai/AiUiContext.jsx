import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { chatPrep } from '../api/client'
import { groundingStatusFromReply } from './samplePrompts'
import { MATTER } from '../data/seed'
import {
  appendAskAiTurn,
  clearAskAiLastView,
  clearAskAiMemoryStore,
  memoryIsFull,
  memoryIsNearFull,
  readAskAiLastView,
  readAskAiMemory,
  writeAskAiLastView,
  writeAskAiMemory,
} from './askAiMemory'
import { prepNotesForAskAi } from '../lib/annotationSearch'
import { queryWantsNotes } from '../lib/notebookSearch'
import { useCaseLibrary } from '../hooks/useCaseLibrary'

/**
 * Selection context for the Ask AI bubble.
 * Calls POST /chat (retrieve → reason → verify) when the backend is running.
 *
 * grounding_source:
 *   documents — FAISS RAG only (default)
 *   web_plus  — uploaded articles + OpenRouter web search
 *
 * includeNotes: when on (or when the prompt clearly asks for "my notes"),
 * matching notebook pages, PDF annotations, and case-library note tabs are
 * searched in this browser and sent with /chat. Never uploaded silently.
 *
 * memory: prior user/assistant turns for this browser tab (sessionStorage).
 */

const AiUiContext = createContext(null)
const INCLUDE_NOTES_KEY = 'case-prep-ask-ai-include-notes'

function readIncludeNotes() {
  try {
    return localStorage.getItem(INCLUDE_NOTES_KEY) === '1'
  } catch {
    return false
  }
}

export function AiUiProvider({ children }) {
  const lib = useCaseLibrary()
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState({ top: 80, left: 80 })
  const [ctx, setCtx] = useState({
    surface: 'guide',
    selection: '',
    matter_id: MATTER.id,
    case_id: null,
    page: null,
    side: 'both',
    source_file: '',
    file_id: null,
  })
  const [groundingSource, setGroundingSource] = useState('documents')
  const [includeNotes, setIncludeNotesState] = useState(readIncludeNotes)
  const [prompt, setPrompt] = useState(() => readAskAiLastView()?.prompt || '')
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState(() => readAskAiLastView()?.reply || null)
  const [memory, setMemory] = useState(() => readAskAiMemory())

  const persistMemory = useCallback((next) => {
    setMemory(next)
    writeAskAiMemory(next)
  }, [])

  const persistReply = useCallback((nextReply, nextPrompt) => {
    setReply(nextReply)
    writeAskAiLastView(nextPrompt, nextReply)
  }, [])

  const setIncludeNotes = useCallback((next) => {
    const on = Boolean(next)
    setIncludeNotesState(on)
    try {
      localStorage.setItem(INCLUDE_NOTES_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const openRef = useRef(false)
  openRef.current = open

  const openBubble = useCallback((partial, position) => {
    setCtx((prev) => ({
      ...prev,
      matter_id: MATTER.id,
      source_file: '',
      file_id: null,
      ...partial,
    }))
    if (position) setAnchor(position)
    // Keep the last answer when reopening. Closing used to wipe reply/prompt
    // even though chat memory was still in sessionStorage.
    if (!openRef.current && !reply) {
      const saved = readAskAiLastView()
      if (saved?.reply) {
        setReply(saved.reply)
        if (saved.prompt) setPrompt(saved.prompt)
      }
    }
    setOpen(true)
  }, [reply])

  const closeBubble = useCallback(() => {
    setOpen(false)
    setLoading(false)
  }, [])

  const switchGroundingSource = useCallback((next) => {
    const mode = next === 'web_plus' ? 'web_plus' : 'documents'
    setGroundingSource(mode)
    setReply(null)
    clearAskAiLastView()
    setLoading(false)
  }, [])

  const clearMemory = useCallback(() => {
    clearAskAiMemoryStore()
    setMemory([])
    setReply(null)
    setLoading(false)
    setPrompt('')
  }, [])

  const runPrompt = useCallback(
    async (userPrompt) => {
      const user_prompt = (userPrompt ?? prompt).trim()
      if (!user_prompt) return
      setPrompt(user_prompt)
      setLoading(true)
      setReply(null)
      // Keep the previous last-view in sessionStorage until the new reply
      // lands, so closing mid-request still restores the prior answer.

      const historyForApi = memory.map((t) => ({
        role: t.role,
        content: t.content,
      }))

      const wantsNotes = includeNotes || queryWantsNotes(user_prompt)
      const notes = wantsNotes
        ? prepNotesForAskAi(user_prompt, {
            annotations: lib.annotations || [],
            cases: lib.cases || [],
            filesMeta: lib.filesMeta || [],
            notesByCase: lib.notesByCase || {},
            noteTabs: lib.noteTabs || [],
            totalLimit: 8,
          })
        : []

      try {
        const data = await chatPrep(
          user_prompt,
          ctx.matter_id || MATTER.id,
          groundingSource,
          ctx.selection || '',
          {
            source_file: ctx.source_file || '',
            page: ctx.page,
            history: historyForApi,
            notes,
          }
        )
        const status = groundingStatusFromReply(data.grounding_status, data.reply)
        const replyText = data.reply || ''
        const nextMemory = appendAskAiTurn(
          appendAskAiTurn(memory, { role: 'user', content: user_prompt }),
          { role: 'assistant', content: replyText }
        )
        persistMemory(nextMemory)
        persistReply(
          {
            grounding_status: status,
            grounding_source: data.grounding_source || groundingSource,
            text: replyText,
            grounding_notes: data.grounding_notes,
            evidence: data.evidence,
            claims_verified: data.claims_verified,
            claims_total: data.claims_total,
            notes_used: notes.length,
          },
          user_prompt
        )
      } catch (err) {
        persistReply(
          {
            grounding_status: 'no_evidence',
            grounding_source: groundingSource,
            text: formatAskAiFailure(err, groundingSource),
            notes_used: notes.length,
          },
          user_prompt
        )
      } finally {
        setLoading(false)
      }
    },
    [
      ctx.matter_id,
      ctx.selection,
      ctx.source_file,
      ctx.page,
      prompt,
      groundingSource,
      includeNotes,
      memory,
      persistMemory,
      persistReply,
      lib.annotations,
      lib.cases,
      lib.filesMeta,
      lib.notesByCase,
      lib.noteTabs,
    ]
  )

  const askAi = useCallback(() => runPrompt(prompt), [prompt, runPrompt])

  const clearReply = useCallback(() => {
    setReply(null)
    clearAskAiLastView()
    setLoading(false)
    setPrompt('')
  }, [])

  const value = useMemo(
    () => ({
      open,
      anchor,
      ctx,
      setCtx,
      groundingSource,
      switchGroundingSource,
      includeNotes,
      setIncludeNotes,
      prompt,
      setPrompt,
      loading,
      reply,
      memory,
      memoryNearFull: memoryIsNearFull(memory),
      memoryFull: memoryIsFull(memory),
      openBubble,
      closeBubble,
      askAi,
      runPrompt,
      clearReply,
      clearMemory,
    }),
    [
      open,
      anchor,
      ctx,
      groundingSource,
      switchGroundingSource,
      includeNotes,
      setIncludeNotes,
      prompt,
      loading,
      reply,
      memory,
      openBubble,
      closeBubble,
      askAi,
      runPrompt,
      clearReply,
      clearMemory,
    ]
  )

  return <AiUiContext.Provider value={value}>{children}</AiUiContext.Provider>
}

export function useAiUi() {
  const v = useContext(AiUiContext)
  if (!v) throw new Error('useAiUi must be used inside AiUiProvider')
  return v
}

/**
 * Production timeouts used to dump local uvicorn instructions. Say what
 * actually failed instead.
 */
export function formatAskAiFailure(err, groundingSource = 'documents') {
  const raw = String(err?.message || err || 'Request failed')
  const lower = raw.toLowerCase()
  const web = groundingSource === 'web_plus'
  const timedOut =
    lower.includes('function_invocation_timeout') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('504')

  if (timedOut) {
    return (
      'Ask AI timed out on the server.\n\n' +
      (web
        ? 'Web mode (corpus + live search) often needs more than a minute. Switch to Uploaded articles, or ask a shorter question, then try again.'
        : 'The agent took too long. Try a shorter question, or retry in a moment.') +
      `\n\nDetail: ${raw.slice(0, 280)}`
    )
  }

  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return (
      'Could not reach the agent backend (network).\n\n' +
      'If you are developing locally, start it with:\n' +
      'uvicorn app.main:app --reload --port 8000\n' +
      'Then: python demo/bootstrap_moot_index.py (once, for indexed cases)'
    )
  }

  return `Ask AI failed.\n\n${raw.slice(0, 600)}`
}
