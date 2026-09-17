/**
 * Chat helper for the grounded agent API.
 * Returns reply + grounding_status so the UI can distrust fluent wrong answers.
 */
import { getWorkspaceId } from "../lib/workspace";

const BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * Headers that identify this browser's workspace to the API.
 *
 * Throws when no key is available, which happens only when localStorage is
 * blocked. Sync callers catch it and stay in browser-only mode.
 */
function workspaceHeaders(extra = {}) {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) throw new Error("No workspace key in this browser; sync is off.");
  return { "X-Workspace-Id": workspaceId, ...extra };
}

/**
 * Same header, but omitted rather than fatal when there is no key.
 *
 * For endpoints that still answer without a workspace, such as /matters
 * falling back to the seeded moot problem. A malformed header would be
 * rejected by the API, so send nothing instead of sending junk.
 */
function optionalWorkspaceHeaders(extra = {}) {
  const workspaceId = getWorkspaceId();
  return workspaceId ? { "X-Workspace-Id": workspaceId, ...extra } : { ...extra };
}

/** Pull the readable message out of a FastAPI error body. */
async function errorDetail(res, fallback) {
  const text = await res.text();
  if (!text) return fallback;
  try {
    const body = JSON.parse(text);
    if (body.detail) {
      return typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    }
  } catch {
    /* use raw text */
  }
  return text;
}

export async function getHealth() {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`health failed: ${res.status}`);
  return res.json();
}

export async function listMatters() {
  const res = await fetch(`${BASE}/matters`, { headers: optionalWorkspaceHeaders() });
  if (!res.ok) throw new Error(`matters failed: ${res.status}`);
  return res.json();
}

export async function chatPrep(message, matterId = "bronner-2026") {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, matter_id: matterId }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `chat failed: ${res.status}`);
  }
  return res.json();
}

/** Upload a PDF; backend chunks it and merges into the FAISS index for Ask AI. */
export async function ingestPdf(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/ingest/pdf`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await errorDetail(res, `ingest failed: ${res.status}`));
  return res.json();
}

export async function listIngestSources() {
  const res = await fetch(`${BASE}/ingest/sources`);
  if (!res.ok) throw new Error(await errorDetail(res, `list sources failed: ${res.status}`));
  return res.json();
}

/** Remove a source (PDF filename or full bootstrap label) from the FAISS index. */
export async function removeIngestSource(source) {
  const res = await fetch(`${BASE}/ingest/source`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
  if (!res.ok) throw new Error(await errorDetail(res, `remove failed: ${res.status}`));
  return res.json();
}

/**
 * Push local changes and pull whatever else moved, in one round trip.
 *
 * @param {number} since serverTime from the previous sync. 0 downloads everything.
 * @param {object} changes Collection name to rows, from collectChanges().
 * @returns {Promise<{serverTime: number, changes: object, written: object}>}
 */
export async function syncChanges(since, changes) {
  const res = await fetch(`${BASE}/sync`, {
    method: "POST",
    headers: workspaceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ since, changes }),
  });
  if (!res.ok) throw new Error(await errorDetail(res, `sync failed: ${res.status}`));
  return res.json();
}

/** Row counts for this workspace, used by the sync status line. */
export async function getSyncStatus() {
  const res = await fetch(`${BASE}/sync/status`, { headers: workspaceHeaders() });
  if (!res.ok) throw new Error(await errorDetail(res, `sync status failed: ${res.status}`));
  return res.json();
}

/**
 * Store a PDF's bytes on the backend.
 *
 * The caller has already written the file to IndexedDB, so a rejection here
 * leaves the PDF usable in this browser and only costs cross-device access.
 *
 * @param {File|Blob} file The PDF.
 * @param {{documentId: string, caseId: string, name: string}} meta Ids the
 *   backend records against, matching the local filesMeta row.
 */
export async function uploadDocument(file, { documentId, caseId, name }) {
  const form = new FormData();
  form.append("file", file, name);
  form.append("document_id", documentId);
  form.append("case_id", caseId);

  const res = await fetch(`${BASE}/documents`, {
    method: "POST",
    headers: workspaceHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(await errorDetail(res, `upload failed: ${res.status}`));
  return res.json();
}

/**
 * Download a PDF's bytes as a Blob.
 *
 * The endpoint answers with a redirect to Blob storage and fetch follows it,
 * so the bytes come from the CDN rather than through the API function.
 */
export async function downloadDocument(documentId) {
  const res = await fetch(`${BASE}/documents/${encodeURIComponent(documentId)}/file`, {
    headers: workspaceHeaders(),
  });
  if (!res.ok) throw new Error(await errorDetail(res, `download failed: ${res.status}`));
  return res.blob();
}

/** Tombstone a document and delete its bytes. */
export async function deleteDocument(documentId) {
  const res = await fetch(`${BASE}/documents/${encodeURIComponent(documentId)}`, {
    method: "DELETE",
    headers: workspaceHeaders(),
  });
  if (!res.ok) throw new Error(await errorDetail(res, `delete failed: ${res.status}`));
  return res.json();
}
