import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { chatPrep } from '../api/client'
import { groundingStatusFromReply } from './samplePrompts'
import { MATTER } from '../data/seed'
import {
  appendAskAiTurn,
  clearAskAiMemoryStore,
  memoryIsFull,
  memoryIsNearFull,
  readAskAiMemory,
  writeAskAiMemory,
} from './askAiMemory'

/**
 * Selection context for the Ask AI bubble.
 * Calls POST /chat (retrieve → reason → verify) when the backend is running.
 *
 * grounding_source:
 *   documents — FAISS RAG only (default)
 *   web_plus  — uploaded articles + OpenRouter web search
 *
 * memory: prior user/assistant turns for this browser tab (sessionStorage).
 */

const AiUiContext = createContext(null)

export function AiUiProvider({ children }) {
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
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState(null)
  const [memory, setMemory] = useState(() => readAskAiMemory())

  const persistMemory = useCallback((next) => {
    setMemory(next)
    writeAskAiMemory(next)
  }, [])

  const openBubble = useCallback((partial, position) => {
    setCtx((prev) => ({
      ...prev,
      matter_id: MATTER.id,
      source_file: '',
      file_id: null,
      ...partial,
    }))
    if (position) setAnchor(position)
    setReply(null)
    setPrompt('')
    setOpen(true)
  }, [])

  const closeBubble = useCallback(() => {
    setOpen(false)
    setLoading(false)
  }, [])

  const switchGroundingSource = useCallback((next) => {
    const mode = next === 'web_plus' ? 'web_plus' : 'documents'
    setGroundingSource(mode)
    setReply(null)
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

      const historyForApi = memory.map((t) => ({
        role: t.role,
        content: t.content,
      }))

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
          }
        )
        const status = groundingStatusFromReply(data.grounding_status, data.reply)
        const replyText = data.reply || ''
        const nextMemory = appendAskAiTurn(
          appendAskAiTurn(memory, { role: 'user', content: user_prompt }),
          { role: 'assistant', content: replyText }
        )
        persistMemory(nextMemory)
        setReply({
          grounding_status: status,
          grounding_source: data.grounding_source || groundingSource,
          text: replyText,
          grounding_notes: data.grounding_notes,
          evidence: data.evidence,
          claims_verified: data.claims_verified,
          claims_total: data.claims_total,
        })
      } catch (err) {
        setReply({
          grounding_status: 'no_evidence',
          grounding_source: groundingSource,
          text:
            `Could not reach the agent backend.\n\n${err.message || 'Request failed'}\n\n` +
            'Start it with: uvicorn app.main:app --reload --port 8000\n' +
            'Then: python demo/bootstrap_moot_index.py (once, for indexed cases)',
        })
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
      memory,
      persistMemory,
    ]
  )

  const askAi = useCallback(() => runPrompt(prompt), [prompt, runPrompt])

  const clearReply = useCallback(() => {
    setReply(null)
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
