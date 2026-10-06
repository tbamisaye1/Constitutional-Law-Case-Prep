import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
} from 'lucide-react'
import { UiTabs, UiTabsContent, UiTabsList, UiTabsTrigger } from '../components/ui/Tabs'
import { NoteEditor } from '../components/NoteEditor'
import { SyncBanner } from '../components/SyncBanner'
import { useArguments } from '../hooks/useArguments'
import { notePreview } from '../lib/argumentNotes'

function supportsFieldSizing() {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? CSS.supports('field-sizing', 'content')
    : false
}

function growTitleField(el) {
  if (!el || supportsFieldSizing()) return
  // Never collapse to 0px. That made every keystroke jump the outline.
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/**
 * Outline titles that wrap when the column is narrow. Enter commits (no
 * newline in the title); the box grows with the wrapped text.
 */
function OutlineTitleField({ className, value, onChange, onFocus, 'aria-label': ariaLabel }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    growTitleField(ref.current)
  }, [value])

  return (
    <textarea
      ref={ref}
      className={className ? `${className} args-title-field` : 'args-input args-title-field'}
      value={value}
      rows={1}
      aria-label={ariaLabel}
      onChange={(e) => {
        growTitleField(e.currentTarget)
        onChange(e)
      }}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
    />
  )
}

function OutlineMoveButtons({ canUp, canDown, onUp, onDown, label }) {
  return (
    <div className="args-moves">
      <button
        type="button"
        className="icon-btn soft"
        aria-label={`Move ${label} up`}
        title="Move up"
        disabled={!canUp}
        onClick={(e) => {
          e.stopPropagation()
          onUp()
        }}
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        className="icon-btn soft"
        aria-label={`Move ${label} down`}
        title="Move down"
        disabled={!canDown}
        onClick={(e) => {
          e.stopPropagation()
          onDown()
        }}
      >
        <ChevronDown size={14} />
      </button>
    </div>
  )
}

const EXPAND_KEY = 'case-prep-args-expanded'
const VIEW_KEY = 'case-prep-args-view'

function readExpanded() {
  try {
    return localStorage.getItem(EXPAND_KEY) === '1'
  } catch {
    return false
  }
}

function readViewMode() {
  try {
    const raw = localStorage.getItem(VIEW_KEY)
    if (raw === 'board' || raw === 'joined' || raw === 'focus') return raw
  } catch {
    /* ignore */
  }
  return 'focus'
}

function NotePreview({ html, active, onSelect, label }) {
  const preview = notePreview(html)
  return (
    <button
      type="button"
      className={
        active
          ? 'args-note-preview on'
          : preview
            ? 'args-note-preview'
            : 'args-note-preview is-empty'
      }
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      aria-label={label}
    >
      {preview || 'No notes yet — click to write working notes for this piece.'}
    </button>
  )
}

/**
 * Argument board: multiple drafts per side, each with sections/prongs,
 * whole-argument notes, and a joined read-through.
 */
