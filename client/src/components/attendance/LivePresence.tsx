import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MapPin, Smartphone, Building2, Truck, Coffee, WifiOff, Battery, Radar, Activity } from "lucide-react";
import { employeesStore, geofencesStore, locationsStore, punchesStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { derivePresence, autoPunchOnPing, type PresenceStatus } from "@/lib/attendance/presence";

export default function LivePresence() {
  const employees = useCollection(employeesStore);
  const fences = useCollection(geofencesStore);
  const locations = useCollection(locationsStore);
  const _ = useCollection(punchesStore);

  const presence = useMemo(() => {
    const latestByEmp = new Map<string, typeof locations[number]>();
    for (const p of locations) {
      const ex = latestByEmp.get(p.employeeId);
      if (!ex || p.timestamp > ex.timestamp) latestByEmp.set(p.employeeId, p);
    }
    return employees.map((e) => derivePresence(e.id, latestByEmp.get(e.id), fences));
  }, [employees, fences, locations]);

  const counts = useMemo(() => {
    const c: Record<PresenceStatus, number> = { "on-site": 0, "in-office": 0, "in-transit": 0, "off-duty": 0, "offline": 0 };
    for (const p of presence) c[p.status]++;
    return c;
  }, [presence]);

  const [simEmpId, setSimEmpId] = useState<string>(employees[0]?.id || "");
  const [simFenceId, setSimFenceId] = useState<string>("");
  const [outsideFence, setOutsideFence] = useState(false);
  const [stationary, setStationary] = useState(true);

  function fireSimulatedPing() {
    const emp = employees.find((e) => e.id === simEmpId);
    if (!emp) return;
    const targetFence = fences.find((f) => f.id === (simFenceId || emp.assignedProjectId)) || fences.find((f) => f.id === "office");
    if (!targetFence) { toast.error("No geofence available"); return; }
    const lat = outsideFence ? targetFence.center.lat + 0.012 : targetFence.center.lat + (Math.random() - 0.5) * 0.0008;
    const lng = outsideFence ? targetFence.center.lng + 0.018 : targetFence.center.lng + (Math.random() - 0.5) * 0.0008;
    const newPing = {
      id: newId("ping"), employeeId: emp.id, lat, lng,
      accuracyM: 8 + Math.round(Math.random() * 6),
      timestamp: new Date().toISOString(),
      batteryPct: 30 + Math.round(Math.random() * 65),
      deviceState: stationary ? "stationary" as const : "active" as const,
    };
    const prev = locations.filter((p) => p.employeeId === emp.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-1)[0];
    const newPunches = autoPunchOnPing({ employeeId: emp.id, prevPing: prev, newPing, fences, newPunchId: () => newId("punch") });
    locationsStore.put(newPing);
    for (const p of newPunches) punchesStore.put(p);
    if (newPunches.length > 0) {
      const events = newPunches.map((p) => `${p.type.toUpperCase()} (${p.projectId || "office"})`).join(", ");
      toast.success(`Auto-detected ${newPunches.length} event${newPunches.length === 1 ? "" : "s"}: ${events}`);
    } else { toast.message(`Location ping recorded — no fence boundary crossed`); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Radar className="w-4 h-4 text-emerald-600" /> Live presence — auto-detected from mobile location stream <Badge variant="outline" className="text-[10px]">No manual punching</Badge></CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <PresenceCount icon={<MapPin className="w-4 h-4 text-emerald-600" />} label="On site" value={counts["on-site"]} />
            <PresenceCount icon={<Building2 className="w-4 h-4 text-blue-600" />} label="In office" value={counts["in-office"]} />
            <PresenceCount icon={<Truck className="w-4 h-4 text-amber-600" />} label="In transit" value={counts["in-transit"]} />
            <PresenceCount icon={<Coffee className="w-4 h-4 text-slate-500" />} label="Off duty" value={counts["off-duty"]} />
            <PresenceCount icon={<WifiOff className="w-4 h-4 text-red-600" />} label="Offline" value={counts["offline"]} />
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr><th className="text-left px-3 py-2">Employee</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Location</th><th className="text-left px-3 py-2">Last seen</th><th className="text-left px-3 py-2">Distance</th><th className="text-left px-3 py-2">Battery</th></tr>
              </thead>
              <tbody>
                {presence.map((p) => {
                  const emp = employees.find((e) => e.id === p.employeeId)!;
                  const fence = fences.find((f) => f.id === p.currentFenceId);
                  return (
                    <tr key={p.employeeId} className="border-t border-slate-100">
                      <td className="px-3 py-2"><div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback></Avatar><div><div className="font-medium">{emp.firstName} {emp.lastName}</div><div className="text-[10px] text-slate-500">{emp.jobTitle}</div></div></div></td>
                      <td className="px-3 py-2"><StatusPill status={p.status} /></td>
                      <td className="px-3 py-2 text-xs">{fence?.name || (p.lastLat ? `${p.lastLat.toFixed(4)}, ${p.lastLng?.toFixed(4)}` : "—")}</td>
                      <td className="px-3 py-2 text-xs tabular-nums">{p.lastSeen ? relativeTime(p.lastSeen) : "—"}</td>
                      <td className="px-3 py-2 text-xs">{p.metersFromFence !== undefined ? `${p.metersFromFence}m to nearest` : "—"}</td>
                      <td className="px-3 py-2 text-xs">{p.batteryPct !== undefined ? <span className="inline-flex items-center gap-1"><Battery className="w-3 h-3" />{p.batteryPct}%</span> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Smartphone className="w-4 h-4" /> Mobile-app location simulator <Badge variant="outline" className="text-[10px]">Stand-in until native app ships</Badge></CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3"><Label className="text-xs">Employee</Label>
            <Select value={simEmpId} onValueChange={setSimEmpId}>
              <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Pick employee" /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3"><Label className="text-xs">Move them to</Label>
            <Select value={simFenceId} onValueChange={setSimFenceId}>
              <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Auto: their assigned site" /></SelectTrigger>
              <SelectContent>{fences.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label className="text-xs">Outside fence?</Label>
            <div className="mt-1 flex items-center gap-2"><Switch checked={outsideFence} onCheckedChange={setOutsideFence} /><span className="text-xs">{outsideFence ? "GPS outside" : "GPS inside"}</span></div>
          </div>
          <div className="md:col-span-2"><Label className="text-xs">Stationary</Label>
            <div className="mt-1 flex items-center gap-2"><Switch checked={stationary} onCheckedChange={setStationary} /><span className="text-xs">{stationary ? "Stationary" : "Moving"}</span></div>
          </div>
          <div className="md:col-span-2 flex flex-col justify-end">
            <Button onClick={fireSimulatedPing} className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Send ping</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: PresenceStatus }) {
  const map: Record<PresenceStatus, { label: string; cls: string }> = {
    "on-site": { label: "On site", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    "in-office": { label: "In office", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    "in-transit": { label: "In transit", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    "off-duty": { label: "Off duty", cls: "bg-slate-100 text-slate-700 border-slate-200" },
    "offline": { label: "Offline", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const m = map[status];
  return <Badge className={`border ${m.cls}`}>{m.label}</Badge>;
}
function PresenceCount({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (<Card><CardContent className="p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">{icon}</div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold leading-tight">{value}</p></div></div></CardContent></Card>);
}
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}
