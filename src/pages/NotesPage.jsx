import { NoteEditor } from '../components/NoteEditor'
import { SectionTree } from '../components/notebook/SectionTree'
import { PageList } from '../components/notebook/PageList'
import { useNotebook } from '../hooks/useNotebook'
import { NOTEBOOK_META } from '../data/notebookSeed'

/**
 * Three-pane OneNote layout:
 *   section groups/sections (react-arborist) | page list | TipTap canvas
 *
 * Model references:
 * - OneNote: notebook → section group → section → page
 * - Tree UX: https://github.com/brimdata/react-arborist
 * - Closest full-app OSS analogue for the hierarchy: Joplin notebooks
 *   https://github.com/laurent22/joplin (we embed the pattern, not the app)
 */
export function NotesPage() {
  const nb = useNotebook()
  const sectionName = findSectionName(nb.tree, nb.sectionId)

  return (
    <section className="workspace notes-onenote">
      <header className="workspace-head">
        <div>
          <h1>Notes</h1>
          <p className="lede">
            {NOTEBOOK_META.title}: section groups → sections → pages. Nested bullets use Tab /
            Shift+Tab. Saves in this browser until the API exists.
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
        />

        <PageList
          pages={nb.pages}
          activePageId={nb.pageId}
          onSelectPage={nb.selectPage}
          onAddPage={nb.addPage}
          sectionName={sectionName}
        />

        <div className="onenote-canvas">
          {nb.activePage ? (
            <>
              <input
                className="notes-title-input"
                value={nb.activePage.title}
                onChange={(e) => nb.renamePage(e.target.value)}
                aria-label="Page title"
              />
              <NoteEditor
                key={nb.activePage.id}
                html={nb.activePage.html}
                onChange={nb.updatePageHtml}
              />
            </>
          ) : (
            <div className="placeholder-box">
              Select a section, then add a page. Double-click a name in the left tree to rename.
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
