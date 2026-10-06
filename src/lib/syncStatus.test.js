import { describe, expect, it } from 'vitest'

import { describeSyncStatus } from './syncStatus'

describe('describeSyncStatus', () => {
  it('never claims database save while changes are still pending', () => {
    const status = describeSyncStatus({
      status: 'idle',
      pending: 3,
      lastSyncedAt: Date.now() - 60_000,
    })
    expect(status.tone).toBe('warn')
    expect(status.text.toLowerCase()).toContain('saving')
    expect(status.text.toLowerCase()).not.toContain('synced to the workspace database')
  })

  it('never claims database save while a sync request is in flight', () => {
    const status = describeSyncStatus({
      status: 'syncing',
      pending: 0,
      lastSyncedAt: Date.now() - 60_000,
    })
    expect(status.tone).toBe('warn')
    expect(status.text.toLowerCase()).toContain('saving')
  })

  it('warns before the first confirmed sync', () => {
    const status = describeSyncStatus({ status: 'idle', pending: 0, lastSyncedAt: null })
    expect(status.tone).toBe('warn')
    expect(status.text.toLowerCase()).toContain('not confirmed')
  })

  it('only says synced after a successful idle sync with no pending work', () => {
    const at = new Date('2026-10-06T12:15:00Z').getTime()
    const status = describeSyncStatus({ status: 'idle', pending: 0, lastSyncedAt: at })
    expect(status.tone).toBe('ok')
    expect(status.text.toLowerCase()).toContain('synced to the workspace database')
  })

  it('warns while Arguments are still dirty even if other pending is zero', () => {
    const status = describeSyncStatus({
      status: 'idle',
      pending: 0,
      pendingArguments: true,
      lastSyncedAt: Date.now() - 60_000,
    })
    expect(status.tone).toBe('warn')
    expect(status.text.toLowerCase()).toContain('saving arguments')
  })

  it('names Arguments confirmation when the server ack is present', () => {
    const at = new Date('2026-10-06T12:15:00Z').getTime()
    const argsAt = new Date('2026-10-06T12:16:00Z').getTime()
    const status = describeSyncStatus({
      status: 'idle',
      pending: 0,
      lastSyncedAt: at,
      argumentsAckedAt: argsAt,
    })
    expect(status.tone).toBe('ok')
    expect(status.text.toLowerCase()).toContain('arguments confirmed')
  })

  it('keeps error and off states honest', () => {
    expect(describeSyncStatus({ status: 'off' }).tone).toBe('warn')
    expect(
      describeSyncStatus({ status: 'error', error: 'network down', pending: 0 }).text
    ).toContain('Database unreachable')
  })
})
