/**
 * Mid-prep popup: what the cited case says, the quote/context, and a jump.
 */
export function CitePopup({ cite, fromCase, toCase, onClose, onJump }) {
  if (!cite) return null

  return (
    <div className="cite-overlay" onClick={onClose} role="presentation">
      <div
        className="cite-popup"
        role="dialog"
        aria-label="Citation context"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cite-popup-head">
          <div>
            <p className="mono cite-popup-kicker">
              {fromCase?.name || 'This case'} cites {toCase?.name || 'another case'}
            </p>
            <h3>{toCase?.name || 'Cited case'}</h3>
            <p className="mono cite-popup-cite">{toCase?.cite}</p>
          </div>
          <button type="button" className="btn-soft" onClick={onClose}>
            Close
          </button>
        </div>

        {cite.pin ? <p className="source-chip mono">{cite.pin}</p> : null}

        {cite.quote ? <blockquote className="cite-quote">“{cite.quote}”</blockquote> : null}

        <dl className="case-meta-grid soft-dl">
          <div>
            <dt className="mono">Context in the citing opinion</dt>
            <dd>{cite.context || 'Add context so OA-you remembers why this cite appears.'}</dd>
          </div>
          <div>
            <dt className="mono">Why it matters for prep</dt>
            <dd>{cite.why || '—'}</dd>
          </div>
          <div>
            <dt className="mono">Holding (cited case)</dt>
            <dd>{toCase?.holding || '—'}</dd>
          </div>
          <div className="dual-use">
            <div>
              <dt className="mono">Petitioner use</dt>
              <dd>{toCase?.usePetitioner || '—'}</dd>
            </div>
            <div>
              <dt className="mono">Respondent use</dt>
              <dd>{toCase?.useRespondent || '—'}</dd>
            </div>
          </div>
        </dl>

        <div className="cite-popup-actions">
          <button type="button" className="btn-ink" onClick={() => onJump(toCase?.id)}>
            Open {toCase?.name?.split(' v.')[0] || 'case'}
          </button>
        </div>
      </div>
    </div>
  )
}
