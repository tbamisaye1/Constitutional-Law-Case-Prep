import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { NoteEditor } from '../components/NoteEditor'
import { SectionTree } from '../components/notebook/SectionTree'
import { PageList } from '../components/notebook/PageList'
import { useNotebook } from '../hooks/useNotebook'
import { NOTEBOOK_META } from '../data/notebookSeed'
import { findPage } from '../lib/pageTree'

/**
 * Three-pane OneNote layout:
 *   section groups/sections (react-arborist) | page list | TipTap canvas
 *
 * Model references:
 * - OneNote: notebook → section group → section → page
 * - Tree UX: https://github.com/brimdata/react-arborist
 * - Closest full-app OSS analogue for the hierarchy: Joplin notebooks
 *   https://github.com/laurent22/joplin (we embed the pattern, not the app)
 *
 * Deep link: /notes?section=sec-articles&page=pg-article-…
 * (Articles → Send to Notes lands here.)
 */
export function NotesPage() {
  const nb = useNotebook()
  const [params] = useSearchParams()
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

  return (
    <section className="workspace notes-onenote">
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

      <div className="onenote-shell">
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
          onDeletePage={nb.deletePage}
          onMovePages={nb.reorderPages}
          sectionName={sectionName}
        />

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
                <button
                  type="button"
                  className="btn-soft notes-add-subpage"
                  onClick={() => nb.addSubpage(nb.pageId)}
                  title="Add a subpage under this page"
                >
                  <span aria-hidden>↳</span> Add subpage
                </button>
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
