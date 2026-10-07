/**
 * One tab per browser talks to /sync. The others follow it.
 *
 * Every open tab used to run its own sync loop against one shared
 * localStorage snapshot. Tabs pushed the same edit at once, the server
 * rejected all but one, and a tab holding an old board could push it back
 * over a newer edit. Now a single leader tab, chosen with the Web Locks API,
 * pushes and pulls. Follower tabs still edit and save to localStorage; the
 * leader adopts those writes through the `storage` event and sends them.
 *
 * The lock is held until the leader tab closes, then the browser hands it to
 * the next waiting tab. Browsers without Web Locks treat every tab as the
 * leader, which is the old behaviour.
 */

export const SYNC_LEADER_LOCK = 'case-prep-sync-leader'
const STATUS_CHANNEL = 'case-prep-sync-status'

function defaultLocks() {
  return globalThis.navigator?.locks
}

/**
 * Decide whether this tab syncs.
 *
 * @param {() => void} onPromoted Called once if this tab starts as a follower
 *   and later becomes the leader because the previous leader closed.
 * @param {{ locks?: LockManager }} [options] Injected for tests.
 * @returns {Promise<boolean>} True when this tab leads from the start.
 */
export function claimSyncLeadership(onPromoted, { locks = defaultLocks() } = {}) {
  if (!locks?.request) return Promise.resolve(true)

  const holdForever = () => new Promise(() => {})
  return new Promise((resolve) => {
    locks
      .request(SYNC_LEADER_LOCK, { ifAvailable: true }, (lock) => {
        if (lock) {
          resolve(true)
          return holdForever()
        }
        resolve(false)
        // Wait in line behind the current leader.
        locks
          .request(SYNC_LEADER_LOCK, () => {
            onPromoted()
            return holdForever()
          })
          .catch(() => {})
        return undefined
      })
      .catch(() => resolve(true))
  })
}

/**
 * True when other tabs of this app are open and waiting on the lock.
 *
 * The leader skips heartbeat pulls while hidden to save database traffic,
 * unless a follower may be on screen relying on it.
 */
export async function hasFollowerTabs({ locks = defaultLocks() } = {}) {
  if (!locks?.query) return false
  try {
    const state = await locks.query()
    return (state.pending || []).some((lock) => lock.name === SYNC_LEADER_LOCK)
  } catch {
    return false
  }
}

/**
 * Channel the leader uses to share sync status, and followers use to ask
 * the leader for a sync. Returns null when BroadcastChannel is unavailable.
 *
 * Messages:
 *   { type: 'status', status }   leader to followers, after every exchange
 *   { type: 'status-request' }   follower asking for the latest status
 *   { type: 'sync-now' }         follower asking the leader to sync now
 */
export function openSyncStatusChannel(onMessage) {
  if (typeof BroadcastChannel === 'undefined') return null
  const channel = new BroadcastChannel(STATUS_CHANNEL)
  channel.onmessage = (event) => {
    if (event?.data && typeof event.data.type === 'string') onMessage(event.data)
  }
  return channel
}
