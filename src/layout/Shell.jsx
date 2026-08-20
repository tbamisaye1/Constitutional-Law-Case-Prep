import { useState } from 'react'
import { TopBar } from './TopBar'
import { SideRail } from './SideRail'
import { CommandPalette } from '../components/CommandPalette'
import { AiUiProvider } from '../ai/AiUiContext'
import { AiSelectionBubble } from '../components/ai/AiSelectionBubble'
import { AiFab } from '../components/ai/AiFab'
import { MATTER } from '../data/seed'

export function Shell({ children }) {
  const [railOpen, setRailOpen] = useState(true)
  const [cmdOpen, setCmdOpen] = useState(false)

  return (
    <AiUiProvider>
      <div className={`app-shell ${railOpen ? 'rail-open' : 'rail-closed'}`}>
        <TopBar
          matterTitle="Bronner"
          season={MATTER.season}
          railOpen={railOpen}
          onToggleRail={() => setRailOpen((v) => !v)}
          onSearchClick={() => setCmdOpen(true)}
        />
        <div className="shell-body">
          <SideRail open={railOpen} />
          <main className="main">{children}</main>
        </div>
        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
        <AiSelectionBubble />
        <AiFab />
      </div>
    </AiUiProvider>
  )
}
