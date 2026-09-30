import { Callout } from '../components/CaseCard'
import { NoteEditor } from '../components/NoteEditor'
import { ingestPdf, listIngestSources, removeIngestSource } from '../api/client'
import { Columns2, Maximize2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { onPageHide, readJson, writeJson } from '../lib/persist'

const OPENINGS_KEY = 'case-prep-openings-v1'

const SIDE_SEED = {
  petitioner: `<h2>Petitioner opening</h2><p>May it please the Court. Counsel for Bobby Bronner…</p><h2>OA notes</h2><ul><li>Cold facts</li><li>Hardest question from the government</li><li>One-sentence hinge on Q1 / Q2</li></ul>`,
  respondent: `<h2>Respondent opening</h2><p>May it please the Court. Counsel for the United States…</p><h2>OA notes</h2><ul><li>Cold facts</li><li>Hardest question from Bronner</li><li>One-sentence hinge on Q1 / Q2</li></ul>`,
}

const SIDES = [
  {
    id: 'petitioner',
    label: 'Petitioner opening',
    hint: 'Bronner / defense script and OA notes for this side.',
  },
  {
    id: 'respondent',
    label: 'Respondent opening',
    hint: 'United States script and OA notes for this side.',
  },
]

function loadOpenings() {
  const saved = readJson(OPENINGS_KEY, null)
  if (saved && typeof saved === 'object') {
    return {
      petitioner: typeof saved.petitioner === 'string' ? saved.petitioner : SIDE_SEED.petitioner,
      respondent: typeof saved.respondent === 'string' ? saved.respondent : SIDE_SEED.respondent,
    }
  }
  return { ...SIDE_SEED }
}

export function OpeningsPage() {
  const [drafts, setDrafts] = useState(loadOpenings)
  const [focus, setFocus] = useState(null)
  const skipFirstWrite = useRef(true)

  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false
      return
    }
    writeJson(OPENINGS_KEY, drafts)
  }, [drafts])

  useEffect(() => onPageHide(() => writeJson(OPENINGS_KEY, drafts)), [drafts])

  function setSide(side, html) {
    setDrafts((prev) => ({ ...prev, [side]: html }))
  }

  const visible = focus ? SIDES.filter((s) => s.id === focus) : SIDES

  return (
    <section className="workspace">
      <header className="workspace-head">
        <div>
          <h1>Openings &amp; OA</h1>
          <p className="lede">
            Separate scripts for each side. Focus one when you want full width; Both brings the
            split back.
          </p>
        </div>
      </header>

      <div className={focus ? 'use-split dive-use use-split-focus' : 'use-split dive-use'}>
        {visible.map((side) => {
          const focused = focus === side.id
          return (
            <div key={side.id} className="use-pane dive-pane">
              <div className="use-pane-head">
                <div>
                  <h3 className="use-pane-title">{side.label}</h3>
                  <p className="notes-hub-hint">{side.hint}</p>
                </div>
                <button
                  type="button"
                  className="btn-soft use-focus-btn"
                  onClick={() => setFocus(focused ? null : side.id)}
                  title={focused ? 'Show both sides' : `Focus ${side.label}`}
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
                  key={side.id}
                  html={drafts[side.id]}
                  onChange={(html) => setSide(side.id, html)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function sourceLabel(source, kind) {
  if (kind === 'bootstrap') {
    return source.replace(/\s+\(Oyez summary\)$/, '')
  }
  return source
}

export function UploadPage() {
  const [hover, setHover] = useState(false)
  const [files, setFiles] = useState([])
  const [corpus, setCorpus] = useState([])
  const [corpusError, setCorpusError] = useState('')
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState('')

  const refreshCorpus = useCallback(async () => {
    try {
      const data = await listIngestSources()
      setCorpus(data.sources || [])
      setCorpusError('')
    } catch (err) {
      setCorpusError(err.message || 'Could not load search index')
    }
  }, [])

  useEffect(() => {
    refreshCorpus()
  }, [refreshCorpus])

  async function onFiles(list) {
    const picked = Array.from(list || [])
    if (!picked.length) return

    setBusy(true)
    for (const file of picked) {
      const entry = {
        name: file.name,
        size: file.size,
        status: 'uploading',
        chunks: null,
        error: null,
      }
      setFiles((prev) => [entry, ...prev])

      try {
        const data = await ingestPdf(file)
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name && f.status === 'uploading'
              ? { ...f, status: 'indexed', chunks: data.chunks }
              : f
          )
        )
        await refreshCorpus()
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name && f.status === 'uploading'
              ? { ...f, status: 'error', error: err.message || 'Upload failed' }
              : f
          )
        )
      }
    }
    setBusy(false)
  }

  async function onRemoveSource(source) {
    if (removing || busy) return
    const label = sourceLabel(source, source.endsWith('(Oyez summary)') ? 'bootstrap' : 'upload')
    if (!window.confirm(`Remove "${label}" from the Ask AI search index?`)) return

    setRemoving(source)
    try {
      await removeIngestSource(source)
      setFiles((prev) => prev.filter((f) => f.name !== source))
      await refreshCorpus()
    } catch (err) {
      window.alert(err.message || 'Remove failed')
    } finally {
      setRemoving('')
    }
  }

  const indexed = files.filter((f) => f.status === 'indexed').length

  return (
    <section className="workspace">
      <header className="workspace-head">
        <div>
          <h1>Upload</h1>
          <p className="lede">
            Drop precedent PDFs here. Each file is chunked and added to the corpus Ask AI searches.
            Large files (over ~4 MB) upload straight to Blob so Vercel&apos;s API body cap does not
            block them. Remove any source below to drop it from context.
          </p>
        </div>
      </header>

      <div
        className={hover ? 'dropzone on' : 'dropzone'}
        onDragOver={(e) => {
          e.preventDefault()
          setHover(true)
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault()
          setHover(false)
          if (!busy) onFiles(e.dataTransfer.files)
        }}
      >
        <p>
          Drag PDFs here, or{' '}
          <label className="linkish">
            browse
            <input
              type="file"
              accept="application/pdf"
              multiple
              hidden
              disabled={busy}
              onChange={(e) => {
                onFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
        </p>
        <p className="mono drop-hint">YUMC/Year 2/Cases or Downloads/Moot_Court_Cases</p>
      </div>

      {files.length ? (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <span>{f.name}</span>
              <span className="mono">
                {f.status === 'uploading' && 'Indexing…'}
                {f.status === 'indexed' && `${f.chunks} chunks indexed`}
                {f.status === 'error' && (f.error || 'Failed')}
                {f.status !== 'uploading' && f.status !== 'indexed' && f.status !== 'error' &&
                  `${Math.round(f.size / 1024)} KB`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="corpus-panel">
        <div className="corpus-panel-head">
          <h2>In search index</h2>
          <button type="button" className="btn-soft" disabled={busy || Boolean(removing)} onClick={refreshCorpus}>
            Refresh
          </button>
        </div>
        {corpusError ? (
          <p className="corpus-error mono">{corpusError}</p>
        ) : corpus.length === 0 ? (
          <p className="corpus-empty">No sources indexed yet.</p>
        ) : (
          <ul className="file-list corpus-list">
            {corpus.map((row) => (
              <li key={row.source}>
                <div className="corpus-row-main">
                  <span className="corpus-name">{sourceLabel(row.source, row.kind)}</span>
                  <span className="mono corpus-meta">
                    {row.chunks} chunk{row.chunks === 1 ? '' : 's'}
                    {row.kind === 'bootstrap' ? ' · demo summary' : ' · upload'}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-btn soft"
                  aria-label={`Remove ${row.source} from search index`}
                  disabled={busy || removing === row.source}
                  onClick={() => onRemoveSource(row.source)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {indexed > 0 ? (
        <Callout label="Ready" tone="note">
          <p style={{ margin: 0 }}>
            {indexed} file{indexed === 1 ? '' : 's'} in the search index. Open Ask AI and ask about
            that case.
          </p>
        </Callout>
      ) : null}
    </section>
  )
}
