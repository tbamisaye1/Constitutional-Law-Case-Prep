import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CaseFilesPanel } from '../components/library/CaseFilesPanel'
import { PdfViewer } from '../components/library/PdfViewer'
import { AnnotationPanel } from '../components/library/AnnotationPanel'
import { SyncBanner } from '../components/SyncBanner'
import { useCaseLibrary } from '../hooks/useCaseLibrary'
import { downloadIngestFile, listIngestSources } from '../api/client'
import { CORPUS_ARTICLES_ID, CORPUS_ARTICLES_LABEL } from '../data/corpusArticles'

/**
 * Corpus PDF room: read Ask AI / Upload articles the same way Instant Case
 * reads the record on Case facts. Left-nav tab between Case library and Notes.
 */
export function ArticlesPage() {
  const lib = useCaseLibrary()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [ingestSources, setIngestSources] = useState([])
  const [pullError, setPullError] = useState('')
  const [pulling, setPulling] = useState('')

  const missing = params.get('missing') || ''
  const focusQuote = params.get('q') || ''
  const paramFile = params.get('file')
  const paramPage = Number(params.get('page') || 0)

  const caseFiles = useMemo(
    () => lib.filesMeta.filter((f) => f.caseId === CORPUS_ARTICLES_ID),
    [lib.filesMeta]
  )

  const activeId =
    (paramFile && caseFiles.some((f) => f.id === paramFile) && paramFile) ||
    (lib.activeFileId && caseFiles.some((f) => f.id === lib.activeFileId)
      ? lib.activeFileId
      : caseFiles[0]?.id || null)

  const fileMeta = caseFiles.find((f) => f.id === activeId)
  const fileBlob = activeId ? lib.blobs[activeId] : null
  const page =
    (paramPage > 0 && activeId === paramFile ? paramPage : null) ||
    (activeId && lib.pageByFile[activeId]) ||
    1

  useEffect(() => {
    let cancelled = false
    listIngestSources()
      .then((data) => {
        if (!cancelled) setIngestSources(data.sources || [])
      })
      .catch(() => {
        if (!cancelled) setIngestSources([])
      })
    return () => {
      cancelled = true
    }
  }, [lib.filesMeta.length])

  useEffect(() => {
    if (paramFile && caseFiles.some((f) => f.id === paramFile)) {
      lib.setActiveFileId(paramFile)
    }
    if (paramFile && paramPage > 0) {
      lib.setPage(paramFile, paramPage)
    }
  }, [paramFile, paramPage]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!missing) return
    let cancelled = false
    ;(async () => {
      setPulling(missing)
      setPullError('')
      try {
        const blob = await downloadIngestFile(missing)
        if (cancelled) return
        const meta = await lib.attachBlob(CORPUS_ARTICLES_ID, missing, blob)
        if (meta?.id) {
          lib.setActiveFileId(meta.id)
          if (paramPage > 0) lib.setPage(meta.id, paramPage)
          const next = new URLSearchParams(params)
          next.delete('missing')
          next.set('file', meta.id)
          if (paramPage > 0) next.set('page', String(paramPage))
          setParams(next, { replace: true })
        }
      } catch (error) {
        if (!cancelled) {
          setPullError(error?.message || `Could not load ${missing}`)
        }
      } finally {
        if (!cancelled) setPulling('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [missing]) // eslint-disable-line react-hooks/exhaustive-deps

  const attachedNames = new Set(caseFiles.map((f) => f.name))
  const orphanSources = ingestSources
    .map((row) => (typeof row === 'string' ? row : row?.source))
    .filter(
      (s) => typeof s === 'string' && s.toLowerCase().endsWith('.pdf') && !attachedNames.has(s)
    )

  async function pullSource(name) {
    setPulling(name)
    setPullError('')
    try {
      const blob = await downloadIngestFile(name)
      const meta = await lib.attachBlob(CORPUS_ARTICLES_ID, name, blob)
      if (meta?.id) {
        lib.setActiveFileId(meta.id)
        navigate(`/articles?file=${encodeURIComponent(meta.id)}&page=1`, { replace: true })
      }
    } catch (error) {
      setPullError(error?.message || `Could not open ${name}`)
    } finally {
      setPulling('')
    }
  }

  const emptyHint = missing || pullError
    ? (
        <>
          {pulling ? (
            <>Pulling <span className="mono">{pulling}</span> from the Ask AI upload store…</>
          ) : pullError ? (
            <>
              {pullError} Attach <span className="mono">{missing || 'the PDF'}</span> below, or re-upload
              it under Upload.
            </>
          ) : (
            <>
              Looking for <span className="mono">{missing}</span>…
            </>
          )}
        </>
      )
    : undefined

  return (
    <section className="workspace articles-room">
      <header className="workspace-head">
        <div>
          <h1>Articles</h1>
          <p className="lede">
            Read PDFs Ask AI retrieved, the same way Instant Case works on Case facts. Jump here from
            an Ask AI cite to land on the page and quote.
          </p>
        </div>
      </header>

      <SyncBanner
        sync={lib.sync}
        saveError={lib.saveError}
        lastSavedAt={lib.lastSavedAt}
        onSyncNow={lib.syncNow}
      />

      {orphanSources.length ? (
        <div className="articles-ingest-rail">
          <div className="mono articles-ingest-label">Indexed for Ask AI, not opened here yet</div>
          <div className="articles-ingest-chips">
            {orphanSources.slice(0, 12).map((name) => (
              <button
                key={name}
                type="button"
                className="btn-soft"
                disabled={Boolean(pulling)}
                onClick={() => pullSource(name)}
              >
                {pulling === name ? 'Opening…' : name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="library-read-stack case-at-bar-read">
        <CaseFilesPanel
          caseId={CORPUS_ARTICLES_ID}
          caseName={CORPUS_ARTICLES_LABEL}
          filesMeta={lib.filesMeta}
          blobs={lib.blobs}
          activeFileId={activeId}
          suggestedFile={missing || 'Upload or pull an Ask AI article'}
          onSelect={(id) => {
            lib.setActiveFileId(id)
            navigate(`/articles?file=${encodeURIComponent(id)}&page=1`, { replace: true })
          }}
          onAttach={lib.attachFiles}
          onRemove={lib.removeFile}
        />
        <div className="library-read">
          <PdfViewer
            file={fileBlob}
            fileName={fileMeta?.name}
            page={page}
            caseId={CORPUS_ARTICLES_ID}
            focusQuote={focusQuote}
            onPageChange={(p) => {
              if (!activeId) return
              lib.setPage(activeId, p)
              const next = new URLSearchParams(params)
              next.set('file', activeId)
              next.set('page', String(p))
              setParams(next, { replace: true })
            }}
            suggestedFile={missing || 'Attach a PDF above'}
            emptyHint={emptyHint}
            highlights={lib.annotations.filter(
              (a) =>
                a.caseId === CORPUS_ARTICLES_ID &&
                (!a.fileId || a.fileId === activeId) &&
                a.kind === 'highlight'
            )}
            onHighlight={({ page: p, quote, rects, text }) =>
              lib.upsertAnnotation({
                caseId: CORPUS_ARTICLES_ID,
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
            caseId={CORPUS_ARTICLES_ID}
            page={page}
            annotations={lib.annotations.filter(
              (a) => a.caseId === CORPUS_ARTICLES_ID && (!a.fileId || a.fileId === activeId)
            )}
            onAdd={({ page: p, text }) =>
              lib.upsertAnnotation({
                caseId: CORPUS_ARTICLES_ID,
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
    </section>
  )
}
