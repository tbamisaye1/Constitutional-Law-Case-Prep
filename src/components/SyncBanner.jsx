/**
 * Where the work on screen is currently saved.
 *
 * This replaced a hard-coded line that always claimed nothing reached the
 * backend. It is worth showing plainly: notes on a moot record are the sort of
 * thing you need to trust, and "saved in this browser" and "saved for every
 * device" are very different promises.
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

  return (
    <>
      {saveError ? <p className="save-banner error">{saveError}</p> : null}
      <p className={`save-banner mono sync-${tone}`}>
        {text}
        {lastSavedAt ? ` Local write ${clock(lastSavedAt)}.` : ''}
        {sync.status === 'error' || sync.pending > 0 ? (
          <button type="button" className="anno-jump" onClick={onSyncNow}>
            Retry now
          </button>
        ) : null}
      </p>
    </>
  )
}
