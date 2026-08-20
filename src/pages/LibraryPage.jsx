import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Maximize2, Plus, Search } from 'lucide-react'
import { Tag } from '../components/CaseCard'
import { CaseMetaEditor } from '../components/library/CaseMetaEditor'
import { CaseFilesPanel } from '../components/library/CaseFilesPanel'
import { CaseNotesHub } from '../components/library/CaseNotesHub'
import { CitePopup } from '../components/library/CitePopup'
import { DoctrineTimeline } from '../components/library/DoctrineTimeline'
import { MatterTagBar } from '../components/library/MatterTagBar'
import { PdfViewer } from '../components/library/PdfViewer'
import { AnnotationPanel } from '../components/library/AnnotationPanel'
import { useCaseLibrary } from '../hooks/useCaseLibrary'
import { USEFULNESS } from '../data/caseResearchSeed'
import * as ScrollArea from '@radix-ui/react-scroll-area'

/**
 * Case library: browse list OR deep-dive one case with full-width notes.
 */
export function LibraryPage() {
  const [params, setParams] = useSearchParams()
  const lib = useCaseLibrary()
  const selectedId = params.get('case') || lib.cases[0]?.id
  const selected = lib.cases.find((c) => c.id === selectedId) || lib.cases[0]
  const [filter, setFilter] = useState('all')
  const [usefulFilter, setUsefulFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [pane, setPane] = useState('notes')
  const [editing, setEditing] = useState(false)
  const [notesTab, setNotesTab] = useState('understand')
  const [openCite, setOpenCite] = useState(null)
  const [deepDive, setDeepDive] = useState(true)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return lib.cases.filter((c) => {
      if (filter !== 'all' && String(c.issue) !== filter) return false
      if (usefulFilter !== 'all' && (c.usefulness || 'background') !== usefulFilter) return false
      if (!q) return true
      return [c.name, c.cite, c.holding, c.rule, c.usePetitioner, c.useRespondent]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [lib.cases, filter, usefulFilter, query])

  const caseFiles = lib.filesMeta.filter((f) => f.caseId === selected?.id)
  const activeId =
    lib.activeFileId && caseFiles.some((f) => f.id === lib.activeFileId)
      ? lib.activeFileId
      : caseFiles[0]?.id || null
  const fileMeta = caseFiles.find((f) => f.id === activeId)
  const fileBlob = activeId ? lib.blobs[activeId] : null
  const page = (activeId && lib.pageByFile[activeId]) || 1

  function selectCase(id) {
    setParams({ case: id })
    setEditing(false)
    setDeepDive(true)
    const first = lib.filesMeta.find((f) => f.caseId === id)
    if (first) lib.setActiveFileId(first.id)
  }

  function jumpToAnnotation(a) {
    if (a.fileId) lib.setActiveFileId(a.fileId)
    lib.setPage(a.fileId || activeId, a.page)
    setPane('read')
  }

  if (!selected) {
    return (
      <section className="workspace">
        <p>No cases yet.</p>
      </section>
    )
  }

  const citeFrom = openCite && lib.cases.find((c) => c.id === openCite.fromCaseId)
  const citeTo = openCite && lib.cases.find((c) => c.id === openCite.toCaseId)

  return (
    <section className={`workspace library-room editorial-room ${deepDive ? 'is-dive' : ''}`}>
      {!deepDive ? (
        <header className="workspace-head">
          <div>
            <h1>Case library</h1>
            <p className="lede">
              Pick a case to deep-dive. Flag what is core, useful, background, or a trap. You write
              and organise; the system holds it.
            </p>
          </div>
          <div className="head-actions">
            <button
              type="button"
              className="btn-soft"
              onClick={() => {
                const id = lib.addCase()
                setParams({ case: id })
                setEditing(true)
                setDeepDive(true)
                setPane('card')
              }}
            >
              <Plus size={16} /> Add case
            </button>
          </div>
        </header>
      ) : null}

      {!deepDive ? (
        <div className="facts-toolbar library-toolbar editorial-toolbar">
          <div className="search-field">
            <Search size={16} strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cases…"
              aria-label="Search cases"
            />
          </div>
          <div className="chip-row">
            {[
              { id: 'all', label: 'All issues' },
              { id: '1', label: 'Q1' },
              { id: '2', label: 'Q2' },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                className={filter === o.id ? 'filter-chip on' : 'filter-chip'}
                onClick={() => setFilter(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="chip-row">
            <button
              type="button"
              className={usefulFilter === 'all' ? 'filter-chip on' : 'filter-chip'}
              onClick={() => setUsefulFilter('all')}
            >
              Any flag
            </button>
            {USEFULNESS.map((u) => (
              <button
                key={u.id}
                type="button"
                className={usefulFilter === u.id ? 'filter-chip on' : 'filter-chip'}
                onClick={() => setUsefulFilter(u.id)}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={deepDive ? 'library-dive' : 'library-split library-split-quiet'}>
        {!deepDive ? (
          <ScrollArea.Root className="library-list quiet-list">
            <ScrollArea.Viewport className="library-list-viewport">
              {list.map((c) => {
                const nFiles = lib.filesMeta.filter((f) => f.caseId === c.id).length
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={c.id === selected.id ? 'case-row soft-row on' : 'case-row soft-row'}
                    onClick={() => selectCase(c.id)}
                  >
                    <div className="case-row-top">
                      <strong>{c.name}</strong>
                      {c.tag ? <Tag tone={c.issue === 2 ? 'q2' : 'q1'}>{c.tag}</Tag> : null}
                    </div>
                    <span className="mono cite">{c.cite}</span>
                    <p className="case-row-blurb">{c.holding}</p>
                    <div className="case-row-flags">
                      <span className={`useful-pill useful-${c.usefulness || 'background'}`}>
                        {c.usefulness || 'background'}
                      </span>
                      {nFiles > 0 ? (
                        <span className="mono case-file-count">
                          {nFiles} PDF{nFiles === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="rail-bar">
              <ScrollArea.Thumb className="rail-thumb" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        ) : null}

        <div className="library-detail quiet-detail dive-detail">
          <div className="sticky-case-bar dive-bar">
            <div className="dive-bar-left">
              {deepDive ? (
                <button type="button" className="btn-soft" onClick={() => setDeepDive(false)}>
                  <ArrowLeft size={15} /> All cases
                </button>
              ) : (
                <button type="button" className="btn-soft" onClick={() => setDeepDive(true)}>
                  <Maximize2 size={15} /> Deep dive
                </button>
              )}
              <div>
                <h2 className="sticky-case-name">{selected.name}</h2>
                <p className="mono sticky-case-cite">{selected.cite}</p>
              </div>
            </div>
            <MatterTagBar
              value={selected.usefulness || 'background'}
              onChange={(usefulness) => lib.updateCase(selected.id, { usefulness })}
            />
          </div>

          <div className="view-toggle editorial-toggle" role="tablist">
            {[
              { id: 'card', label: 'Card' },
              { id: 'read', label: 'PDF' },
              { id: 'notes', label: 'Notes' },
              { id: 'timeline', label: 'Doctrine arc' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={pane === t.id ? 'on' : ''}
                onClick={() => setPane(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {pane === 'card' || editing ? (
            <>
              <CaseMetaEditor
                caseItem={selected}
                editing={editing}
                onToggleEdit={() => setEditing((v) => !v)}
                onChange={(patch) => lib.updateCase(selected.id, patch)}
              />
              {pane === 'card' ? (
                <CaseFilesPanel
                  caseId={selected.id}
                  caseName={selected.name}
                  filesMeta={lib.filesMeta}
                  blobs={lib.blobs}
                  activeFileId={activeId}
                  suggestedFile={selected.suggestedFile}
                  onSelect={(id) => {
                    lib.setActiveFileId(id)
                    setPane('read')
                  }}
                  onAttach={lib.attachFiles}
                  onRemove={lib.removeFile}
                />
              ) : null}
            </>
          ) : null}

          {pane === 'read' ? (
            <div className="library-read-stack">
              <CaseFilesPanel
                caseId={selected.id}
                caseName={selected.name}
                filesMeta={lib.filesMeta}
                blobs={lib.blobs}
                activeFileId={activeId}
                suggestedFile={selected.suggestedFile}
                onSelect={(id) => lib.setActiveFileId(id)}
                onAttach={lib.attachFiles}
                onRemove={lib.removeFile}
              />
              <div className="library-read">
                <PdfViewer
                  file={fileBlob}
                  fileName={fileMeta?.name}
                  page={page}
                  caseId={selected.id}
                  onPageChange={(p) => activeId && lib.setPage(activeId, p)}
                  suggestedFile={selected.suggestedFile}
                  highlights={lib.annotations.filter(
                    (a) =>
                      a.caseId === selected.id &&
                      (!a.fileId || a.fileId === activeId) &&
                      a.kind === 'highlight'
                  )}
                  onHighlight={({ page: p, quote, rects, text }) =>
                    lib.upsertAnnotation({
                      caseId: selected.id,
                      fileId: activeId,
                      page: p,
                      quote,
                      rects,
                      text,
                      kind: 'highlight',
                    })
                  }
                />
                <AnnotationPanel
                  caseId={selected.id}
                  page={page}
                  annotations={lib.annotations.filter(
                    (a) => a.caseId === selected.id && (!a.fileId || a.fileId === activeId)
                  )}
                  onAdd={({ page: p, text }) =>
                    lib.upsertAnnotation({
                      caseId: selected.id,
                      fileId: activeId,
                      page: p,
                      text,
                      kind: 'page',
                    })
                  }
                  onUpdate={(id, patch) => lib.updateAnnotation(id, patch)}
                  onRemove={lib.removeAnnotation}
                  onJump={(p) => activeId && lib.setPage(activeId, p)}
                />
              </div>
            </div>
          ) : null}

          {pane === 'notes' ? (
            <CaseNotesHub
              tab={notesTab}
              onTabChange={setNotesTab}
              caseId={selected.id}
              caseItem={selected}
              annotations={lib.annotations}
              onJumpToPage={jumpToAnnotation}
              lib={lib}
              onOpenCite={setOpenCite}
              onJumpCase={selectCase}
              issueFilter={filter === 'all' ? String(selected.issue) : filter}
            />
          ) : null}

          {pane === 'timeline' ? (
            <DoctrineTimeline
              timeline={lib.timeline}
              cases={lib.cases}
              mode="doctrine"
              issueFilter={filter === 'all' ? String(selected.issue) : filter}
              highlightCaseId={selected.id}
              onUpsert={lib.upsertTimeline}
              onRemove={lib.removeTimeline}
              onJump={selectCase}
            />
          ) : null}
        </div>
      </div>

      <CitePopup
        cite={openCite}
        fromCase={citeFrom}
        toCase={citeTo}
        onClose={() => setOpenCite(null)}
        onJump={(id) => {
          setOpenCite(null)
          if (id) {
            selectCase(id)
            setPane('notes')
            setNotesTab('understand')
          }
        }}
      />
    </section>
  )
}
