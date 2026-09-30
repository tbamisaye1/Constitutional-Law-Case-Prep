import { useMemo, useState } from 'react'
import { Columns2, Maximize2, Plus, X } from 'lucide-react'
import {
  CASE_NOTE_LAYERS,
  NOTE_TAB_KINDS,
  NOTE_TAB_TEMPLATES,
} from '../../data/casesSeed'
import { NoteEditor } from '../NoteEditor'
import { OpinionsPanel } from './OpinionsPanel'
import { PrecedentFactsPanel } from './PrecedentFactsPanel'
import { CitesPanel } from './CitesPanel'
import { DoctrineTimeline } from './DoctrineTimeline'

function seedText(label, hint, caseItem) {
  const title = label || 'Notes'
  const line = hint || 'Write freely. Nested bullets use Tab / Shift+Tab.'
  return `<h2>${title}</h2><p>${line}</p><p><em>${caseItem?.name || ''}</em></p><ul><li></li></ul>`
}

function seedForLayer(layerId, caseItem) {
  const layer = CASE_NOTE_LAYERS.find((l) => l.id === layerId) || CASE_NOTE_LAYERS[0]
  return seedText(layer.label, layer.hint, caseItem)
}

/**
 * Deep research surface for one case.
 *
 * Built-in chips (Understand, Facts, …) are templates. Add more tabs and pick
 * a kind: text, facts, opinions, cites, timeline, or both-sides.
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
  const [adding, setAdding] = useState(false)
  const [draftLabel, setDraftLabel] = useState('')
  const [draftKind, setDraftKind] = useState('text')

  const customTabs = useMemo(
    () => (lib.noteTabs || []).filter((t) => t.caseId === caseId),
    [lib.noteTabs, caseId]
  )

  const tabs = useMemo(() => [...NOTE_TAB_TEMPLATES, ...customTabs], [customTabs])

  const active = tabs.find((t) => t.id === tab) || tabs[0]

  function submitAdd(event) {
    event.preventDefault()
    const label = draftLabel.trim() || NOTE_TAB_KINDS.find((k) => k.id === draftKind)?.label || 'Tab'
    const created = lib.addNoteTab({ caseId, label, kind: draftKind })
    if (created?.id) onTabChange(created.id)
    setDraftLabel('')
    setDraftKind('text')
    setAdding(false)
  }

  function removeCustom(tabId) {
    const target = customTabs.find((t) => t.id === tabId)
    if (!target) return
    if (!window.confirm(`Remove tab “${target.label}”? Text on a text tab is deleted too.`)) return
    lib.removeNoteTab(tabId)
    if (tab === tabId) onTabChange('understand')
  }

  return (
    <div className="notes-hub dive">
      <div className="notes-hub-nav">
        {tabs.map((t) =>
          t.template ? (
            <button
              key={t.id}
              type="button"
              className={t.id === active?.id ? 'layer-chip on' : 'layer-chip'}
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
            </button>
          ) : (
            <div key={t.id} className={t.id === active?.id ? 'layer-chip-wrap on' : 'layer-chip-wrap'}>
              <button
                type="button"
                className={t.id === active?.id ? 'layer-chip on' : 'layer-chip'}
                onClick={() => onTabChange(t.id)}
              >
                {t.label}
              </button>
              <button
                type="button"
                className="layer-chip-x"
                aria-label={`Remove ${t.label}`}
                title="Remove tab"
                onClick={() => removeCustom(t.id)}
              >
                <X size={12} />
              </button>
            </div>
          )
        )}
        <button
          type="button"
          className={adding ? 'layer-chip on' : 'layer-chip layer-chip-add'}
          onClick={() => setAdding((v) => !v)}
        >
          <Plus size={12} /> Add tab
        </button>
      </div>

      {adding ? (
        <form className="note-tab-add" onSubmit={submitAdd}>
          <div className="note-tab-add-fields">
            <div className="note-tab-field">
              <label className="field-label mono" htmlFor="note-tab-label">
                Tab name
              </label>
              <input
                id="note-tab-label"
                className="fact-input"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="e.g. Hypo notes"
                autoFocus
              />
            </div>
            <div className="note-tab-field note-tab-field-kind">
              <label className="field-label mono" htmlFor="note-tab-kind">
                Kind
              </label>
              <select
                id="note-tab-kind"
                className="fact-input"
                value={draftKind}
                onChange={(e) => setDraftKind(e.target.value)}
              >
                {NOTE_TAB_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="note-tab-add-actions">
              <button type="submit" className="btn-ink">
                Add
              </button>
              <button type="button" className="btn-soft" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </div>
          <p className="note-tab-kind-hint mono">
            {NOTE_TAB_KINDS.find((k) => k.id === draftKind)?.hint}
          </p>
        </form>
      ) : null}

      {active && !adding ? (
        <TabBody
          tab={active}
          caseId={caseId}
          caseItem={caseItem}
          annotations={annotations}
          onJumpToPage={onJumpToPage}
          lib={lib}
          onOpenCite={onOpenCite}
          onJumpCase={onJumpCase}
          issueFilter={issueFilter}
        />
      ) : null}
    </div>
  )
}

function TabBody({
  tab,
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

  if (tab.kind === 'text') {
    const layerId = tab.layerId || tab.id
    const hint = tab.hint || overview.hint
    const html = lib.getLayerNotes(caseId)[layerId]
    const seed =
      tab.layerId != null
        ? seedForLayer(tab.layerId, caseItem)
        : seedText(tab.label, hint, caseItem)

    return (
      <div className="dive-stack">
        {tab.id === 'understand' ? <p className="notes-hub-hint">{hint}</p> : null}
        <div className="dive-editor">
          <NoteEditor
            key={`${caseId}-${layerId}`}
            html={html || seed}
            onChange={(next) => lib.setLayerNote(caseId, layerId, next)}
          />
        </div>
        {tab.id === 'understand' ? (
          <details className="anno-map-details">
            <summary className="mono">
              PDF annotation map ({annotations.filter((a) => a.caseId === caseId).length})
            </summary>
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
        ) : null}
      </div>
    )
  }

  if (tab.kind === 'facts') {
    return (
      <PrecedentFactsPanel
        caseId={caseId}
        facts={lib.caseFacts}
        onUpsert={lib.upsertCaseFact}
        onRemove={lib.removeCaseFact}
      />
    )
  }

  if (tab.kind === 'opinions') {
    return (
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
    )
  }

  if (tab.kind === 'cites') {
    return (
      <CitesPanel
        caseId={caseId}
        cites={lib.cites}
        cases={lib.cases}
        onUpsert={lib.upsertCite}
        onRemove={lib.removeCite}
        onOpenCite={onOpenCite}
        onJump={onJumpCase}
      />
    )
  }

  if (tab.kind === 'timeline') {
    return (
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
    )
  }

  if (tab.kind === 'use') {
    return (
      <BothSidesNotes
        caseId={caseId}
        caseItem={caseItem}
        tabId={tab.id}
        lib={lib}
      />
    )
  }

  return <p className="notes-hub-hint">Unknown tab kind.</p>
}

function BothSidesNotes({ caseId, caseItem, tabId, lib }) {
  const [focus, setFocus] = useState(null)
  const sides = focus ? [focus] : ['petitioner', 'respondent']

  return (
    <div className={focus ? 'use-split dive-use use-split-focus' : 'use-split dive-use'}>
      {sides.map((side) => {
        const meta = CASE_NOTE_LAYERS.find((l) => l.id === side)
        const html = lib.getLayerNotes(caseId)[side]
        const focused = focus === side
        return (
          <div key={side} className="use-pane dive-pane">
            <div className="use-pane-head">
              <div>
                <h3 className="use-pane-title">{meta.label}</h3>
                <p className="notes-hub-hint">{meta.hint}</p>
              </div>
              <button
                type="button"
                className="btn-soft use-focus-btn"
                onClick={() => setFocus(focused ? null : side)}
                title={focused ? 'Show both sides' : `Focus ${meta.label}`}
              >
                {focused ? (
                  <>
                    <Columns2 size={14} /> Both
                  </>
                ) : (
                  <>
                    <Maximize2 size={14} /> Focus
                  </>
                )}
              </button>
            </div>
            <div className="dive-editor">
              <NoteEditor
                key={`${caseId}-${side}-${tabId}`}
                html={html || seedForLayer(side, caseItem)}
                onChange={(h) => lib.setLayerNote(caseId, side, h)}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
