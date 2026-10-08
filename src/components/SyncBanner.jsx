import { useState } from 'react'
import {
  createWorkspaceBackup,
  downloadWorkspaceBackup,
  listWorkspaceBackups,
} from '../api/client'
import { useCaseLibrary } from '../hooks/useCaseLibrary'
import { describeSyncStatus } from '../lib/syncStatus'
import { isWorkspacePinned, setWorkspaceId } from '../lib/workspace'

/**
 * Where the work on screen is currently saved.
 *
 * Subscribes to the library store itself so Arguments / Notes pages do not
 * re-render on every cache write or sync tick while the user is typing.
 *
 * Pending / syncing states must not claim the database already has the work.
 */

function clock(timestamp) {
  return new Date(timestamp).toLocaleTimeString()
}

export function SyncBanner({
  /** Optional override (e.g. Library PDF upload errors). */
  saveError: saveErrorOverride,
  onRetrySaveError,
  retrySaveLabel = 'Retry',
  /** @deprecated Prefer letting SyncBanner read the store itself. */
  sync: syncProp,
  /** @deprecated */
  lastSavedAt: lastSavedAtProp,
  /** @deprecated */
  onSyncNow: onSyncNowProp,
}) {
  const lib = useCaseLibrary()
  const sync = syncProp || lib.sync
  const lastSavedAt =
    typeof lastSavedAtProp === 'number' ? lastSavedAtProp : lib.lastSavedAt
  const onSyncNow = onSyncNowProp || lib.syncNow
  const saveError =
    saveErrorOverride !== undefined && saveErrorOverride !== null
      ? saveErrorOverride
      : lib.saveError

  const { tone, text } = describeSyncStatus(sync)
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
      // Flush debounced editor writes and push before snapshotting Postgres.
      if (typeof onSyncNow === 'function') await Promise.resolve(onSyncNow())
      const created = await createWorkspaceBackup(
        `Manual ${new Date().toISOString().slice(0, 16)}`
      )
      await downloadWorkspaceBackup(created.id)
      const bits = Array.isArray(created.includes) && created.includes.length
        ? created.includes.join(', ')
        : 'arguments, notes, guide, facts, openings, cases, PDFs'
      setNote(
        `Backup #${created.id} saved in Postgres and downloaded (${bits}). Hard refresh cannot erase that file.`
      )
      setOpen(true)
    } catch (error) {
      setNote(error?.message || 'Backup failed.')
    } finally {
      setBusy(false)
    }
  }

  async function reloadFromDb() {
    if (busy || sync.status === 'off') return
    if (sync.pending > 0) {
      const ok = window.confirm(
        `${sync.pending === 1 ? '1 change on this device has' : `${sync.pending} changes on this device have`} not reached the database yet.\n\nReload from database discards ${sync.pending === 1 ? 'it' : 'them'} and shows exactly what Postgres holds. Continue?`
      )
      if (!ok) return
    }
    setBusy(true)
    setNote('')
    try {
      const result = await lib.reloadFromDatabase()
      setNote(
        result.ok
          ? `Reloaded from the database at ${clock(Date.now())}. This device now matches Postgres.`
          : 'Could not reach the database. Nothing on this device was changed.'
      )
    } catch (error) {
      setNote(error?.message || 'Reload failed.')
    } finally {
      setBusy(false)
    }
  }

  async function forceSave() {
    if (busy || sync.status === 'off') return
    const ok = window.confirm(
      'Force save replaces the Arguments board in the database with exactly what this tab shows, even if another tab, device, or the assistant changed it since.\n\nThe replaced version stays in the database history. Continue?'
    )
    if (!ok) return
    setBusy(true)
    setNote('')
    try {
      const result = await lib.forceSaveArguments()
      if (result.ok) {
        setNote(`Force saved Arguments to the database at ${clock(Date.now())}.`)
      } else if (result.reason === 'network') {
        setNote('Could not reach the database. Your board is still on this device; try again.')
      } else if (result.reason === 'nothing-to-save') {
        setNote('This tab has no Arguments board saved yet, so there was nothing to push.')
      } else {
        setNote(`The server still refused the save (${result.reason}). Use Download backup before changing anything else.`)
      }
    } catch (error) {
      setNote(error?.message || 'Force save failed.')
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

  const detailBits = []
  if (sync.lastSyncedAt) detailBits.push(`Last sync ${clock(sync.lastSyncedAt)}`)
  if (lastSavedAt) detailBits.push(`Local cache write ${clock(lastSavedAt)}`)
  if (sync.pending > 0) {
    detailBits.push(
      sync.pending === 1 ? '1 change still uploading' : `${sync.pending} changes still uploading`
    )
  }
  if (sync.pendingArguments) detailBits.push('Arguments still uploading')
  if (sync.argumentsAckedAt) {
    detailBits.push(`Arguments confirmed ${clock(sync.argumentsAckedAt)}`)
  }
  if (sync.status === 'syncing') detailBits.push('Sync in progress')
  if (pinned) detailBits.push('Shared workspace pinned for this site')

  return (
    <>
      {saveError ? (
        <p className="save-banner error">
          <span className="save-banner-text">{saveError}</span>
          {onRetrySaveError ? (
            <span className="save-banner-actions">
              <button type="button" className="anno-jump" onClick={onRetrySaveError}>
                {retrySaveLabel}
              </button>
            </span>
          ) : null}
        </p>
      ) : null}
      <p className={`save-banner mono sync-${tone}`}>
        <span className="save-banner-text" title={text}>
          {text}
        </span>
        <span className="save-banner-actions">
          {sync.status === 'error' ? (
            <button type="button" className="anno-jump" onClick={onSyncNow}>
              Retry now
            </button>
          ) : null}
          {sync.workspaceId && sync.status !== 'off' ? (
            <>
              <button
                type="button"
                className="anno-jump"
                disabled={busy}
                onClick={reloadFromDb}
                title="Discard this device's copy and show exactly what the database holds"
              >
                Reload from database
              </button>
              <button
                type="button"
                className="anno-jump"
                disabled={busy}
                onClick={forceSave}
                title="Save this tab's Arguments board to the database, replacing the copy there"
              >
                Force save
              </button>
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
        </span>
      </p>
      {open && sync.workspaceId ? (
        <div className="workspace-link-panel">
          <p>
            {pinned
              ? 'This build uses one shared workspace. After a hard refresh, the app reloads from the database for arguments, notes, guide, facts, openings, and Instant Case PDFs. Backup now saves all of that (including every Arguments draft and prong note) to Postgres and a JSON file on your laptop.'
              : 'Each browser keeps its own workspace key unless you link them. Copy this key into the other device, then reload. Use Backup now so arguments, notes, and the rest exist outside the browser.'}
          </p>
          {detailBits.length ? (
            <p className="mono workspace-link-detail">{detailBits.join(' · ')}</p>
          ) : null}
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
