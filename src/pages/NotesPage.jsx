import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Maximize2, Minimize2 } from 'lucide-react'
import { NoteEditor } from '../components/NoteEditor'
import { SectionTree } from '../components/notebook/SectionTree'
import { PageList } from '../components/notebook/PageList'
import { useNotebook } from '../hooks/useNotebook'
import { NOTEBOOK_META } from '../data/notebookSeed'
import { findPage } from '../lib/pageTree'

const EXPAND_KEY = 'case-prep-notes-expanded'

function readExpanded() {
  try {
    return localStorage.getItem(EXPAND_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Three-pane OneNote layout:
 *   section groups/sections (react-arborist) | page list | TipTap canvas
 *
 * Expand hides Sections + Pages so the editor can use the full width.
 * Esc exits expand. Preference is remembered.
 *
 * Deep link: /notes?section=sec-articles&page=pg-article-…
 * (Articles → Send to Notes lands here.)
 */
export function NotesPage() {
  const nb = useNotebook()
  const [params] = useSearchParams()
  const [expanded, setExpanded] = useState(readExpanded)
  const sectionName = findSectionName(nb.tree, nb.sectionId)

  useEffect(() => {
    const section = params.get('section')
    const page = params.get('page')
    if (!section) return
    if (!sectionExists(nb.tree, section)) return
    if (nb.sectionId !== section) nb.selectSection(section)
    const list = nb.pagesBySection?.[section] || []
    if (page && findPage(list, page)) nb.selectPage(page)
    // Only react to URL changes; notebook selection APIs are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  useEffect(() => {
    try {
      localStorage.setItem(EXPAND_KEY, expanded ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [expanded])

  useEffect(() => {
    if (!expanded) return undefined
    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setExpanded(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  return (
    <section className={expanded ? 'workspace notes-onenote is-expanded' : 'workspace notes-onenote'}>
      {!expanded ? (
        <header className="workspace-head">
          <div>
            <h1>Notes</h1>
            <p className="lede">
              {NOTEBOOK_META.title}: section groups → sections → pages. Use Add subpage (or the
              corner icon on a page) to nest under the current page; drag to reorder. Nested bullets
              use Tab / Shift+Tab. Saves in this browser until the API exists.
            </p>
          </div>
        </header>
      ) : null}

      <div className={expanded ? 'onenote-shell is-expanded' : 'onenote-shell'}>
        {!expanded ? (
          <>
            <SectionTree
              tree={nb.tree}
              setTree={nb.setTree}
              selectedSectionId={nb.sectionId}
              onSelectSection={nb.selectSection}
              onAddGroup={nb.addSectionGroup}
              onAddSection={nb.addSection}
              onRenameNode={nb.renameTreeNode}
              onDeleteNodes={nb.deleteTreeNodes}
            />

            <PageList
              pages={nb.pages}
              activePageId={nb.pageId}
              onSelectPage={nb.selectPage}
              onAddPage={nb.addPage}
              onAddSubpage={nb.addSubpage}
              onPromotePage={nb.promotePageToMain}
              onDeletePage={nb.deletePage}
              onMovePages={nb.reorderPages}
              sectionName={sectionName}
            />
          </>
        ) : null}

        <div className="onenote-canvas">
          {nb.activePage ? (
            <>
              <div className="notes-canvas-head">
                <input
                  className="notes-title-input"
                  value={nb.activePage.title}
                  onChange={(e) => nb.renamePage(e.target.value)}
                  aria-label="Page title"
                />
                <div className="notes-canvas-actions">
                  {!expanded ? (
                    <button
                      type="button"
                      className="btn-soft notes-add-subpage"
                      onClick={() => nb.addSubpage(nb.pageId)}
                      title="Add a subpage under this page"
                    >
                      <span aria-hidden>↳</span> Add subpage
                    </button>
                  ) : (
                    <span className="mono notes-expand-hint">{sectionName}</span>
                  )}
                  <button
                    type="button"
                    className={expanded ? 'btn-ink notes-expand-exit' : 'btn-soft'}
                    onClick={() => setExpanded((v) => !v)}
                    aria-label={expanded ? 'Exit expanded notes' : 'Expand notes page'}
                    title={
                      expanded
                        ? 'Exit expanded view (Esc) · show Sections and Pages again'
                        : 'Expand this page · hide Sections and Pages'
                    }
                  >
                    {expanded ? (
                      <>
                        <Minimize2 size={15} /> Exit
                      </>
                    ) : (
                      <>
                        <Maximize2 size={15} /> Expand
                      </>
                    )}
                  </button>
                </div>
              </div>
              <NoteEditor
                key={nb.activePage.id}
                html={nb.activePage.html}
                onChange={nb.updatePageHtml}
              />
            </>
          ) : (
            <div className="placeholder-box">
              Select a section, then add a page. Hover a section to rename or delete it
              (or double-click / F2 to rename, Backspace to delete).
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function findSectionName(tree, id) {
  for (const n of tree) {
    if (n.id === id) return n.name
    if (n.children) {
      const hit = n.children.find((c) => c.id === id)
      if (hit) return hit.name
    }
  }
  return 'Pages'
}

function sectionExists(tree, id) {
  for (const n of tree || []) {
    if (n.id === id) return true
    if (n.children?.length && sectionExists(n.children, id)) return true
  }
  return false
}
