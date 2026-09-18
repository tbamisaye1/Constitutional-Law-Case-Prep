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

export async function chatPrep(message, matterId = "bronner-2026", groundingSource = "documents") {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      matter_id: matterId,
      grounding_source: groundingSource === "web_plus" ? "web_plus" : "documents",
    }),
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
 * Download a PDF that was saved during /ingest/pdf (Ask AI corpus store).
 * Used when Case library / Articles need to open a cite that is indexed but
 * not yet attached in this browser.
 */
export async function downloadIngestFile(filename) {
  const safe = String(filename || "").split(/[/\\]/).pop();
  const res = await fetch(`${BASE}/ingest/file/${encodeURIComponent(safe)}`);
  if (!res.ok) throw new Error(await errorDetail(res, `Could not open ${safe}`));
  return res.blob();
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
 * Prefer uploadDocumentDirect for files near or over Vercel's 4.5 MB body cap.
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
 * Upload PDF bytes straight to Vercel Blob, then register the row on the API.
 *
 * Skips the API request-body limit. Flow:
 * 1. Ask the API for a short-lived client token scoped to this workspace
 * 2. PUT the PDF to Blob with that token
 * 3. POST /documents/complete so Postgres knows the file is stored
 */
export async function uploadDocumentDirect(file, { documentId, caseId, name }) {
  const tokenRes = await fetch(`${BASE}/documents/blob-client-upload`, {
    method: "POST",
    headers: workspaceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: {
        pathname: `case-law-agent/workspaces/pending/${documentId}/upload.pdf`,
        clientPayload: JSON.stringify({ documentId, caseId, name }),
        multipart: false,
      },
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(await errorDetail(tokenRes, `direct upload token failed: ${tokenRes.status}`));
  }
  const tokenBody = await tokenRes.json();
  const clientToken = tokenBody.clientToken;
  const pathname = tokenBody.pathname;
  if (!clientToken || !pathname) {
    throw new Error("Blob upload token response was incomplete.");
  }

  const putRes = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${clientToken}`,
      "x-api-version": "7",
      "x-content-type": file.type || "application/pdf",
      "x-content-length": String(file.size),
      "x-add-random-suffix": "0",
    },
    body: file,
  });
  if (!putRes.ok) {
    const detail = await putRes.text();
    throw new Error(detail || `Blob PUT failed: ${putRes.status}`);
  }
  let stored = {};
  try {
    stored = await putRes.json();
  } catch {
    stored = {};
  }
  const blobUrl = stored.url || stored.downloadUrl || "";
  if (!blobUrl) {
    throw new Error("Blob accepted the upload but returned no URL.");
  }

  const completeRes = await fetch(`${BASE}/documents/complete`, {
    method: "POST",
    headers: workspaceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      document_id: documentId,
      case_id: caseId,
      name,
      size_bytes: file.size,
      blob_pathname: pathname,
      blob_url: blobUrl,
    }),
  });
  if (!completeRes.ok) {
    throw new Error(await errorDetail(completeRes, `complete upload failed: ${completeRes.status}`));
  }
  return completeRes.json();
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
