import { Fragment, useEffect, useState } from 'react'
import { TopBar } from './TopBar'
import { SideRail } from './SideRail'
import { CommandPalette } from '../components/CommandPalette'
import { WorkspaceBootScreen } from '../components/WorkspaceBootScreen'
import { AiUiProvider } from '../ai/AiUiContext'
import { AiSelectionBubble } from '../components/ai/AiSelectionBubble'
import { AiFab } from '../components/ai/AiFab'
import { RELOADED_FROM_DATABASE_EVENT, useCaseLibrary } from '../hooks/useCaseLibrary'
import { MATTER } from '../data/seed'

function ShellBody({ children }) {
  const { workspaceReady } = useCaseLibrary()
  const [railOpen, setRailOpen] = useState(true)
  const [cmdOpen, setCmdOpen] = useState(false)
  // Bumped by Reload from database: remounts the open page so every editor
  // re-reads the fresh cache instead of keeping its in-memory document.
  const [reloadEpoch, setReloadEpoch] = useState(0)

  useEffect(() => {
    const bump = () => setReloadEpoch((n) => n + 1)
    window.addEventListener(RELOADED_FROM_DATABASE_EVENT, bump)
    return () => window.removeEventListener(RELOADED_FROM_DATABASE_EVENT, bump)
  }, [])

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
          {workspaceReady ? (
            <Fragment key={reloadEpoch}>{children}</Fragment>
          ) : (
            <WorkspaceBootScreen />
          )}
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
