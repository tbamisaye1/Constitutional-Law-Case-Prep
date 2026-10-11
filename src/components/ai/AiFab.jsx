import { Sparkles } from 'lucide-react'
import { useAiUi } from '../../ai/AiUiContext'
import { useLocation } from 'react-router-dom'

/**
 * Always-available Ask AI control when nothing is selected.
 */
export function AiFab() {
  const { open, openBubble } = useAiUi()
  const loc = useLocation()

  if (open) return null

  function surfaceFromPath() {
    if (loc.pathname.startsWith('/guide')) return 'guide'
    if (loc.pathname.startsWith('/library')) return 'library'
    if (loc.pathname.startsWith('/facts')) return 'facts'
    if (loc.pathname.startsWith('/notes')) return 'notes'
    if (loc.pathname.startsWith('/arguments')) return 'arguments'
    if (loc.pathname.startsWith('/agent')) return 'agent'
    return 'home'
  }

  return (
    <button
      type="button"
      className="ai-fab"
      aria-label="Ask AI"
      onClick={() => {
        const surface = surfaceFromPath()
        // On Arguments, keep the Petitioner/Respondent tab already in ctx
        // (ArgumentsPage syncs it). Elsewhere reset to both.
        openBubble(
          {
            surface,
            selection: '',
            case_id: null,
            page: null,
            ...(surface === 'arguments' ? {} : { side: 'both' }),
          },
          { top: 0, left: 0 }
        )
      }}
    >
      <Sparkles size={18} />
      <span>Ask AI</span>
    </button>
  )
}
