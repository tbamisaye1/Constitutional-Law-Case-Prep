import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'

const PAGE_SIZE = 8

/**
 * Annotations beside the PDF:
 * - default: all notes on this case/file
 * - toggle: only this PDF page
 * - highlights show quoted text
 * - list paginates when it overflows
 */
export function AnnotationPanel({
  caseId,
  page,
  annotations,
  onAdd,
  onUpdate,
  onRemove,
  onJump,
}) {
  const [scope, setScope] = useState('all') // all | page
  const [listPage, setListPage] = useState(1)

  const forCase = useMemo(
    () =>
      annotations
        .filter((a) => a.caseId === caseId)
        .sort((a, b) => a.page - b.page || (b.savedAt || 0) - (a.savedAt || 0)),
    [annotations, caseId]
  )

  const filtered = useMemo(() => {
    if (scope === 'page') return forCase.filter((a) => a.page === page)
    return forCase
  }, [forCase, scope, page])

  const totalListPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safeListPage = Math.min(listPage, totalListPages)
  const slice = filtered.slice((safeListPage - 1) * PAGE_SIZE, safeListPage * PAGE_SIZE)
  const onThisPage = forCase.filter((a) => a.page === page)

  useEffect(() => {
    setListPage(1)
  }, [scope, caseId, page, filtered.length])

  return (
    <div className="anno-panel">
      <div className="anno-head">
        <h3>Annotations</h3>
        <button type="button" className="btn-ink" onClick={() => onAdd({ page, text: '' })}>
          <Plus size={14} /> Page {page}
        </button>
      </div>

      <div className="anno-scope" role="tablist" aria-label="Note scope">
        <button
          type="button"
          className={scope === 'all' ? 'on' : ''}
          onClick={() => setScope('all')}
        >
          All notes ({forCase.length})
        </button>
        <button
          type="button"
          className={scope === 'page' ? 'on' : ''}
          onClick={() => setScope('page')}
        >
          This page ({onThisPage.length})
        </button>
      </div>

      <p className="anno-hint mono">
        Select PDF text to save a highlight. Jump by clicking a page number.
      </p>

      <ul className="anno-list">
        {slice.length === 0 ? (
          <li className="anno-empty">
            {scope === 'page'
              ? 'No notes on this page yet.'
              : 'No notes yet. Add a page note or highlight text in the PDF.'}
          </li>
        ) : (
          slice.map((a) => (
            <li key={a.id} className={a.page === page ? 'anno-item on' : 'anno-item'}>
              <button type="button" className="anno-jump" onClick={() => onJump(a.page)}>
                <span className="mono">p. {a.page}</span>
              </button>
              <div className="anno-body">
                {a.quote ? (
                  <blockquote className="anno-quote">“{a.quote}”</blockquote>
                ) : null}
                <textarea
                  className="anno-text"
                  rows={a.quote ? 2 : 3}
                  value={a.text || ''}
                  onChange={(e) => onUpdate(a.id, { text: e.target.value })}
                  placeholder={
                    a.quote
                      ? 'Your note on this highlight…'
                      : 'Quote scrap, rule left behind, how you will use it…'
                  }
                />
                {a.kind === 'highlight' ? (
                  <span className="anno-kind mono">highlight</span>
                ) : (
                  <span className="anno-kind mono">page note</span>
                )}
              </div>
              <button
                type="button"
                className="icon-btn soft"
                aria-label="Delete annotation"
                onClick={() => onRemove(a.id)}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))
        )}
      </ul>

      {filtered.length > PAGE_SIZE ? (
        <div className="anno-pager">
          <button
            type="button"
            className="btn-soft"
            disabled={safeListPage <= 1}
            onClick={() => setListPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="mono">
            {safeListPage} / {totalListPages}
          </span>
          <button
            type="button"
            className="btn-soft"
            disabled={safeListPage >= totalListPages}
            onClick={() => setListPage((p) => Math.min(totalListPages, p + 1))}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
