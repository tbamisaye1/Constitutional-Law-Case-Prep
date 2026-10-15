/**
 * Local forensic log for sync freezes.
 *
 * Postgres sync_audit_log records every /sync round-trip, but it cannot see
 * Chrome-only state (orphan dirty flags, local-ahead Arguments, follower tab).
 * This ring buffer keeps the last N client events so the next incident can be
 * diagnosed without guessing from empty heartbeats.
 */

import { readJson, writeJsonResilient } from './persist'

export const SYNC_DIAGNOSTICS_KEY = 'case-prep-sync-diagnostics-v1'
export const SYNC_DIAGNOSTICS_KEEP = 40

function emptyLog() {
  return { events: [] }
}

/**
 * @param {string} type Short machine code (e.g. orphan_dirty_pruned, sync_401).
 * @param {Record<string, unknown>} [detail] JSON-safe facts only.
 */
export function recordSyncDiagnostic(type, detail = {}) {
  if (typeof localStorage === 'undefined') return
  try {
    const store = readJson(SYNC_DIAGNOSTICS_KEY, emptyLog()) || emptyLog()
    const events = Array.isArray(store.events) ? store.events : []
    const entry = {
      at: Date.now(),
      type: String(type || 'event'),
      detail: detail && typeof detail === 'object' ? detail : {},
    }
    const next = [entry, ...events].slice(0, SYNC_DIAGNOSTICS_KEEP)
    writeJsonResilient(SYNC_DIAGNOSTICS_KEY, { events: next })
  } catch {
    /* quota / private mode */
  }
}

export function readSyncDiagnostics() {
  const store = readJson(SYNC_DIAGNOSTICS_KEY, emptyLog()) || emptyLog()
  return Array.isArray(store.events) ? store.events : []
}

/**
 * Snapshot for the Devices panel / Paste to agent.
 *
 * @param {object} live Live fields from the library hook
 */
export function formatSyncDiagnosticsReport(live = {}) {
  const events = readSyncDiagnostics()
  const lines = [
    'Case Prep sync diagnostics',
    `capturedAt=${new Date().toISOString()}`,
    `workspaceId=${live.workspaceId || ''}`,
    `status=${live.status || ''}`,
    `error=${live.error || ''}`,
    `pending=${live.pending ?? ''}`,
    `pendingKeys=${JSON.stringify(live.pendingKeys || [])}`,
    `pendingArguments=${Boolean(live.pendingArguments)}`,
    `argumentsLocalAhead=${Boolean(live.argumentsLocalAhead)}`,
    `canEdit=${live.canEdit}`,
    `lockEnabled=${live.lockEnabled}`,
    `lastSyncedAt=${live.lastSyncedAt || 0}`,
    `argumentsAckedAt=${live.argumentsAckedAt || 0}`,
    `rejected=${JSON.stringify(live.rejected || [])}`,
    '--- recent client events (newest first) ---',
  ]
  for (const event of events.slice(0, 20)) {
    const when = event.at ? new Date(event.at).toISOString() : '?'
    lines.push(`${when} ${event.type} ${JSON.stringify(event.detail || {})}`)
  }
  lines.push(
    '--- how to use ---',
    'Also check GET /api/sync/audit?limit=30 for server round-trips (empty_inbound vs arguments_snapshot).'
  )
  return lines.join('\n')
}
