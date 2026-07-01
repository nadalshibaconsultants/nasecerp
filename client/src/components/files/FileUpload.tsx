/**
 * Generic file uploader bound to /api/v1/files. Pass entityType + entityId
 * to scope uploads to a record. Bytes live on the backend (S3 / local FS);
 * the StoredFile.dataUrl is a relative API URL the browser fetches lazily.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Trash2, Download, FileText, File as FileIcon } from "lucide-react";
import { isImage, isPDF, bytesLabel } from "@/lib/files/utils";
import { uploadFile, listFiles, deleteFile, downloadFileById, fileUrl } from "@/lib/files/api";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import type { StoredFile } from "@/lib/files/types";

type Props = {
  entityType: StoredFile["entityType"];
  entityId: string;
  readOnly?: boolean;
  category?: string;
  label?: string;
  compact?: boolean;
};

// Server limit is 25 MB (multer); we keep a soft cap to surface a friendly toast earlier.
const SOFT_CAP_BYTES = 25 * 1024 * 1024;

export default function FileUpload({ entityType, entityId, readOnly, category, label, compact }: Props) {
  const actor = useCurrentActor();
  const [cat, setCat] = useState(category || "");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    if (!entityId) return;
    try {
      const rows = await listFiles({ entityType, entityId });
      // A fixed category prop scopes this uploader to one section (e.g. the
      // Contract tab) — show only that section's files there.
      setFiles(category ? rows.filter((r) => r.category === category) : rows);
    } catch (err: any) {
      console.warn("[FileUpload] list failed", err);
    }
  }, [entityType, entityId, category]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function onPick(filesPicked: FileList | null) {
    if (!filesPicked || filesPicked.length === 0) return;
    setLoading(true);
    let ok = 0;
    for (const f of Array.from(filesPicked)) {
      if (f.size > SOFT_CAP_BYTES) { toast.error(`${f.name}: too large (cap 25 MB).`); continue; }
      try {
        await uploadFile(f, { entityType, entityId, category: cat || undefined, uploadedByDisplay: actor });
        ok++;
      } catch (err: any) {
        toast.error(`${f.name}: ${err?.message || "upload failed"}`);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
    setLoading(false);
    if (ok > 0) {
      toast.success(`Uploaded ${ok} file${ok === 1 ? "" : "s"}`);
      await refresh();
    }
  }

  async function remove(f: StoredFile) {
    if (!confirm(`Delete ${f.name}?`)) return;
    try {
      await deleteFile(f.id);
      toast.success("Deleted");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-2">
      {label && <Label className="text-xs">{label}</Label>}
      {!readOnly && (
        <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "p-3 border border-dashed border-slate-300 rounded-lg"}`}>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => onPick(e.target.files)} />
          {!compact && !category && (
            <Input className="h-8 w-48" placeholder="Tag (e.g. passport)" value={cat} onChange={(e) => setCat(e.target.value)} />
          )}
          <Button size="sm" variant="outline" className="gap-1.5" disabled={loading} onClick={() => inputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" /> {loading ? "Uploading…" : (compact ? "Upload" : "Choose files")}
          </Button>
          {!compact && <span className="text-[10px] text-slate-500">Max 25 MB / file. Stored on backend with access control.</span>}
        </div>
      )}
      {files.length === 0 ? (
        <div className="text-xs text-slate-500">{readOnly ? "No files." : "No files uploaded yet."}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {files.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-2">
                <div className="aspect-[4/3] flex items-center justify-center bg-slate-50 rounded mb-2 overflow-hidden">
                  {isImage(f.mimeType) ? <img src={fileUrl(f.id)} alt={f.name} className="object-cover w-full h-full" /> :
                   isPDF(f.mimeType) ? <FileText className="w-8 h-8 text-red-500" /> :
                   <FileIcon className="w-8 h-8 text-slate-400" />}
                </div>
                <div className="text-xs font-medium truncate" title={f.name}>{f.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <Badge variant="outline" className="text-[10px]">{bytesLabel(f.sizeBytes)}</Badge>
                  <div className="flex">
                    <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => downloadFileById(f.id, f.name)}><Download className="w-3 h-3" /></Button>
                    {!readOnly && <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => remove(f)}><Trash2 className="w-3 h-3 text-red-500" /></Button>}
                  </div>
                </div>
                {f.category && <div className="text-[10px] text-slate-500 mt-0.5">{f.category}</div>}
                <div className="text-[9px] text-slate-400 mt-0.5">{new Date(f.uploadedAt).toLocaleDateString("en-GB", { timeZone: "UTC" })} · {(f.uploadedBy ?? "").split("(")[0].trim()}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
