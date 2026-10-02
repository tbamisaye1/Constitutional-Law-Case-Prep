import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  FileText,
  FileUp,
  Filter,
  Highlighter,
  Pencil,
  Search,
  StickyNote,
  Trash2,
} from 'lucide-react'
import { PdfViewer } from '../components/library/PdfViewer'
import { AnnotationPanel } from '../components/library/AnnotationPanel'
import { SyncBanner } from '../components/SyncBanner'
import { useCaseLibrary } from '../hooks/useCaseLibrary'
import { downloadIngestFile, listIngestSources } from '../api/client'
import { CORPUS_ARTICLES_ID, CORPUS_ARTICLES_LABEL } from '../data/corpusArticles'
import { articleDisplayName, articleSearchHaystack } from '../lib/articleLabels'
import { exportArticleTakeawaysToNotes } from '../lib/articleTakeaways'

const SHELF_OPEN_KEY = 'case-prep-articles-shelf-open'
const ANNO_COLLAPSED_KEY = 'case-prep-articles-anno-collapsed'

function readBool(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === '1' || raw === 'true'
  } catch {
    return fallback
  }
}

function writeBool(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* ignore quota */
  }
}

function initialShelfOpen() {
  try {
    const raw = localStorage.getItem(SHELF_OPEN_KEY)
    if (raw !== null) return raw === '1' || raw === 'true'
  } catch {
    /* fall through */
  }
  // First visit: if a PDF is already open, start collapsed so the reader gets the screen.
  try {
    return !new URLSearchParams(window.location.search).get('file')
  } catch {
    return true
  }
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'opened', label: 'Opened here' },
  { id: 'ready', label: 'Ready to open' },
  { id: 'notes', label: 'With notes' },
]

