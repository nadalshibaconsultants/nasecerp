/**
 * Backup & Restore — full export/import of every store as a single JSON blob.
 * Works with the active backend adapter (LocalBackend by default).
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";

const PREFIX = "nasec-erp-v1::";

export default function BackupRestore() {
  const [importPreview, setImportPreview] = useState<{ keys: number; size: number } | null>(null);
  const [importData, setImportData] = useState<string | null>(null);

  function collectAll(): Record<string, string> {
    const out: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      out[k] = localStorage.getItem(k) || "";
    }
    return out;
  }

  function exportNow() {
    const data = collectAll();
    const blob = new Blob([JSON.stringify({
      generatedAt: new Date().toISOString(),
      app: "NASEC ERP",
      version: "v28",
      store: data,
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nasec-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${Object.keys(data).length} stores`);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed.store) return toast.error("Invalid backup file");
        setImportData(JSON.stringify(parsed.store));
        setImportPreview({ keys: Object.keys(parsed.store).length, size: String(reader.result).length });
        toast.success("Backup loaded - click Restore to apply");
      } catch { toast.error("Invalid JSON"); }
    };
    reader.readAsText(f);
  }

  function restoreNow() {
    if (!importData) return;
    if (!confirm("This will OVERWRITE every existing record (employees, projects, finance, etc.). Are you sure?")) return;
    const parsed: Record<string, string> = JSON.parse(importData);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
    for (const [k, v] of Object.entries(parsed)) localStorage.setItem(k, v);
    toast.success("Restore complete - reloading...", { description: "All stores replaced" });
    setTimeout(() => window.location.reload(), 800);
  }

  const currentKeys = collectAll();
  const currentSize = Object.values(currentKeys).reduce((s, v) => s + v.length, 0);

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">System</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="w-6 h-6" /> Backup &amp; Restore</h1>
        <p className="text-sm text-muted-foreground mt-1">Export your entire ERP dataset as a single JSON file, or restore from one.</p>
      </div>

      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Current state</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-[10px] uppercase text-muted-foreground">Stores</p><p className="text-xl font-bold font-mono">{Object.keys(currentKeys).length}</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Total size</p><p className="text-xl font-bold font-mono">{(currentSize / 1024).toFixed(1)} KB</p></div>
            <div><p className="text-[10px] uppercase text-muted-foreground">Backend</p><Badge variant="outline" className="text-xs">localStorage</Badge></div>
          </div>
        </CardContent></Card>

      <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Download className="w-4 h-4" /> Export backup</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Generates a JSON file containing every store record. Store this securely; treat it as full database access.</p>
          <Button onClick={exportNow} className="gap-1"><Download className="w-4 h-4" /> Download backup JSON</Button>
        </CardContent></Card>

      <Card className="border-amber-300"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Upload className="w-4 h-4" /> Restore from backup</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-[11px] p-2 bg-amber-50 rounded border border-amber-200 flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-600 flex-shrink-0" />
            <span>Restore is <strong>destructive</strong>: every existing record is replaced. Export the current state first as a safety net.</span>
          </div>
          <input type="file" accept="application/json" onChange={onFile} className="text-xs" />
          {importPreview && (
            <div className="p-2 border border-emerald-300 bg-emerald-50 rounded text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Loaded {importPreview.keys} stores ({(importPreview.size / 1024).toFixed(1)} KB)</span>
              <Button size="sm" onClick={restoreNow} className="ml-auto bg-red-600 hover:bg-red-700">Restore now</Button>
            </div>
          )}
        </CardContent></Card>
    </div>
  );
}
