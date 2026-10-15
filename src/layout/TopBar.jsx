import { Lock, LogOut, PanelLeft, Search } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

/**
 * Sticky chrome. Icons from Lucide (https://github.com/lucide-icons/lucide).
 */
export function TopBar({ matterTitle, season, onSearchClick, onToggleRail, railOpen }) {
  const { ready, lockEnabled, canEdit, setLoginOpen, logout } = useAuth()

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-btn"
        aria-label={railOpen ? 'Hide sidebar' : 'Show sidebar'}
        aria-pressed={railOpen}
        onClick={onToggleRail}
      >
        <PanelLeft size={18} strokeWidth={1.75} />
      </button>
      <div className="brand">
        Case Prep
        <span>
          {' '}
          · {matterTitle}
          {season ? ` · ${season}` : ''}
        </span>
      </div>
      <button type="button" className="searchbtn mono" onClick={onSearchClick}>
        <Search size={14} strokeWidth={1.75} />
        <span className="search-lbl">Search</span>
        <kbd>⌘K</kbd>
      </button>
      {ready && lockEnabled ? (
        canEdit ? (
          <button
            type="button"
            className="btn-ghost topbar-auth"
            title="Log out of editor mode on this browser"
            onClick={() => logout()}
          >
            <LogOut size={14} strokeWidth={1.75} />
            Log out
          </button>
        ) : (
          <button
            type="button"
            className="btn-ink topbar-auth"
            title="Log in to edit"
            onClick={() => setLoginOpen(true)}
          >
            <Lock size={14} strokeWidth={1.75} />
            Log in
          </button>
        )
      ) : null}
    </header>
  )
}