export function ArgumentsPage() {
  const args = useArguments()
  const [expanded, setExpanded] = useState(readExpanded)
  const [viewMode, setViewMode] = useState(readViewMode)

  useEffect(() => {
    try {
      localStorage.setItem(EXPAND_KEY, expanded ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [expanded])

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, viewMode)
    } catch {
      /* ignore */
    }
  }, [viewMode])

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

  // Restore joined focus when that view was remembered from a prior visit.
  const restoredView = useRef(false)
  useEffect(() => {
    if (restoredView.current) return
    restoredView.current = true
    if (viewMode === 'joined') args.focusJoinedArgument()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot restore
  }, [])

  // Leaving joined via Edit / outline should not wipe Structure + notes.
  useEffect(() => {
    if (args.focus?.type === 'joined') {
      setViewMode('joined')
      return
    }
    setViewMode((prev) => (prev === 'joined' ? 'focus' : prev))
  }, [args.focus?.type])

  return (
    <section className={expanded ? 'workspace args-workspace is-expanded' : 'workspace args-workspace'}>
      {!expanded ? (
        <header className="workspace-head">
          <div>
            <h1>Arguments</h1>
            <p className="lede">
              Structure the argument on the left; write working notes for each section, prong, or the
              whole draft on the right. Use Structure + notes to scan your logic beside the outline
              while you outline. Full argument joins every piece to read through. The database is the
              durable copy; hard refresh reloads from there.
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

      {!expanded ? <SyncBanner /> : null}

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
            viewMode={viewMode}
            setViewMode={setViewMode}
            onToggleExpand={() => setExpanded((v) => !v)}
          />
        </UiTabsContent>
        <UiTabsContent value="respondent">
          <ArgsBoard
            args={args}
            visible={args.side === 'respondent'}
            expanded={expanded}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onToggleExpand={() => setExpanded((v) => !v)}
          />
        </UiTabsContent>
      </UiTabs>
    </section>
  )
}

function ArgsBoard({ args, visible, expanded, viewMode, setViewMode, onToggleExpand }) {
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  if (!visible) return null

  function clearDrag() {
    setDragging(null)
    setDragOver(null)
  }

  const showBoardPreviews = viewMode === 'board'
  const isJoined = args.focus?.type === 'joined'
  const wholeOn = !isJoined && args.focus?.type === 'side' && viewMode !== 'board'
  const boardOn = viewMode === 'board' && !isJoined
  const editorKey = [
    args.side,
    args.activeDraftId || '',
    args.focus?.type || 'side',
    args.focus?.sectionId || '',
    args.focus?.prongId || '',
  ].join(':')

  function openWholeNotes() {
    setViewMode('focus')
    args.focusWholeArgument()
  }

  function openBoard() {
    setViewMode('board')
    if (args.focus?.type === 'joined') args.focusWholeArgument()
  }

  function openJoined() {
    setViewMode('joined')
    args.focusJoinedArgument()
  }

  function editSection(sectionId) {
    if (viewMode === 'joined') setViewMode('focus')
    args.selectSection(sectionId)
  }

  function editProng(sectionId, prongId) {
    if (viewMode === 'joined') setViewMode('focus')
    args.selectProng(sectionId, prongId)
  }

  return (
    <div className={expanded ? 'args-split is-expanded' : 'args-split'}>
      {!expanded ? (
        <div className={showBoardPreviews ? 'args-outline is-board' : 'args-outline'}>
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
                  onBlur={() => args.commitDraftName(args.activeDraftId)}
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
              className={wholeOn ? 'args-whole-chip on' : 'args-whole-chip'}
              onClick={openWholeNotes}
            >
              Whole argument notes
            </button>
            <button
              type="button"
              className={boardOn ? 'args-whole-chip on' : 'args-whole-chip'}
              onClick={openBoard}
            >
              Structure + notes
            </button>
            <button
              type="button"
              className={isJoined ? 'args-whole-chip on' : 'args-whole-chip'}
              onClick={openJoined}
            >
              Full argument (joined)
            </button>
            {showBoardPreviews ? (
              <NotePreview
                html={args.activeDraft?.notes || ''}
                active={args.focus?.type === 'side'}
                onSelect={args.focusWholeArgument}
                label="Whole argument working notes preview"
              />
            ) : null}
          </div>

          {args.sections.length === 0 && (
            <p className="args-empty">
              No sections yet. Use <strong>Add section</strong>, then <strong>Add prong</strong> for
              the steps under it. Drag the grip or use the arrows to rearrange.
            </p>
          )}
          {args.sections.map((section, sectionIdx) => {
            const sectionOn =
              args.focus?.type === 'section' && args.focus.sectionId === section.id
            const sectionActive = section.id === args.activeSectionId
            const sectionDropOn =
              dragOver?.kind === 'section' && dragOver.sectionId === section.id
            return (
              <div
                key={section.id}
                className={[
                  sectionOn ||
                  (sectionActive && args.focus?.type !== 'side' && args.focus?.type !== 'joined')
                    ? 'args-section on'
                    : 'args-section',
                  sectionDropOn ? 'is-drop-target' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onDragOver={(e) => {
                  if (dragging?.kind !== 'section') return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOver({ kind: 'section', sectionId: section.id })
                }}
                onDragLeave={() => {
                  setDragOver((cur) =>
                    cur?.kind === 'section' && cur.sectionId === section.id ? null : cur
                  )
                }}
                onDrop={(e) => {
                  if (dragging?.kind !== 'section') return
                  e.preventDefault()
                  const fromId = dragging.sectionId
                  clearDrag()
                  if (fromId === section.id) return
                  args.moveSection(fromId, sectionIdx)
                }}
              >
                <div
                  className="args-section-head"
                  onClick={() => editSection(section.id)}
                >
                  <span
                    className="args-grip"
                    draggable
                    title="Drag to reorder section"
                    aria-label={`Drag section ${sectionIdx + 1}`}
                    onClick={(e) => e.stopPropagation()}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', section.id)
                      setDragging({ kind: 'section', sectionId: section.id })
                    }}
                    onDragEnd={clearDrag}
                  >
                    <GripVertical size={14} aria-hidden />
                  </span>
                  <span className="mono args-num">{sectionIdx + 1}</span>
                  <OutlineTitleField
                    className="args-input args-section-input"
                    value={section.title}
                    aria-label={`Section ${sectionIdx + 1} title`}
                    onChange={(e) => args.updateSectionTitle(section.id, e.target.value)}
                    onFocus={() => editSection(section.id)}
                  />
                  <OutlineMoveButtons
                    label={`section ${sectionIdx + 1}`}
                    canUp={sectionIdx > 0}
                    canDown={sectionIdx < args.sections.length - 1}
                    onUp={() => args.moveSectionByDelta(section.id, -1)}
                    onDown={() => args.moveSectionByDelta(section.id, 1)}
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
                {showBoardPreviews ? (
                  <NotePreview
                    html={section.notes || ''}
                    active={sectionOn}
                    onSelect={() => editSection(section.id)}
                    label={`Section ${sectionIdx + 1} working notes preview`}
                  />
                ) : null}

                <ul className="args-prongs">
                  {(section.prongs || []).map((prong, prongIdx) => {
                    const prongOn =
                      args.focus?.type === 'prong' && args.focus.prongId === prong.id
                    const prongDropOn =
                      dragOver?.kind === 'prong' &&
                      dragOver.sectionId === section.id &&
                      dragOver.prongId === prong.id
                    const prongs = section.prongs || []
                    return (
                      <li
                        key={prong.id}
                        className={[
                          prongOn ? 'args-row args-prong-row on' : 'args-row args-prong-row',
                          prongDropOn ? 'is-drop-target' : '',
                          showBoardPreviews ? 'has-preview' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => editProng(section.id, prong.id)}
                        onDragOver={(e) => {
                          if (
                            dragging?.kind !== 'prong' ||
                            dragging.sectionId !== section.id
                          ) {
                            return
                          }
                          e.preventDefault()
                          e.stopPropagation()
                          e.dataTransfer.dropEffect = 'move'
                          setDragOver({
                            kind: 'prong',
                            sectionId: section.id,
                            prongId: prong.id,
                          })
                        }}
                        onDragLeave={() => {
                          setDragOver((cur) =>
                            cur?.kind === 'prong' && cur.prongId === prong.id ? null : cur
                          )
                        }}
                        onDrop={(e) => {
                          if (
                            dragging?.kind !== 'prong' ||
                            dragging.sectionId !== section.id
                          ) {
                            return
                          }
                          e.preventDefault()
                          e.stopPropagation()
                          const fromId = dragging.prongId
                          clearDrag()
                          if (fromId === prong.id) return
                          args.moveProng(section.id, fromId, prongIdx)
                        }}
                      >
                        <span
                          className="args-grip"
                          draggable
                          title="Drag to reorder prong"
                          aria-label={`Drag prong ${sectionIdx + 1}.${prongIdx + 1}`}
                          onClick={(e) => e.stopPropagation()}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', prong.id)
                            setDragging({
                              kind: 'prong',
                              sectionId: section.id,
                              prongId: prong.id,
                            })
                          }}
                          onDragEnd={clearDrag}
                        >
                          <GripVertical size={14} aria-hidden />
                        </span>
                        <span className="mono args-num">
                          {sectionIdx + 1}.{prongIdx + 1}
                        </span>
                        <OutlineTitleField
                          className="args-input"
                          value={prong.title}
                          aria-label={`Prong ${sectionIdx + 1}.${prongIdx + 1} title`}
                          onChange={(e) =>
                            args.updateProngTitle(section.id, prong.id, e.target.value)
                          }
                          onFocus={() => editProng(section.id, prong.id)}
                        />
                        <OutlineMoveButtons
                          label={`prong ${sectionIdx + 1}.${prongIdx + 1}`}
                          canUp={prongIdx > 0}
                          canDown={prongIdx < prongs.length - 1}
                          onUp={() => args.moveProngByDelta(section.id, prong.id, -1)}
                          onDown={() => args.moveProngByDelta(section.id, prong.id, 1)}
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
                        {showBoardPreviews ? (
                          <NotePreview
                            html={prong.notes || ''}
                            active={prongOn}
                            onSelect={() => editProng(section.id, prong.id)}
                            label={`Prong ${sectionIdx + 1}.${prongIdx + 1} working notes preview`}
                          />
                        ) : null}
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
          {isJoined
            ? 'Every section and prong in this draft, joined in outline order. Click Edit to focus a piece.'
            : showBoardPreviews
              ? 'Working notes for the selected piece. Previews on the left are for scanning only.'
              : args.focus?.type === 'side'
                ? 'Freeform flowing notes for this draft. Separate from the section/prong outline.'
                : args.focus?.type === 'section'
                  ? 'Notes for this section only. Use Structure + notes to scan logic beside the outline.'
                  : 'Notes for this prong only. Use Structure + notes to scan logic beside the outline.'}
        </p>
        {isJoined ? (
          <ArgsJoinedReadthrough
            blocks={args.joinedBlocks}
            onEditSection={editSection}
            onEditProng={editProng}
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
