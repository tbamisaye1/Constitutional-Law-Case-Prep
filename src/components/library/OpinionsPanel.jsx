import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { OPINION_KINDS } from '../../data/caseResearchSeed'
import { NoteEditor } from '../NoteEditor'

/**
 * Opinions by justice with a real writing surface:
 * pick an opinion → full TipTap body + cite links to other library cases.
 */
export function OpinionsPanel({ caseId, opinions, cases, cites, onUpsert, onRemove, onOpenCite, onJump }) {
  const list = opinions.filter((o) => o.caseId === caseId)
  const [selectedId, setSelectedId] = useState(list[0]?.id || null)
  const selected = list.find((o) => o.id === selectedId) || list[0] || null

  const linkedCites = useMemo(() => {
    if (!selected) return []
    const ids = selected.citedCaseIds || []
    return cites.filter(
      (c) =>
        (c.fromCaseId === caseId && ids.includes(c.toCaseId)) ||
        ids.includes(c.toCaseId) ||
        ids.includes(c.fromCaseId)
    )
  }, [selected, cites, caseId])

  function add(kind) {
    const id = `op-${Date.now()}`
    onUpsert({
      id,
      caseId,
      kind,
      justice: '',
      joinedBy: '',
      page: '',
      summary: '',
      notes: '',
      bodyHtml: `<h2>${kind}</h2><p>Flesh out the argument: holdings, reasoning, quotes with pins, how each side uses this opinion, cases it relies on.</p><ul><li></li></ul>`,
      citedCaseIds: [],
    })
    setSelectedId(id)
  }

  function toggleCited(targetId) {
    if (!selected) return
    const cur = selected.citedCaseIds || []
    const next = cur.includes(targetId) ? cur.filter((x) => x !== targetId) : [...cur, targetId]
    onUpsert({ ...selected, citedCaseIds: next })
  }

  return (
    <div className="opinions-workspace">
      <div className="opinions-side">
        <div className="research-add-row">
          {OPINION_KINDS.map((k) => (
            <button key={k.id} type="button" className="btn-soft" onClick={() => add(k.id)}>
              <Plus size={14} /> {k.label}
            </button>
          ))}
        </div>
        <ul className="opinion-nav">
          {list.length === 0 ? (
            <li className="files-empty">Add a majority (or concurrence / dissent) to start writing.</li>
          ) : (
            list.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={o.id === selected?.id ? `op-nav-item on kind-${o.kind}` : `op-nav-item kind-${o.kind}`}
                  onClick={() => setSelectedId(o.id)}
                >
                  <span className="mono op-kind">{o.kind}</span>
                  <strong>{o.justice || 'Unnamed justice'}</strong>
                  <span className="op-sum">{o.summary || 'No summary yet'}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="opinions-main">
        {!selected ? (
          <p className="files-empty">Select or add an opinion.</p>
        ) : (
          <>
            <div className="opinion-meta-bar">
              <select
                className="fact-input"
                value={selected.kind}
                onChange={(e) => onUpsert({ ...selected, kind: e.target.value })}
              >
                {OPINION_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
              <input
                className="fact-input"
                value={selected.justice}
                placeholder="Justice (e.g. Roberts, C.J.)"
                onChange={(e) => onUpsert({ ...selected, justice: e.target.value })}
              />
              <input
                className="fact-input"
                value={selected.joinedBy || ''}
                placeholder="Joined by"
                onChange={(e) => onUpsert({ ...selected, joinedBy: e.target.value })}
              />
              <input
                className="fact-input mono"
                value={selected.page || ''}
                placeholder="pg / pin"
                onChange={(e) => onUpsert({ ...selected, page: e.target.value })}
              />
              <button
                type="button"
                className="icon-btn soft"
                aria-label="Delete opinion"
                onClick={() => {
                  onRemove(selected.id)
                  setSelectedId(null)
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>

            <label className="field-label mono">One-line summary</label>
            <input
              className="fact-input"
              value={selected.summary || ''}
              onChange={(e) => onUpsert({ ...selected, summary: e.target.value })}
              placeholder="What this opinion stands for in one line"
            />

            <label className="field-label mono">Full write-up</label>
            <p className="research-hint">
              Explore the argument fully: quotes, reasoning, traps, how petitioner and respondent
              each use this opinion. Link other cases below.
            </p>
            <div className="opinion-editor-shell">
              <NoteEditor
                key={selected.id}
                html={selected.bodyHtml || selected.notes || '<p></p>'}
                onChange={(html) => onUpsert({ ...selected, bodyHtml: html, notes: html })}
              />
            </div>

            <div className="opinion-cites-block">
              <h4>Cases this opinion talks about</h4>
              <p className="research-hint">
                Tag library cases it cites or distinguishes. Preview opens the cite popup; jump opens
                that case.
              </p>
              <div className="cite-tag-row">
                {cases
                  .filter((c) => c.id !== caseId)
                  .map((c) => {
                    const on = (selected.citedCaseIds || []).includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={on ? 'cite-tag on' : 'cite-tag'}
                        onClick={() => toggleCited(c.id)}
                      >
                        {c.name}
                      </button>
                    )
                  })}
              </div>
              {(selected.citedCaseIds || []).length > 0 ? (
                <ul className="linked-cite-actions">
                  {(selected.citedCaseIds || []).map((id) => {
                    const c = cases.find((x) => x.id === id)
                    const edge =
                      linkedCites.find((x) => x.toCaseId === id || x.fromCaseId === id) || null
                    return (
                      <li key={id}>
                        <span>{c?.name}</span>
                        <button type="button" className="btn-soft" onClick={() => onJump(id)}>
                          Jump
                        </button>
                        {edge ? (
                          <button type="button" className="btn-soft" onClick={() => onOpenCite(edge)}>
                            Preview cite
                          </button>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
