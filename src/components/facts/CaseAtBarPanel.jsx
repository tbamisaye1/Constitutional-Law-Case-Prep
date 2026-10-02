import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CaseFilesPanel } from '../library/CaseFilesPanel'
import { PdfViewer } from '../library/PdfViewer'
import { AnnotationPanel } from '../library/AnnotationPanel'
import { NoteEditor } from '../NoteEditor'
import { SyncBanner } from '../SyncBanner'
import { CASE_AT_BAR_ID, CASE_AT_BAR_LABEL } from '../../data/caseAtBar'

/**
 * Upload / read the record PDF, highlight, annotate, and keep working notes.
 * Reuses library PDF storage under a reserved case id.
 * Deep-link: /facts?view=record&file=&page=&q=
 */
export function CaseAtBarPanel({ lib }) {
  const [params, setParams] = useSearchParams()
  const [mode, setMode] = useState('read') // read | notes
  const [focusAnnotationId, setFocusAnnotationId] = useState(null)
  const [focusHighlightId, setFocusHighlightId] = useState(null)
  const paramFile = params.get('file')
  const paramPage = Number(params.get('page') || 0)
  const focusQuote = params.get('q') || ''

  const caseFiles = lib.filesMeta.filter((f) => f.caseId === CASE_AT_BAR_ID)
  const activeId =
    (paramFile && caseFiles.some((f) => f.id === paramFile) && paramFile) ||
    (lib.activeFileId && caseFiles.some((f) => f.id === lib.activeFileId)
      ? lib.activeFileId
      : caseFiles[0]?.id || null)
  const fileMeta = caseFiles.find((f) => f.id === activeId)
  const fileBlob = activeId ? lib.blobs[activeId] : null
  const page =
    (paramPage > 0 && (!paramFile || paramFile === activeId) ? paramPage : null) ||
    (activeId && lib.pageByFile[activeId]) ||
    1
  const notes = lib.getLayerNotes(CASE_AT_BAR_ID)

  useEffect(() => {
    if (paramFile && caseFiles.some((f) => f.id === paramFile)) {
      lib.setActiveFileId(paramFile)
      setMode('read')
    }
    if (paramPage > 0 && (paramFile || activeId)) {
      lib.setPage(paramFile || activeId, paramPage)
      setMode('read')
    }
    if (focusQuote) setMode('read')
  }, [paramFile, paramPage, focusQuote]) // eslint-disable-line react-hooks/exhaustive-deps

  function jumpToAnnotation(a) {
    if (a.fileId) lib.setActiveFileId(a.fileId)
    lib.setPage(a.fileId || activeId, a.page)
    setMode('read')
  }

  return (
    <div className="case-at-bar">
      <div className="case-at-bar-intro">
        <p>
          Upload the record (or opinion excerpt) you are arguing from. Select text to highlight,
          add page notes, and keep a free-form working page beside it. The same PDF is indexed for
          Ask AI, so the agent can cite this Instant Case alongside other corpus sources.
        </p>
        <div className="view-toggle case-at-bar-modes" role="tablist" aria-label="Case at bar mode">
          <button
            type="button"
            className={mode === 'read' ? 'on' : ''}
            onClick={() => setMode('read')}
          >
            Read PDF
          </button>
          <button
            type="button"
            className={mode === 'notes' ? 'on' : ''}
            onClick={() => setMode('notes')}
          >
            Working notes
          </button>
        </div>
      </div>

      <SyncBanner
        sync={lib.sync}
        saveError={lib.saveError}
        lastSavedAt={lib.lastSavedAt}
        onSyncNow={lib.syncNow}
      />

      <div hidden={mode !== 'read'}>
        <div className="library-read-stack case-at-bar-read">
          <CaseFilesPanel
            caseId={CASE_AT_BAR_ID}
            caseName={CASE_AT_BAR_LABEL}
            filesMeta={lib.filesMeta}
            blobs={lib.blobs}
            activeFileId={activeId}
            suggestedFile="Bronner record / Joint Appendix PDF"
            onSelect={(id) => lib.setActiveFileId(id)}
            onAttach={lib.attachFiles}
            onRemove={lib.removeFile}
          />
          <div className="library-read">
            <PdfViewer
              file={fileBlob}
              fileName={fileMeta?.name}
              page={page}
              caseId={CASE_AT_BAR_ID}
              fileId={activeId}
              focusQuote={focusQuote}
              onPageChange={(p) => activeId && lib.setPage(activeId, p)}
              suggestedFile="Upload the case at bar PDF above"
              highlights={lib.annotations.filter(
                (a) =>
                  a.caseId === CASE_AT_BAR_ID &&
                  (!a.fileId || a.fileId === activeId) &&
                  a.kind === 'highlight'
              )}
              onHighlight={({ page: p, quote, rects, text, color }) =>
                lib.upsertAnnotation({
                  caseId: CASE_AT_BAR_ID,
                  fileId: activeId,
                  page: p,
                  quote,
                  rects,
                  text,
                  color,
                  kind: 'highlight',
                })
              }
              onSelectHighlight={(id) => setFocusAnnotationId(id)}
              focusHighlightId={focusHighlightId}
            />
            <AnnotationPanel
              caseId={CASE_AT_BAR_ID}
              page={page}
              annotations={lib.annotations.filter(
                (a) => a.caseId === CASE_AT_BAR_ID && (!a.fileId || a.fileId === activeId)
              )}
              onAdd={({ page: p, text, kind }) =>
                lib.upsertAnnotation({
                  caseId: CASE_AT_BAR_ID,
                  fileId: activeId,
                  page: kind === 'general' ? 0 : p,
                  text,
                  kind: kind || 'page',
                })
              }
              onUpdate={(id, patch) => lib.updateAnnotation(id, patch)}
              onRemove={lib.removeAnnotation}
              onJump={(anno) => {
                if (!activeId || !anno?.page) return
                const targetPage = Number(anno.page) || 1
                const fileId = anno.fileId || activeId
                if (anno.fileId) lib.setActiveFileId(anno.fileId)
                lib.setPage(fileId, targetPage)
                const next = new URLSearchParams(params)
                next.set('file', fileId)
                next.set('page', String(targetPage))
                setParams(next, { replace: true })
                setMode('read')
                setFocusHighlightId(null)
                setFocusAnnotationId(anno.id || null)
                window.setTimeout(() => setFocusHighlightId(anno.id || null), 0)
              }}
              onFlush={lib.syncNow}
              focusAnnotationId={focusAnnotationId}
            />
          </div>
        </div>
      </div>

      <div hidden={mode !== 'notes'}>
        <div className="case-at-bar-notes">
          <div className="case-at-bar-notes-head">
            <h3>Working notes</h3>
            <p className="mono">
              Outline what matters in the record, flag traps, link page numbers from your
              highlights.
            </p>
          </div>
          <div className="case-at-bar-notes-body">
            <NoteEditor
              html={notes.overview || '<p></p>'}
              onChange={(html) => lib.setLayerNote(CASE_AT_BAR_ID, 'overview', html)}
            />
          </div>
          {lib.annotations.some((a) => a.caseId === CASE_AT_BAR_ID) ? (
            <details className="case-at-bar-anno-map" open>
              <summary className="mono">
                Highlights &amp; page notes (
                {lib.annotations.filter((a) => a.caseId === CASE_AT_BAR_ID).length})
              </summary>
              <ul>
                {lib.annotations
                  .filter((a) => a.caseId === CASE_AT_BAR_ID)
                  .sort((a, b) => a.page - b.page || (b.savedAt || 0) - (a.savedAt || 0))
                  .map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className="anno-jump"
                        onClick={() => jumpToAnnotation(a)}
                      >
                        p.{a.page}
                      </button>
                      <span>{a.quote || a.text || '(empty note)'}</span>
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  )
}
