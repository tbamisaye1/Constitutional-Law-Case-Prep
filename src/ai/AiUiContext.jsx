import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { chatPrep } from '../api/client'
import { groundingStatusFromReply } from './samplePrompts'
import { MATTER } from '../data/seed'

/**
 * Selection context for the Ask AI bubble.
 * Calls POST /chat (retrieve → reason → verify) when the backend is running.
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
  })
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState(null)

  const openBubble = useCallback((partial, position) => {
    setCtx((prev) => ({
      ...prev,
      matter_id: MATTER.id,
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

  const runPrompt = useCallback(
    async (userPrompt) => {
      const user_prompt = (userPrompt ?? prompt).trim()
      if (!user_prompt) return
      setPrompt(user_prompt)
      setLoading(true)
      setReply(null)

      try {
        const data = await chatPrep(user_prompt, ctx.matter_id || MATTER.id)
        const status = groundingStatusFromReply(data.grounding_status, data.reply)
        setReply({
          grounding_status: status,
          text: data.reply,
          grounding_notes: data.grounding_notes,
          evidence: data.evidence,
          claims_verified: data.claims_verified,
          claims_total: data.claims_total,
        })
      } catch (err) {
        setReply({
          grounding_status: 'no_evidence',
          text:
            `Could not reach the agent backend.\n\n${err.message || 'Request failed'}\n\n` +
            'Start it with: uvicorn app.main:app --reload --port 8000\n' +
            'Then: python demo/bootstrap_moot_index.py (once, for indexed cases)',
        })
      } finally {
        setLoading(false)
      }
    },
    [ctx.matter_id, prompt]
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
      prompt,
      setPrompt,
      loading,
      reply,
      openBubble,
      closeBubble,
      askAi,
      runPrompt,
      clearReply,
    }),
    [open, anchor, ctx, prompt, loading, reply, openBubble, closeBubble, askAi, runPrompt, clearReply]
  )

  return <AiUiContext.Provider value={value}>{children}</AiUiContext.Provider>
}

export function useAiUi() {
  const v = useContext(AiUiContext)
  if (!v) throw new Error('useAiUi must be used inside AiUiProvider')
  return v
}
