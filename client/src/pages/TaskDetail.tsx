/**
 * Task detail — task summary, member management (creator adds/removes assignees),
 * and a per-task WhatsApp-style group chat (text, images, files, voice notes)
 * with live updates over socket.io.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, Send, Paperclip, Image as ImageIcon, Mic, Square, X, Download, UserPlus, Trash2, Loader2, Pencil,
} from "lucide-react";
import { apiFetch } from "@/lib/backend/api";
import { uploadFile } from "@/lib/files/api";
import { getTask, addAssignee, removeAssignee, listMessages, postMessage } from "@/lib/tasks/api";
import { userDirectoryStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSocket, useRealtime } from "@/lib/realtime/socket";
import { TASK_STATUS_LABEL, PRIORITY_LABEL, type Task, type TaskMessage } from "@/lib/tasks/types";

function initials(name: string) { return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase(); }
function timeOf(iso: string) { return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }); }

// Renders a chat attachment (image inline, voice as audio, file as download) by
// fetching the bucket file as an authenticated blob.
function Attachment({ m }: { m: TaskMessage }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let revoke: string | undefined;
    if (!m.fileStoreId) return;
    (async () => {
      try {
        const resp = (await apiFetch<Response>(`/files/${m.fileStoreId}`, { raw: true })) as unknown as Response;
        const blobUrl = URL.createObjectURL(await resp.blob());
        revoke = blobUrl; setUrl(blobUrl);
      } catch { /* ignore */ }
    })();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [m.fileStoreId]);

  if (!m.fileStoreId) return null;
  if (!url) return <div className="flex items-center gap-1 text-xs opacity-70 py-2"><Loader2 className="w-3 h-3 animate-spin" /> loading…</div>;
  if (m.kind === "image") return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={m.fileName || "image"} className="rounded-md max-h-60 max-w-full" /></a>;
  if (m.kind === "voice") return <audio controls src={url} className="h-9 max-w-[240px]" />;
  return (
    <a href={url} download={m.fileName || "file"} className="flex items-center gap-2 underline text-sm">
      <Download className="w-4 h-4" /> {m.fileName || "Download file"}
    </a>
  );
}

