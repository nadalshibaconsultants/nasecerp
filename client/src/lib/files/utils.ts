import type { StoredFile } from "./types";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB cap per file (browser localStorage is ~5MB total)

export function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function isImage(mime: string): boolean { return mime.startsWith("image/"); }
export function isPDF(mime: string): boolean { return mime === "application/pdf"; }

export function bytesLabel(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function tooBig(file: File): boolean { return file.size > MAX_BYTES; }
export const MAX_FILE_BYTES = MAX_BYTES;

// Download helper
export function downloadFile(f: StoredFile) {
  const a = document.createElement("a");
  a.href = f.dataUrl;
  a.download = f.name;
  a.click();
}
