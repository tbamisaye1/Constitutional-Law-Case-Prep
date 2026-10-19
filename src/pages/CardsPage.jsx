import { Plus, Search, Trash2 } from 'lucide-react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { CardDeck } from '../components/cards/CardDeck'
import { CARD_KINDS, CARD_SIDES } from '../data/cardsSeed'
import { useCards } from '../hooks/useCards'

/**
 * Case-law and judge-Q flashcards (separate from Instant Case fact Memorise).
 */
export function CardsPage() {
  const c = useCards()

  return (
    <section className="workspace facts-room cards-room">
      <header className="workspace-head">
        <div>
          <h1>Cards</h1>
          <p className="lede">
            Drill case references, quotations, and judge questions. Put the prompt on the front
            (what the Court might ask) and the cites you answer with on the back. Instant Case
            record facts stay under Instant Case → Memorise.
          </p>
        </div>
        <div className="head-actions">
          <div className="view-toggle" role="tablist">
            {[
              { id: 'drill', label: 'Drill' },
              { id: 'edit', label: 'Edit cards' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={c.mode === t.id ? 'on' : ''}
                onClick={() => c.setMode(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn-ink" onClick={c.addCard}>
            <Plus size={16} /> Add card
          </button>
        </div>
      </header>

      <div className="facts-toolbar facts-toolbar-slim">
        <div className="facts-toolbar-row">
          <div className="search-field">
            <Search size={16} strokeWidth={1.75} />
            <input
              value={c.query}
              onChange={(e) => c.setQuery(e.target.value)}
              placeholder="Filter cards…"
              aria-label="Filter cards"
            />
          </div>
          <label className="facts-filter-field cards-inline-filter">
            <span className="mono">Kind</span>
            <select value={c.kind} onChange={(e) => c.setKind(e.target.value)}>
              <option value="all">All kinds</option>
              {CARD_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="facts-filter-field cards-inline-filter">
            <span className="mono">Side</span>
            <select value={c.side} onChange={(e) => c.setSide(e.target.value)}>
              <option value="all">All sides</option>
              {CARD_SIDES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {c.mode === 'drill' ? <CardDeck cards={c.filtered} /> : null}

      {c.mode === 'edit' ? (
        <div className="facts-split">
          <ScrollArea.Root className="facts-list-pane">
            <ScrollArea.Viewport className="facts-list-viewport">
              <div className="facts-count mono">{c.filtered.length} cards</div>
              {c.filtered.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={card.id === c.selectedId ? 'fact-card on' : 'fact-card'}
                  onClick={() => c.setSelectedId(card.id)}
                >
                  <div className="fact-card-meta">
                    <span className="source-chip mono">
                      {CARD_KINDS.find((k) => k.id === card.kind)?.label || card.kind}
                    </span>
                    <span
                      className={`side-pill side-${card.side === 'either' ? 'neutral' : card.side}`}
                    >
                      {card.side}
                    </span>
                  </div>
                  <p className="fact-card-text">
                    {card.label || card.front || 'Empty card — add a prompt.'}
                  </p>
                </button>
              ))}
              {!c.filtered.length ? (
                <p className="facts-empty">Nothing matched. Clear a filter or add a card.</p>
              ) : null}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="rail-bar">
              <ScrollArea.Thumb className="rail-thumb" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          <CardDetail
            card={c.selected}
            onChange={(patch) => c.selected && c.updateCard(c.selected.id, patch)}
            onDelete={c.removeCard}
          />
        </div>
      ) : null}
    </section>
  )
}

function CardDetail({ card, onChange, onDelete }) {
  if (!card) {
    return <div className="fact-detail empty">Select a card to edit, or add one.</div>
  }

  return (
    <div className="fact-detail">
      <div className="fact-detail-head">
        <div className="fact-detail-title">
          <span>Card detail</span>
        </div>
        <button
          type="button"
          className="icon-btn soft"
          aria-label="Delete card"
          onClick={() => onDelete(card.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="fact-grid-2">
        <div>
          <label className="field-label mono">Kind</label>
          <select
            className="fact-input"
            value={card.kind}
            onChange={(e) => onChange({ kind: e.target.value })}
          >
            {CARD_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label mono">Side frame</label>
          <select
            className="fact-input"
            value={card.side}
            onChange={(e) => onChange({ side: e.target.value })}
          >
            {CARD_SIDES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="field-label mono">Short label</label>
      <input
        className="fact-input"
        value={card.label || ''}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="e.g. Judge · Carpenter push (respondent)"
      />

      <label className="field-label mono">Cite (optional)</label>
      <input
        className="fact-input mono"
        value={card.cite || ''}
        onChange={(e) => onChange({ cite: e.target.value })}
        placeholder="585 U.S. 296 (2018) or R. 7"
      />

      <label className="field-label mono">Front · prompt / judge question</label>
      <textarea
        className="fact-textarea"
        rows={4}
        value={card.front || ''}
        onChange={(e) => onChange({ front: e.target.value })}
        placeholder="If the judge asks you this on respondent, what can you say back?"
      />

      <label className="field-label mono">Back · answer / cases to cite</label>
      <textarea
        className="fact-textarea"
        rows={6}
        value={card.back || ''}
        onChange={(e) => onChange({ back: e.target.value })}
        placeholder="Cases and lines you would cite in response…"
      />
    </div>
  )
}
