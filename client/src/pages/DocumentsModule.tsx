/**
 * Documents Module — restored to Manus-style hierarchy:
 *  - Left: collapsible projects tree (every project → 01-08 folders → sub-folders under 01)
 *  - Right: breadcrumb · search · status filter · list/grid view · file rows
 *
 * File rows show: icon, filename, uploader + when + size + status badge(s), version on the right.
 * Folder header shows file count + access roles + retention.
 */
import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Folder, FolderOpen, ChevronRight, ChevronDown, FileText, Search, Filter,
  List, Grid, X, Lock, Clock, Plus, Trash2, ChevronUp, Eye, Download, Upload,
  FolderPlus, Pencil,
} from "lucide-react";
import { docFoldersStore, documentsStore, projectsStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useAuth, useCurrentActor } from "@/lib/auth/AuthContext";
import { visibleProjects } from "@/lib/projects/acl";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { DOC_STATUS_LABEL, DOC_STATUS_CLASS, INDICATOR_DOT, type DocFolder, type DocumentFile, type DocStatus } from "@/lib/documents/types";
import { apiFetch } from "@/lib/backend/api";
import { uploadFile, downloadFileById } from "@/lib/files/api";

function fmtBytes(n: number): string {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}
function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "1 day ago";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} week${Math.floor(d / 7) === 1 ? "" : "s"} ago`;
  if (d < 365) return `${Math.floor(d / 30)} month${Math.floor(d / 30) === 1 ? "" : "s"} ago`;
  return `${Math.floor(d / 365)} year${Math.floor(d / 365) === 1 ? "" : "s"} ago`;
}

export default function DocumentsModule() {
  const folders = useCollection(docFoldersStore);
  const files = useCollection(documentsStore);
  const projects = useCollection(projectsStore);
  useCollection(auditStore);
  const { currentUser } = useAuth();
  const actor = useCurrentActor();
  const [, navigate] = useLocation();
  const myProjects = useMemo(() => visibleProjects(projects, currentUser), [projects, currentUser]);

  // UI state
  const [treeOpen, setTreeOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([myProjects[0]?.id, `fld-${myProjects[0]?.id}-01`].filter(Boolean) as string[]));
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [addOpen, setAddOpen] = useState(false);
  const [draftFile, setDraftFile] = useState<Partial<DocumentFile>>({ status: "draft", version: "v1.0" });
  const [folderOpen, setFolderOpen] = useState(false);
  const [draftFolder, setDraftFolder] = useState<{ projectId?: string; parentId?: string; name: string }>({ name: "" });
  const [renameTarget, setRenameTarget] = useState<DocumentFile | undefined>(undefined);
  const [renameName, setRenameName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleFolderIds = useMemo(() => new Set(folders.filter((f) => myProjects.some((p) => p.id === f.projectId)).map((f) => f.id)), [folders, myProjects]);

  // Default selection: first project / first folder
  const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : undefined;
  const activeProject = activeFolder ? projects.find((p) => p.id === activeFolder.projectId) : undefined;

  // File set for the active folder
  const activeFolderFiles = useMemo(() => {
    if (!activeFolder) return [] as DocumentFile[];
    // include files in the active folder + any sub-folder of it
    const subIds = new Set([activeFolder.id, ...folders.filter((f) => f.parentId === activeFolder.id).map((f) => f.id)]);
    return files.filter((f) => subIds.has(f.folderId)).filter((f) => {
      const q = search.trim().toLowerCase();
      if (q && !f.name.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [activeFolder, folders, files, search, statusFilter]);

  // Helper: folder count + indicator
  function folderFileCount(fid: string): number {
    const folder = folders.find((f) => f.id === fid);
    if (!folder) return 0;
    const subIds = new Set([fid, ...folders.filter((f) => f.parentId === fid).map((f) => f.id)]);
    return files.filter((x) => subIds.has(x.folderId)).length;
  }

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function deleteFile(f: DocumentFile) {
    if (!confirm(`Delete ${f.name}?`)) return;
    documentsStore.remove(f.id);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "delete", subject: `Document deleted · ${f.name}` });
    toast.success("Deleted");
  }

  function saveDraft() {
    if (!draftFile.name?.trim() || !activeFolder) { toast.error("Pick a folder and give the file a name"); return; }
    const f: DocumentFile = {
      id: newId("df"),
      folderId: activeFolder.id,
      projectId: activeFolder.projectId,
      name: draftFile.name!,
      status: (draftFile.status || "draft") as DocStatus,
      version: draftFile.version || "v1.0",
      uploadedByUserId: currentUser?.id ?? "",
      uploadedByDisplay: currentUser?.displayName,
      uploadedAt: new Date().toISOString(),
      sizeBytes: draftFile.sizeBytes || 0,
      mimeType: draftFile.mimeType,
      fileStoreId: draftFile.fileStoreId,
      notes: draftFile.notes,
    };
    documentsStore.put(f);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "create", subject: `Document added · ${f.name}`, detail: `${activeProject?.nameEn} / ${activeFolder.name}` });
    toast.success("Added");
    setAddOpen(false);
    setDraftFile({ status: "draft", version: "v1.0" });
  }

  function openAddFolder() {
    setDraftFolder({ projectId: activeProject?.id || myProjects[0]?.id, parentId: activeFolder?.parentId ? undefined : activeFolder?.id, name: "" });
    setFolderOpen(true);
  }
  function saveFolder() {
    const pid = draftFolder.projectId;
    if (!pid) { toast.error("Pick a project"); return; }
    if (!draftFolder.name.trim()) { toast.error("Folder name is required"); return; }
    const parentId = draftFolder.parentId || undefined;
    const siblings = folders.filter((f) => f.projectId === pid && (f.parentId || undefined) === parentId);
    const order = siblings.reduce((m, f) => Math.max(m, f.order), -1) + 1;
    const folder: DocFolder = { id: newId("fld"), projectId: pid, parentId, order, name: draftFolder.name.trim() };
    docFoldersStore.put(folder);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "create", subject: `Folder created · ${folder.name}` });
    setExpanded((prev) => { const n = new Set(prev); n.add(pid); if (parentId) n.add(parentId); return n; });
    toast.success("Folder created");
    setFolderOpen(false);
  }
  function saveRename() {
    if (!renameTarget || !renameName.trim()) { toast.error("Name is required"); return; }
    // Drop null uuid fields so the PATCH validates; display name lives on uploadedByDisplay.
    documentsStore.put({ ...renameTarget, name: renameName.trim(), uploadedByUserId: renameTarget.uploadedByUserId || undefined, fileStoreId: renameTarget.fileStoreId || undefined } as any);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "update", subject: `Document renamed · ${renameName.trim()}` });
    toast.success("Renamed");
    setRenameTarget(undefined);
  }

  // Upload bytes to the storage bucket, then attach the stored file id to the
  // document being added (prefills the name from the file when blank).
  async function onPickFile(list: FileList | null) {
    const file = list?.[0];
    if (!file || !activeFolder) return;
    setUploading(true);
    try {
      const stored = await uploadFile(file, { entityType: "drawing", entityId: "folder:" + activeFolder.id, uploadedByDisplay: actor });
      setDraftFile((d) => ({ ...d, name: d.name?.trim() ? d.name : stored.name, fileStoreId: stored.id, sizeBytes: stored.sizeBytes, mimeType: stored.mimeType }));
      toast.success("File uploaded to bucket");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Open a stored document inline. The serving endpoint needs the bearer token,
  // so fetch it as an authenticated blob and open that object URL.
  async function openFile(f: DocumentFile) {
    if (!f.fileStoreId) { toast.message("No file attached. Use Add file to upload one to the bucket."); return; }
    try {
      const resp = (await apiFetch<Response>(`/files/${f.fileStoreId}`, { raw: true })) as unknown as Response;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("Couldn't open the file");
    }
  }
  async function downloadDoc(f: DocumentFile) {
    if (!f.fileStoreId) { toast.message("No file attached to download."); return; }
    try { await downloadFileById(f.fileStoreId, f.name); }
    catch { toast.error("Download failed"); }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] gap-3">
      {/* Left tree — Projects */}
      {treeOpen && (
        <aside className="w-72 shrink-0 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-medium">Projects</div>
            <div className="flex items-center gap-0.5">
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px] gap-1" onClick={openAddFolder}><FolderPlus className="w-3.5 h-3.5" /> Folder</Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setTreeOpen(false)}><X className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <ul className="text-sm py-1">
              {myProjects.map((p) => {
                const isProjOpen = expanded.has(p.id);
                const topFolders = folders.filter((f) => f.projectId === p.id && !f.parentId).sort((a, b) => a.order - b.order);
                return (
                  <li key={p.id}>
                    <button onClick={() => toggle(p.id)} className="w-full flex items-center gap-1 px-2 py-1.5 hover:bg-slate-50 text-left">
                      {isProjOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      <Folder className={`w-4 h-4 ${isProjOpen ? "text-amber-600" : "text-slate-500"}`} />
                      <span className="font-mono text-xs truncate">{p.code}</span>
                      <Badge variant="outline" className={`ml-auto text-[9px] capitalize ${p.stage === "post-contract" ? "border-orange-300 text-orange-700" : p.stage === "pre-contract" ? "border-emerald-300 text-emerald-700" : p.stage === "completed" ? "border-slate-300 text-slate-600" : "border-blue-300 text-blue-700"}`}>{p.stage === "post-contract" ? "active" : p.stage === "completed" ? "completed" : p.stage}</Badge>
                    </button>
                    {isProjOpen && (
                      <ul className="ml-1">
                        {topFolders.map((tf) => {
                          const isFolderOpen = expanded.has(tf.id);
                          const subFolders = folders.filter((f) => f.parentId === tf.id).sort((a, b) => a.order - b.order);
                          const count = folderFileCount(tf.id);
                          return (
                            <li key={tf.id}>
                              <div className={`flex items-center gap-1 pl-5 pr-2 py-1.5 ${activeFolderId === tf.id ? "bg-emerald-50/60 border-l-2 border-emerald-400" : "hover:bg-slate-50"}`}>
                                {subFolders.length > 0 ? (
                                  <button onClick={() => toggle(tf.id)} className="text-slate-400"><ChevronRight className={`w-3 h-3 transition-transform ${isFolderOpen ? "rotate-90" : ""}`} /></button>
                                ) : <span className="w-3" />}
                                <button onClick={() => setActiveFolderId(tf.id)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
                                  {isFolderOpen ? <FolderOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                                  <span className="text-xs truncate">{tf.name}</span>
                                  {tf.indicator && <span className={`w-1.5 h-1.5 rounded-full ${INDICATOR_DOT[tf.indicator]} shrink-0`} />}
                                  {count > 0 && <span className="ml-auto text-[10px] text-slate-500 tabular-nums">{count}</span>}
                                </button>
                              </div>
                              {isFolderOpen && subFolders.length > 0 && (
                                <ul>
                                  {subFolders.map((sf) => {
                                    const subCount = folderFileCount(sf.id);
                                    return (
                                      <li key={sf.id}>
                                        <button onClick={() => setActiveFolderId(sf.id)} className={`w-full flex items-center gap-1.5 pl-12 pr-2 py-1.5 text-left ${activeFolderId === sf.id ? "bg-emerald-50/60 border-l-2 border-emerald-400" : "hover:bg-slate-50"}`}>
                                          <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span className="text-[11px] truncate">{sf.name}</span>
                                          {subCount > 0 && <span className="ml-auto text-[10px] text-slate-400 tabular-nums">{subCount}</span>}
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </aside>
      )}

      {!treeOpen && (
        <Button size="sm" variant="outline" className="self-start h-9 gap-1" onClick={() => setTreeOpen(true)}><ChevronRight className="w-4 h-4" /> Projects</Button>
      )}

      {/* Right pane — file list */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-1 min-w-0">
            <button onClick={() => setActiveFolderId(undefined)} className="hover:text-slate-900">Documents</button>
            {activeProject && (
              <>
                <span>›</span>
                <span className="text-slate-700">{activeProject.code} — {activeProject.nameEn}</span>
              </>
            )}
            {activeFolder && (
              <>
                <span>›</span>
                <span className="text-slate-900 font-medium truncate">{activeFolder.name}</span>
              </>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
            <Input className="pl-8 h-9 w-64" placeholder="Search files…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {(Object.keys(DOC_STATUS_LABEL) as DocStatus[]).map((s) => <SelectItem key={s} value={s}>{DOC_STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="inline-flex rounded-md border border-slate-200 overflow-hidden">
            <button onClick={() => setView("list")} className={`p-1.5 ${view === "list" ? "bg-slate-100" : "hover:bg-slate-50"}`}><List className="w-4 h-4" /></button>
            <button onClick={() => setView("grid")} className={`p-1.5 ${view === "grid" ? "bg-slate-100" : "hover:bg-slate-50"}`}><Grid className="w-4 h-4" /></button>
          </div>
        </header>

        {!activeFolder ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500 p-6 text-center">Pick a folder from the project tree to view its documents.</div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-slate-500" />
                <h2 className="font-semibold">{activeFolder.name}</h2>
                <Badge variant="outline" className="text-[10px]">{activeFolderFiles.length} {activeFolderFiles.length === 1 ? "file" : "files"}</Badge>
                {activeFolder.indicator && <span className={`w-2 h-2 rounded-full ${INDICATOR_DOT[activeFolder.indicator]}`} />}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {activeFolder.accessRoles && activeFolder.accessRoles.length > 0 && (
                  <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Access: {activeFolder.accessRoles.map((r) => ROLE_LABELS[r]).join(", ")}</span>
                )}
                {activeFolder.retention && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Retention: {activeFolder.retention}</span>}
                <Button size="sm" className="gap-1.5 h-8" onClick={() => { setDraftFile({ status: "draft", version: "v1.0" }); setAddOpen(true); }}><Plus className="w-3.5 h-3.5" /> Add file</Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {view === "list" ? (
                <ul>
                  {activeFolderFiles.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 hover:bg-slate-50/60">
                      <div className="w-9 h-9 rounded bg-red-50 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-red-500" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{f.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{f.uploadedByDisplay || f.uploadedByUserId}</span>
                          <span>·</span>
                          <span>{relTime(f.uploadedAt)}</span>
                          <span>·</span>
                          <span className="font-mono">{fmtBytes(f.sizeBytes)}</span>
                          <Badge variant="outline" className={`text-[10px] ${DOC_STATUS_CLASS[f.status]}`}>{DOC_STATUS_LABEL[f.status]}</Badge>
                        </div>
                      </div>
                      <Badge className={`text-[11px] tabular-nums ${DOC_STATUS_CLASS[f.status]}`}>{DOC_STATUS_LABEL[f.status]}</Badge>
                      <span className="text-xs font-mono text-slate-500 tabular-nums w-12 text-right">{f.version}</span>
                      <div className="flex">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openFile(f)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => downloadDoc(f)}><Download className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setRenameTarget(f); setRenameName(f.name); }}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => deleteFile(f)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                    </li>
                  ))}
                  {activeFolderFiles.length === 0 && <li className="text-center text-sm text-slate-500 py-12">No files match. Try clearing search or status filter.</li>}
                </ul>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
                  {activeFolderFiles.map((f) => (
                    <Card key={f.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="aspect-[4/3] bg-red-50 rounded flex items-center justify-center mb-2"><FileText className="w-10 h-10 text-red-500" /></div>
                        <div className="text-sm font-medium truncate">{f.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{relTime(f.uploadedAt)} · {fmtBytes(f.sizeBytes)}</div>
                        <div className="flex items-center justify-between mt-2">
                          <Badge className={`text-[9px] ${DOC_STATUS_CLASS[f.status]}`}>{DOC_STATUS_LABEL[f.status]}</Badge>
                          <span className="text-[10px] font-mono text-slate-500">{f.version}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </div>

      {/* New folder dialog */}
      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Create a folder in a project. Keep parent as "Top level" for a main folder, or nest it inside an existing one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Project</Label>
              <Select value={draftFolder.projectId} onValueChange={(v) => setDraftFolder({ ...draftFolder, projectId: v, parentId: undefined })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{myProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.nameEn}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Parent folder</Label>
              <Select value={draftFolder.parentId || "_top"} onValueChange={(v) => setDraftFolder({ ...draftFolder, parentId: v === "_top" ? undefined : v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_top">Top level</SelectItem>
                  {folders.filter((f) => f.projectId === draftFolder.projectId && !f.parentId).sort((a, b) => a.order - b.order).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Folder name</Label><Input value={draftFolder.name} onChange={(e) => setDraftFolder({ ...draftFolder, name: e.target.value })} placeholder="e.g. 09. Tender Documents" className="mt-1" autoFocus /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderOpen(false)}>Cancel</Button>
            <Button onClick={saveFolder}>Create folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename document dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => { if (!o) setRenameTarget(undefined); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Rename document</DialogTitle></DialogHeader>
          <div><Label className="text-xs">Document name</Label><Input value={renameName} onChange={(e) => setRenameName(e.target.value)} className="mt-1" autoFocus /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(undefined)}>Cancel</Button>
            <Button onClick={saveRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add file dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add file to "{activeFolder?.name}"</DialogTitle>
            <DialogDescription>For now the upload form captures metadata; file bytes attach via the standard file-uploader below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">File name</Label><Input value={draftFile.name || ""} onChange={(e) => setDraftFile({ ...draftFile, name: e.target.value })} placeholder="e.g. DM Building Permit Application.pdf" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Status</Label>
                <Select value={draftFile.status} onValueChange={(v) => setDraftFile({ ...draftFile, status: v as DocStatus })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(DOC_STATUS_LABEL) as DocStatus[]).map((s) => <SelectItem key={s} value={s}>{DOC_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Version</Label><Input value={draftFile.version || ""} onChange={(e) => setDraftFile({ ...draftFile, version: e.target.value })} placeholder="v1.0 / Rev A" className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Notes (optional)</Label><Input value={draftFile.notes || ""} onChange={(e) => setDraftFile({ ...draftFile, notes: e.target.value })} className="mt-1" /></div>
            {activeFolder && (
              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-600 mb-1">Attach file (stored in the bucket)</div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => onPickFile(e.target.files)} />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading…" : "Choose file"}
                  </Button>
                  {draftFile.fileStoreId
                    ? <span className="text-xs text-emerald-600">Attached ✓ ({fmtBytes(draftFile.sizeBytes || 0)})</span>
                    : <span className="text-[10px] text-slate-500">PDF, image, Office docs · up to 25 MB</span>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={saveDraft}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
