import { Callout } from '../components/CaseCard'
import { NoteEditor } from '../components/NoteEditor'
import { ingestPdf } from '../api/client'
import { useState } from 'react'

export function OpeningsPage() {
  const [html, setHtml] = useState(
    `<h2>Opening</h2><p>May it please the Court…</p><h2>OA notes</h2><ul><li>Cold facts</li><li>Hardest question from the other side</li><li>One-sentence hinge</li></ul>`
  )
  return (
    <section className="workspace">
      <header className="workspace-head">
        <div>
          <h1>Openings &amp; OA</h1>
          <p className="lede">Scripts and oral-argument packs. Edit here the way you do in OneNote.</p>
        </div>
      </header>
      <NoteEditor html={html} onChange={setHtml} />
    </section>
  )
}

export function UploadPage() {
  const [hover, setHover] = useState(false)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const hostedDemo =
    typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')

  async function onFiles(list) {
    if (hostedDemo) return
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

  const indexed = files.filter((f) => f.status === 'indexed').length

  return (
    <section className="workspace">
      <header className="workspace-head">
        <div>
          <h1>Upload</h1>
          <p className="lede">
            {hostedDemo
              ? 'PDF upload is disabled on the hosted demo. Run the app locally to index new cases.'
              : 'Drop precedent PDFs here. Each file is chunked and added to the corpus Ask AI searches.'}
          </p>
        </div>
      </header>

      {hostedDemo ? (
        <Callout label="Hosted demo" tone="warn">
          <p style={{ margin: 0 }}>
            <strong>case-law-agent.vercel.app</strong> cannot save uploads (read-only server). For
            Katz-style tests, run locally: backend{' '}
            <span className="mono">uvicorn app.main:app --port 8000</span>, frontend{' '}
            <span className="mono">npm run dev</span>, then open{' '}
            <span className="mono">http://localhost:5173/upload</span>.
          </p>
        </Callout>
      ) : null}

      <div
        className={hover ? 'dropzone on' : 'dropzone'}
        style={hostedDemo ? { opacity: 0.45, pointerEvents: 'none' } : undefined}
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

      {indexed > 0 ? (
        <Callout label="Ready" tone="note">
          <p style={{ margin: 0 }}>
            {indexed} file{indexed === 1 ? '' : 's'} in the search index. Open Ask AI and ask about
            that case.
          </p>
        </Callout>
      ) : hostedDemo ? null : (
        <Callout label="Local dev" tone="note">
          <p style={{ margin: 0 }}>
            Start the FastAPI backend on port 8000 before uploading (
            <span className="mono">uvicorn app.main:app --reload --port 8000</span>
            ).
          </p>
        </Callout>
      )}
    </section>
  )
}
