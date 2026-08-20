import { PanelLeft, Search } from 'lucide-react'

/**
 * Sticky chrome. Icons from Lucide (https://github.com/lucide-icons/lucide).
 */
export function TopBar({ matterTitle, season, onSearchClick, onToggleRail, railOpen }) {
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
    </header>
  )
}