const SORTS = [
  { id: 'name', label: 'Name' },
  { id: 'recent', label: 'Recent' },
  { id: 'notes', label: 'Most notes' },
]

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
  const [focusAnnotationId, setFocusAnnotationId] = useState(null)
  const [focusHighlightId, setFocusHighlightId] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('name')
  const [indexingId, setIndexingId] = useState('')
  const [renamingName, setRenamingName] = useState('')
  const [renameDraft, setRenameDraft] = useState('')
  const [shelfOpen, setShelfOpen] = useState(initialShelfOpen)
  const [annoCollapsed, setAnnoCollapsed] = useState(() =>
    readBool(ANNO_COLLAPSED_KEY, false)
  )
  const attachInput = useRef(null)
  const renameInput = useRef(null)

  const titleByName = useMemo(() => {
    const map = new Map()
    for (const row of lib.articleTitles || []) {
      if (row?.id && row.title) map.set(row.id, row.title)
    }
    return map
  }, [lib.articleTitles])

  const missing = params.get('missing') || ''
  const focusQuote = params.get('q') || ''
  const paramFile = params.get('file')
  const paramPage = Number(params.get('page') || 0)

  const caseFiles = useMemo(
    () => lib.filesMeta.filter((f) => f.caseId === CORPUS_ARTICLES_ID),
    [lib.filesMeta]
  )

  const noteStats = useMemo(() => {
    const byFile = new Map()
    for (const a of lib.annotations) {
      if (a.caseId !== CORPUS_ARTICLES_ID) continue
      const key = a.fileId || '__case__'
      const row = byFile.get(key) || { notes: 0, highlights: 0 }
      if (a.kind === 'highlight') row.highlights += 1
      else row.notes += 1
      byFile.set(key, row)
    }
    return byFile
  }, [lib.annotations])

  const activeId =
    (paramFile && caseFiles.some((f) => f.id === paramFile) && paramFile) ||
    (lib.activeFileId && caseFiles.some((f) => f.id === lib.activeFileId)
      ? lib.activeFileId
      : caseFiles[0]?.id || null)

  const fileMeta = caseFiles.find((f) => f.id === activeId)
  const fileBlob = activeId ? lib.blobs[activeId] : null
  const activeTitle = fileMeta
    ? articleDisplayName(fileMeta.name, titleByName.get(fileMeta.name) || '')
    : ''
  const activeNoteCount = activeId
    ? (noteStats.get(activeId)?.notes || 0) + (noteStats.get(activeId)?.highlights || 0)
    : 0
  const page =
    (paramPage > 0 && activeId === paramFile ? paramPage : null) ||
    (activeId && lib.pageByFile[activeId]) ||
    1

  useEffect(() => {
    writeBool(ANNO_COLLAPSED_KEY, annoCollapsed)
  }, [annoCollapsed])

  function toggleShelf(next) {
    setShelfOpen(next)
    writeBool(SHELF_OPEN_KEY, next)
  }

  useEffect(() => {
    let cancelled = false
    listIngestSources()
      .then((data) => {
        if (cancelled) return
        const sources = data.sources || []
        setIngestSources(sources)
        lib.reconcileAskAiIndexed(sources)
      })
      .catch(() => {
        if (!cancelled) setIngestSources([])
      })
    return () => {
      cancelled = true
    }
  }, [lib.filesMeta.length]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const attachedNames = useMemo(
    () => new Set(caseFiles.map((f) => f.name)),
    [caseFiles]
  )

  const catalog = useMemo(() => {
    const rows = []

    for (const f of caseFiles) {
      const stats = noteStats.get(f.id) || { notes: 0, highlights: 0 }
      const customTitle = titleByName.get(f.name) || ''
      rows.push({
        key: `local-${f.id}`,
        kind: 'opened',
        id: f.id,
        name: f.name,
        customTitle,
        label: articleDisplayName(f.name, customTitle),
        available: Boolean(lib.blobs[f.id]),
        askAiIndexed: Boolean(f.askAiIndexed),
        askAiIndexError: f.askAiIndexError || '',
        notes: stats.notes,
        highlights: stats.highlights,
        savedAt: f.savedAt || 0,
        size: f.size || 0,
      })
    }

    for (const row of ingestSources) {
      const source = typeof row === 'string' ? row : row?.source
      if (typeof source !== 'string' || !source.toLowerCase().endsWith('.pdf')) continue
      if (attachedNames.has(source)) continue
      const customTitle = titleByName.get(source) || ''
      rows.push({
        key: `ingest-${source}`,
        kind: 'ready',
        id: null,
        name: source,
        customTitle,
        label: articleDisplayName(source, customTitle),
        available: true,
        askAiIndexed: true,
        askAiIndexError: '',
        notes: 0,
        highlights: 0,
        savedAt: 0,
        size: 0,
        chunks: typeof row === 'object' ? row.chunks : null,
      })
    }

    return rows
  }, [caseFiles, ingestSources, attachedNames, noteStats, lib.blobs, titleByName])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = catalog.filter((row) => {
      if (filter === 'opened' && row.kind !== 'opened') return false
      if (filter === 'ready' && row.kind !== 'ready') return false
      if (filter === 'notes' && row.notes + row.highlights === 0) return false
      if (q && !articleSearchHaystack(row.name, row.customTitle).includes(q)) return false
      return true
    })

    rows = [...rows].sort((a, b) => {
      if (sort === 'recent') return (b.savedAt || 0) - (a.savedAt || 0) || a.label.localeCompare(b.label)
      if (sort === 'notes') {
        const n = b.notes + b.highlights - (a.notes + a.highlights)
        return n || a.label.localeCompare(b.label)
      }
      return a.label.localeCompare(b.label)
    })
    return rows
  }, [catalog, filter, query, sort])

  useEffect(() => {
    if (!renamingName) return
    renameInput.current?.focus()
    renameInput.current?.select()
  }, [renamingName])

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

  function openOpened(id) {
    lib.setActiveFileId(id)
    navigate(`/articles?file=${encodeURIComponent(id)}&page=1`, { replace: true })
  }

  function startRename(row) {
    setRenamingName(row.name)
    setRenameDraft(row.customTitle || row.label)
  }

  function commitRename() {
    if (!renamingName) return
    const name = renamingName
    const draft = renameDraft
    setRenamingName('')
    setRenameDraft('')
    lib.setArticleTitle(name, draft)
  }

  function cancelRename() {
    setRenamingName('')
    setRenameDraft('')
  }

  async function onRetryIndex(fileId) {
    setIndexingId(fileId)
    try {
      await lib.retryAskAiIndex(fileId)
    } finally {
      setIndexingId('')
      try {
        const data = await listIngestSources()
        setIngestSources(data.sources || [])
      } catch {
        /* keep prior list */
      }
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

  const indexFailMeta = caseFiles.find((f) => f.askAiIndexError && !f.askAiIndexed)

  return (
    <section className="workspace articles-room">
      <header className="workspace-head">
        <div>
          <h1>Articles</h1>
          <p className="lede">
            Search and open PDFs Ask AI indexed, then read them the same way Instant Case works on
            Case facts. Jump here from an Ask AI cite to land on the page and quote.
          </p>
        </div>
      </header>

      <SyncBanner
        sync={lib.sync}
        saveError={lib.saveError}
        lastSavedAt={lib.lastSavedAt}
        onSyncNow={lib.syncNow}
        onRetrySaveError={
          indexFailMeta
            ? () => onRetryIndex(indexFailMeta.id)
            : undefined
        }
        retrySaveLabel={
          indexingId === indexFailMeta?.id ? 'Indexing…' : 'Retry Ask AI index'
        }
      />

      <div className={shelfOpen ? 'articles-shelf' : 'articles-shelf is-collapsed'}>
        <div className="articles-shelf-bar">
          <button
            type="button"
            className="articles-shelf-toggle"
            aria-expanded={shelfOpen}
            onClick={() => toggleShelf(!shelfOpen)}
          >
            {shelfOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            <span>{shelfOpen ? 'Hide article list' : 'Browse articles'}</span>
          </button>
          <div className="articles-shelf-current">
            {activeTitle ? (
              <>
                <FileText size={14} aria-hidden />
                <span className="articles-shelf-current-title" title={fileMeta?.name}>
                  {activeTitle}
                </span>
                {activeNoteCount > 0 ? (
                  <span className="articles-badge marks mono">
                    {activeNoteCount} note{activeNoteCount === 1 ? '' : 's'}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="mono articles-shelf-current-empty">No article open</span>
            )}
          </div>
          <button
            type="button"
            className="btn-ink articles-add"
            onClick={() => attachInput.current?.click()}
          >
            <FileUp size={14} /> Add PDF
          </button>
          <input
            ref={attachInput}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            hidden
            onChange={(e) => {
              lib.attachFiles(CORPUS_ARTICLES_ID, e.target.files)
              e.target.value = ''
              toggleShelf(true)
            }}
          />
        </div>

        {shelfOpen ? (
          <>
            <div className="articles-shelf-toolbar">
              <label className="articles-search">
                <Search size={14} aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles…"
                  aria-label="Search articles"
                />
              </label>

              <div className="articles-filter-group" role="group" aria-label="Filter articles">
                <Filter size={13} aria-hidden />
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={filter === f.id ? 'articles-chip on' : 'articles-chip'}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <label className="articles-sort">
                <span className="mono">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sort articles"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="articles-shelf-meta mono">
              {filtered.length} shown
              {catalog.length !== filtered.length ? ` of ${catalog.length}` : ''}
              {' · '}
              {caseFiles.length} opened here
              {' · '}
              {catalog.filter((r) => r.kind === 'ready').length} ready to open
            </div>

            <ul className="articles-shelf-list">
              {filtered.length === 0 ? (
                <li className="articles-shelf-empty">
                  {catalog.length === 0
                    ? `No PDFs on ${CORPUS_ARTICLES_LABEL} yet. Add one above, or pull from Upload / Ask AI.`
                    : 'Nothing matches that search or filter.'}
                </li>
              ) : (
                filtered.map((row) => {
                  const selected = row.kind === 'opened' && row.id === activeId
                  const busy = pulling === row.name || indexingId === row.id
                  const markCount = row.notes + row.highlights
                  const isRenaming = renamingName === row.name
                  return (
                    <li
                      key={row.key}
                      className={
                        selected
                          ? 'articles-row on'
                          : row.kind === 'ready'
                            ? 'articles-row ready'
                            : 'articles-row'
                      }
                    >
                      {isRenaming ? (
                        <form
                          className="articles-rename"
                          onSubmit={(e) => {
                            e.preventDefault()
                            commitRename()
                          }}
                        >
                          <Pencil size={14} aria-hidden />
                          <input
                            ref={renameInput}
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                e.preventDefault()
                                cancelRename()
                              }
                            }}
                            onBlur={commitRename}
                            placeholder="Display name"
                            aria-label={`Rename ${row.name}`}
                          />
                          <button type="submit" className="btn-soft">
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn-soft"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={cancelRename}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="articles-row-main"
                            disabled={busy || (row.kind === 'opened' && !row.available)}
                            title={row.name}
                            onClick={() => {
                              if (row.kind === 'ready') pullSource(row.name)
                              else if (row.id) openOpened(row.id)
                              toggleShelf(false)
                            }}
                          >
                            <FileText size={15} aria-hidden />
                            <span className="articles-row-copy">
                              <span className="articles-row-title">{row.label}</span>
                              <span className="articles-row-file mono">{row.name}</span>
                            </span>
                            <span className="articles-row-badges">
                              {row.kind === 'ready' ? (
                                <span className="articles-badge ready">Ready to open</span>
                              ) : row.askAiIndexed ? (
                                <span className="articles-badge ok">In Ask AI</span>
                              ) : row.askAiIndexError ? (
                                <span className="articles-badge warn">Index failed</span>
                              ) : (
                                <span className="articles-badge">Local</span>
                              )}
                              {markCount > 0 ? (
                                <span
                                  className="articles-badge marks"
                                  title={`${row.notes} notes, ${row.highlights} highlights`}
                                >
                                  {row.highlights > 0 ? (
                                    <>
                                      <Highlighter size={11} aria-hidden /> {row.highlights}
                                    </>
                                  ) : null}
                                  {row.notes > 0 ? (
                                    <>
                                      {row.highlights > 0 ? ' · ' : null}
                                      <StickyNote size={11} aria-hidden /> {row.notes}
                                    </>
                                  ) : null}
                                </span>
                              ) : null}
                              {busy ? (
                                <span className="mono articles-row-busy">
                                  {pulling === row.name ? 'Opening…' : 'Indexing…'}
                                </span>
                              ) : null}
                            </span>
                          </button>
                          <div className="articles-row-actions">
                            <button
                              type="button"
                              className="icon-btn soft"
                              aria-label={`Rename ${row.label}`}
                              title="Rename how this article is shown"
                              onClick={() => startRename(row)}
                            >
                              <Pencil size={14} />
                            </button>
                            {row.kind === 'opened' && row.askAiIndexError && !row.askAiIndexed ? (
                              <button
                                type="button"
                                className="btn-soft"
                                disabled={Boolean(indexingId)}
                                onClick={() => onRetryIndex(row.id)}
                              >
                                Retry index
                              </button>
                            ) : null}
                            {row.kind === 'opened' ? (
                              <button
                                type="button"
                                className="icon-btn soft"
                                aria-label={`Remove ${row.name}`}
                                onClick={() => lib.removeFile(row.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : null}
                          </div>
                        </>
                      )}
                    </li>
                  )
                })
              )}
            </ul>
          </>
        ) : null}
      </div>

      <div className="library-read-stack case-at-bar-read">
        <div
          className={
            annoCollapsed
              ? 'library-read articles-read anno-collapsed'
              : 'library-read articles-read'
          }
        >
          <PdfViewer
            file={fileBlob}
            fileName={fileMeta?.name}
            page={page}
            caseId={CORPUS_ARTICLES_ID}
            fileId={activeId}
            focusQuote={focusQuote}
            onPageChange={(p) => {
              if (!activeId) return
              lib.setPage(activeId, p)
              const next = new URLSearchParams(params)
              next.set('file', activeId)
              next.set('page', String(p))
              setParams(next, { replace: true })
            }}
            suggestedFile={missing || 'Select an article above'}
            emptyHint={emptyHint}
            highlights={lib.annotations.filter(
              (a) =>
                a.caseId === CORPUS_ARTICLES_ID &&
                (!a.fileId || a.fileId === activeId) &&
                a.kind === 'highlight'
            )}
            onHighlight={({ page: p, quote, rects, text, color }) =>
              lib.upsertAnnotation({
                caseId: CORPUS_ARTICLES_ID,
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
            onUpdateHighlight={(id, patch) => lib.updateAnnotation(id, patch)}
            onDeleteHighlight={(id) => lib.removeAnnotation(id)}
            focusHighlightId={focusHighlightId}
            bookmarks={(lib.pdfBookmarks || []).filter((b) => b.fileId === activeId)}
            onAddBookmark={(p) => {
              if (!activeId) return
              lib.addPdfBookmark(activeId, p)
            }}
            onRemoveBookmark={(id) => lib.removePdfBookmark(id)}
          />
          <AnnotationPanel
            caseId={CORPUS_ARTICLES_ID}
            page={page}
            articleTitle={activeTitle || fileMeta?.name || ''}
            annotations={lib.annotations.filter(
              (a) => a.caseId === CORPUS_ARTICLES_ID && (!a.fileId || a.fileId === activeId)
            )}
            collapsed={annoCollapsed}
            onToggleCollapsed={setAnnoCollapsed}
            onExportToNotes={async () => {
              if (!activeId && !fileMeta?.name) {
                throw new Error('Open an article first.')
              }
              const annotations = lib.annotations.filter(
                (a) =>
                  a.caseId === CORPUS_ARTICLES_ID && (!a.fileId || a.fileId === activeId)
              )
              const result = exportArticleTakeawaysToNotes({
                fileId: activeId,
                fileName: fileMeta?.name || '',
                title: activeTitle || fileMeta?.name || 'Article',
                annotations,
              })
              window.setTimeout(() => navigate(result.notesPath), 450)
              return result
            }}
            onAdd={({ page: p, text, kind }) =>
              lib.upsertAnnotation({
                caseId: CORPUS_ARTICLES_ID,
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
              lib.setPage(activeId, targetPage)
              const next = new URLSearchParams(params)
              next.set('file', activeId)
              next.set('page', String(targetPage))
              setParams(next, { replace: true })
              setFocusHighlightId(null)
              setFocusAnnotationId(anno.id || null)
              window.setTimeout(() => setFocusHighlightId(anno.id || null), 0)
            }}
            onFlush={lib.syncNow}
            focusAnnotationId={focusAnnotationId}
          />
        </div>
      </div>
    </section>
  )
}
