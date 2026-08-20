import { CASE_NOTE_LAYERS } from '../../data/casesSeed'
import { NoteEditor } from '../NoteEditor'
import { OpinionsPanel } from './OpinionsPanel'
import { PrecedentFactsPanel } from './PrecedentFactsPanel'
import { CitesPanel } from './CitesPanel'
import { DoctrineTimeline } from './DoctrineTimeline'

const TABS = [
  { id: 'understand', label: 'Understand' },
  { id: 'facts', label: 'Facts' },
  { id: 'opinions', label: 'Opinions' },
  { id: 'cites', label: 'Cites' },
  { id: 'timeline', label: 'Timelines' },
  { id: 'use', label: 'Both sides' },
]

function seedFor(layerId, caseItem) {
  const layer = CASE_NOTE_LAYERS.find((l) => l.id === layerId) || CASE_NOTE_LAYERS[0]
  return `<h2>${layer.label}</h2><p>${layer.hint}</p><p><em>${caseItem?.name || ''}</em></p><ul><li></li></ul>`
}

/**
 * Deep research surface for one case. Meant to feel like the main page, not a sidebar.
 */
export function CaseNotesHub({
  tab,
  onTabChange,
  caseId,
  caseItem,
  annotations,
  onJumpToPage,
  lib,
  onOpenCite,
  onJumpCase,
  issueFilter,
}) {
  const overview = CASE_NOTE_LAYERS[0]

  return (
    <div className="notes-hub dive">
      <div className="notes-hub-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'layer-chip on' : 'layer-chip'}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'understand' ? (
        <div className="dive-stack">
          <p className="notes-hub-hint">{overview.hint}</p>
          <div className="dive-editor">
            <NoteEditor
              key={`${caseId}-overview`}
              html={lib.getLayerNotes(caseId).overview || seedFor('overview', caseItem)}
              onChange={(html) => lib.setLayerNote(caseId, 'overview', html)}
            />
          </div>
          <details className="anno-map-details">
            <summary className="mono">PDF annotation map ({annotations.filter((a) => a.caseId === caseId).length})</summary>
            <ul className="anno-map-list">
              {annotations.filter((a) => a.caseId === caseId).length === 0 ? (
                <li className="anno-empty">None yet. Add them while reading the PDF.</li>
              ) : (
                annotations
                  .filter((a) => a.caseId === caseId)
                  .map((a) => (
                    <li key={a.id}>
                      <button type="button" className="anno-map-item" onClick={() => onJumpToPage(a)}>
                        <span className="mono">p. {a.page}</span>
                        <span className="anno-map-text">{a.text || '(empty)'}</span>
                      </button>
                    </li>
                  ))
              )}
            </ul>
          </details>
        </div>
      ) : null}

      {tab === 'facts' ? (
        <PrecedentFactsPanel
          caseId={caseId}
          facts={lib.caseFacts}
          onUpsert={lib.upsertCaseFact}
          onRemove={lib.removeCaseFact}
        />
      ) : null}

      {tab === 'opinions' ? (
        <OpinionsPanel
          caseId={caseId}
          opinions={lib.opinions}
          cases={lib.cases}
          cites={lib.cites}
          onUpsert={lib.upsertOpinion}
          onRemove={lib.removeOpinion}
          onOpenCite={onOpenCite}
          onJump={onJumpCase}
        />
      ) : null}

      {tab === 'cites' ? (
        <CitesPanel
          caseId={caseId}
          cites={lib.cites}
          cases={lib.cases}
          onUpsert={lib.upsertCite}
          onRemove={lib.removeCite}
          onOpenCite={onOpenCite}
          onJump={onJumpCase}
        />
      ) : null}

      {tab === 'timeline' ? (
        <div className="timeline-pair">
          <DoctrineTimeline
            timeline={lib.timeline}
            cases={lib.cases}
            mode="doctrine"
            issueFilter={issueFilter || 'all'}
            highlightCaseId={caseId}
            onUpsert={lib.upsertTimeline}
            onRemove={lib.removeTimeline}
            onJump={onJumpCase}
          />
          <DoctrineTimeline
            timeline={lib.timeline}
            cases={lib.cases}
            mode="procedural"
            highlightCaseId={caseId}
            onUpsert={lib.upsertTimeline}
            onRemove={lib.removeTimeline}
            onJump={onJumpCase}
          />
        </div>
      ) : null}

      {tab === 'use' ? (
        <div className="use-split dive-use">
          {['petitioner', 'respondent'].map((side) => {
            const meta = CASE_NOTE_LAYERS.find((l) => l.id === side)
            const html = lib.getLayerNotes(caseId)[side]
            return (
              <div key={side} className="use-pane dive-pane">
                <h3 className="use-pane-title">{meta.label}</h3>
                <p className="notes-hub-hint">{meta.hint}</p>
                <div className="dive-editor">
                  <NoteEditor
                    key={`${caseId}-${side}`}
                    html={html || seedFor(side, caseItem)}
                    onChange={(h) => lib.setLayerNote(caseId, side, h)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
