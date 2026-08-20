import { Plus, Trash2 } from 'lucide-react'

/**
 * Outgoing + incoming cites with preview popup + jump to linked case.
 */
export function CitesPanel({
  caseId,
  cites,
  cases,
  onUpsert,
  onRemove,
  onOpenCite,
  onJump,
}) {
  const outgoing = cites.filter((c) => c.fromCaseId === caseId)
  const incoming = cites.filter((c) => c.toCaseId === caseId)

  function nameOf(id) {
    return cases.find((c) => c.id === id)?.name || id
  }

  function add() {
    const other = cases.find((c) => c.id !== caseId)
    onUpsert({
      id: `cite-${Date.now()}`,
      fromCaseId: caseId,
      toCaseId: other?.id || caseId,
      pin: '',
      quote: '',
      context: '',
      why: '',
    })
  }

  return (
    <div className="research-panel">
      <div className="research-panel-head">
        <h3>Cross-cites</h3>
        <button type="button" className="btn-ink" onClick={add}>
          <Plus size={14} /> Add cite
        </button>
      </div>
      <p className="research-hint">
        Hyperjump between cases that cite each other. Open a cite to see quote, context, and a
        short card for the linked case.
      </p>

      <h4 className="research-sub">This case cites</h4>
      <CiteList
        items={outgoing}
        direction="out"
        cases={cases}
        nameOf={nameOf}
        onUpsert={onUpsert}
        onRemove={onRemove}
        onOpenCite={onOpenCite}
        onJump={onJump}
      />

      <h4 className="research-sub">Cited by</h4>
      <CiteList
        items={incoming}
        direction="in"
        cases={cases}
        nameOf={nameOf}
        onUpsert={onUpsert}
        onRemove={onRemove}
        onOpenCite={onOpenCite}
        onJump={onJump}
        readOnlyLink
      />
    </div>
  )
}

function CiteList({
  items,
  direction,
  cases,
  nameOf,
  onUpsert,
  onRemove,
  onOpenCite,
  onJump,
  readOnlyLink,
}) {
  if (!items.length) {
    return <p className="files-empty">None yet.</p>
  }

  return (
    <ul className="cite-list">
      {items.map((c) => {
        const targetId = direction === 'out' ? c.toCaseId : c.fromCaseId
        return (
          <li key={c.id} className="cite-row">
            <div className="cite-row-main">
              {!readOnlyLink ? (
                <select
                  className="fact-input"
                  value={c.toCaseId}
                  onChange={(e) => onUpsert({ ...c, toCaseId: e.target.value })}
                >
                  {cases.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.name}
                    </option>
                  ))}
                </select>
              ) : (
                <button type="button" className="cite-jump-name" onClick={() => onJump(targetId)}>
                  {nameOf(targetId)}
                </button>
              )}
              <input
                className="fact-input mono"
                value={c.pin || ''}
                placeholder="pg / pin"
                onChange={(e) => onUpsert({ ...c, pin: e.target.value })}
              />
            </div>
            <textarea
              className="fact-textarea"
              rows={2}
              value={c.quote || ''}
              placeholder="Quote (optional)"
              onChange={(e) => onUpsert({ ...c, quote: e.target.value })}
            />
            <textarea
              className="fact-textarea"
              rows={2}
              value={c.context || ''}
              placeholder="Context in the opinion"
              onChange={(e) => onUpsert({ ...c, context: e.target.value })}
            />
            <div className="cite-row-actions">
              <button type="button" className="btn-soft" onClick={() => onOpenCite(c)}>
                Preview
              </button>
              <button type="button" className="btn-soft" onClick={() => onJump(targetId)}>
                Jump
              </button>
              {!readOnlyLink ? (
                <button
                  type="button"
                  className="icon-btn soft"
                  aria-label="Remove cite"
                  onClick={() => onRemove(c.id)}
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
