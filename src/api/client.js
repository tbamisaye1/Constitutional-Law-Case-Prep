/**
 * Chat helper for the grounded agent API.
 * Returns reply + grounding_status so the UI can distrust fluent wrong answers.
 */
import {
  isNetworkFailure,
  putPdfToBlob,
  withNetworkRetries,
} from "../lib/blobUpload";
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

export async function chatPrep(
  message,
  matterId = "bronner-2026",
  groundingSource = "documents",
  selection = "",
  options = {}
) {
  const body = {
    message,
    matter_id: matterId,
    grounding_source: groundingSource === "web_plus" ? "web_plus" : "documents",
    model_tier: options?.model_tier === "advanced" ? "advanced" : "standard",
  };
  const sel = typeof selection === "string" ? selection.trim() : "";
  if (sel) body.selection = sel;
  const sourceFile =
    typeof options?.source_file === "string" ? options.source_file.trim() : "";
  if (sourceFile) body.source_file = sourceFile;
  const page = options?.page;
  if (page != null && Number.isFinite(Number(page)) && Number(page) > 0) {
    body.page = Number(page);
  }
  if (Array.isArray(options?.history) && options.history.length) {
    body.history = options.history
      .filter(
        (t) =>
          t &&
          (t.role === "user" || t.role === "assistant") &&
          typeof t.content === "string" &&
          t.content.trim()
      )
      .map((t) => ({ role: t.role, content: t.content.trim() }));
  }
  if (Array.isArray(options?.notes) && options.notes.length) {
    body.notes = options.notes
      .filter((n) => n && typeof n.text === "string" && n.text.trim())
      .slice(0, 8)
      .map((n, i) => {
        const row = {
          id: String(n.id || `note-${i}`),
          title: String(n.title || "Untitled note").trim() || "Untitled note",
          text: n.text.trim(),
          section_name: n.section_name ? String(n.section_name) : undefined,
          page_id: n.page_id ? String(n.page_id) : undefined,
          notes_path: n.notes_path ? String(n.notes_path) : undefined,
        };
        if (n.source_type) row.source_type = String(n.source_type);
        if (n.page != null && Number.isFinite(Number(n.page)) && Number(n.page) > 0) {
          row.page = Number(n.page);
        }
        return row;
      });
  }

  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `chat failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Vercel rejects API bodies over 4.5 MB. Stay under that for the proxied path;
 * larger PDFs go browser → Blob → /ingest/from-blob.
 *
 * Stay well under the hard cap: multipart framing plus a ~3 MB opinion often
 * trips a connection reset ("Failed to fetch") instead of a clean 413.
 */
const INGEST_PROXY_LIMIT_BYTES = 2.5 * 1024 * 1024;

/** Upload a PDF; backend chunks it and merges into the FAISS index for Ask AI. */
export async function ingestPdf(file) {
  if (file.size > INGEST_PROXY_LIMIT_BYTES) {
    return ingestPdfDirect(file);
  }

  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/ingest/pdf`, {
      method: "POST",
      body: form,
    });
    if (res.status === 413) {
      // Older deploys or multipart overhead can still 413 near the cap.
      return ingestPdfDirect(file);
    }
    if (!res.ok) throw new Error(await errorDetail(res, `ingest failed: ${res.status}`));
    return res.json();
  } catch (error) {
    // Vercel often resets oversized multipart uploads before returning 413.
    // Retry via Blob so Instant Case opinions (Milligan, Youngstown, etc.)
    // still reach FAISS instead of stranding as "readable but not indexed".
    if (isNetworkFailure(error)) {
      return ingestPdfDirect(file);
    }
    throw error;
  }
}

/**
 * Index a large PDF without sending bytes through the API function body.
 *
 * 1. Mint a Blob client token from /ingest/blob-client-upload
 * 2. PUT the PDF straight to Blob
 * 3. Tell the API to download that URL and merge into FAISS
 */
