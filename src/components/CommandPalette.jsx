import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { FileText, Library, NotebookPen, Scale, Home, Bot, Upload, Mic, BookOpen } from 'lucide-react'
import { NAV } from '../data/seed'
import { LIBRARY_CASES } from '../data/casesSeed'
import guideSections from '../data/guideSections.json'

const ICONS = {
  Home,
  ListChecks: FileText,
  Library,
  NotebookPen,
  Scale,
  Mic,
  Upload,
  Bot,
  FileText,
  BookOpen,
}

/**
 * ⌘K palette via cmdk (https://github.com/pacocoursey/cmdk).
 * Navigate rooms + jump to seeded cases without looking AI-chrome generic.
 */
export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate()
  const flatNav = useMemo(
    () => NAV.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label }))),
    []
  )

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (e.key === 'Escape' && open) onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (!open) return null

  function go(path) {
    navigate(path)
    onOpenChange(false)
  }

  return (
    <div className="cmdk-overlay" onClick={() => onOpenChange(false)}>
      <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
        <Command label="Global search" shouldFilter>
          <Command.Input placeholder="Jump to a room, case, or tool…" autoFocus />
          <Command.List>
            <Command.Empty>Nothing matched. Try “Katz”, “notes”, or “facts”.</Command.Empty>

            <Command.Group heading="Navigate">
              {flatNav.map((item) => {
                const Icon = ICONS[item.icon] || FileText
                return (
                  <Command.Item key={item.to} value={`${item.text} ${item.group}`} onSelect={() => go(item.to)}>
                    <Icon size={16} strokeWidth={1.75} />
                    <span>{item.text}</span>
                    <span className="cmdk-muted mono">{item.group}</span>
                  </Command.Item>
                )
              })}
            </Command.Group>

            <Command.Group heading="Guide">
              {guideSections.map((s) => (
                <Command.Item
                  key={s.id}
                  value={`${s.title} ${s.group} guide`}
                  onSelect={() => go(`/guide?s=${s.id}`)}
                >
                  <BookOpen size={16} strokeWidth={1.75} />
                  <span>{s.title}</span>
                  <span className="cmdk-muted mono">{s.group}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Cases">
              {LIBRARY_CASES.map((c) => (
                <Command.Item
                  key={c.id}
                  value={`${c.name} ${c.cite}`}
                  onSelect={() => go(`/library?case=${c.id}`)}
                >
                  <Library size={16} strokeWidth={1.75} />
                  <span>{c.name}</span>
                  <span className="cmdk-muted mono">Q{c.issue}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
