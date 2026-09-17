/**
 * The workspace key that ties this browser's prep to rows in Postgres.
 *
 * There is no login. The key is generated once, kept in localStorage, and sent
 * on every API call as X-Workspace-Id. Copy it into another browser and you
 * see the same notes there, which is how you move between a laptop and an
 * iPad today. It is not a password: anyone who has the key can read that
 * workspace, so treat it like a private share link.
 */

const KEY = 'case-prep-workspace-id'

/** Matches the canonical 8-4-4-4-12 form the API validates against. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Safari below 15.4 and any non-secure origin lack randomUUID. getRandomValues
  // is much older, so build a v4 by hand rather than falling back to Math.random.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

/**
 * This browser's workspace key, creating one on first run.
 *
 * Returns null when localStorage is unavailable (private mode with storage
 * blocked, or an embedded webview). Callers treat null as "no sync" and keep
 * working against IndexedDB, which is why this never throws.
 */
export function getWorkspaceId() {
  try {
    const existing = localStorage.getItem(KEY)
    if (existing && UUID_PATTERN.test(existing)) return existing

    const created = newId()
    localStorage.setItem(KEY, created)
    return created
  } catch (error) {
    console.warn('Workspace key unavailable; sync is off for this session', error)
    return null
  }
}

/**
 * Adopt a key from another device, so both browsers share one workspace.
 *
 * Returns true when the key was accepted. The caller has to reload afterwards:
 * the in-memory store still holds the previous workspace's rows, and merging
 * two workspaces in place would push one device's notes into the other.
 */
export function setWorkspaceId(candidate) {
  const trimmed = (candidate || '').trim()
  if (!UUID_PATTERN.test(trimmed)) return false
  try {
    localStorage.setItem(KEY, trimmed)
    return true
  } catch (error) {
    console.warn('Could not save the workspace key', error)
    return false
  }
}
