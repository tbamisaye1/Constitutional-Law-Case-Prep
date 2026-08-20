import { NavLink } from 'react-router-dom'
import {
  Home,
  ListChecks,
  Library,
  NotebookPen,
  Scale,
  Mic,
  Upload,
  Bot,
  BookOpen,
} from 'lucide-react'
import { NAV } from '../data/seed'
import * as ScrollArea from '@radix-ui/react-scroll-area'

const ICONS = { Home, ListChecks, Library, NotebookPen, Scale, Mic, Upload, Bot, BookOpen }

/**
 * Left rail: OneNote-style rooms with Lucide icons.
 * ScrollArea from Radix keeps long nav tidy without custom scroll CSS hell.
 */
export function SideRail({ open }) {
  if (!open) return null

  return (
    <aside className="rail">
      <ScrollArea.Root className="rail-scroll">
        <ScrollArea.Viewport className="rail-viewport">
          {NAV.map((group) => (
            <div key={group.label}>
              <div className="rail-grp mono">{group.label}</div>
              {group.items.map((link) => {
                const Icon = ICONS[link.icon] || Home
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) => (isActive ? 'rail-link on' : 'rail-link')}
                  >
                    <Icon size={16} strokeWidth={1.75} className="rail-icon" />
                    <span>{link.text}</span>
                  </NavLink>
                )
              })}
            </div>
          ))}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="rail-bar" orientation="vertical">
          <ScrollArea.Thumb className="rail-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </aside>
  )
}
