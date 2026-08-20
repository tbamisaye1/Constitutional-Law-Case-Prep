import { useRef } from 'react'
import { FileText, FileUp, Trash2 } from 'lucide-react'

/**
 * All PDFs attached to this case (and a global glance at other uploads).
 * Click a row to open it in the reader.
 */
export function CaseFilesPanel({
  caseId,
  caseName,
  filesMeta,
  blobs,
  activeFileId,
  onSelect,
  onAttach,
  onRemove,
  suggestedFile,
}) {
  const input = useRef(null)
  const forCase = filesMeta.filter((f) => f.caseId === caseId)
  const others = filesMeta.filter((f) => f.caseId !== caseId)

  return (
    <div className="files-panel">
      <div className="files-panel-head">
        <h3>PDFs</h3>
        <button type="button" className="btn-ink" onClick={() => input.current?.click()}>
          <FileUp size={14} /> Add PDF
        </button>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            onAttach(caseId, e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {suggestedFile && !forCase.length ? (
        <p className="files-hint mono">Hint: {suggestedFile}</p>
      ) : null}

      <ul className="files-list">
        {forCase.length === 0 ? (
          <li className="files-empty">
            No PDFs on {caseName || 'this case'} yet. Add one or more files.
          </li>
        ) : (
          forCase.map((f) => {
            const available = Boolean(blobs[f.id])
            return (
              <li key={f.id} className={f.id === activeFileId ? 'files-row on' : 'files-row'}>
                <button
                  type="button"
                  className="files-open"
                  onClick={() => onSelect(f.id)}
                  disabled={!available}
                  title={available ? 'Open in reader' : 'Still loading from storage, or re-add this file'}
                >
                  <FileText size={15} />
                  <span className="files-name">{f.name}</span>
                  {!available ? <span className="mono files-missing">loading…</span> : null}
                </button>
                <button
                  type="button"
                  className="icon-btn soft"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => onRemove(f.id)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            )
          })
        )}
      </ul>

      {others.length > 0 ? (
        <details className="files-other">
          <summary className="mono">Other uploads ({others.length})</summary>
          <ul className="files-list compact">
            {others.map((f) => (
              <li key={f.id} className="files-row muted">
                <span className="files-name">{f.name}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}