export default function TaskDetail() {
  const [, params] = useRoute("/tasks/:id");
  const taskId = params?.id;
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const directory = useCollection(userDirectoryStore);
  const nameOf = (id?: string | null) => directory.find((u) => u.id === id)?.displayName || id || "—";

  const [task, setTask] = useState<Task | undefined>();
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [text, setText] = useState("");
  const [addMember, setAddMember] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const members = useMemo(() => {
    if (!task) return [] as string[];
    const s = new Set<string>(task.assigneeUserIds ?? []);
    if (task.reporterUserId) s.add(task.reporterUserId);
    return [...s];
  }, [task]);
  const canManage = !!task && (currentUser?.role === "director" || task.reporterUserId === currentUser?.id);
  const isDirector = currentUser?.role === "director";

  // Edit details dialog (creator / director)
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({ title: "", description: "", status: "todo", priority: "medium", dueDate: "" });
  function openEdit() {
    if (!task) return;
    setEdit({ title: task.title, description: task.description || "", status: task.status, priority: task.priority, dueDate: task.dueDate || "" });
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!taskId || !edit.title.trim()) { toast.error("Title is required"); return; }
    try {
      const t = await apiFetch<Task>(`/tasks/${taskId}`, { method: "PATCH", body: {
        title: edit.title.trim(),
        description: edit.description.trim() || undefined,
        status: edit.status,
        priority: edit.priority,
        dueDate: edit.dueDate || undefined,
      }});
      setTask(t);
      setEditOpen(false);
      toast.success("Task updated");
    } catch (err: any) { toast.error(err?.message || "Couldn't update task"); }
  }
  async function deleteTask() {
    if (!taskId || !confirm("Delete this task, its chat and uploads?")) return;
    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
      toast.success("Task deleted");
      navigate("/tasks");
    } catch (err: any) { toast.error(err?.message || "Couldn't delete task"); }
  }
  async function deleteMessage(m: TaskMessage) {
    if (!taskId || !confirm("Delete this message?")) return;
    try {
      await apiFetch(`/tasks/${taskId}/messages/${m.id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err: any) { toast.error(err?.message || "Couldn't delete message"); }
  }

  // Load task + messages, subscribe to the task room for live updates.
  useEffect(() => {
    if (!taskId) return;
    let alive = true;
    (async () => {
      try {
        const [t, msgs] = await Promise.all([getTask(taskId), listMessages(taskId)]);
        if (!alive) return;
        setTask(t); setMessages(msgs);
      } catch { toast.error("Couldn't load this task"); }
    })();
    const sock = getSocket();
    sock?.emit("subscribe:task", taskId);
    return () => { alive = false; sock?.emit("unsubscribe:task", taskId); };
  }, [taskId]);

  useRealtime<TaskMessage>("task-message", (m) => {
    if (m.taskId !== taskId) return;
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  });
  useRealtime<Task>("task-updated", (t) => { if (t.id === taskId) setTask(t); });
  useRealtime<{ id: string; taskId: string }>("task-message-deleted", (d) => {
    if (d.taskId === taskId) setMessages((prev) => prev.filter((x) => x.id !== d.id));
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  async function sendText() {
    if (!taskId || !text.trim() || sending) return;
    setSending(true);
    const body = text.trim();
    setText("");
    try {
      const m = await postMessage(taskId, { kind: "text", body });
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    } catch { toast.error("Message failed"); setText(body); }
    finally { setSending(false); }
  }

  async function sendAttachment(file: File, kind: "image" | "file") {
    if (!taskId) return;
    setSending(true);
    try {
      const stored = await uploadFile(file, { entityType: "drawing" as any, entityId: "task:" + taskId, uploadedByDisplay: currentUser?.displayName });
      const m = await postMessage(taskId, { kind, fileStoreId: stored.id, fileName: stored.name, mimeType: stored.mimeType });
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    } catch { toast.error("Upload failed"); }
    finally { setSending(false); if (fileRef.current) fileRef.current.value = ""; if (imgRef.current) imgRef.current.value = ""; }
  }

  async function toggleRecord() {
    if (recording) { recRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = []; recStartRef.current = Date.now();
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const durationSec = Math.max(1, Math.round((Date.now() - recStartRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        if (!taskId) return;
        setSending(true);
        try {
          const stored = await uploadFile(file, { entityType: "drawing" as any, entityId: "task:" + taskId, uploadedByDisplay: currentUser?.displayName });
          const m = await postMessage(taskId, { kind: "voice", fileStoreId: stored.id, fileName: file.name, mimeType: "audio/webm", durationSec });
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        } catch { toast.error("Voice note failed (audio uploads may need MIME allow-listing)"); }
        finally { setSending(false); }
      };
      recRef.current = rec; rec.start(); setRecording(true);
    } catch { toast.error("Microphone permission denied"); }
  }

  async function onAddMember(userId: string) {
    if (!taskId) return;
    try { const t = await addAssignee(taskId, userId); setTask(t); setAddMember(""); toast.success(`Added ${nameOf(userId)}`); }
    catch { toast.error("Couldn't add member"); }
  }
  async function onRemoveMember(userId: string) {
    if (!taskId) return;
    try { const t = await removeAssignee(taskId, userId); setTask(t); toast.success(`Removed ${nameOf(userId)}`); }
    catch { toast.error("Couldn't remove member"); }
  }

  if (!task) {
    return <div className="p-6 text-sm text-muted-foreground"><Button variant="ghost" size="sm" onClick={() => navigate("/tasks")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button><div className="mt-4">Loading task…</div></div>;
  }

  const candidates = directory.filter((u) => !members.includes(u.id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-140px)]">
      {/* Left: task info + members */}
      <div className="space-y-3 overflow-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")}><ArrowLeft className="w-4 h-4 mr-1" /> Back to Tasks</Button>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-lg font-bold leading-tight">{task.title}</h1>
              {canManage && (
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit details" onClick={openEdit}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Delete task" onClick={deleteTask}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
              )}
            </div>
            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{TASK_STATUS_LABEL[task.status]}</Badge>
              <Badge variant="outline">{PRIORITY_LABEL[task.priority]}</Badge>
              {task.dueDate && <Badge variant="outline">Due {task.dueDate}</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">Created by <span className="font-medium text-foreground">{nameOf(task.reporterUserId)}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Members · {members.length}</h2>
            </div>
            {members.map((id) => (
              <div key={id} className="flex items-center gap-2">
                <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{initials(nameOf(id))}</AvatarFallback></Avatar>
                <span className="text-sm flex-1 truncate">{nameOf(id)}{id === task.reporterUserId && <span className="text-[10px] text-muted-foreground ml-1">· creator</span>}</span>
                {canManage && id !== task.reporterUserId && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onRemoveMember(id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                )}
              </div>
            ))}
            {canManage && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <UserPlus className="w-4 h-4 text-muted-foreground" />
                <Select value={addMember} onValueChange={onAddMember}>
                  <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Add member…" /></SelectTrigger>
                  <SelectContent>{candidates.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: chat */}
      <Card className="flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 text-sm font-semibold flex items-center justify-between">
          <span>Task chat</span>
          <span className="text-xs font-normal text-muted-foreground">{members.length} members</span>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-2 bg-slate-50/60">
          {messages.length === 0 && <div className="text-center text-xs text-muted-foreground py-10">No messages yet. Say hello 👋</div>}
          {messages.map((m) => {
            const mine = m.userId === currentUser?.id;
            return (
              <div key={m.id} className={`group flex items-start gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                {mine && (mine || isDirector) && (
                  <button className="mt-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity" title="Delete message" onClick={() => deleteMessage(m)}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <div className={`max-w-[78%] rounded-lg px-3 py-2 shadow-sm ${mine ? "bg-emerald-600 text-white" : "bg-white border border-slate-200"}`}>
                  {!mine && <div className="text-[10px] font-medium opacity-70 mb-0.5">{nameOf(m.userId)}</div>}
                  {m.kind === "text" ? <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div> : <Attachment m={m} />}
                  <div className={`text-[9px] mt-0.5 ${mine ? "text-emerald-100" : "text-slate-400"} text-right`}>{timeOf(m.createdAt)}</div>
                </div>
                {!mine && isDirector && (
                  <button className="mt-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity" title="Delete message (Director)" onClick={() => deleteMessage(m)}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {/* Composer */}
        <div className="border-t border-slate-100 p-2 flex items-center gap-1.5">
          <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && sendAttachment(e.target.files[0], "image")} />
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && sendAttachment(e.target.files[0], "file")} />
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0" title="Image" onClick={() => imgRef.current?.click()} disabled={sending}><ImageIcon className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0" title="File" onClick={() => fileRef.current?.click()} disabled={sending}><Paperclip className="w-4 h-4" /></Button>
          <Button size="sm" variant={recording ? "destructive" : "ghost"} className="h-9 w-9 p-0" title={recording ? "Stop" : "Voice note"} onClick={toggleRecord} disabled={sending}>
            {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            placeholder={recording ? "Recording… tap stop to send" : "Type a message"}
            className="h-9 flex-1"
            disabled={recording}
          />
          <Button size="sm" className="h-9 gap-1" onClick={sendText} disabled={!text.trim() || sending}><Send className="w-4 h-4" /></Button>
        </div>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit task details</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title</Label><Input className="mt-1" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
            <div><Label className="text-xs">Description</Label><Textarea className="mt-1" rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Status</Label>
                <Select value={edit.status} onValueChange={(v) => setEdit({ ...edit, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Priority</Label>
                <Select value={edit.priority} onValueChange={(v) => setEdit({ ...edit, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Due date</Label><Input type="date" className="mt-1" value={edit.dueDate} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
