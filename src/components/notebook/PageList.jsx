import { Plus } from 'lucide-react'
import * as ScrollArea from '@radix-ui/react-scroll-area'

/**
 * Middle OneNote pane: pages in the selected section, with text previews.
 */
export function PageList({ pages, activePageId, onSelectPage, onAddPage, sectionName }) {
  return (
    <div className="onenote-pages">
      <div className="onenote-pane-label mono">{sectionName || 'Pages'}</div>
      <ScrollArea.Root className="onenote-pages-scroll">
        <ScrollArea.Viewport className="onenote-pages-viewport">
          {pages.length === 0 ? (
            <p className="onenote-empty">No pages yet. Add one below.</p>
          ) : (
            pages.map((p) => (
              <button
                key={p.id}
                type="button"
                className={p.id === activePageId ? 'page-card on' : 'page-card'}
                onClick={() => onSelectPage(p.id)}
              >
                <strong>{p.title}</strong>
                {p.preview ? <span className="page-preview">{p.preview}</span> : null}
              </button>
            ))
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="rail-bar">
          <ScrollArea.Thumb className="rail-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
      <button type="button" className="onenote-add page-add" onClick={onAddPage}>
        <Plus size={14} /> Add page
      </button>
    </div>
  )
}
