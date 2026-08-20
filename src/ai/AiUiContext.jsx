import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { MATTER } from '../data/seed'

/**
 * Selection context for the Ask AI bubble.
 * askAi returns a stub until the backend chat route is wired.
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

  const askAi = useCallback(async () => {
    const user_prompt = prompt.trim()
    if (!user_prompt) return
    setLoading(true)
    setReply(null)

    // Stub until LangGraph / POST /ai/selection is wired.
    await new Promise((r) => setTimeout(r, 600))
    const payload = {
      ...ctx,
      user_prompt,
    }
    setReply({
      grounding_status: 'unverified',
      stub: true,
      text:
        'AI backend is not connected yet. When we build it, this bubble will send SelectionContext to the agent (retrieve → reason → verify) and show a grounded answer here.\n\n' +
        `Surface: ${payload.surface}\n` +
        `Side: ${payload.side}\n` +
        (payload.case_id ? `Case: ${payload.case_id}\n` : '') +
        (payload.page != null ? `Page/section: ${payload.page}\n` : '') +
        (payload.selection
          ? `Selection: “${payload.selection.slice(0, 180)}${payload.selection.length > 180 ? '…' : ''}”\n`
          : '') +
        `Your prompt: ${user_prompt}`,
      proposed_actions: [
        { id: 'save_annotation', label: 'Save as annotation', enabled: false },
        { id: 'append_pet', label: 'Add to petitioner notes', enabled: false },
        { id: 'append_resp', label: 'Add to respondent notes', enabled: false },
      ],
    })
    setLoading(false)
  }, [ctx, prompt])

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
    }),
    [open, anchor, ctx, prompt, loading, reply, openBubble, closeBubble, askAi]
  )

  return <AiUiContext.Provider value={value}>{children}</AiUiContext.Provider>
}

export function useAiUi() {
  const v = useContext(AiUiContext)
  if (!v) throw new Error('useAiUi must be used inside AiUiProvider')
  return v
}
