/**
 * OCR helper — Tesseract.js loaded lazily from CDN.
 *
 * Usage: const text = await ocrImage(file);
 */
declare global { interface Window { Tesseract: any; } }

const TESS_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

async function ensureTesseract(): Promise<void> {
  if (window.Tesseract) return;
  await new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = TESS_CDN;
    s.onload = () => res();
    s.onerror = () => rej(new Error("Failed to load Tesseract.js"));
    document.body.appendChild(s);
  });
}

export async function ocrImage(file: File, lang = "eng+ara"): Promise<string> {
  await ensureTesseract();
  const result = await window.Tesseract.recognize(file, lang);
  return result.data.text;
}
