/**
 * Editable case header: name, cite, holding, rule, dual-side use.
 * You argue both sides; both use fields stay visible.
 */
export function CaseMetaEditor({ caseItem, onChange, editing, onToggleEdit }) {
  if (!caseItem) return null

  if (!editing) {
    return (
      <article className={`case-card soft-card ${caseItem.issue === 2 ? 'case-card-q2' : 'case-card-q1'}`}>
        <div className="case-meta-bar">
          <span className="mono cite">{caseItem.cite || 'No citation yet'}</span>
          <button type="button" className="btn-soft" onClick={onToggleEdit}>
            Edit details
          </button>
        </div>
        <h2 className="case-detail-title">{caseItem.name}</h2>
        <dl className="case-meta-grid">
          <div>
            <dt className="mono">Holding</dt>
            <dd>{caseItem.holding || '—'}</dd>
          </div>
          <div>
            <dt className="mono">Rule</dt>
            <dd>{caseItem.rule || '—'}</dd>
          </div>
          <div className="dual-use">
            <div>
              <dt className="mono">Petitioner use</dt>
              <dd>{caseItem.usePetitioner || '—'}</dd>
            </div>
            <div>
              <dt className="mono">Respondent use</dt>
              <dd>{caseItem.useRespondent || '—'}</dd>
            </div>
          </div>
          <div>
            <dt className="mono">Matter flag</dt>
            <dd>{caseItem.usefulness || 'background'}</dd>
          </div>
        </dl>
      </article>
    )
  }

  function field(key, label, multiline = false) {
    const Tag = multiline ? 'textarea' : 'input'
    return (
      <div>
        <label className="field-label mono">{label}</label>
        <Tag
          className={multiline ? 'fact-textarea' : 'fact-input'}
          rows={multiline ? 3 : undefined}
          value={caseItem[key] || ''}
          onChange={(e) => onChange({ [key]: e.target.value })}
        />
      </div>
    )
  }

  return (
    <article className="case-card soft-card case-edit">
      <div className="case-meta-bar">
        <span className="mono">Editing case details</span>
        <button type="button" className="btn-ink" onClick={onToggleEdit}>
          Done
        </button>
      </div>
      <div className="fact-grid-2">
        {field('name', 'Case name')}
        {field('cite', 'Citation')}
      </div>
      <div className="fact-grid-2">
        {field('year', 'Year')}
        <div>
          <label className="field-label mono">Issue</label>
          <select
            className="fact-input"
            value={String(caseItem.issue)}
            onChange={(e) => onChange({ issue: Number(e.target.value) })}
          >
            <option value="1">Q1 · Fourth</option>
            <option value="2">Q2 · Article II</option>
          </select>
        </div>
      </div>
      <div>
        <label className="field-label mono">Matter flag</label>
        <select
          className="fact-input"
          value={caseItem.usefulness || 'background'}
          onChange={(e) => onChange({ usefulness: e.target.value })}
        >
          <option value="core">Core for matter</option>
          <option value="useful">Useful</option>
          <option value="background">Background</option>
          <option value="trap">Trap / distinguish</option>
        </select>
      </div>
      <div>
        <label className="field-label mono">Status tag</label>
        <select
          className="fact-input"
          value={caseItem.tag || ''}
          onChange={(e) => onChange({ tag: e.target.value || null })}
        >
          <option value="">None</option>
          <option value="priority">priority</option>
          <option value="split">split</option>
          <option value="needs reanalysis">needs reanalysis</option>
          <option value="overview">overview</option>
        </select>
      </div>
      {field('holding', 'Holding', true)}
      {field('rule', 'Rule left behind', true)}
      <div className="fact-grid-2">
        {field('usePetitioner', 'Petitioner use', true)}
        {field('useRespondent', 'Respondent use', true)}
      </div>
      {field('suggestedFile', 'Suggested PDF filename')}
    </article>
  )
}
