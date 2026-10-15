/**
 * Pending Arguments conflicts after a three-way merge.
 *
 * When this tab and another writer both edited the same field, the merge keeps
 * the other version and stashes yours in scratch. This module also keeps both
 * sides in localStorage so the UI can show them side by side and let you pick.
 */

import { normalizeArgumentsBoard } from './argumentsBoard'
import { readJson, writeJson } from './persist'

export const CONFLICTS_KEY = 'case-prep-arguments-conflicts-v1'
export const CONFLICTS_EVENT = 'case-prep-arguments-conflicts'

/**
 * Human label for a conflict path like /petitioner/draftId/sec/prong.notes
 */
export function conflictLabel(conflict, board) {
  if (!conflict?.path) return 'Unknown field'
  const field = conflict.field || conflict.path.split('.').pop()
  const parts = conflict.path.replace(/^\//, '').split('.')[0].split('/')
  const [side, draftId, sectionId, prongId] = parts
  const draft = (board?.draftsBySide?.[side] || []).find((d) => d.id === draftId)
  const draftName = draft?.name || draftId || 'draft'
  if (prongId) {
    for (const section of draft?.sections || []) {
      const prong = (section.prongs || []).find((p) => p.id === prongId)
      if (prong) {
        return `${side} · ${draftName} · "${prong.title || prongId}" · ${field}`
      }
    }
  }
  if (sectionId) {
    const section = (draft?.sections || []).find((s) => s.id === sectionId)
    if (section) {
      return `${side} · ${draftName} · "${section.title || sectionId}" · ${field}`
    }
  }
  return `${side} · ${draftName} · ${field}`
}

/** Plain text for comparing rich or plain conflict values. */
export function conflictPreview(value, { max = 480 } = {}) {
  const raw = String(value ?? '')
  const text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!text) return '(empty)'
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function readPendingConflicts() {
  const raw = readJson(CONFLICTS_KEY, null)
  if (!raw || !Array.isArray(raw.conflicts) || !raw.conflicts.length) return null
  return {
    at: Number(raw.at) || Date.now(),
    conflicts: raw.conflicts,
    local: raw.local ? normalizeArgumentsBoard(raw.local) : null,
    remote: raw.remote ? normalizeArgumentsBoard(raw.remote) : null,
    merged: raw.merged ? normalizeArgumentsBoard(raw.merged) : null,
  }
}

export function clearPendingConflicts() {
  try {
    localStorage.removeItem(CONFLICTS_KEY)
  } catch {
    /* ignore */
  }
  emitConflicts(null)
}

function emitConflicts(payload) {
  try {
    window.dispatchEvent(new CustomEvent(CONFLICTS_EVENT, { detail: payload }))
  } catch {
    /* tests */
  }
}

/**
 * Store a merge conflict for the review UI. Replaces any prior pending set.
 */
export function recordConflicts({ conflicts, local, remote, merged, at = Date.now() }) {
  if (!Array.isArray(conflicts) || !conflicts.length) {
    clearPendingConflicts()
    return null
  }
  const payload = {
    at,
    conflicts: conflicts.map((c) => ({
      path: c.path,
      field: c.field,
      local: c.local,
      remote: c.remote,
      lost: c.lost,
    })),
    local: local
      ? {
          draftsBySide: local.draftsBySide,
          activeDraftBySide: local.activeDraftBySide,
          practiceLog: local.practiceLog || [],
        }
      : null,
    remote: remote
      ? {
          draftsBySide: remote.draftsBySide,
          activeDraftBySide: remote.activeDraftBySide,
          practiceLog: remote.practiceLog || [],
        }
      : null,
    merged: merged
      ? {
          draftsBySide: merged.draftsBySide,
          activeDraftBySide: merged.activeDraftBySide,
          practiceLog: merged.practiceLog || [],
        }
      : null,
  }
  writeJson(CONFLICTS_KEY, payload)
  const normalized = readPendingConflicts()
  emitConflicts(normalized)
  return normalized
}

/**
 * Write one field on a board from a conflict path.
 * Paths look like /side/draftId[.field] or /side/draftId/sectionId[.field]
 * or /side/draftId/sectionId/prongId.field
 */
export function setBoardField(board, path, value) {
  const match = String(path || '').match(
    /^\/(petitioner|respondent)\/([^/.]+)(?:\/([^/.]+))?(?:\/([^/.]+))?\.(\w+)$/
  )
  if (!match) return board
  const [, side, draftId, sectionId, prongId, field] = match
  const draftsBySide = { ...board.draftsBySide }
  const drafts = (draftsBySide[side] || []).map((draft) => {
    if (draft.id !== draftId) return draft
    if (!sectionId) {
      return { ...draft, [field]: value }
    }
    return {
      ...draft,
      sections: (draft.sections || []).map((section) => {
        if (section.id !== sectionId) return section
        if (!prongId) {
          return { ...section, [field]: value }
        }
        return {
          ...section,
          prongs: (section.prongs || []).map((prong) =>
            prong.id === prongId ? { ...prong, [field]: value } : prong
          ),
        }
      }),
    }
  })
  draftsBySide[side] = drafts
  return { ...board, draftsBySide }
}

/**
 * Apply per-field choices onto the merged board.
 * @param {object} merged
 * @param {object[]} conflicts
 * @param {Record<string, 'local' | 'remote'>} choices keyed by conflict.path
 */
export function applyConflictChoices(merged, conflicts, choices) {
  let next = normalizeArgumentsBoard(merged)
  for (const conflict of conflicts || []) {
    const pick = choices?.[conflict.path] || 'remote'
    const value = pick === 'local' ? conflict.local : conflict.remote
    next = setBoardField(next, conflict.path, value)
  }
  return next
}
