import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

/**
 * Two timelines:
 * 1) Doctrine arc = how case law develops (read as a story; edit separately)
 * 2) Procedural = life of ONE case (investigation → lower court → SCOTUS)
 *
 * Default is READ mode so it is not a wall of form fields.
 */
export function DoctrineTimeline({
  timeline,
  cases,
  issueFilter = 'all',
  highlightCaseId = null,
  mode = 'doctrine', // doctrine | procedural
  onUpsert,
  onRemove,
  onJump,
}) {
  const [editing, setEditing] = useState(false)

  const list = useMemo(() => {
    return [...timeline]
      .filter((t) => {
        const kind = t.kind || 'doctrine'
        if (mode === 'doctrine' && kind !== 'doctrine') return false
        if (mode === 'procedural') {
          if (kind !== 'procedural') return false
          if (highlightCaseId && t.caseId !== highlightCaseId) return false
        }
        if (mode === 'record') {
          if (kind !== 'record') return false
        }
        if (
          mode === 'doctrine' &&
          issueFilter &&
          issueFilter !== 'all' &&
          String(t.issue) !== String(issueFilter)
        ) {
          return false
        }
        return true
      })
      .sort((a, b) => Number(a.year) - Number(b.year))
  }, [timeline, mode, issueFilter, highlightCaseId])

  function add() {
    onUpsert({
      id: `tl-${Date.now()}`,
      kind: mode === 'procedural' ? 'procedural' : 'doctrine',
      year: String(new Date().getFullYear()),
      caseId: highlightCaseId || cases[0]?.id || '',
      issue: 1,
      label: '',
      note: '',
    })
    setEditing(true)
  }

  const title =
    mode === 'procedural'
      ? 'Procedural timeline (this case)'
      : mode === 'record'
        ? 'Bronner record timeline'
        : 'Doctrine arc (case law over time)'

  const blurb =
    mode === 'procedural'
      ? 'What happened in the life of this one case: investigation, lower courts, SCOTUS. Not the whole doctrine story.'
      : mode === 'record'
        ? 'Matter chronology from the Bronner guide (tip → cameras → warrants → GTMO). Editable. Not the case-law doctrine arc.'
        : 'Read top to bottom: how the law moved (e.g. Katz → Jones → Carpenter → Tuggle). Click a beat to open that case. Highlighted beat = the case you have open.'

  return (
    <div className="timeline-room">
      <div className="timeline-room-head">
        <div>
          <h3>{title}</h3>
          <p className="timeline-blurb">{blurb}</p>
        </div>
        <div className="timeline-room-actions">
          <button
            type="button"
            className={editing ? 'btn-ink' : 'btn-soft'}
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil size={14} /> {editing ? 'Done editing' : 'Edit beats'}
          </button>
          <button type="button" className="btn-soft" onClick={add}>
            <Plus size={14} /> Add beat
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="files-empty">
          {mode === 'procedural'
            ? 'No procedural beats yet. Add investigation / lower court / opinion dates for this case.'
            : 'No doctrine beats in this filter. Switch issue filter or add a beat.'}
        </p>
      ) : (
        <ol className="arc-list">
          {list.map((t, i) => {
            const c = cases.find((x) => x.id === t.caseId)
            const on = highlightCaseId && t.caseId === highlightCaseId
            if (editing) {
              return (
                <li key={t.id} className={on ? 'arc-edit on' : 'arc-edit'}>
                  <div className="arc-edit-grid">
                    <input
                      className="fact-input mono"
                      value={t.year}
                      onChange={(e) => onUpsert({ ...t, year: e.target.value })}
                      aria-label="Year"
                    />
                    <select
                      className="fact-input"
                      value={t.caseId || ''}
                      onChange={(e) => onUpsert({ ...t, caseId: e.target.value || null })}
                    >
                      <option value="">(matter / no case)</option>
                      {cases.map((cs) => (
                        <option key={cs.id} value={cs.id}>
                          {cs.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="icon-btn soft"
                      aria-label="Remove"
                      onClick={() => onRemove(t.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    className="fact-input"
                    value={t.label || ''}
                    placeholder="Short label"
                    onChange={(e) => onUpsert({ ...t, label: e.target.value })}
                  />
                  <textarea
                    className="fact-textarea"
                    rows={2}
                    value={t.note || ''}
                    placeholder="Why this beat matters for prep"
                    onChange={(e) => onUpsert({ ...t, note: e.target.value })}
                  />
                </li>
              )
            }

            return (
              <li key={t.id} className={on ? 'arc-beat on' : 'arc-beat'}>
                <div className="arc-rail" aria-hidden>
                  <span className="arc-dot" />
                  {i < list.length - 1 ? <span className="arc-line" /> : null}
                </div>
                <button
                  type="button"
                  className="arc-card"
                  onClick={() => t.caseId && onJump(t.caseId)}
                >
                  <span className="arc-year mono">{t.year}</span>
                  <span className="arc-case">{c?.name || (mode === 'record' ? 'Bronner record' : 'Unknown case')}</span>
                  <span className="arc-label">{t.label}</span>
                  {t.note ? <span className="arc-note">{t.note}</span> : null}
                  {on ? <span className="arc-you mono">You are here</span> : null}
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
