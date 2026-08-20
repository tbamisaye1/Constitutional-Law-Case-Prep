import { useEffect } from 'react'
import { useAiUi } from '../ai/AiUiContext'

/**
 * On mouseup inside `containerRef`, if there is a text selection, open the AI bubble.
 */
export function useTextSelectionAi(containerRef, { surface, case_id = null, page = null, side = 'both' }) {
  const { openBubble } = useAiUi()

  useEffect(() => {
    const el = containerRef?.current
    if (!el) return undefined

    function onUp(e) {
      if (e.target.closest?.('.ai-bubble, button, textarea, input, select, a')) return

      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      const text = sel.toString().replace(/\s+/g, ' ').trim()
      if (text.length < 2) return

      let range
      try {
        range = sel.getRangeAt(0)
      } catch {
        return
      }
      const rect = range.getBoundingClientRect()
      openBubble(
        { surface, case_id, page, side, selection: text },
        {
          top: Math.min(rect.bottom + 10, window.innerHeight - 40),
          left: Math.min(Math.max(12, rect.left), window.innerWidth - 360),
        }
      )
    }

    el.addEventListener('mouseup', onUp)
    return () => el.removeEventListener('mouseup', onUp)
  }, [containerRef, surface, case_id, page, side, openBubble])
}
