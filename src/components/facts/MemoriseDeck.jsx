import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { formatSourceLabel } from '../../data/factsSeed'

/**
 * Flash-style pass over Instant Case facts for one side deck
 * (neutral / petitioner / respondent) or the combined filter.
 */
export function MemoriseDeck({ facts, sideLabel }) {
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const deckKey = facts.map((f) => f.id).join('|')

  useEffect(() => {
    setI(0)
    setRevealed(false)
  }, [deckKey])

  if (!facts.length) {
    return (
      <div className="memo-empty">
        No {sideLabel ? `${sideLabel.toLowerCase()} ` : ''}facts in this filter. Loosen search or
        add a memorise line on a Fact card.
      </div>
    )
  }

  const fact = facts[Math.min(i, facts.length - 1)]

  function next(delta) {
    setRevealed(false)
    setI((prev) => (prev + delta + facts.length) % facts.length)
  }

  return (
    <div className="memo-deck">
      <div className="memo-progress mono">
        {Math.min(i, facts.length - 1) + 1} / {facts.length}
        {sideLabel ? ` · ${sideLabel}` : ''}
      </div>
      <div className="memo-card">
        <div className="memo-card-meta">
          <span className="source-chip mono">{formatSourceLabel(fact.source)}</span>
          <span className={`side-pill side-${fact.side}`}>{fact.side}</span>
        </div>
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
