import { Callout } from '../components/CaseCard'
import { NoteEditor } from '../components/NoteEditor'
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

  function onFiles(list) {
    const next = Array.from(list || []).map((f) => ({ name: f.name, size: f.size }))
    setFiles((prev) => [...next, ...prev])
  }

  return (
    <section className="workspace">
      <header className="workspace-head">
        <div>
          <h1>Upload</h1>
          <p className="lede">
            Drop the record and precedents. Backend ingest is ready at <span className="mono">/ingest/pdf</span>;
            this dropzone collects files in the UI first.
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
          onFiles(e.dataTransfer.files)
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
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
        </p>
        <p className="mono drop-hint">From YUMC/Year 2/Cases or Downloads/Moot_Court_Cases</p>
      </div>

      {files.length ? (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <span>{f.name}</span>
              <span className="mono">{Math.round(f.size / 1024)} KB</span>
            </li>
          ))}
        </ul>
      ) : null}

      <Callout label="Next wiring" tone="note">
        <p style={{ margin: 0 }}>
          Multipart upload to the FastAPI ingest route is the next backend hook so RAG can index these
          files.
        </p>
      </Callout>
    </section>
  )
}
