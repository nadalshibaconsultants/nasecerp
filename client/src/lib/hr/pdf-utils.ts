export function generatePrintablePDF(opts: { title: string; html: string; widthMM?: number; heightMM?: number }): void {
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) { alert("Popup blocked — please allow popups to print PDFs"); return; }
  const w = opts.widthMM || 210;
  const h = opts.heightMM || 297;
  win.document.open();
  win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>${escapeHTML(opts.title)}</title>
<style>
@page { size: ${w}mm ${h}mm; margin: 18mm 16mm; }
body { font-family: "Inter", Arial, sans-serif; color: #0f172a; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1, h2, h3 { color: #0f172a; margin: 0 0 6px; }
h1 { font-size: 18pt; } h2 { font-size: 14pt; } h3 { font-size: 11pt; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 4pt 6pt; text-align: left; border-bottom: 0.5pt solid #cbd5e1; }
.logo-img { height: 14mm; width: auto; display: block; }
.logo-text { font-weight: 800; letter-spacing: 1px; color: #000000; font-size: 22pt; }
.muted { color: #64748b; }
.right { text-align: right; }
.small { font-size: 9pt; }
.letterhead { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8mm; border-bottom: 1pt solid #000000; margin-bottom: 8mm; }
.footer { position: fixed; bottom: 8mm; left: 0; right: 0; text-align: center; font-size: 8pt; color: #94a3b8; }
.stamp { margin-top: 14mm; }
.signature-line { display: inline-block; min-width: 60mm; border-bottom: 0.5pt solid #0f172a; padding-bottom: 1mm; margin-top: 8mm; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
.badge { display: inline-block; padding: 1pt 5pt; border-radius: 2mm; background: #ecfdf5; color: #065f46; font-size: 8pt; }
</style></head><body>${opts.html}<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); };</script></body></html>`);
  win.document.close();
}

export function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" } as any)[c]);
}

export function letterhead(opts: { ref?: string; date?: string }): string {
  return `<div class="letterhead">
<div>
<img src="/logo.png" class="logo-img" onerror="this.style.display=\'none\'; (this.nextElementSibling || this).style.display=\'block\';" /><span class="logo-text">nasec</span>
<div class="small muted">Nadal Al Shiba Engineering Consultants</div>
<div class="small muted">Office No. 1503, Business Bay, Dubai, UAE</div>
<div class="small muted">Tel: +971 4 555 0000 · info@nasec.ae · www.nasec.ae</div>
</div>
<div class="small right">
${opts.ref ? `<div><strong>Ref:</strong> ${escapeHTML(opts.ref)}</div>` : ""}
${opts.date ? `<div><strong>Date:</strong> ${escapeHTML(opts.date)}</div>` : ""}
</div>
</div>`;
}
