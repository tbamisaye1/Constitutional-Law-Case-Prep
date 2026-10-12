import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from 'lucide-react'

function stamp(at) {
  try {
    return new Date(at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function emptyDraft() {
  return { side: 'petitioner', from: '', argued: '', feedback: '' }
}

function draftFromEntry(entry) {
  return {
    side: entry?.side === 'respondent' ? 'respondent' : 'petitioner',
    from: typeof entry?.from === 'string' ? entry.from : '',
    argued: typeof entry?.argued === 'string' ? entry.argued : '',
    feedback: typeof entry?.feedback === 'string' ? entry.feedback : '',
  }
}

function EntryFields({ draft, onChange, idPrefix }) {
  return (
    <>
      <label>
        Side
        <select
          value={draft.side}
          onChange={(e) => onChange({ ...draft, side: e.target.value })}
          aria-label={`${idPrefix} side`}
        >
          <option value="petitioner">Petitioner</option>
          <option value="respondent">Respondent</option>
        </select>
      </label>
      <label>
        From
        <input
          value={draft.from}
          onChange={(e) => onChange({ ...draft, from: e.target.value })}
          placeholder="Coach, judge, self…"
        />
      </label>
      <label className="span-2">
        What you argued
        <textarea
          value={draft.argued}
          onChange={(e) => onChange({ ...draft, argued: e.target.value })}
          placeholder="Prongs you ran, hard questions, what you said on the hinge…"
        />
      </label>
      <label className="span-2">
        Feedback
        <textarea
          value={draft.feedback}
          onChange={(e) => onChange({ ...draft, feedback: e.target.value })}
          placeholder="What landed, what to fix before the next run…"
        />
      </label>
    </>
  )
}

/**
 * Record each practice run: what you argued and the feedback you got.
 * Entries sync with the Arguments board across devices.
 */
export function PracticeLog({ entries, side, canEdit = true, onAdd, onUpdate, onRemove }) {
  const [open, setOpen] = useState(true)
  const [argued, setArgued] = useState('')
  const [feedback, setFeedback] = useState('')
  const [from, setFrom] = useState('')
  const [entrySide, setEntrySide] = useState(side || 'petitioner')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(emptyDraft)

  useEffect(() => {
    if (side === 'petitioner' || side === 'respondent') setEntrySide(side)
  }, [side])

  function submit(event) {
    event.preventDefault()
    if (!canEdit || (!argued.trim() && !feedback.trim())) return
    onAdd({
      side: entrySide,
      argued: argued.trim(),
      feedback: feedback.trim(),
      from: from.trim(),
    })
    setArgued('')
    setFeedback('')
    setFrom('')
  }

  function startEdit(entry) {
    setEditingId(entry.id)
    setEditDraft(draftFromEntry(entry))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft(emptyDraft())
  }

  function saveEdit(event) {
    event.preventDefault()
    if (!canEdit || !editingId || !onUpdate) return
    if (!editDraft.argued.trim() && !editDraft.feedback.trim()) return
    onUpdate(editingId, {
      side: editDraft.side,
      from: editDraft.from.trim(),
      argued: editDraft.argued.trim(),
      feedback: editDraft.feedback.trim(),
    })
    cancelEdit()
  }

  return (
    <section className="args-practice-log" aria-label="Practice log">
      <div className="args-practice-log-head">
        <div>
          <h2>Practice log</h2>
          <p>Each run and the feedback that came back, newest first.</p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {open ? 'Hide' : 'Show'}
          {entries?.length ? (
            <span className="args-practice-count mono">{entries.length}</span>
          ) : null}
        </button>
      </div>
      {open ? (
        <div className="args-practice-log-body">
          {canEdit ? (
            <form className="args-practice-form" onSubmit={submit}>
              <EntryFields
                idPrefix="New practice"
                draft={{ side: entrySide, from, argued, feedback }}
                onChange={(next) => {
                  setEntrySide(next.side)
                  setFrom(next.from)
                  setArgued(next.argued)
                  setFeedback(next.feedback)
                }}
              />
              <div className="args-practice-form-actions">
                <button type="submit" className="btn-ink" disabled={!argued.trim() && !feedback.trim()}>
                  <Plus size={15} strokeWidth={1.75} />
                  Add entry
                </button>
              </div>
            </form>
          ) : null}

          {!entries?.length ? (
            <p className="args-practice-empty">
              {canEdit
                ? 'No practice entries yet. Add one after a run.'
                : 'No practice entries yet.'}
            </p>
          ) : (
            <ul className="args-practice-list">
              {entries.map((entry) => {
                const isEditing = canEdit && editingId === entry.id
                return (
                  <li key={entry.id} className="args-practice-item">
                    {isEditing ? (
                      <form className="args-practice-form is-inline-edit" onSubmit={saveEdit}>
                        <EntryFields
                          idPrefix="Edit practice"
                          draft={editDraft}
                          onChange={setEditDraft}
                        />
                        <div className="args-practice-form-actions">
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={cancelEdit}
                          >
                            <X size={15} strokeWidth={1.75} />
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn-ink"
                            disabled={!editDraft.argued.trim() && !editDraft.feedback.trim()}
                          >
                            <Check size={15} strokeWidth={1.75} />
                            Save
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="args-practice-item-head">
                          <span className="args-practice-item-meta mono">
                            {stamp(entry.at)}
                            {' · '}
                            {entry.side === 'respondent' ? 'Respondent' : 'Petitioner'}
                            {entry.from ? ` · ${entry.from}` : ''}
                          </span>
                          {canEdit ? (
                            <div className="args-practice-item-actions">
                              <button
                                type="button"
                                className="icon-btn soft"
                                aria-label="Edit practice entry"
                                title="Edit this entry"
                                onClick={() => startEdit(entry)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn danger"
                                aria-label="Delete practice entry"
                                title="Delete this entry"
                                onClick={() => {
                                  if (window.confirm('Delete this practice entry?')) onRemove(entry.id)
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {entry.argued ? (
                          <div className="args-practice-block">
                            <h3>Argued</h3>
                            <p>{entry.argued}</p>
                          </div>
                        ) : null}
                        {entry.feedback ? (
                          <div className="args-practice-block is-feedback">
                            <h3>Feedback</h3>
                            <p>{entry.feedback}</p>
                          </div>
                        ) : null}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}
