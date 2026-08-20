import { useState } from 'react'
import { Plus, GripVertical, Trash2 } from 'lucide-react'
import { UiTabs, UiTabsContent, UiTabsList, UiTabsTrigger } from '../components/ui/Tabs'
import { NoteEditor } from '../components/NoteEditor'

const INITIAL = {
  petitioner: [
    { id: 'p1', title: 'Opening theme' },
    { id: 'p2', title: 'Q1 roadmap — search' },
    { id: 'p3', title: 'Q2 roadmap — Youngstown' },
    { id: 'p4', title: 'Hinge + close' },
  ],
  respondent: [
    { id: 'r1', title: 'Opening theme' },
    { id: 'r2', title: 'No search / Tuggle line' },
    { id: 'r3', title: 'Category 1 authority' },
    { id: 'r4', title: 'Rebuttal points' },
  ],
}

/**
 * Argument board: interactive outline lists + working notes pane.
 * Full drag-and-drop can use dnd-kit later; for now add / remove / edit is enough.
 */
export function ArgumentsPage() {
  const [side, setSide] = useState('petitioner')
  const [outlines, setOutlines] = useState(INITIAL)
  const [notes, setNotes] = useState({
    petitioner: '<h2>Petitioner working notes</h2><p>Quips, corrections, language.</p>',
    respondent: '<h2>Respondent working notes</h2><p>Structure and rebuttal scratch.</p>',
  })

  const items = outlines[side]

  function addItem() {
    const id = `${side[0]}-${Date.now()}`
    setOutlines((prev) => ({
      ...prev,
      [side]: [...prev[side], { id, title: 'New point' }],
    }))
  }

  function updateTitle(id, title) {
    setOutlines((prev) => ({
      ...prev,
      [side]: prev[side].map((it) => (it.id === id ? { ...it, title } : it)),
    }))
  }

  function removeItem(id) {
    setOutlines((prev) => ({
      ...prev,
      [side]: prev[side].filter((it) => it.id !== id),
    }))
  }

  return (
    <section className="workspace">
      <header className="workspace-head">
        <div>
          <h1>Arguments</h1>
          <p className="lede">
            Structure the side you are arguing. Mirror of OneNote “My Arguments” / petitioner &amp;
            respondent pages.
          </p>
        </div>
        <button type="button" className="btn-ink" onClick={addItem}>
          <Plus size={16} strokeWidth={1.75} />
          Add point
        </button>
      </header>

      <UiTabs value={side} onValueChange={setSide}>
        <UiTabsList>
          <UiTabsTrigger value="petitioner">Petitioner</UiTabsTrigger>
          <UiTabsTrigger value="respondent">Respondent</UiTabsTrigger>
        </UiTabsList>

        <UiTabsContent value={side}>
          <div className="args-split">
            <ol className="args-outline">
              {items.map((it, idx) => (
                <li key={it.id} className="args-row">
                  <GripVertical size={16} className="args-grip" aria-hidden />
                  <span className="mono args-num">{idx + 1}</span>
                  <input
                    className="args-input"
                    value={it.title}
                    onChange={(e) => updateTitle(it.id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label="Remove point"
                    onClick={() => removeItem(it.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ol>
            <NoteEditor
              key={side}
              html={notes[side]}
              onChange={(html) => setNotes((prev) => ({ ...prev, [side]: html }))}
            />
          </div>
        </UiTabsContent>
      </UiTabs>
    </section>
  )
}