export async function ingestPdfDirect(file) {
  const name = file.name || "upload.pdf";
  const tokenBody = await withNetworkRetries("Ask AI index token", async () => {
    const tokenRes = await fetch(`${BASE}/ingest/blob-client-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "blob.generate-client-token",
        payload: {
          pathname: `case-law-agent/ingest/${name}`,
          clientPayload: JSON.stringify({ name }),
          multipart: false,
        },
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(
        await errorDetail(
          tokenRes,
          `This PDF is ${(file.size / (1024 * 1024)).toFixed(1)} MB and needs direct Blob ingest, but the token request failed (${tokenRes.status}).`
        )
      );
    }
    return tokenRes.json();
  });
  const clientToken = tokenBody.clientToken;
  const pathname = tokenBody.pathname;
  if (!clientToken || !pathname) {
    throw new Error("Blob upload token response was incomplete.");
  }

  const stored = await withNetworkRetries("Ask AI Blob upload", () =>
    putPdfToBlob(clientToken, pathname, file, name)
  );
  const blobUrl = stored.url || stored.downloadUrl || "";

  return withNetworkRetries("Ask AI index from Blob", async () => {
    const completeRes = await fetch(`${BASE}/ingest/from-blob`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: name,
        blob_url: blobUrl,
        blob_pathname: pathname,
        size_bytes: file.size,
      }),
    });
    if (!completeRes.ok) {
      throw new Error(
        await errorDetail(completeRes, `ingest from Blob failed: ${completeRes.status}`)
      );
    }
    return completeRes.json();
  });
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
 * @param {{ keepalive?: boolean }} [options] Pass keepalive on pagehide so the
 *   browser is more likely to finish the request after the tab closes.
 * @returns {Promise<{serverTime: number, changes: object, written: object}>}
 */
export async function syncChanges(since, changes, options = {}) {
  const res = await fetch(`${BASE}/sync`, {
    method: "POST",
    headers: workspaceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ since, changes }),
    keepalive: Boolean(options.keepalive),
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

/** List durable Postgres backups for this workspace (no payload bodies). */
export async function listWorkspaceBackups() {
  const res = await fetch(`${BASE}/sync/backups`, { headers: workspaceHeaders() });
  if (!res.ok) throw new Error(await errorDetail(res, `list backups failed: ${res.status}`));
  return res.json();
}

/** Snapshot the live workspace into Postgres. Survives hard refresh. */
export async function createWorkspaceBackup(label = "Manual backup") {
  const res = await fetch(`${BASE}/sync/backups`, {
    method: "POST",
    headers: workspaceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error(await errorDetail(res, `create backup failed: ${res.status}`));
  return res.json();
}

/**
 * Download a backup JSON file to the user's machine.
 * This is the competition safety net: file on disk + row in Postgres.
 */
export async function downloadWorkspaceBackup(backupId) {
  const res = await fetch(`${BASE}/sync/backups/${backupId}/download`, {
    headers: workspaceHeaders(),
  });
  if (!res.ok) throw new Error(await errorDetail(res, `download backup failed: ${res.status}`));
  const body = await res.json();
  const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `case-prep-backup-${backupId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return body;
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
  const tokenBody = await withNetworkRetries("Backend storage token", async () => {
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
      throw new Error(
        await errorDetail(tokenRes, `direct upload token failed: ${tokenRes.status}`)
      );
    }
    return tokenRes.json();
  });
  const clientToken = tokenBody.clientToken;
  const pathname = tokenBody.pathname;
  if (!clientToken || !pathname) {
    throw new Error("Blob upload token response was incomplete.");
  }

  const stored = await withNetworkRetries("Backend Blob upload", () =>
    putPdfToBlob(clientToken, pathname, file, name)
  );
  const blobUrl = stored.url || stored.downloadUrl || "";

  return withNetworkRetries("Backend storage complete", async () => {
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
      throw new Error(
        await errorDetail(completeRes, `complete upload failed: ${completeRes.status}`)
      );
    }
    return completeRes.json();
  });
}

/**
 * Download a PDF's bytes as a Blob.
 *
 * Asks the API for the Blob URL, then fetches it with no custom headers.
 *
 * Do not fetch /documents/:id/file directly from the browser: that endpoint
 * 307-redirects to the Blob CDN and fetch() re-sends X-Workspace-Id on the
 * redirected request. A custom header makes it a non-simple CORS request, Blob
 * rejects the preflight, and every PDF fails with "TypeError: Failed to fetch".
 */
export async function downloadDocument(documentId) {
  const id = encodeURIComponent(documentId);
  const res = await fetch(`${BASE}/documents/${id}/url`, { headers: workspaceHeaders() });

  if (res.ok) {
    const { url } = await res.json();
    if (!url) throw new Error("download failed: API returned no URL");
    // Plain GET, no custom headers or cookies, so no CORS preflight.
    const blobRes = await fetch(url, { credentials: "omit" });
    if (!blobRes.ok) throw new Error(`download failed: blob ${blobRes.status}`);
    return blobRes.blob();
  }

  // Older API without /url: fall back to the redirect route. This only works
  // where the browser drops the header on redirect, but it keeps clients
  // working during a deploy where the frontend ships before the API.
  if (res.status === 404 || res.status === 405) {
    const detail = await errorDetail(res, "");
    if (!/No such document/i.test(detail)) {
      const legacy = await fetch(`${BASE}/documents/${id}/file`, { headers: workspaceHeaders() });
      if (!legacy.ok) throw new Error(await errorDetail(legacy, `download failed: ${legacy.status}`));
      return legacy.blob();
    }
    throw new Error(detail);
  }
  throw new Error(await errorDetail(res, `download failed: ${res.status}`));
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
