// Multipart file upload + scoped fetch helpers backed by /api/v1/files.
// Replaces the legacy base64-in-localStorage path. Components should call
// these instead of poking filesStore directly so server-side storage,
// access control and audit get applied.
import { apiFetch, ApiError } from "@/lib/backend/api";
import type { StoredFile } from "./types";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api/v1";

export async function uploadFile(file: File, params: {
  entityType: StoredFile["entityType"];
  entityId: string;
  category?: string;
  uploadedByDisplay?: string;
}): Promise<StoredFile> {
  const form = new FormData();
  form.append("file", file);
  form.append("entityType", params.entityType);
  form.append("entityId", params.entityId);
  if (params.category) form.append("category", params.category);
  if (params.uploadedByDisplay) form.append("uploadedByDisplay", params.uploadedByDisplay);
  return apiFetch<StoredFile>("/files", { method: "POST", body: form });
}

export function listFiles(filter: Partial<{ entityType: string; entityId: string; scope: string; scopeId: string }>): Promise<StoredFile[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) if (v) qs.set(k, String(v));
  const path = qs.toString() ? `/files?${qs.toString()}` : "/files";
  return apiFetch<StoredFile[]>(path);
}

export function deleteFile(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/files/${id}`, { method: "DELETE" });
}

export function fileUrl(id: string): string {
  return `${API_BASE}/files/${id}`;
}

// Force-download a file. Falls back to opening in a new tab if the fetch fails.
export async function downloadFileById(id: string, name: string) {
  try {
    const blob = await apiFetch<Blob>(`/files/${id}`, { raw: true }).then((r) => (r as any as Response).blob());
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw err;
    window.open(fileUrl(id), "_blank");
  }
}
