/**
 * The workspace key that ties this browser's prep to rows in Postgres.
 *
 * There is no login. Notes, annotations, and Instant Case PDFs are scoped to
 * this key. Copy it into another browser and you see the same prep; that is how
 * a laptop and an iPad stay in sync today. It is not a password: anyone who has
 * the key can read that workspace, so treat it like a private share link.
 *
 * Production can pin one key with VITE_WORKSPACE_ID so every visitor of the
 * hosted Bronner matter shares the same Instant Case and notes. Without that
 * env var, each browser mints its own UUID on first visit.
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
 * Env-pinned workspace for the hosted app, when set at build time.
 *
 * Returns null when unset or malformed. Callers fall back to a per-browser key.
 */
export function getPinnedWorkspaceId() {
  const raw = (import.meta.env.VITE_WORKSPACE_ID || '').trim()
  return UUID_PATTERN.test(raw) ? raw : null
}

/**
 * This browser's workspace key.
 *
 * Order of preference:
 * 1. VITE_WORKSPACE_ID when the build pinned one (production Bronner matter)
 * 2. The key already saved in localStorage
 * 3. A freshly minted UUID, written to localStorage
 *
 * Returns null when localStorage is unavailable (private mode with storage
 * blocked). Callers treat null as "no sync" and keep working against IndexedDB.
 */
export function getWorkspaceId() {
  const pinned = getPinnedWorkspaceId()
  if (pinned) return pinned

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
 *
 * No-ops when the build pinned VITE_WORKSPACE_ID, because that key is the
 * shared production workspace and should not be overwritten from the UI.
 */
export function setWorkspaceId(candidate) {
  if (getPinnedWorkspaceId()) return false
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

export function isWorkspacePinned() {
  return Boolean(getPinnedWorkspaceId())
}
