import { describe, expect, it, vi } from 'vitest'

import { claimSyncLeadership, hasFollowerTabs, SYNC_LEADER_LOCK } from './syncLeader'

/** Minimal in-memory LockManager: one exclusive lock name, FIFO waiters. */
function fakeLocks() {
  let held = false
  const waiters = []
  const release = () => {
    held = false
    const next = waiters.shift()
    if (next) grant(next)
  }
  const grant = (callback) => {
    held = true
    const result = callback({ name: SYNC_LEADER_LOCK })
    Promise.resolve(result).then(release, release)
  }
  return {
    request(name, optionsOrCallback, maybeCallback) {
      const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback
      const options = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback
      if (!held) {
        grant(callback)
      } else if (options.ifAvailable) {
        callback(null)
      } else {
        waiters.push(callback)
      }
      return Promise.resolve()
    },
    async query() {
      return { held: held ? [{ name: SYNC_LEADER_LOCK }] : [], pending: waiters.map(() => ({ name: SYNC_LEADER_LOCK })) }
    },
    closeLeader: release,
  }
}

describe('claimSyncLeadership', () => {
  it('makes every tab the leader when Web Locks is unavailable', async () => {
    await expect(claimSyncLeadership(() => {}, { locks: undefined })).resolves.toBe(true)
  })

  it('gives the first tab the lead and makes the second wait', async () => {
    const locks = fakeLocks()
    const promoted = vi.fn()

    await expect(claimSyncLeadership(() => {}, { locks })).resolves.toBe(true)
    await expect(claimSyncLeadership(promoted, { locks })).resolves.toBe(false)
    expect(promoted).not.toHaveBeenCalled()
    await expect(hasFollowerTabs({ locks })).resolves.toBe(true)
  })

  it('promotes the waiting tab when the leader closes', async () => {
    const locks = fakeLocks()
    const promoted = vi.fn()
    await claimSyncLeadership(() => {}, { locks })
    await claimSyncLeadership(promoted, { locks })

    locks.closeLeader()

    expect(promoted).toHaveBeenCalledOnce()
    await expect(hasFollowerTabs({ locks })).resolves.toBe(false)
  })
})
