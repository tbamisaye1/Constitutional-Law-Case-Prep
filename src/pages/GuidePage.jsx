import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Pencil, BookOpen } from 'lucide-react'
import { NoteEditor } from '../components/NoteEditor'
import { useGuide } from '../hooks/useGuide'
import { useTextSelectionAi } from '../hooks/useTextSelectionAi'
import * as ScrollArea from '@radix-ui/react-scroll-area'

/**
 * In-app Bronner guide: same TOC as the HTML, full explanations, searchable, editable.
 * Case library / facts still hold structured atoms; this room is for reading the guide.
 */
export function GuidePage() {
  const { sections, getHtml, setHtml, resetSection } = useGuide()
  const [params, setParams] = useSearchParams()
  const activeId = params.get('s') || sections[0]?.id || 'orient'
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)

  const active = sections.find((s) => s.id === activeId) || sections[0]
  const html = active ? getHtml(active.id) : ''
  const proseRef = useRef(null)

  useTextSelectionAi(proseRef, {
    surface: 'guide',
    page: active?.id || null,
    side: 'both',
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sections
    return sections.filter((s) => {
      const hay = `${s.title} ${s.group} ${getHtml(s.id)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [sections, query, getHtml])

  const groups = useMemo(() => {
    const order = []
    const map = new Map()
    for (const s of filtered) {
      if (!map.has(s.group)) {
        map.set(s.group, [])
        order.push(s.group)
      }
      map.get(s.group).push(s)
    }
    return order.map((g) => ({ name: g, items: map.get(g) }))
  }, [filtered])

  function select(id) {
    setParams({ s: id })
    setEditing(false)
  }

  if (!active) {
    return (
      <section className="workspace">
        <p>Guide sections failed to load.</p>
      </section>
    )
  }

  return (
    <section className="workspace guide-room">
      <header className="workspace-head">
        <div>
          <h1>Bronner guide</h1>
          <p className="lede">
            Full explanations from your HTML case guide: orientation, doctrine stories, statutes,
            both questions applied to Bronner. Edit any section; structured Case facts / Library stay
            for prep atoms.
          </p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className={editing ? 'btn-ink' : 'btn-soft'}
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil size={15} /> {editing ? 'Done editing' : 'Edit section'}
          </button>
          {editing ? (
            <button type="button" className="btn-soft" onClick={() => resetSection(active.id)}>
              Reset to guide text
            </button>
          ) : null}
        </div>
      </header>

      <div className="guide-shell">
        <aside className="guide-toc">
          <div className="search-field soft-search guide-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the guide…"
              aria-label="Search guide"
            />
          </div>
          <ScrollArea.Root className="guide-toc-scroll">
            <ScrollArea.Viewport className="guide-toc-viewport">
              {groups.map((g) => (
                <div key={g.name} className="guide-toc-group">
                  <div className="guide-toc-label mono">{g.name}</div>
                  {g.items.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={s.id === active.id ? 'guide-toc-item on' : 'guide-toc-item'}
                      onClick={() => select(s.id)}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              ))}
              {!filtered.length ? <p className="files-empty">No sections matched.</p> : null}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="rail-bar">
              <ScrollArea.Thumb className="rail-thumb" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
          <p className="guide-toc-foot mono">
            <BookOpen size={12} style={{ verticalAlign: '-1px' }} /> Also in{' '}
            <Link to="/library">Case library</Link> · <Link to="/facts">Facts</Link>
          </p>
        </aside>

        <article className="guide-article">
          <h2 className="guide-article-title">{active.title}</h2>
          <p className="guide-article-group mono">{active.group}</p>

          {editing ? (
            <div className="guide-editor">
              <NoteEditor
                key={active.id}
                html={html}
                onChange={(next) => setHtml(active.id, next)}
              />
            </div>
          ) : (
            <div
              className="guide-prose"
              ref={proseRef}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </article>
      </div>
    </section>
  )
}
