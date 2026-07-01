/**
 * PunchSimulator — simulates the geofence-based mobile-app punch flow.
 *
 * Until the native mobile app is built, HR/PMs can use this to record punches
 * and see the downstream effects across HR, payroll, project labor cost.
 *
 * Inputs:
 *  - Employee
 *  - Project (geofence target) — defaults to the employee's assigned project
 *  - "I'm at the site" toggle — emulates GPS being inside the fence
 *  - Override approval (PM-approved offline punch)
 *
 * Output: appends to punchesStore.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LogIn, LogOut, Smartphone, MapPin, ShieldAlert } from "lucide-react";
import { employeesStore, geofencesStore, punchesStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { isInsideGeofence, distanceMeters } from "@/lib/attendance/utils";
import type { AttendancePunch } from "@/lib/attendance/types";

export default function PunchSimulator() {
  const employees = useCollection(employeesStore);
  const geofences = useCollection(geofencesStore);
  const punches = useCollection(punchesStore);

  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id || "");
  const [projectId, setProjectId] = useState<string>("");
  const [atSite, setAtSite] = useState(true);
  const [override, setOverride] = useState(false);
  const [note, setNote] = useState("");

  const selectedEmployee = useMemo(() => employees.find((e) => e.id === employeeId), [employees, employeeId]);
  const effectiveProjectId = projectId || selectedEmployee?.assignedProjectId || "";
  const fence = useMemo(() => geofences.find((g) => g.projectId === effectiveProjectId) || geofences.find((g) => g.projectId === "office"), [geofences, effectiveProjectId]);
  const currentlyIn = useMemo(() => {
    if (!employeeId) return false;
    const my = punches.filter((p) => p.employeeId === employeeId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return my.length > 0 && my[my.length - 1].type === "in";
  }, [punches, employeeId]);

  function doPunch(type: "in" | "out") {
    if (!selectedEmployee || !fence) {
      toast.error("Pick employee and project");
      return;
    }
    // Simulate GPS — inside fence near center, otherwise far away
    const lat = atSite ? fence.center.lat + (Math.random() - 0.5) * 0.0008 : fence.center.lat + 0.005;
    const lng = atSite ? fence.center.lng + (Math.random() - 0.5) * 0.0008 : fence.center.lng + 0.005;
    const accuracy = 8 + Math.round(Math.random() * 6);
    const inside = isInsideGeofence(fence, lat, lng, accuracy);
    const dist = Math.round(distanceMeters(fence.center.lat, fence.center.lng, lat, lng));

    if (!inside && !override) {
      toast.error(`Outside ${fence.name} (${dist}m from centre, fence ${fence.radiusM}m). Toggle override or move closer.`);
      return;
    }

    const punch: AttendancePunch = {
      id: newId("punch"),
      employeeId: selectedEmployee.id,
      projectId: effectiveProjectId === "office" ? undefined : effectiveProjectId,
      timestamp: new Date().toISOString(),
      type,
      gpsLat: lat, gpsLng: lng, accuracyM: accuracy,
      geofenceCheck: effectiveProjectId === "office" ? "office" : (inside ? "passed" : (override ? "manual-override" : "failed-out")),
      note: note || undefined,
      device: "web-simulator",
    };
    punchesStore.put(punch);
    setNote("");
    toast.success(`Punched ${type.toUpperCase()} for ${selectedEmployee.firstName} at ${fence.name}${override && !inside ? " (PM override)" : ""}`);
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Smartphone className="w-4 h-4" /> Mobile-app punch simulator <Badge variant="outline" className="text-[10px]">Stand-in until native app ships</Badge></CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-3">
          <Label className="text-xs">Employee</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Pick employee" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.code}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <Label className="text-xs">Project (geofence)</Label>
          <Select value={effectiveProjectId} onValueChange={setProjectId}>
            <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Auto-pick from employee" /></SelectTrigger>
            <SelectContent>{geofences.map((g) => <SelectItem key={g.projectId} value={g.projectId}>{g.name} · {g.radiusM}m</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> At the site</Label>
          <div className="mt-1 flex items-center gap-2"><Switch checked={atSite} onCheckedChange={setAtSite} /><span className="text-xs">{atSite ? "GPS inside fence" : "GPS outside fence"}</span></div>
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> PM override</Label>
          <div className="mt-1 flex items-center gap-2"><Switch checked={override} onCheckedChange={setOverride} /><span className="text-xs">{override ? "Approved offline" : "Off"}</span></div>
        </div>
        <div className="md:col-span-2 flex flex-col justify-end">
          {!currentlyIn ? (
            <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => doPunch("in")}><LogIn className="w-3.5 h-3.5" /> Punch IN</Button>
          ) : (
            <Button className="gap-1.5 bg-orange-600 hover:bg-orange-700" onClick={() => doPunch("out")}><LogOut className="w-3.5 h-3.5" /> Punch OUT</Button>
          )}
        </div>
        <div className="md:col-span-12">
          <Label className="text-xs">Note (optional)</Label>
          <Textarea rows={2} className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Late arrival — traffic on SZR" />
        </div>
      </CardContent>
    </Card>
  );
}
