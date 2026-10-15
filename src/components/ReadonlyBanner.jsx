import { Lock } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

/** Shown when the site is view-only until the editor password is entered. */
export function ReadonlyBanner() {
  const { ready, lockEnabled, canEdit, setLoginOpen } = useAuth()
  if (!ready || !lockEnabled || canEdit) return null

  return (
    <div className="readonly-banner" role="status">
      <Lock size={14} strokeWidth={1.75} aria-hidden />
      <span>Viewing only. Log in to edit arguments, notes, and uploads.</span>
      <button type="button" className="btn-ink readonly-banner-btn" onClick={() => setLoginOpen(true)}>
        Log in
      </button>
    </div>
  )
}
