import { Fragment, useEffect, useState } from 'react'
import { TopBar } from './TopBar'
import { SideRail } from './SideRail'
import { CommandPalette } from '../components/CommandPalette'
import { WorkspaceBootScreen } from '../components/WorkspaceBootScreen'
import { LoginModal } from '../components/LoginModal'
import { ReadonlyBanner } from '../components/ReadonlyBanner'
import { AiUiProvider } from '../ai/AiUiContext'
import { AuthProvider, useAuth } from '../auth/AuthContext'
import { AiSelectionBubble } from '../components/ai/AiSelectionBubble'
import { AiFab } from '../components/ai/AiFab'
import { RELOADED_FROM_DATABASE_EVENT, useCaseLibrary } from '../hooks/useCaseLibrary'
import { MATTER } from '../data/seed'

function ShellBody({ children }) {
  const { workspaceReady } = useCaseLibrary()
  const { canEdit, lockEnabled } = useAuth()
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

  const shellClass = [
    'app-shell',
    railOpen ? 'rail-open' : 'rail-closed',
    lockEnabled && !canEdit ? 'is-readonly' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
      <TopBar
        matterTitle="Bronner"
        season={MATTER.season}
        railOpen={railOpen}
        onToggleRail={() => setRailOpen((v) => !v)}
        onSearchClick={() => setCmdOpen(true)}
      />
      <ReadonlyBanner />
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
          {canEdit ? (
            <>
              <AiSelectionBubble />
              <AiFab />
            </>
          ) : null}
        </>
      ) : null}
      <LoginModal />
    </div>
  )
}

export function Shell({ children }) {
  return (
    <AuthProvider>
      <AiUiProvider>
        <ShellBody>{children}</ShellBody>
      </AiUiProvider>
    </AuthProvider>
  )
}
