import { useEffect, useState } from 'react'
import {
  createWorkspaceBackup,
  downloadWorkspaceBackup,
  listWorkspaceBackups,
} from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { forceSaveArguments, useCaseLibrary } from '../hooks/useCaseLibrary'
import {
  CONFLICTS_EVENT,
  readPendingConflicts,
} from '../lib/argumentsConflicts'
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
  /**
   * Quiet strip for Notes: status + one Workspace control. Backup / reload /
   * devices live in the panel so the editor keeps the vertical space.
   */
  compact = false,
  /** @deprecated Prefer letting SyncBanner read the store itself. */
  sync: syncProp,
  /** @deprecated */
  lastSavedAt: lastSavedAtProp,
  /** @deprecated */
  onSyncNow: onSyncNowProp,
}) {
  const lib = useCaseLibrary()
  const { lockEnabled, canEdit, setLoginOpen } = useAuth()
  const sync = syncProp || lib.sync
  const lastSavedAt =
    typeof lastSavedAtProp === 'number' ? lastSavedAtProp : lib.lastSavedAt
  const onSyncNow = onSyncNowProp || lib.syncNow
  const saveError =
    saveErrorOverride !== undefined && saveErrorOverride !== null
      ? saveErrorOverride
      : lib.saveError

  const { tone, text } = describeSyncStatus({
    ...sync,
    lockEnabled,
    canEdit,
  })
  const pinned = isWorkspacePinned()
  const [open, setOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasConflicts, setHasConflicts] = useState(() => Boolean(readPendingConflicts()))

  useEffect(() => {
    function onConflicts(event) {
      setHasConflicts(Boolean(event?.detail?.conflicts?.length || readPendingConflicts()))
    }
    window.addEventListener(CONFLICTS_EVENT, onConflicts)
    return () => window.removeEventListener(CONFLICTS_EVENT, onConflicts)
  }, [])

  // If Arguments stay ahead after the first paint, force-save from this tab
  // instead of hoping a background leader wakes up. Skip when logged out —
  // the API editor lock rejects writes with 401 and a retry storm looks like
  // "Saving…" forever.
  useEffect(() => {
    if (!sync.pendingArguments || sync.status === 'off' || busy) return undefined
    if (lockEnabled && !canEdit) {
      setLoginOpen(true)
      return undefined
    }
    const timer = window.setTimeout(() => {
      void forceSaveArguments().then((result) => {
        if (result?.ok) setNote(`Arguments saved to the database at ${clock(Date.now())}.`)
        else if (result?.reason === 'network') {
          const msg = String(result.reason || '')
          if (/log in/i.test(sync.error || '')) setLoginOpen(true)
          else setNote('Could not reach the database. Your board is still on this device; retrying…')
          void msg
        } else if (result?.reason === 'readonly') {
          setLoginOpen(true)
        }
      })
    }, 800)
    return () => window.clearTimeout(timer)
  }, [
    sync.pendingArguments,
    sync.status,
    sync.error,
    busy,
    lockEnabled,
    canEdit,
    setLoginOpen,
  ])


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
      // Backup snapshots Postgres. If this tab's Arguments never got marked
      // dirty, a plain sync leaves the server stale and the backup lies.
      // Force-save the board on screen first, then snapshot.
      const pushed = await lib.forceSaveArguments()
      if (!pushed.ok && pushed.reason !== 'nothing-to-save') {
        setNote(
          pushed.reason === 'network'
            ? 'Could not reach the database, so no backup was taken. Your board is still on this device.'
            : `Arguments did not reach Postgres (${pushed.reason}). Backup skipped so it would not freeze a stale copy.`
        )
        return
      }
      if (typeof onSyncNow === 'function') await Promise.resolve(onSyncNow())
      const created = await createWorkspaceBackup(
        `Manual ${new Date().toISOString().slice(0, 16)}`
      )
      await downloadWorkspaceBackup(created.id)
      const bits = Array.isArray(created.includes) && created.includes.length
        ? created.includes.join(', ')
        : 'arguments, notes, guide, facts, openings, cases, PDFs'
      setNote(
        `Backup #${created.id} saved in Postgres and downloaded (${bits}). Arguments were force-saved first.`
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
      <p className={`save-banner mono sync-${tone}${compact ? ' is-compact' : ''}`}>
        <span className="save-banner-text" title={text}>
          {text}
        </span>
        <span className="save-banner-actions">
          {sync.status === 'error' ? (
            <button type="button" className="anno-jump" onClick={onSyncNow}>
              Retry now
            </button>
          ) : null}
          {hasConflicts ? (
            <button
              type="button"
              className="anno-jump"
              onClick={() => {
                document
                  .querySelector('.args-conflict-review')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }}
              title="Compare your version with the other one and choose which text to keep"
            >
              Review conflicts
            </button>
          ) : null}
          {!compact && sync.workspaceId && sync.status !== 'off' ? (
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
              {open ? 'Hide' : compact ? 'Workspace' : 'Devices'}
            </button>
          ) : null}
        </span>
      </p>
      {open && sync.workspaceId ? (
        <div className="workspace-link-panel">
          {compact ? (
            <div className="workspace-link-actions workspace-link-actions-row">
              {sync.status !== 'off' ? (
                <>
                  <button
                    type="button"
                    className="btn-soft"
                    disabled={busy}
                    onClick={reloadFromDb}
                    title="Discard this device's copy and show exactly what the database holds"
                  >
                    Reload from database
                  </button>
                  <button
                    type="button"
                    className="btn-soft"
                    disabled={busy}
                    onClick={forceSave}
                    title="Save this tab's Arguments board to the database, replacing the copy there"
                  >
                    Force save
                  </button>
                  <button type="button" className="btn-soft" disabled={busy} onClick={backupNow}>
                    {busy ? 'Backing up…' : 'Backup now'}
                  </button>
                  <button
                    type="button"
                    className="btn-soft"
                    disabled={busy}
                    onClick={downloadLatest}
                  >
                    Download backup
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          <p>
            {pinned
              ? 'This build uses one shared workspace. After a hard refresh, the app reloads from the database for arguments, notes, guide, facts, openings, and Instant Case PDFs. Backup now force-saves this tab\'s Arguments board to Postgres first, then snapshots the workspace and downloads a JSON file.'
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
