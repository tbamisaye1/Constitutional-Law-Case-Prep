import { useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { formatSourceLabel } from '../../data/factsSeed'

/**
 * Flash-style pass over facts tagged memorise (or all filtered).
 * Lawyers drill cold facts; this is that mode, not another editor.
 */
export function MemoriseDeck({ facts }) {
  const deck = facts.filter((f) => (f.argumentTags || []).includes('memorise') || f.memoriseLine)
  const list = deck.length ? deck : facts
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)

  if (!list.length) {
    return <div className="memo-empty">No facts in this filter. Loosen search or add a memorise tag.</div>
  }

  const fact = list[Math.min(i, list.length - 1)]

  function next(delta) {
    setRevealed(false)
    setI((prev) => (prev + delta + list.length) % list.length)
  }

  return (
    <div className="memo-deck">
      <div className="memo-progress mono">
        {Math.min(i, list.length - 1) + 1} / {list.length}
      </div>
      <div className="memo-card">
        <span className="source-chip mono">{formatSourceLabel(fact.source)}</span>
        <p className="memo-prompt">{fact.memoriseLine || 'No cold line yet — reveal full fact.'}</p>
        {revealed ? <p className="memo-full">{fact.text}</p> : null}
      </div>
      <div className="memo-actions">
        <button type="button" className="btn-soft" onClick={() => next(-1)}>
          <ChevronLeft size={16} /> Prev
        </button>
        <button type="button" className="btn-soft" onClick={() => setRevealed((v) => !v)}>
          {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          {revealed ? 'Hide' : 'Reveal'}
        </button>
        <button type="button" className="btn-ink" onClick={() => next(1)}>
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
