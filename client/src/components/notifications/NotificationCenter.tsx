import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocation } from "wouter";
import { Bell, AlertTriangle, AlertCircle, Info, Check } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { employeesStore, trainingStore, leavesStore, punchesStore, usersStore, notificationsStore, notificationReadFlagsStore, tasksStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { deriveAlerts } from "@/lib/notifications/derive";
import type { Notification } from "@/lib/notifications/types";

export default function NotificationCenter() {
  const { currentUser } = useAuth();
  const employees = useCollection(employeesStore);
  const training = useCollection(trainingStore);
  const leaves = useCollection(leavesStore);
  const punches = useCollection(punchesStore);
  const users = useCollection(usersStore);
  const stored = useCollection(notificationsStore);
  const readFlags = useCollection(notificationReadFlagsStore);
  const tasks = useCollection(tasksStore);
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  const alerts = useMemo(() => {
    if (!currentUser) return [];
    const all = deriveAlerts({ employees, training, leaves, punches, users, tasks });
    return all.filter((a) => a.recipientUserId === currentUser.id || a.recipientUserId === "*");
  }, [currentUser, employees, training, leaves, punches, users]);

  // Stored (server) notifications addressed to me + freshly derived alerts.
  // Derived alerts never exist server-side, so their read state lives in the
  // local notificationReadFlagsStore.
  const merged = useMemo<Notification[]>(() => {
    const readSet = new Set([
      ...stored.filter((n) => n.read).map((n) => n.id),
      ...readFlags.map((f) => f.id),
    ]);
    const byId = new Map<string, Notification>();
    for (const n of stored) {
      if (currentUser && n.recipientUserId !== currentUser.id && n.recipientUserId !== "*") continue;
      byId.set(n.id, { ...n, read: n.read || readSet.has(n.id) });
    }
    for (const a of alerts) if (!byId.has(a.id)) byId.set(a.id, { ...a, read: readSet.has(a.id) });
    return Array.from(byId.values())
      .sort((a, b) => (a.read ? 1 : 0) - (b.read ? 1 : 0) || b.createdAt.localeCompare(a.createdAt));
  }, [alerts, stored, readFlags, currentUser]);

  const unreadCount = merged.filter((n) => !n.read).length;

  function markRead(n: Notification) {
    if (stored.some((s) => s.id === n.id)) notificationsStore.put({ ...n, read: true });
    else notificationReadFlagsStore.put({ id: n.id, readAt: new Date().toISOString() } as any);
  }
  function markAllRead() {
    for (const n of merged) if (!n.read) markRead(n);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] bg-red-600 text-white">{unreadCount}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 flex flex-col" style={{ maxHeight: "min(70vh, 560px)" }}>
        <div className="flex items-center justify-between p-3 border-b shrink-0">
          <div className="font-medium text-sm">Notifications</div>
          {unreadCount > 0 && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}><Check className="w-3 h-3 mr-1" /> Mark all read</Button>}
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
          {merged.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">All clear.</div>
          ) : merged.map((n) => (
            <button key={n.id} className={`w-full text-left p-3 border-b border-slate-100 hover:bg-slate-50 flex items-start gap-2 ${n.read ? "opacity-60" : ""}`} onClick={() => { markRead(n); if (n.link) { navigate(n.link); setOpen(false); } }}>
              <SeverityIcon sev={n.severity} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{n.title}</div>
                <div className="text-xs text-slate-500">{n.body}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleString("en-GB", { timeZone: "UTC", hour12: true })}</div>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
function SeverityIcon({ sev }: { sev: Notification["severity"] }) {
  if (sev === "critical") return <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />;
  if (sev === "warning") return <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />;
  return <Info className="w-4 h-4 text-blue-600 mt-0.5" />;
}
