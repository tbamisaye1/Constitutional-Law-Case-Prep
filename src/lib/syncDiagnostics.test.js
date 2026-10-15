import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
})

const {
  formatSyncDiagnosticsReport,
  readSyncDiagnostics,
  recordSyncDiagnostic,
  SYNC_DIAGNOSTICS_KEY,
} = await import('./syncDiagnostics')

describe('syncDiagnostics', () => {
  beforeEach(() => {
    memory.clear()
  })

  it('keeps a newest-first ring of client events', () => {
    recordSyncDiagnostic('orphan_dirty_pruned', { count: 2 })
    recordSyncDiagnostic('sync_401_login', { message: 'Log in' })
    const events = readSyncDiagnostics()
    expect(events[0].type).toBe('sync_401_login')
    expect(events[1].type).toBe('orphan_dirty_pruned')
    expect(memory.has(SYNC_DIAGNOSTICS_KEY)).toBe(true)
  })

  it('formats a paste-ready report with live fields', () => {
    recordSyncDiagnostic('sync_exchange_ok', { pendingAfter: 0 })
    const report = formatSyncDiagnosticsReport({
      workspaceId: 'ws-test',
      status: 'idle',
      pending: 2,
      pendingKeys: ['library_records::arguments::main'],
      pendingArguments: true,
      argumentsLocalAhead: true,
    })
    expect(report).toContain('ws-test')
    expect(report).toContain('library_records::arguments::main')
    expect(report).toContain('sync_exchange_ok')
    expect(report).toContain('/api/sync/audit')
  })
})
