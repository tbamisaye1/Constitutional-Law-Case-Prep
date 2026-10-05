import { useEffect, useState } from 'react'
import { Maximize2, Minimize2, Plus, Trash2 } from 'lucide-react'
import { UiTabs, UiTabsContent, UiTabsList, UiTabsTrigger } from '../components/ui/Tabs'
import { NoteEditor } from '../components/NoteEditor'
import { useArguments } from '../hooks/useArguments'

const EXPAND_KEY = 'case-prep-args-expanded'

function readExpanded() {
  try {
    return localStorage.getItem(EXPAND_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Argument board: sections + prongs, each with its own notes, plus whole-argument
 * working notes. Click a section or prong to edit that layer; Ask AI can search all.
 */
export function ArgumentsPage() {
  const args = useArguments()
  const [expanded, setExpanded] = useState(readExpanded)

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
    <section className={expanded ? 'workspace args-workspace is-expanded' : 'workspace args-workspace'}>
      {!expanded ? (
        <header className="workspace-head">
          <div>
            <h1>Arguments</h1>
            <p className="lede">
              Structure the side you are arguing. Add a section for each issue or theme, then add
              prongs under it. Click a section or prong to write notes for that piece, or use whole
              argument notes for the full flowing draft. Edits save in this browser.
            </p>
          </div>
          <div className="args-head-actions">
            <button type="button" className="btn-ghost" onClick={args.addSection}>
              <Plus size={16} strokeWidth={1.75} />
              Add section
            </button>
            <button
              type="button"
              className="btn-ink"
              onClick={() => args.addProng(args.activeSectionId)}
            >
              <Plus size={16} strokeWidth={1.75} />
              Add prong
            </button>
          </div>
        </header>
      ) : null}

      <UiTabs value={args.side} onValueChange={args.setSide}>
        <UiTabsList>
          <UiTabsTrigger value="petitioner">Petitioner</UiTabsTrigger>
          <UiTabsTrigger value="respondent">Respondent</UiTabsTrigger>
        </UiTabsList>

        <UiTabsContent value="petitioner">
          <ArgsBoard
            args={args}
            visible={args.side === 'petitioner'}
            expanded={expanded}
            onToggleExpand={() => setExpanded((v) => !v)}
          />
        </UiTabsContent>
        <UiTabsContent value="respondent">
          <ArgsBoard
            args={args}
            visible={args.side === 'respondent'}
            expanded={expanded}
            onToggleExpand={() => setExpanded((v) => !v)}
          />
        </UiTabsContent>
      </UiTabs>
    </section>
  )
}

function ArgsBoard({ args, visible, expanded, onToggleExpand }) {
  if (!visible) return null

  const editorKey = [
    args.side,
    args.focus?.type || 'side',
    args.focus?.sectionId || '',
    args.focus?.prongId || '',
  ].join(':')

  return (
    <div className={expanded ? 'args-split is-expanded' : 'args-split'}>
      {!expanded ? (
        <div className="args-outline">
          <button
            type="button"
            className={
              args.focus?.type === 'side' ? 'args-whole-chip on' : 'args-whole-chip'
            }
            onClick={args.focusWholeArgument}
          >
            Whole argument notes
          </button>

          {args.sections.length === 0 && (
            <p className="args-empty">
              No sections yet. Use <strong>Add section</strong>, then <strong>Add prong</strong> for
              the steps under it.
            </p>
          )}
          {args.sections.map((section, sectionIdx) => {
            const sectionOn =
              args.focus?.type === 'section' && args.focus.sectionId === section.id
            const sectionActive = section.id === args.activeSectionId
            return (
              <div
                key={section.id}
                className={
                  sectionOn || (sectionActive && args.focus?.type !== 'side')
                    ? 'args-section on'
                    : 'args-section'
                }
              >
                <div
                  className="args-section-head"
                  onClick={() => args.selectSection(section.id)}
                >
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
                  {(section.prongs || []).map((prong, prongIdx) => {
                    const prongOn =
                      args.focus?.type === 'prong' && args.focus.prongId === prong.id
                    return (
                      <li
                        key={prong.id}
                        className={
                          prongOn ? 'args-row args-prong-row on' : 'args-row args-prong-row'
                        }
                        onClick={() => args.selectProng(section.id, prong.id)}
                      >
                        <span className="mono args-num">
                          {sectionIdx + 1}.{prongIdx + 1}
                        </span>
                        <input
                          className="args-input"
                          value={prong.title}
                          aria-label={`Prong ${sectionIdx + 1}.${prongIdx + 1} title`}
                          onChange={(e) =>
                            args.updateProngTitle(section.id, prong.id, e.target.value)
                          }
                          onFocus={() => args.selectProng(section.id, prong.id)}
                        />
                        <button
                          type="button"
                          className="icon-btn danger"
                          aria-label="Remove prong"
                          onClick={(e) => {
                            e.stopPropagation()
                            args.removeProng(section.id, prong.id)
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    )
                  })}
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
      ) : null}

      <div className="args-notes">
        <div className="args-notes-head">
          {expanded ? (
            <span className="mono notes-expand-hint">{args.focusLabel}</span>
          ) : (
            <span className="mono args-notes-label">{args.focusLabel}</span>
          )}
          <button
            type="button"
            className={expanded ? 'btn-ink notes-expand-exit' : 'btn-soft'}
            onClick={onToggleExpand}
            aria-label={expanded ? 'Exit expanded notes' : 'Expand working notes'}
            title={
              expanded
                ? 'Exit expanded view (Esc) · show argument outline again'
                : 'Expand notes · hide argument outline'
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
        <p className="args-notes-hint mono">
          {args.focus?.type === 'side'
            ? 'Full flowing notes for this side. Ask AI can read this as the whole argument.'
            : args.focus?.type === 'section'
              ? 'Notes for this argument section only. Click Whole argument notes for the full draft.'
              : 'Notes for this prong only. Click the section or Whole argument notes to zoom out.'}
        </p>
        <NoteEditor key={editorKey} html={args.notesHtml} onChange={args.setNotesForSide} />
      </div>
    </div>
  )
}
