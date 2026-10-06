import { useState } from 'react'
import { TopBar } from './TopBar'
import { SideRail } from './SideRail'
import { CommandPalette } from '../components/CommandPalette'
import { WorkspaceBootScreen } from '../components/WorkspaceBootScreen'
import { AiUiProvider } from '../ai/AiUiContext'
import { AiSelectionBubble } from '../components/ai/AiSelectionBubble'
import { AiFab } from '../components/ai/AiFab'
import { useCaseLibrary } from '../hooks/useCaseLibrary'
import { MATTER } from '../data/seed'

function ShellBody({ children }) {
  const { workspaceReady } = useCaseLibrary()
  const [railOpen, setRailOpen] = useState(true)
  const [cmdOpen, setCmdOpen] = useState(false)

  return (
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
        <main className="main">
          {workspaceReady ? children : <WorkspaceBootScreen />}
        </main>
      </div>
      {workspaceReady ? (
        <>
          <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
          <AiSelectionBubble />
          <AiFab />
        </>
      ) : null}
    </div>
  )
}

export function Shell({ children }) {
  return (
    <AiUiProvider>
      <ShellBody>{children}</ShellBody>
    </AiUiProvider>
  )
}
