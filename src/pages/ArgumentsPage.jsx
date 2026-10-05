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
 * Argument board: multiple drafts per side, each with sections/prongs,
 * whole-argument notes, and a joined read-through.
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
              Keep a Main argument and as many alternate drafts as you want. Switch drafts above the
              outline, focus a section or prong to edit it, or open Full argument to read everything
              joined. Edits save in this browser.
            </p>
          </div>
          <div className="args-head-actions">
            <button type="button" className="btn-ghost" onClick={args.addDraft}>
              <Plus size={16} strokeWidth={1.75} />
              New draft
            </button>
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

  const isJoined = args.focus?.type === 'joined'
  const editorKey = [
    args.side,
    args.activeDraftId || '',
    args.focus?.type || 'side',
    args.focus?.sectionId || '',
    args.focus?.prongId || '',
  ].join(':')

  return (
    <div className={expanded ? 'args-split is-expanded' : 'args-split'}>
      {!expanded ? (
        <div className="args-outline">
          <div className="args-drafts">
            <div className="args-drafts-label mono">Drafts</div>
            <div className="args-draft-chips">
              {(args.drafts || []).map((draft) => (
                <button
                  key={draft.id}
                  type="button"
                  className={
                    draft.id === args.activeDraftId ? 'args-draft-chip on' : 'args-draft-chip'
                  }
                  onClick={() => args.selectDraft(draft.id)}
                >
                  {draft.name}
                </button>
              ))}
              <button type="button" className="args-draft-chip add" onClick={args.addDraft}>
                + Draft
              </button>
            </div>
            {args.activeDraft ? (
              <div className="args-draft-rename">
                <input
                  className="args-input"
                  value={args.activeDraft.name}
                  aria-label="Draft name"
                  onChange={(e) => args.renameDraft(args.activeDraftId, e.target.value)}
                />
                {args.canRemoveDraft ? (
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label="Delete this draft"
                    title="Delete this draft"
                    onClick={() => args.removeDraft(args.activeDraftId)}
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="args-view-chips">
            <button
              type="button"
              className={args.focus?.type === 'side' ? 'args-whole-chip on' : 'args-whole-chip'}
              onClick={args.focusWholeArgument}
            >
              Whole argument notes
            </button>
            <button
              type="button"
              className={isJoined ? 'args-whole-chip on' : 'args-whole-chip'}
              onClick={args.focusJoinedArgument}
            >
              Full argument (joined)
            </button>
          </div>

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
                  sectionOn ||
                  (sectionActive && args.focus?.type !== 'side' && args.focus?.type !== 'joined')
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
            ? 'Freeform flowing notes for this draft. Separate from the section/prong outline.'
            : args.focus?.type === 'joined'
              ? 'Every section and prong in this draft, joined in outline order. Click Edit to focus a piece.'
              : args.focus?.type === 'section'
                ? 'Notes for this section only. Switch drafts above, or open Full argument (joined).'
                : 'Notes for this prong only. Switch drafts above, or open Full argument (joined).'}
        </p>
        {isJoined ? (
          <ArgsJoinedReadthrough
            blocks={args.joinedBlocks}
            onEditSection={args.selectSection}
            onEditProng={args.selectProng}
          />
        ) : (
          <NoteEditor key={editorKey} html={args.notesHtml} onChange={args.setNotesForSide} />
        )}
      </div>
    </div>
  )
}

function ArgsJoinedReadthrough({ blocks, onEditSection, onEditProng }) {
  if (!blocks?.length) {
    return (
      <div className="args-joined">
        <p className="args-joined-empty">
          No sections yet. Add sections and prongs on the left, write notes on each, then come back
          here to read the full argument in order.
        </p>
      </div>
    )
  }

  return (
    <div className="args-joined">
      {blocks.map((block) => (
        <article
          key={block.key}
          className={
            block.kind === 'section' ? 'args-joined-block is-section' : 'args-joined-block is-prong'
          }
        >
          <header className="args-joined-head">
            <div>
              <span className="mono args-joined-label">{block.label}</span>
              <h3 className="args-joined-title">{block.title}</h3>
            </div>
            <button
              type="button"
              className="btn-soft"
              onClick={() => {
                if (block.kind === 'prong') onEditProng(block.sectionId, block.prongId)
                else onEditSection(block.sectionId)
              }}
            >
              Edit
            </button>
          </header>
          {block.empty ? (
            <p className="args-joined-empty-block mono">No notes on this piece yet.</p>
          ) : (
            <div
              className="args-joined-body note-prose"
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          )}
        </article>
      ))}
    </div>
  )
}
