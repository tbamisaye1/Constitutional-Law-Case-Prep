/**
 * Chat helper for the grounded agent API.
 * Returns reply + grounding_status so the UI can distrust fluent wrong answers.
 */
const BASE = import.meta.env.VITE_API_BASE || "/api";

export async function getHealth() {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`health failed: ${res.status}`);
  return res.json();
}

export async function listMatters() {
  const res = await fetch(`${BASE}/matters`);
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
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `ingest failed: ${res.status}`);
  }
  return res.json();
}
