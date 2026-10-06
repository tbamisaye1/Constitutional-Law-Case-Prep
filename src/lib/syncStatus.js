/**
 * Honest workspace save status for the banner.
 *
 * Never claim the database has the latest work while changes are still queued
 * or a sync request is in flight. Local cache writes are not the same as a
 * successful push.
 *
 * Arguments get an explicit line: heartbeats can return 200 while the Arguments
 * row on Postgres never moves, which is what hid the 2026-10-06 freeze.
 */

function rejectedMessage(rejected) {
  if (!Array.isArray(rejected) || !rejected.length) return ''
  const reasons = rejected.map((row) => row?.reason || '').filter(Boolean)
  if (reasons.some((r) => r.includes('agent_jackson') || r.includes('agent_claim'))) {
    return 'Server kept your existing Arguments board and rejected an agent/seed overwrite.'
  }
  if (reasons.some((r) => r.includes('seed'))) {
    return 'Server blocked seed outline text from overwriting your Arguments notes.'
  }
  return 'Server rejected part of your last Arguments sync. Check the board against another device.'
}

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

  const rejectedText = rejectedMessage(sync.rejected)
  if (rejectedText) {
    return {
      tone: 'warn',
      text: rejectedText,
    }
  }

  const pending = Number(sync.pending) || 0
  const pendingArguments = Boolean(sync.pendingArguments)
  if (pending > 0 || sync.status === 'syncing' || pendingArguments) {
    if (pendingArguments) {
      return {
        tone: 'warn',
        text: 'Saving Arguments to the workspace database…',
      }
    }
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

  const argsAck = Number(sync.argumentsAckedAt) || 0
  if (argsAck) {
    return {
      tone: 'ok',
      text: `Synced to the workspace database at ${new Date(sync.lastSyncedAt).toLocaleTimeString()}. Arguments confirmed ${new Date(argsAck).toLocaleTimeString()}.`,
    }
  }

  return {
    tone: 'ok',
    text: `Synced to the workspace database at ${new Date(sync.lastSyncedAt).toLocaleTimeString()}.`,
  }
}
