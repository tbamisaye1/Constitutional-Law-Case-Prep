import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
  FileText,
  Library,
  NotebookPen,
  Scale,
  Home,
  Bot,
  Upload,
  Mic,
  BookOpen,
  ListChecks,
} from 'lucide-react'
import { NAV } from '../data/seed'
import { guideSections } from '../data/guideCopy'
import { useCaseLibrary } from '../hooks/useCaseLibrary'
import { searchCases, searchWorkspace } from '../lib/workspaceSearch'

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
 * Navigate rooms, guide, cases, and search notebook + case-library notes
 * (e.g. type Enemy → Hamdi “Enemy Combatant” tab).
 */
export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate()
  const lib = useCaseLibrary()
  const [query, setQuery] = useState('')
  const flatNav = useMemo(
    () => NAV.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label }))),
    []
  )

  const searching = query.trim().length >= 2

  const contentHits = useMemo(() => {
    if (!open) return []
    return searchWorkspace(query, {
      limit: searching ? 14 : 8,
      notesByCase: lib.notesByCase || {},
      noteTabs: lib.noteTabs || [],
      caseFacts: lib.caseFacts || [],
      cases: lib.cases || [],
    })
  }, [open, query, searching, lib.notesByCase, lib.noteTabs, lib.caseFacts, lib.cases])

  const caseHits = useMemo(() => {
    if (!open) return []
    if (!searching) return (lib.cases || []).slice(0, 10)
    return searchCases(query, lib.cases || [], { limit: 10 })
  }, [open, query, searching, lib.cases])

  const guideHits = useMemo(() => {
    if (!searching) return guideSections
    const q = query.trim().toLowerCase()
    return guideSections.filter(
      (s) => s.title.toLowerCase().includes(q) || s.group.toLowerCase().includes(q)
    )
  }, [query, searching])

  const navHits = useMemo(() => {
    if (!searching) return flatNav
    const q = query.trim().toLowerCase()
    return flatNav.filter(
      (item) => item.text.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    )
  }, [flatNav, query, searching])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

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

  const hasContent = contentHits.length > 0
  const hasCases = caseHits.length > 0
  const hasGuide = guideHits.length > 0
  const hasNav = navHits.length > 0
  const showEmpty = searching && !hasContent && !hasCases && !hasGuide && !hasNav

  return (
    <div className="cmdk-overlay" onClick={() => onOpenChange(false)}>
      <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
        <Command label="Global search" shouldFilter={false}>
          <Command.Input
            placeholder="Search notes, case library, guide… try Enemy or NDAA"
            autoFocus
            value={query}
            onValueChange={setQuery}
          />
          <Command.List>
            {showEmpty ? (
              <Command.Empty>
                Nothing matched. Try “Enemy”, “NDAA”, a case name, or “notes”.
              </Command.Empty>
            ) : null}

            {hasContent ? (
              <Command.Group heading={searching ? 'Matching notes & facts' : 'Recent notes'}>
                {contentHits.map((hit) => (
                  <Command.Item
                    key={hit.id}
                    value={`${hit.id} ${hit.title} ${hit.sectionName} ${hit.snippet}`}
                    onSelect={() => go(hit.path)}
                  >
                    {hit.kind === 'case_fact' ? (
                      <ListChecks size={16} strokeWidth={1.75} />
                    ) : hit.kind === 'case_note' ? (
                      <Library size={16} strokeWidth={1.75} />
                    ) : (
                      <NotebookPen size={16} strokeWidth={1.75} />
                    )}
                    <span>{hit.title}</span>
                    <span className="cmdk-muted mono">
                      {hit.sectionName}
                      {searching && hit.snippet ? ` · ${hit.snippet.slice(0, 52)}` : ''}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {hasNav ? (
              <Command.Group heading="Navigate">
                {navHits.map((item) => {
                  const Icon = ICONS[item.icon] || FileText
                  return (
                    <Command.Item
                      key={item.to}
                      value={`${item.text} ${item.group} navigate`}
                      onSelect={() => go(item.to)}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                      <span>{item.text}</span>
                      <span className="cmdk-muted mono">{item.group}</span>
                    </Command.Item>
                  )
                })}
              </Command.Group>
            ) : null}

            {hasGuide ? (
              <Command.Group heading="Guide">
                {guideHits.map((s) => (
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
            ) : null}

            {hasCases ? (
              <Command.Group heading="Cases">
                {caseHits.map((c) => (
                  <Command.Item
                    key={c.id}
                    value={`${c.name} ${c.cite || ''} case`}
                    onSelect={() => go(`/library?case=${encodeURIComponent(c.id)}`)}
                  >
                    <Library size={16} strokeWidth={1.75} />
                    <span>{c.name || c.id}</span>
                    <span className="cmdk-muted mono">
                      {c.issue != null && c.issue !== '' ? `Q${c.issue}` : 'Library'}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
