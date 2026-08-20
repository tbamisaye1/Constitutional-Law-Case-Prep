import { Plus, Trash2 } from 'lucide-react'

/**
 * Facts of this precedent (what happened in Katz / Carpenter / …),
 * separate from Bronner record facts. Flag ones that help the matter.
 */
export function PrecedentFactsPanel({ caseId, facts, onUpsert, onRemove }) {
  const list = facts.filter((f) => f.caseId === caseId)

  function add() {
    onUpsert({
      id: `cf-${Date.now()}`,
      caseId,
      text: '',
      useful: true,
      note: '',
    })
  }

  return (
    <div className="research-panel">
      <div className="research-panel-head">
        <h3>Precedent facts</h3>
        <button type="button" className="btn-ink" onClick={add}>
          <Plus size={14} /> Add fact
        </button>
      </div>
      <p className="research-hint">
        Story of <em>this</em> case so you know what is going on before you argue from it. Flag
        facts that actually help Bronner.
      </p>

      <ul className="prec-fact-list">
        {list.length === 0 ? (
          <li className="files-empty">No facts yet. Add the parties, what was watched/seized, posture.</li>
        ) : (
          list.map((f) => (
            <li key={f.id} className="prec-fact-row">
              <textarea
                className="fact-textarea"
                rows={3}
                value={f.text}
                placeholder="What happened…"
                onChange={(e) => onUpsert({ ...f, text: e.target.value })}
              />
              <div className="prec-fact-meta">
                <label className="check-flag">
                  <input
                    type="checkbox"
                    checked={Boolean(f.useful)}
                    onChange={(e) => onUpsert({ ...f, useful: e.target.checked })}
                  />
                  Useful for matter
                </label>
                <input
                  className="fact-input"
                  value={f.note || ''}
                  placeholder="Why this fact matters"
                  onChange={(e) => onUpsert({ ...f, note: e.target.value })}
                />
                <button
                  type="button"
                  className="icon-btn soft"
                  aria-label="Remove fact"
                  onClick={() => onRemove(f.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
