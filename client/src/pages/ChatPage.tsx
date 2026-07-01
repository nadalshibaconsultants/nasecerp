/**
 * Chat — real-user direct & group messaging, persisted to the backend.
 * Messages save to /api/v1/chat, deliver in realtime (socket "chat:message"),
 * and per-conversation unread counts derive from each member's last-read marker.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, MessageSquare, Plus, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRealtime } from "@/lib/realtime/socket";
import {
  listChatUsers, listConversations, createConversation, getMessages, sendMessage, markRead,
  type Conversation, type ChatMessage, type ChatUser,
} from "@/lib/chat/api";

const initials = (name?: string) => (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const timeLabel = (iso?: string) => iso ? new Date(iso).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : "";

export default function ChatPage() {
  const { currentUser } = useAuth();
  const [, navigate] = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const active = conversations.find((c) => c.id === activeId) || null;

  async function refreshConversations() {
    try { setConversations(await listConversations()); } catch { /* ignore */ }
  }
  useEffect(() => { void refreshConversations(); }, []);

  // Open a conversation: load messages (also marks read) + refresh list counts.
  async function openConversation(id: string) {
    setActiveId(id);
    try {
      setMessages(await getMessages(id));
      await refreshConversations();
    } catch { toast.error("Could not load messages"); }
  }

  // Incoming realtime messages.
  useRealtime<{ conversationId: string; message: ChatMessage }>("chat:message", (p) => {
    if (p.conversationId === activeIdRef.current) {
      setMessages((m) => [...m, p.message]);
      void markRead(p.conversationId).then(refreshConversations);
    } else {
      void refreshConversations();
    }
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  async function send() {
    const text = draft.trim();
    if (!text || !activeId) return;
    setDraft("");
    setSending(true);
    try {
      const saved = await sendMessage(activeId, text);
      setMessages((m) => [...m, saved]);
      await refreshConversations();
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
      setDraft(text);
    } finally { setSending(false); }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? conversations.filter((c) => c.name.toLowerCase().includes(q)) : conversations;
  }, [conversations, search]);

  // ---- New chat dialog ----
  const [newOpen, setNewOpen] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [userSearch, setUserSearch] = useState("");
  async function openNew() {
    setPicked(new Set()); setGroupName(""); setUserSearch("");
    setNewOpen(true);
    try { setUsers(await listChatUsers()); } catch { /* ignore */ }
  }
  function togglePick(id: string) {
    setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  async function startChat() {
    const ids = [...picked];
    if (!ids.length) { toast.error("Pick at least one person"); return; }
    const type = ids.length > 1 ? "group" : "dm";
    try {
      const { id } = await createConversation({ type, memberIds: ids, name: type === "group" ? (groupName || undefined) : undefined });
      setNewOpen(false);
      await refreshConversations();
      await openConversation(id);
    } catch (e: any) { toast.error(e?.message || "Could not start chat"); }
  }
  const usersFiltered = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return q ? users.filter((u) => u.displayName.toLowerCase().includes(q)) : users;
  }, [users, userSearch]);

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /><h1 className="text-lg font-bold">Chat</h1></div>
        <div className="ml-auto text-xs text-muted-foreground">{currentUser?.displayName}</div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar — conversation list */}
        <aside className="flex w-72 flex-col border-r bg-white">
          <div className="flex items-center gap-2 border-b p-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input className="h-9 pl-8" placeholder="Search chats…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={openNew} title="New chat"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && <p className="p-4 text-xs text-muted-foreground">No conversations yet. Click + to start one with a colleague.</p>}
            {filtered.map((c) => (
              <button key={c.id} onClick={() => openConversation(c.id)}
                className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50 ${activeId === c.id ? "bg-slate-100" : ""}`}>
                <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{c.type === "group" ? <Users className="h-4 w-4" /> : initials(c.name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{c.lastMessageAt ? timeLabel(c.lastMessageAt) : ""}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">{c.lastMessage || (c.type === "group" ? "Group chat" : "Say hi 👋")}</span>
                    {c.unread > 0 && <Badge className="h-5 min-w-5 shrink-0 justify-center bg-red-600 px-1.5 text-[10px] text-white">{c.unread}</Badge>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Thread */}
        <main className="flex min-w-0 flex-1 flex-col">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">Select a conversation, or start a new one.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{active.type === "group" ? <Users className="h-4 w-4" /> : initials(active.name)}</AvatarFallback></Avatar>
                <div>
                  <div className="text-sm font-semibold">{active.name}</div>
                  <div className="text-[11px] text-muted-foreground">{active.type === "group" ? `${active.members.length} members` : active.members.find((m) => m.id !== currentUser?.id)?.displayName}</div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${m.mine ? "bg-primary text-primary-foreground" : "border bg-white"}`}>
                      {!m.mine && active.type === "group" && <div className="mb-0.5 text-[10px] font-semibold opacity-70">{m.senderName}</div>}
                      <div className="whitespace-pre-wrap break-words text-sm">{m.body}</div>
                      <div className={`mt-0.5 text-right text-[10px] ${m.mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{timeLabel(m.createdAt)}</div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-center text-xs text-muted-foreground">No messages yet — send the first one.</p>}
              </div>

              <div className="flex items-center gap-2 border-t bg-white p-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  placeholder="Type a message…"
                  className="flex-1"
                />
                <Button onClick={send} disabled={sending || !draft.trim()} className="gap-1.5"><Send className="h-4 w-4" /> Send</Button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* New chat */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New chat</DialogTitle><DialogDescription>Pick one person for a direct message, or several for a group.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input className="h-9 pl-8" placeholder="Search people…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            </div>
            {picked.size > 1 && (
              <Input placeholder="Group name (optional)" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            )}
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {usersFiltered.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-slate-50">
                  <Checkbox checked={picked.has(u.id)} onCheckedChange={() => togglePick(u.id)} />
                  <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{initials(u.displayName)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm">{u.displayName}</div>
                    <div className="text-[10px] capitalize text-muted-foreground">{u.role.replace("-", " ")}</div>
                  </div>
                </label>
              ))}
              {usersFiltered.length === 0 && <p className="p-2 text-xs text-muted-foreground">No users found.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={startChat} disabled={picked.size === 0}>{picked.size > 1 ? `Start group (${picked.size})` : "Start chat"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
