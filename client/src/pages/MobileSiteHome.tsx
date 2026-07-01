/**
 * Mobile Site-Engineer home — the killer mobile screen.
 *  - Banner: "You're at [site]" (or "Off-site" / "Offline") driven by latest geofence
 *  - Stats: hours today / this week / OT
 *  - My open tasks (clickable)
 *  - My pending inspections / WIRs
 *  - Auto-geofence status & permission prompt
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAutoGeofence, requestLocationPermission, startAutoGeofence } from "@/lib/native/geofence-service";
import { isNative } from "@/lib/native/platform";
import { employeesStore, locationsStore, geofencesStore, punchesStore, tasksStore, leavesStore, documentsStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { derivePresence } from "@/lib/attendance/presence";
import { aggregateDays } from "@/lib/attendance/utils";
import { MapPin, Clock, Activity, ListTodo, AlertTriangle, Shield, CheckCircle2, Sun, Coffee } from "lucide-react";
import { toast } from "sonner";

export default function MobileSiteHome() {
  const { currentUser } = useAuth();
  const employees = useCollection(employeesStore);
  const locations = useCollection(locationsStore);
  const fences = useCollection(geofencesStore);
  const punches = useCollection(punchesStore);
  const tasks = useCollection(tasksStore);
  const leaves = useCollection(leavesStore);
  const docs = useCollection(documentsStore);
  const auto = useAutoGeofence();
  const [, navigate] = useLocation();
  const [permPrompt, setPermPrompt] = useState(false);

  if (!currentUser) return null;
  const me = employees.find((e) => e.id === currentUser.employeeId);
  const myLocation = locations.filter((p) => p.employeeId === me?.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  const presence = me ? derivePresence(me.id, myLocation, fences) : { status: "offline" as const, currentFenceId: undefined as string | undefined, metersFromFence: undefined as number | undefined };
  const currentFence = presence.currentFenceId ? fences.find((f) => f.id === presence.currentFenceId) : undefined;

  // Hours today / week from punches
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const weekStart = new Date(today.getTime() - 7 * 86_400_000);
  const fromDate = weekStart.toISOString().slice(0, 10);
  const days = useMemo(() => me ? aggregateDays({ punches, employeeIds: [me.id], fromDate, toDate: todayISO, leaves }) : [], [punches, me, fromDate, todayISO, leaves]);
  const todayDay = days.find((d) => d.date === todayISO);
  const weekHours = days.reduce((a, d) => a + (d.normalMinutes + d.overtimeMinutes) / 60, 0);
  const todayHours = todayDay ? (todayDay.normalMinutes + todayDay.overtimeMinutes) / 60 : 0;
  const todayOT = todayDay ? todayDay.overtimeMinutes / 60 : 0;

  const myOpenTasks = tasks.filter((t) => t.assigneeUserId === currentUser.id && t.status !== "done").slice(0, 5);
  const myOpenRFIs = docs.filter((d) => d.status === "for-approval" && d.name.toLowerCase().includes("rfi")).slice(0, 3);
  const myOpenIRs = docs.filter((d) => d.status === "for-approval" && d.name.toLowerCase().includes("wir")).slice(0, 3);

  async function askPermission() {
    const granted = await requestLocationPermission();
    if (granted) {
      const r = await startAutoGeofence();
      toast.success(r.message);
    } else {
      toast.error("Location permission denied. Open Settings → NASEC ERP → Location → Always to enable.");
    }
    setPermPrompt(false);
  }

  // Greeting based on local time
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-3 pt-3 pb-20 space-y-3">
      {/* Greeting */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500">{greeting}</div>
        <div className="text-2xl font-bold tracking-tight">{me?.firstName || currentUser.displayName.split(" ")[0]}</div>
      </div>

      {/* Presence banner — the visual headline */}
      <Card className={`overflow-hidden border-0 ${presence.status === "on-site" ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white" : presence.status === "in-office" ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white" : presence.status === "in-transit" ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white" : "bg-gradient-to-br from-slate-500 to-slate-700 text-white"}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              {presence.status === "on-site" ? <MapPin className="w-6 h-6" /> : presence.status === "in-office" ? <Sun className="w-6 h-6" /> : presence.status === "in-transit" ? <Activity className="w-6 h-6" /> : <Coffee className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest opacity-80">You're</div>
              <div className="text-xl font-bold">{presence.status === "on-site" ? `on site at ${currentFence?.name || "—"}` : presence.status === "in-office" ? "in the office" : presence.status === "in-transit" ? "in transit" : presence.status === "off-duty" ? "off duty" : "offline"}</div>
              {presence.metersFromFence !== undefined && presence.status !== "on-site" && presence.status !== "in-office" && (
                <div className="text-xs opacity-80 mt-1">{presence.metersFromFence}m to nearest fence</div>
              )}
              <div className="text-[10px] mt-2 opacity-75">Auto-detect: {auto.message}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission prompt — show only on native if user hasn't enabled */}
      {isNative() && !auto.running && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-700 shrink-0" />
            <div className="text-xs flex-1">
              <div className="font-medium text-amber-900">Enable Always-Allow location</div>
              <div className="text-amber-800 mt-0.5">Required for auto-punch when you arrive at or leave a site.</div>
            </div>
            <Button size="sm" className="bg-amber-700 hover:bg-amber-800" onClick={askPermission}>Enable</Button>
          </CardContent>
        </Card>
      )}

      {/* Hours stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile icon={<Clock className="w-4 h-4 text-blue-600" />} value={`${todayHours.toFixed(1)}h`} label="Today" />
        <StatTile icon={<Activity className="w-4 h-4 text-amber-600" />} value={`${todayOT.toFixed(1)}h`} label="OT today" />
        <StatTile icon={<Sun className="w-4 h-4 text-emerald-600" />} value={`${weekHours.toFixed(0)}h`} label="Last 7 days" />
      </div>

      {/* My tasks */}
      <SectionHeader title="My open tasks" onAll={() => navigate("/tasks")} />
      {myOpenTasks.length === 0 ? (
        <Card><CardContent className="p-3 text-xs text-slate-500 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Nothing on your plate. Nice.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {myOpenTasks.map((t) => (
            <Card key={t.id} className="active:bg-slate-50" onClick={() => navigate("/tasks")}>
              <CardContent className="p-3 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="text-[10px] text-slate-500">{t.dueDate ? `Due ${t.dueDate}` : "No due date"} · {t.category}</div>
                </div>
                <Badge variant="outline" className="text-[9px] capitalize">{t.priority}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Open RFIs / WIRs */}
      {(myOpenRFIs.length > 0 || myOpenIRs.length > 0) && (
        <>
          <SectionHeader title="Open submittals" onAll={() => navigate("/documents")} />
          <div className="space-y-2">
            {[...myOpenRFIs, ...myOpenIRs].slice(0, 4).map((d) => (
              <Card key={d.id} className="active:bg-slate-50">
                <CardContent className="p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{d.version}</div>
                  </div>
                  <Badge variant="outline" className="text-[9px] capitalize">{d.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Quick action — request leave */}
      <Button variant="outline" className="w-full justify-start gap-2 mt-3" onClick={() => navigate("/my-hr")}>
        <UserCircleIcon /> Request leave / view my profile
      </Button>
    </div>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Card><CardContent className="p-2 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </CardContent></Card>
  );
}
function SectionHeader({ title, onAll }: { title: string; onAll: () => void }) {
  return (
    <div className="flex items-center justify-between mt-1 px-1">
      <h2 className="text-sm font-semibold">{title}</h2>
      <button className="text-xs text-slate-500 hover:text-slate-900" onClick={onAll}>See all →</button>
    </div>
  );
}
function UserCircleIcon() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M6 21a6 6 0 0 1 12 0" /></svg>; }
