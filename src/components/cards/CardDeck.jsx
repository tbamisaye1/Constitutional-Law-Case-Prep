import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { CARD_KINDS, CARD_SIDES } from '../../data/cardsSeed'

function kindLabel(id) {
  return CARD_KINDS.find((k) => k.id === id)?.label || id
}

function sideLabel(id) {
  return CARD_SIDES.find((s) => s.id === id)?.label || id
}

/**
 * Flip deck for case-law / judge-Q flashcards.
 * Front = prompt; back = cites and answer.
 */
export function CardDeck({ cards }) {
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const deckKey = cards.map((c) => c.id).join('|')

  useEffect(() => {
    setI(0)
    setRevealed(false)
  }, [deckKey])

  if (!cards.length) {
    return (
      <div className="memo-empty">
        No cards in this filter. Add a card, or loosen kind / side / search.
      </div>
    )
  }

  const card = cards[Math.min(i, cards.length - 1)]

  function next(delta) {
    setRevealed(false)
    setI((prev) => (prev + delta + cards.length) % cards.length)
  }

  return (
    <div className="memo-deck cards-deck">
      <div className="memo-progress mono">
        {Math.min(i, cards.length - 1) + 1} / {cards.length}
      </div>
      <div className={revealed ? 'memo-card cards-card flipped' : 'memo-card cards-card'}>
        <div className="memo-card-meta">
          <span className="source-chip mono">{kindLabel(card.kind)}</span>
          <span className={`side-pill side-${card.side === 'either' ? 'neutral' : card.side}`}>
            {sideLabel(card.side)}
          </span>
        </div>
        {card.label ? <p className="cards-card-label mono">{card.label}</p> : null}
        <p className="memo-prompt">{card.front || 'Empty prompt — edit this card.'}</p>
        {revealed ? (
          <div className="cards-card-back">
            <p className="memo-full">{card.back || 'No answer yet.'}</p>
            {card.cite ? <p className="cards-cite mono">{card.cite}</p> : null}
          </div>
        ) : (
          <p className="cards-flip-hint mono">Reveal for the answer / cites</p>
        )}
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
