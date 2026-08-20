import { useMemo, useState } from 'react'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { FactCard, FactDetail } from '../components/facts/FactCard'
import { MemoriseDeck } from '../components/facts/MemoriseDeck'
import { CaseAtBarPanel } from '../components/facts/CaseAtBarPanel'
import { DoctrineTimeline } from '../components/library/DoctrineTimeline'
import { useFacts } from '../hooks/useFacts'
import { useCaseLibrary } from '../hooks/useCaseLibrary'
import { ARGUMENT_TAGS, FACT_SIDES, FACT_SUBSECTIONS } from '../data/factsSeed'
import * as ScrollArea from '@radix-ui/react-scroll-area'

/**
 * Case facts: Case at bar PDF + notes, guide-seeded fact cards, timeline, memorise.
 */
export function FactsPage() {
  const f = useFacts()
  const lib = useCaseLibrary()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (f.subsection !== 'all') n += 1
    if (f.side !== 'all') n += 1
    if (f.argumentTag !== 'all') n += 1
    return n
  }, [f.subsection, f.side, f.argumentTag])

  return (
    <section className="workspace facts-room">
      <header className="workspace-head">
        <div>
          <h1>Case facts</h1>
          <p className="lede">
            Start with the Case at bar PDF: highlight, annotate, and write working notes. Fact cards
            and the record timeline sit beside that when you need them.
          </p>
        </div>
        <div className="head-actions">
          <div className="view-toggle" role="tablist">
            {[
              { id: 'record', label: 'Case at bar' },
              { id: 'browse', label: 'Fact cards' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'memorise', label: 'Memorise' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={f.view === t.id ? 'on' : ''}
                onClick={() => f.setView(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {f.view === 'browse' ? (
            <button type="button" className="btn-ink" onClick={f.addFact}>
              <Plus size={16} /> Add fact
            </button>
          ) : null}
        </div>
      </header>

      <div hidden={f.view !== 'record'}>
        <CaseAtBarPanel lib={lib} />
      </div>

      {f.view === 'timeline' ? (
        <DoctrineTimeline
          timeline={lib.timeline}
          cases={lib.cases}
          mode="record"
          onUpsert={lib.upsertTimeline}
          onRemove={lib.removeTimeline}
          onJump={() => {}}
        />
      ) : null}

      {f.view === 'memorise' ? (
        <>
          <div className="facts-toolbar facts-toolbar-slim">
            <div className="search-field">
              <Search size={16} strokeWidth={1.75} />
              <input
                value={f.query}
                onChange={(e) => f.setQuery(e.target.value)}
                placeholder="Filter memorise lines…"
                aria-label="Filter memorise lines"
              />
            </div>
          </div>
          <MemoriseDeck facts={f.filtered} />
        </>
      ) : null}

      {f.view === 'browse' ? (
        <>
          <div className="facts-toolbar facts-toolbar-slim">
            <div className="facts-toolbar-row">
              <div className="search-field">
                <Search size={16} strokeWidth={1.75} />
                <input
                  value={f.query}
                  onChange={(e) => f.setQuery(e.target.value)}
                  placeholder="Search facts, cites, tags…"
                  aria-label="Search facts"
                />
              </div>
              <button
                type="button"
                className={filtersOpen || activeFilterCount ? 'btn-soft on' : 'btn-soft'}
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal size={14} />
                Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
              </button>
              {activeFilterCount ? (
                <button
                  type="button"
                  className="btn-soft"
                  onClick={() => {
                    f.setSubsection('all')
                    f.setSide('all')
                    f.setArgumentTag('all')
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>

            {filtersOpen ? (
              <div className="facts-filter-panel">
                <label className="facts-filter-field">
                  <span className="mono">Section</span>
                  <select
                    value={f.subsection}
                    onChange={(e) => f.setSubsection(e.target.value)}
                  >
                    <option value="all">All sections</option>
                    {FACT_SUBSECTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="facts-filter-field">
                  <span className="mono">Side</span>
                  <select value={f.side} onChange={(e) => f.setSide(e.target.value)}>
                    <option value="all">All sides</option>
                    {FACT_SIDES.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="facts-filter-field">
                  <span className="mono">Argument</span>
                  <select
                    value={f.argumentTag}
                    onChange={(e) => f.setArgumentTag(e.target.value)}
                  >
                    <option value="all">Any argument</option>
                    {ARGUMENT_TAGS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>

          <div className="facts-split">
            <ScrollArea.Root className="facts-list-pane">
              <ScrollArea.Viewport className="facts-list-viewport">
                <div className="facts-count mono">{f.filtered.length} facts</div>
                {f.filtered.map((fact) => (
                  <FactCard
                    key={fact.id}
                    fact={fact}
                    active={fact.id === f.selectedId}
                    onSelect={f.setSelectedId}
                  />
                ))}
                {!f.filtered.length ? (
                  <p className="facts-empty">Nothing matched. Clear a filter or add a fact.</p>
                ) : null}
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="vertical" className="rail-bar">
                <ScrollArea.Thumb className="rail-thumb" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>

            <FactDetail
              fact={f.selected}
              argumentOptions={ARGUMENT_TAGS}
              onChange={(patch) => f.selected && f.updateFact(f.selected.id, patch)}
              onDelete={f.removeFact}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}
