import { useState } from 'react'
import {
  createWorkspaceBackup,
  downloadWorkspaceBackup,
  listWorkspaceBackups,
} from '../api/client'
import { isWorkspacePinned, setWorkspaceId } from '../lib/workspace'

/**
 * Where the work on screen is currently saved.
 *
 * Hard refresh must never sound like the only copy is in the browser. When
 * sync is healthy, the database is the durable store; localStorage is a cache.
 */

function clock(timestamp) {
  return new Date(timestamp).toLocaleTimeString()
}

function describe(sync) {
  if (sync.status === 'off') {
    return {
      tone: 'warn',
      text:
        'Database sync is off in this browser (storage key blocked). Notes will not survive a clear of site data until sync works.',
    }
  }

  if (sync.status === 'syncing') {
    return { tone: 'info', text: 'Saving to the database…' }
  }

  if (sync.status === 'error') {
    return {
      tone: 'warn',
      text: `Local cache updated; database unreachable (retrying). ${sync.error}`,
    }
  }

  if (sync.pending > 0) {
    const label = sync.pending === 1 ? '1 change' : `${sync.pending} changes`
    return {
      tone: 'info',
      text: `Local cache updated. ${label} still uploading to the database.`,
    }
  }

  const when = sync.lastSyncedAt ? ` Last sync ${clock(sync.lastSyncedAt)}.` : ''
  return {
    tone: 'ok',
    text: `On the database and syncing as you type (incognito / other devices get the same copy): notes, arguments, guide, facts, openings, annotations, PDFs.${when}`,
  }
}

export function SyncBanner({
  sync,
  saveError,
  lastSavedAt,
  onSyncNow,
  onRetrySaveError,
  retrySaveLabel = 'Retry',
}) {
  const { tone, text } = describe(sync)
  const pinned = isWorkspacePinned()
  const [open, setOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

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

  async function backupNow() {
    if (busy || sync.status === 'off') return
    setBusy(true)
    setNote('')
    try {
      const created = await createWorkspaceBackup(
        `Manual ${new Date().toISOString().slice(0, 16)}`
      )
      await downloadWorkspaceBackup(created.id)
      setNote(
        `Backup #${created.id} saved in Postgres and downloaded. Hard refresh cannot erase that file.`
      )
      setOpen(true)
    } catch (error) {
      setNote(error?.message || 'Backup failed.')
    } finally {
      setBusy(false)
    }
  }

  async function downloadLatest() {
    if (busy || sync.status === 'off') return
    setBusy(true)
    setNote('')
    try {
      const { backups } = await listWorkspaceBackups()
      if (!backups?.length) {
        const created = await createWorkspaceBackup('First backup')
        await downloadWorkspaceBackup(created.id)
        setNote(`No prior backups. Created and downloaded #${created.id}.`)
        return
      }
      await downloadWorkspaceBackup(backups[0].id)
      setNote(`Downloaded backup #${backups[0].id} (${backups[0].label}).`)
    } catch (error) {
      setNote(error?.message || 'Download failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {saveError ? (
        <p className="save-banner error">
          {saveError}
          {onRetrySaveError ? (
            <button type="button" className="anno-jump" onClick={onRetrySaveError}>
              {retrySaveLabel}
            </button>
          ) : null}
        </p>
      ) : null}
      <p className={`save-banner mono sync-${tone}`}>
        {text}
        {lastSavedAt ? ` Local cache write ${clock(lastSavedAt)}.` : ''}
        {pinned ? ' Shared workspace pinned for this site.' : ''}
        {sync.status === 'error' || sync.pending > 0 ? (
          <button type="button" className="anno-jump" onClick={onSyncNow}>
            Retry now
          </button>
        ) : null}
        {sync.workspaceId && sync.status !== 'off' ? (
          <>
            <button type="button" className="anno-jump" disabled={busy} onClick={backupNow}>
              {busy ? 'Backing up…' : 'Backup now'}
            </button>
            <button type="button" className="anno-jump" disabled={busy} onClick={downloadLatest}>
              Download backup
            </button>
          </>
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
              ? 'This build uses one shared workspace. After a hard refresh, the app reloads from the database for notes, arguments, guide, facts, openings, and Instant Case PDFs. Use Backup now before competition for a JSON file on your laptop plus a durable Postgres snapshot.'
              : 'Each browser keeps its own workspace key unless you link them. Copy this key into the other device, then reload. Use Backup now so a JSON copy exists outside the browser.'}
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
      {!open && note ? <p className="workspace-link-note save-banner mono">{note}</p> : null}
    </>
  )
}
