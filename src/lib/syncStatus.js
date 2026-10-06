/**
 * Honest workspace save status for the banner.
 *
 * Never claim the database has the latest work while changes are still queued
 * or a sync request is in flight. Local cache writes are not the same as a
 * successful push.
 */

export function describeSyncStatus(sync) {
  if (!sync || sync.status === 'off') {
    return {
      tone: 'warn',
      text:
        'Database sync is off in this browser. Work may not survive clearing site data.',
    }
  }

  if (sync.status === 'error') {
    return {
      tone: 'warn',
      text: `Database unreachable (retrying). ${sync.error || ''}`.trim(),
    }
  }

  const pending = Number(sync.pending) || 0
  if (pending > 0 || sync.status === 'syncing') {
    return {
      tone: 'warn',
      text:
        pending > 1
          ? `Saving ${pending} changes to the workspace database…`
          : 'Saving to the workspace database…',
    }
  }

  if (!sync.lastSyncedAt) {
    return {
      tone: 'warn',
      text: 'Not confirmed in the database yet. Waiting for first sync…',
    }
  }

  return {
    tone: 'ok',
    text: `Synced to the workspace database at ${new Date(sync.lastSyncedAt).toLocaleTimeString()}.`,
  }
}
