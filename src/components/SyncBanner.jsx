import { useState } from 'react'
import { isWorkspacePinned, setWorkspaceId } from '../lib/workspace'

/**
 * Where the work on screen is currently saved.
 *
 * This replaced a hard-coded line that always claimed nothing reached the
 * backend. It is worth showing plainly: notes on a moot record are the sort of
 * thing you need to trust, and "saved in this browser" and "saved for every
 * device" are very different promises.
 *
 * Instant Case PDFs only reappear on another browser when that browser uses
 * the same workspace key. Production pins one via VITE_WORKSPACE_ID. Local /
 * unpinned builds expose copy + link controls so a laptop and an iPad can share.
 */

function clock(timestamp) {
  return new Date(timestamp).toLocaleTimeString()
}

function describe(sync) {
  if (sync.status === 'off') {
    return {
      tone: 'warn',
      text:
        'Saved in this browser only. This browser blocks storage keys, so nothing reaches the backend.',
    }
  }

  if (sync.status === 'syncing') {
    return { tone: 'info', text: 'Saving to the backend…' }
  }

  if (sync.status === 'error') {
    return {
      tone: 'warn',
      text: `Saved in this browser. The backend is unreachable, retrying. ${sync.error}`,
    }
  }

  if (sync.pending > 0) {
    const label = sync.pending === 1 ? '1 change' : `${sync.pending} changes`
    return { tone: 'info', text: `Saved in this browser. ${label} still to send.` }
  }

  const when = sync.lastSyncedAt ? ` Last sync ${clock(sync.lastSyncedAt)}.` : ''
  return { tone: 'ok', text: `Saved in this browser and on the backend.${when}` }
}

export function SyncBanner({ sync, saveError, lastSavedAt, onSyncNow }) {
  const { tone, text } = describe(sync)
  const pinned = isWorkspacePinned()
  const [open, setOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [note, setNote] = useState('')

  async function copyKey() {
    if (!sync.workspaceId) return
    try {
      await navigator.clipboard.writeText(sync.workspaceId)
      setNote('Workspace key copied. Paste it on another device, then reload.')
    } catch {
      setNote('Could not copy. Select the key and copy it manually.')
    }
  }

  function adoptKey() {
    if (!setWorkspaceId(paste)) {
      setNote('That does not look like a workspace key.')
      return
    }
    setNote('Linked. Reloading…')
    window.setTimeout(() => window.location.reload(), 400)
  }

  return (
    <>
      {saveError ? <p className="save-banner error">{saveError}</p> : null}
      <p className={`save-banner mono sync-${tone}`}>
        {text}
        {lastSavedAt ? ` Local write ${clock(lastSavedAt)}.` : ''}
        {pinned ? ' Instant Case is shared across devices on this site.' : ''}
        {sync.status === 'error' || sync.pending > 0 ? (
          <button type="button" className="anno-jump" onClick={onSyncNow}>
            Retry now
          </button>
        ) : null}
        {sync.workspaceId ? (
          <button type="button" className="anno-jump" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide devices' : 'Devices'}
          </button>
        ) : null}
      </p>
      {open && sync.workspaceId ? (
        <div className="workspace-link-panel">
          <p>
            {pinned
              ? 'This build uses one shared workspace for every browser. Upload the Instant Case once and it should reappear after a refresh on any device that opens this site.'
              : 'Each browser keeps its own workspace key unless you link them. Copy this key into the other device, then reload.'}
          </p>
          <p className="mono workspace-key">{sync.workspaceId}</p>
          <div className="workspace-link-actions">
            <button type="button" className="btn-soft" onClick={copyKey}>
              Copy key
            </button>
            {!pinned ? (
              <>
                <input
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder="Paste another device’s key"
                  aria-label="Paste workspace key"
                />
                <button type="button" className="btn-soft" onClick={adoptKey}>
                  Link and reload
                </button>
              </>
            ) : null}
          </div>
          {note ? <p className="workspace-link-note">{note}</p> : null}
        </div>
      ) : null}
    </>
  )
}
