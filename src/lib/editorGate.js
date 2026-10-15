/**
 * Module flag so sync / workspace saves can refuse writes when the UI is in
 * view-only mode. AuthProvider keeps this in sync with /auth/me.
 */

let canWrite = true

export function setEditorCanWrite(value) {
  canWrite = Boolean(value)
}

export function editorCanWrite() {
  return canWrite
}
