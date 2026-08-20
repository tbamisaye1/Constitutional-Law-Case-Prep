import { useState } from 'react'
import { CaseFilesPanel } from '../library/CaseFilesPanel'
import { PdfViewer } from '../library/PdfViewer'
import { AnnotationPanel } from '../library/AnnotationPanel'
import { NoteEditor } from '../NoteEditor'
import { CASE_AT_BAR_ID, CASE_AT_BAR_LABEL } from '../../data/caseAtBar'

/**
 * Upload / read the record PDF, highlight, annotate, and keep working notes.
 * Reuses library PDF storage under a reserved case id.
 */
export function CaseAtBarPanel({ lib }) {
  const [mode, setMode] = useState('read') // read | notes
  const caseFiles = lib.filesMeta.filter((f) => f.caseId === CASE_AT_BAR_ID)
  const activeId =
    lib.activeFileId && caseFiles.some((f) => f.id === lib.activeFileId)
      ? lib.activeFileId
      : caseFiles[0]?.id || null
  const fileMeta = caseFiles.find((f) => f.id === activeId)
  const fileBlob = activeId ? lib.blobs[activeId] : null
  const page = (activeId && lib.pageByFile[activeId]) || 1
  const notes = lib.getLayerNotes(CASE_AT_BAR_ID)

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
          add page notes, and keep a free-form working page beside it.
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

      {lib.saveError ? <p className="save-banner error">{lib.saveError}</p> : null}
      <p className="save-banner mono">
        Saved in this browser only (survives refresh). Not uploaded to the backend yet.
        {lib.lastSavedAt ? ` Last write ${new Date(lib.lastSavedAt).toLocaleTimeString()}.` : ''}
      </p>

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
              onPageChange={(p) => activeId && lib.setPage(activeId, p)}
              suggestedFile="Upload the case at bar PDF above"
              highlights={lib.annotations.filter(
                (a) =>
                  a.caseId === CASE_AT_BAR_ID &&
                  (!a.fileId || a.fileId === activeId) &&
                  a.kind === 'highlight'
              )}
              onHighlight={({ page: p, quote, rects, text }) =>
                lib.upsertAnnotation({
                  caseId: CASE_AT_BAR_ID,
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
              caseId={CASE_AT_BAR_ID}
              page={page}
              annotations={lib.annotations.filter(
                (a) => a.caseId === CASE_AT_BAR_ID && (!a.fileId || a.fileId === activeId)
              )}
              onAdd={({ page: p, text }) =>
                lib.upsertAnnotation({
                  caseId: CASE_AT_BAR_ID,
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
