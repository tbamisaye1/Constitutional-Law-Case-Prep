import { BookMarked, Link2, Trash2 } from 'lucide-react'
import { formatSourceLabel } from '../../data/factsSeed'

/**
 * One fact atom: text + page/fn cite + argument tags.
 */
export function FactCard({ fact, active, onSelect }) {
  return (
    <button
      type="button"
      className={active ? 'fact-card on' : 'fact-card'}
      onClick={() => onSelect(fact.id)}
    >
      <div className="fact-card-meta">
        <span className="source-chip mono">{formatSourceLabel(fact.source)}</span>
        <span className={`side-pill side-${fact.side}`}>{fact.side}</span>
      </div>
      <p className="fact-card-text">{fact.text || 'Empty fact — add text in the detail pane.'}</p>
      <div className="fact-card-tags">
        {(fact.argumentTags || []).slice(0, 4).map((t) => (
          <span key={t} className="arg-chip">
            {t}
          </span>
        ))}
      </div>
    </button>
  )
}

function patchSource(fact, field, value) {
  return { source: { ...fact.source, [field]: value } }
}

export function FactDetail({ fact, onChange, onDelete, argumentOptions }) {
  if (!fact) {
    return <div className="fact-detail empty">Select a fact to edit, or add one.</div>
  }

  function toggleTag(tagId) {
    const has = (fact.argumentTags || []).includes(tagId)
    const next = has
      ? fact.argumentTags.filter((t) => t !== tagId)
      : [...(fact.argumentTags || []), tagId]
    onChange({ argumentTags: next })
  }

  return (
    <div className="fact-detail">
      <div className="fact-detail-head">
        <div className="fact-detail-title">
          <BookMarked size={16} strokeWidth={1.75} />
          <span>Fact detail</span>
        </div>
        <button type="button" className="icon-btn soft" aria-label="Delete fact" onClick={() => onDelete(fact.id)}>
          <Trash2 size={15} />
        </button>
      </div>

      <label className="field-label mono">Statement</label>
      <textarea
        className="fact-textarea"
        rows={5}
        value={fact.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="What happened, in one or two sentences…"
      />

      <div className="source-block">
        <div className="field-label mono">Where it comes from</div>
        <p className="source-preview mono">{formatSourceLabel(fact.source)}</p>
        <div className="fact-grid-2">
          <div>
            <label className="field-label mono">Page</label>
            <input
              className="fact-input mono"
              value={fact.source?.page || ''}
              onChange={(e) => onChange(patchSource(fact, 'page', e.target.value))}
              placeholder="12 or 4–5"
            />
          </div>
          <div>
            <label className="field-label mono">Footnote (optional)</label>
            <input
              className="fact-input mono"
              value={fact.source?.footnote || ''}
              onChange={(e) => onChange(patchSource(fact, 'footnote', e.target.value))}
              placeholder="8 or 8–9"
            />
          </div>
        </div>
        <label className="field-label mono">Context note</label>
        <input
          className="fact-input"
          value={fact.source?.note || ''}
          onChange={(e) => onChange(patchSource(fact, 'note', e.target.value))}
          placeholder="What that page/fn is about"
        />
      </div>

      <div className="fact-grid-2">
        <div>
          <label className="field-label mono">Subsection</label>
          <select
            className="fact-input"
            value={fact.subsection}
            onChange={(e) => onChange({ subsection: e.target.value })}
          >
            <option value="timeline">Timeline</option>
            <option value="posture">Posture</option>
            <option value="q1">Q1 · Fourth</option>
            <option value="q2">Q2 · Article II</option>
            <option value="names">Names & numbers</option>
          </select>
        </div>
        <div>
          <label className="field-label mono">Side frame</label>
          <select
            className="fact-input"
            value={fact.side}
            onChange={(e) => onChange({ side: e.target.value })}
          >
            <option value="neutral">Neutral</option>
            <option value="petitioner">Petitioner</option>
            <option value="respondent">Respondent</option>
          </select>
        </div>
      </div>

      <label className="field-label mono">
        <Link2 size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Argument tags
      </label>
      <div className="tag-toggle-row">
        {argumentOptions.map((t) => {
          const on = (fact.argumentTags || []).includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              className={on ? 'tag-toggle on' : 'tag-toggle'}
              onClick={() => toggleTag(t.id)}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <label className="field-label mono">Cold memorise line</label>
      <input
        className="fact-input"
        value={fact.memoriseLine || ''}
        onChange={(e) => onChange({ memoriseLine: e.target.value })}
        placeholder="Short line you can say in OA without looking"
      />
    </div>
  )
}
