import { Plus, Trash2 } from 'lucide-react'
import { UiTabs, UiTabsContent, UiTabsList, UiTabsTrigger } from '../components/ui/Tabs'
import { NoteEditor } from '../components/NoteEditor'
import { useArguments } from '../hooks/useArguments'

/**
 * Argument board: sections (issues / themes) with nested prongs, plus working notes.
 * Outline + notes persist in localStorage (survives refresh).
 */
export function ArgumentsPage() {
  const args = useArguments()

  return (
    <section className="workspace">
      <header className="workspace-head">
        <div>
          <h1>Arguments</h1>
          <p className="lede">
            Structure the side you are arguing. Add a section for each issue or theme, then add
            prongs under it. Edits save in this browser.
          </p>
        </div>
        <div className="args-head-actions">
          <button type="button" className="btn-ghost" onClick={args.addSection}>
            <Plus size={16} strokeWidth={1.75} />
            Add section
          </button>
          <button type="button" className="btn-ink" onClick={() => args.addProng(args.activeSectionId)}>
            <Plus size={16} strokeWidth={1.75} />
            Add prong
          </button>
        </div>
      </header>

      <UiTabs value={args.side} onValueChange={args.setSide}>
        <UiTabsList>
          <UiTabsTrigger value="petitioner">Petitioner</UiTabsTrigger>
          <UiTabsTrigger value="respondent">Respondent</UiTabsTrigger>
        </UiTabsList>

        <UiTabsContent value="petitioner">
          <ArgsBoard args={args} visible={args.side === 'petitioner'} />
        </UiTabsContent>
        <UiTabsContent value="respondent">
          <ArgsBoard args={args} visible={args.side === 'respondent'} />
        </UiTabsContent>
      </UiTabs>
    </section>
  )
}

function ArgsBoard({ args, visible }) {
  if (!visible) return null

  return (
    <div className="args-split">
      <div className="args-outline">
        {args.sections.length === 0 && (
          <p className="args-empty">
            No sections yet. Use <strong>Add section</strong>, then <strong>Add prong</strong> for
            the steps under it.
          </p>
        )}
        {args.sections.map((section, sectionIdx) => {
          const active = section.id === args.activeSectionId
          return (
            <div
              key={section.id}
              className={active ? 'args-section on' : 'args-section'}
              onClick={() => args.selectSection(section.id)}
            >
              <div className="args-section-head">
                <span className="mono args-num">{sectionIdx + 1}</span>
                <input
                  className="args-input args-section-input"
                  value={section.title}
                  aria-label={`Section ${sectionIdx + 1} title`}
                  onChange={(e) => args.updateSectionTitle(section.id, e.target.value)}
                  onFocus={() => args.selectSection(section.id)}
                />
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label="Remove section"
                  onClick={(e) => {
                    e.stopPropagation()
                    args.removeSection(section.id)
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <ul className="args-prongs">
                {(section.prongs || []).map((prong, prongIdx) => (
                  <li key={prong.id} className="args-row args-prong-row">
                    <span className="mono args-num">
                      {sectionIdx + 1}.{prongIdx + 1}
                    </span>
                    <input
                      className="args-input"
                      value={prong.title}
                      aria-label={`Prong ${sectionIdx + 1}.${prongIdx + 1} title`}
                      onChange={(e) => args.updateProngTitle(section.id, prong.id, e.target.value)}
                      onFocus={() => args.selectSection(section.id)}
                    />
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label="Remove prong"
                      onClick={() => args.removeProng(section.id, prong.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="args-add-prong"
                onClick={(e) => {
                  e.stopPropagation()
                  args.addProng(section.id)
                }}
              >
                <Plus size={14} strokeWidth={1.75} />
                Add prong under this section
              </button>
            </div>
          )
        })}
      </div>

      <NoteEditor key={args.side} html={args.notesHtml} onChange={args.setNotesForSide} />
    </div>
  )
}
