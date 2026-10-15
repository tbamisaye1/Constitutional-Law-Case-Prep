import { useEffect, useRef, useState } from 'react'
import { Lock, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

/**
 * Quiet password gate matching Case Prep tokens (paper / ink / gold).
 */
export function LoginModal() {
  const { loginOpen, setLoginOpen, login, lockEnabled } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!loginOpen) return undefined
    setPassword('')
    setError('')
    const t = window.setTimeout(() => inputRef.current?.focus(), 40)
    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setLoginOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [loginOpen, setLoginOpen])

  if (!loginOpen) return null

  async function onSubmit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await login(password)
    } catch (err) {
      setError(err?.message || 'Could not log in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-modal-root" role="presentation">
      <button
        type="button"
        className="login-modal-backdrop"
        aria-label="Close login"
        onClick={() => setLoginOpen(false)}
      />
      <div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <div className="login-modal-head">
          <div className="login-modal-mark" aria-hidden>
            <Lock size={18} strokeWidth={1.75} />
          </div>
          <button
            type="button"
            className="icon-btn soft login-modal-close"
            aria-label="Close"
            onClick={() => setLoginOpen(false)}
          >
            <X size={16} />
          </button>
        </div>
        <h2 id="login-title">Edit Case Prep</h2>
        <p className="login-modal-lede">
          {lockEnabled
            ? 'Enter the editor password. This browser stays signed in for months, including after deploys.'
            : 'Editor lock is off on this server. You can close this and edit freely.'}
        </p>
        <form className="login-modal-form" onSubmit={onSubmit}>
          <label>
            Password
            <input
              ref={inputRef}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Editor password"
            />
          </label>
          {error ? <p className="login-modal-error">{error}</p> : null}
          <div className="login-modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setLoginOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-ink" disabled={busy || !password.trim()}>
              {busy ? 'Checking…' : 'Log in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
