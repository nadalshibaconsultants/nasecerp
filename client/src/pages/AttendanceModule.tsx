/**
 * Attendance Module — store-driven, geofence-aware.
 *
 * Surfaces:
 *  - Punch simulator (mobile-app proxy)
 *  - Live "on site now" panel
 *  - Per-employee attendance summary for the current month
 *  - Per-project labor cost roll-up
 *  - Recent punches feed
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Activity, Users, Clock, MapPin, Building2, AlertTriangle, FileDown, Radar,
  RefreshCw, Loader2, CalendarDays, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useFirebaseAttendance } from "@/lib/attendance/firebase";
import type { AttendanceDay, AttendancePunch, Geofence } from "@/lib/attendance/types";
import type { User } from "@/lib/auth/types";
import type { Employee } from "@/lib/hr/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { employeesStore, geofencesStore, punchesStore, leavesStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { aggregateDays } from "@/lib/attendance/utils";
import { projectLaborCosts } from "@/lib/payroll/utils";
import OfficeSwitcher, { useActiveOffice } from "@/components/office/OfficeSwitcher";
import { OFFICES } from "@/lib/office/configs";

export default function AttendanceModule() {
  const { currentUser, hasRole } = useAuth();
  const firebaseAttendance = useFirebaseAttendance();
  const sourceEmployees = useCollection(employeesStore);
  const sourcePunches = useCollection(punchesStore);
  const geofences = useCollection(geofencesStore);
  const isAttendanceAdmin = hasRole("director", "hr-manager");
  const currentEmployee = useMemo(() => findAttendanceEmployee(currentUser, sourceEmployees), [currentUser, sourceEmployees]);
  const allEmployees = isAttendanceAdmin ? sourceEmployees : currentEmployee ? [currentEmployee] : [];
  const [office, setOffice] = useActiveOffice("all");
  const employees = isAttendanceAdmin && office !== "all" ? allEmployees.filter((e) => e.office === office) : allEmployees;
  const officeCounts = { all: allEmployees.length, dubai: allEmployees.filter((e) => e.office === "dubai").length, cairo: allEmployees.filter((e) => e.office === "cairo").length };
  const punches = isAttendanceAdmin ? sourcePunches : currentEmployee ? sourcePunches.filter((p) => p.employeeId === currentEmployee.id) : [];
  const leaves = useCollection(leavesStore);
  const activeByFence = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todays = punches.filter((p) => p.timestamp.startsWith(todayStr));
    const latestByEmp = new Map<string, typeof todays[number]>();
    for (const p of todays) {
      const ex = latestByEmp.get(p.employeeId);
      if (!ex || p.timestamp > ex.timestamp) latestByEmp.set(p.employeeId, p);
    }
    const map: Record<string, number> = {};
    for (const p of latestByEmp.values()) {
      if (p.type !== "in") continue;
      const fenceId = p.geofenceId || geofences.find((g) => g.projectId === p.projectId)?.id;
      if (fenceId) map[fenceId] = (map[fenceId] || 0) + 1;
    }
    return map;
  }, [punches, geofences]);
  const activeAtFence = (id: string) => activeByFence[id] || 0;

  const today = new Date();
  const year = today.getUTCFullYear();
  const monthIndex0 = today.getUTCMonth();
  const fromDate = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, monthIndex0 + 1, 0));
  const toDate = last.toISOString().slice(0, 10);
  const previousMonth = monthIndex0 === 0 ? { year: year - 1, monthIndex0: 11 } : { year, monthIndex0: monthIndex0 - 1 };
  const previousFromDate = `${previousMonth.year}-${String(previousMonth.monthIndex0 + 1).padStart(2, "0")}-01`;
  const previousLast = new Date(Date.UTC(previousMonth.year, previousMonth.monthIndex0 + 1, 0));
  const previousToDate = previousLast.toISOString().slice(0, 10);

  const [filterProj, setFilterProj] = useState<string>("all");
  const [search, setSearch] = useState("");
  const firebaseProjectOptions = firebaseAttendance.status?.projectOptions ?? [];
  const firebaseEmployeeSiteMap = firebaseAttendance.status?.employeeSiteMap ?? {};
  const siteOptions = useMemo(() => buildSiteOptions(geofences, punches, firebaseProjectOptions), [geofences, punches, firebaseProjectOptions]);

  const days = useMemo(() => aggregateDays({
    punches, employeeIds: employees.map((e) => e.id),
    fromDate, toDate, leaves,
  }), [punches, employees, fromDate, toDate, leaves]);
  const previousDays = useMemo(() => aggregateDays({
    punches, employeeIds: employees.map((e) => e.id),
    fromDate: previousFromDate, toDate: previousToDate, leaves,
  }), [punches, employees, previousFromDate, previousToDate, leaves]);

  const onSiteNow = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todays = punches.filter((p) => p.timestamp.startsWith(todayStr));
    const lastByEmp = new Map<string, typeof todays[number]>();
    for (const p of todays) {
      const ex = lastByEmp.get(p.employeeId);
      if (!ex || p.timestamp > ex.timestamp) lastByEmp.set(p.employeeId, p);
    }
    return Array.from(lastByEmp.values()).filter((p) => p.type === "in");
  }, [punches]);

  const projectCosts = useMemo(() => projectLaborCosts({
    employees, days, year, monthIndex0,
  }), [employees, days, year, monthIndex0]);

  // Employees matching the search box (name / staff ID) + site filter.
  // Shared by the live presence table AND the per-employee summary so the
  // filters act on the whole page consistently.
  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      const employeeSearchText = [
        e.id,
        e.code,
        e.firstName,
        e.lastName,
        `${e.firstName} ${e.lastName}`,
      ].join(" ").toLowerCase();
      if (q && !employeeSearchText.includes(q)) return false;
      if (filterProj === "all") return true;
      const myPunches = punches.filter((p) => p.employeeId === e.id);
      const firebaseSites = firebaseEmployeeSiteMap[e.id] ?? [];
      return e.assignedProjectId === filterProj
        || myPunches.some((p) => p.projectId === filterProj || p.geofenceId === filterProj || firebaseSiteFromNote(p.note) === filterProj)
        || firebaseSites.includes(filterProj);
    });
  }, [employees, punches, search, filterProj, firebaseEmployeeSiteMap]);

  const empSummary = useMemo(() => {
    return filteredEmployees.map((e) => {
      const myDays = days.filter((d) => d.employeeId === e.id);
      const present = myDays.filter((d) => d.status === "present" || d.status === "partial").length;
      const absent = myDays.filter((d) => d.status === "absent").length;
      const leaveD = myDays.filter((d) => d.status === "leave").length;
      const totalMin = myDays.reduce((a, d) => a + d.normalMinutes, 0);
      const otMin = myDays.reduce((a, d) => a + d.overtimeMinutes, 0);
      const flags = myDays.flatMap((d) => d.flags);
      const lastPunch = punches.filter((p) => p.employeeId === e.id).slice(-1)[0];
      const myPunches = punches.filter((p) => p.employeeId === e.id);
      return { employee: e, present, absent, leave: leaveD, totalMin, otMin, flags, lastPunch, myPunches };
    });
  }, [filteredEmployees, days, punches]);

  const recent = useMemo(() => [...punches].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 12), [punches]);
  const dailyRows = useMemo(() => [...days].sort((a, b) => b.date.localeCompare(a.date)).slice(0, isAttendanceAdmin ? 60 : days.length), [days, isAttendanceAdmin]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance & Site Tracking</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Auto-detected from mobile location stream. Drives payroll, labor cost, and reports — UAE Mon–Fri or Egyptian Sun–Thu calendar applied per employee.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FirebaseSyncButton isAttendanceAdmin={isAttendanceAdmin} onSynced={() => punchesStore.refresh?.()} />
          <Button variant="outline" size="sm" className="gap-1.5"><FileDown className="w-3.5 h-3.5" /> Export month</Button>
        </div>
      </div>

      {isAttendanceAdmin && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi icon={<Users className="w-4 h-4 text-emerald-600" />} label="On site now" value={String(onSiteNow.length)} />
            <Kpi icon={<Clock className="w-4 h-4 text-blue-600" />} label="Hours this month" value={`${Math.round(days.reduce((a, d) => a + d.normalMinutes, 0) / 60).toLocaleString()}`} />
            <Kpi icon={<Activity className="w-4 h-4 text-amber-600" />} label="Overtime hours" value={`${Math.round(days.reduce((a, d) => a + d.overtimeMinutes, 0) / 60)}`} />
            <Kpi icon={<AlertTriangle className="w-4 h-4 text-red-600" />} label="Out-of-fence punches" value={String(punches.filter((p) => p.geofenceCheck === "failed-out").length)} />
            <Kpi icon={<Building2 className="w-4 h-4 text-purple-600" />} label="Active geofences" value={String(geofences.length)} />
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-3 flex flex-wrap gap-2 items-center">
              <Input className="h-9 w-64" placeholder="Search employee by ID or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={filterProj} onValueChange={setFilterProj}>
                <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Site / project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sites</SelectItem>
                  {siteOptions.map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </>
      )}


      {!isAttendanceAdmin && (
        <SelfAttendanceView
          currentUser={currentUser}
          employee={currentEmployee}
          days={days}
          previousDays={previousDays}
          punches={punches}
          geofences={geofences}
          monthLabel={monthLabel(year, monthIndex0)}
          previousMonthLabel={monthLabel(previousMonth.year, previousMonth.monthIndex0)}
        />
      )}

      {isAttendanceAdmin && (
        <>
      <PunchPresence employees={filteredEmployees} punches={punches} geofences={geofences} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Employee summaries */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Per-employee summary · {monthLabel(year, monthIndex0)}</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr><th className="text-left px-3 py-2">Employee</th><th className="text-left px-3 py-2">Site</th><th className="text-right px-3 py-2">Days P/A/L</th><th className="text-right px-3 py-2">Hours / OT</th><th className="text-left px-3 py-2">Last punch</th><th className="text-left px-3 py-2">Flags</th></tr>
              </thead>
              <tbody>
                {empSummary.map(({ employee, present, absent, leave, totalMin, otMin, flags, myPunches }) => (
                  <tr key={employee.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback></Avatar>
                        <span>{employee.firstName} {employee.lastName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{employee.assignedProjectId || "office"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{present} / {absent} / {leave}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{(totalMin / 60).toFixed(1)}h / {(otMin / 60).toFixed(1)}h</td>
                    <td className="px-3 py-2 text-xs"><LastPunchCell punches={myPunches} /></td>
                    <td className="px-3 py-2 space-x-1">
                      {Array.from(new Set(flags)).slice(0, 3).map((f) => (
                        <Badge key={f} variant="outline" className="text-[10px] capitalize">{f.replace("-", " ")}</Badge>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Per-project labor cost */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Project labor cost · {monthLabel(year, monthIndex0)}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {projectCosts.length === 0 && <p className="text-xs text-slate-500">No project labor cost yet this month.</p>}
            {projectCosts.map((p) => {
              const fence = geofences.find((g) => g.projectId === p.projectId);
              return (
                <div key={p.projectId} className="p-2 border border-slate-200 rounded">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium truncate">{fence?.name || p.projectId}</div>
                    <Badge variant="outline" className="text-[10px]">{p.totalHours.toFixed(0)}h</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 tabular-nums">AED {p.totalLaborCostAED.toLocaleString()} cost-to-date</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>


      {/* Geofence Zones — per-site active count */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Radar className="w-4 h-4" /> Geofence Zones</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {geofences.map((g) => {
            const insideCount = activeAtFence(g.id);
            const isActive = insideCount > 0;
            return (
              <div key={g.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{g.name}</div>
                    <div className="text-xs text-slate-500">Radius: {g.radiusM}m</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm tabular-nums text-slate-700">{insideCount} active</span>
                  <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <DailyAttendanceTable days={dailyRows} employees={employees} punches={punches} title={`Daily check-in / check-out · ${monthLabel(year, monthIndex0)}`} />

      {/* Recent punches */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> Recent punches</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="text-left px-3 py-1.5">When</th><th className="text-left px-3 py-1.5">Employee</th><th className="text-left px-3 py-1.5">Project</th><th className="text-left px-3 py-1.5">Type</th><th className="text-left px-3 py-1.5">Check</th><th className="text-left px-3 py-1.5">Device</th></tr>
            </thead>
            <tbody>
              {recent.map((p) => {
                const emp = employees.find((e) => e.id === p.employeeId);
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 tabular-nums">{new Date(p.timestamp).toLocaleString("en-GB", { timeZone: "UTC", hour12: true })}</td>
                    <td className="px-3 py-1.5">{emp ? `${emp.firstName} ${emp.lastName}` : p.employeeId}</td>
                    <td className="px-3 py-1.5 font-mono">{p.projectId || "office"}</td>
                    <td className="px-3 py-1.5 capitalize">{p.type}</td>
                    <td className="px-3 py-1.5">
                      <Badge variant="outline" className={`text-[10px] capitalize ${p.geofenceCheck === "failed-out" ? "border-red-300 text-red-700" : p.geofenceCheck === "manual-override" ? "border-amber-300 text-amber-700" : ""}`}>{p.geofenceCheck.replace("-", " ")}</Badge>
                    </td>
                    <td className="px-3 py-1.5">{p.device || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}

function SelfAttendanceView({
  currentUser, employee, days, previousDays, punches, geofences, monthLabel, previousMonthLabel,
}: {
  currentUser?: User;
  employee?: Employee;
  days: AttendanceDay[];
  previousDays: AttendanceDay[];
  punches: AttendancePunch[];
  geofences: Geofence[];
  monthLabel: string;
  previousMonthLabel: string;
}) {
  if (!employee) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="text-sm font-semibold text-amber-950">Attendance profile is not linked</div>
          <p className="text-sm text-amber-900 mt-1">
            {currentUser?.displayName || "This user"} is signed in, but the ERP user does not match a Firebase attendance employee yet.
          </p>
          <p className="text-xs text-amber-800 mt-2">Link by Firebase UID, email, or exact display name so this user can see only their own attendance.</p>
        </CardContent>
      </Card>
    );
  }

  const present = days.filter((d) => d.status === "present" || d.status === "partial").length;
  const offDays = days.filter((d) => d.status === "weekend" || d.status === "holiday" || d.status === "leave").length;
  const absent = days.filter((d) => d.status === "absent").length;
  const currentHours = days.reduce((a, d) => a + d.normalMinutes + d.overtimeMinutes, 0) / 60;
  const previousHours = previousDays.reduce((a, d) => a + d.normalMinutes + d.overtimeMinutes, 0) / 60;
  const latestPunch = [...punches].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10"><AvatarFallback>{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback></Avatar>
            <div>
              <div className="font-semibold">{employee.firstName} {employee.lastName}</div>
              <div className="text-xs text-muted-foreground">{employee.jobTitle} · {employee.code}</div>
            </div>
          </div>
          <Badge variant="outline" className="w-fit">{latestPunch ? `Last ${latestPunch.type}: ${formatDateTime(latestPunch.timestamp)}` : "No punches yet"}</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi icon={<CalendarDays className="w-4 h-4 text-emerald-600" />} label="Present days" value={String(present)} />
        <Kpi icon={<Clock className="w-4 h-4 text-blue-600" />} label="Hours this month" value={`${currentHours.toFixed(1)}h`} />
        <Kpi icon={<Activity className="w-4 h-4 text-amber-600" />} label="Previous month" value={`${previousHours.toFixed(1)}h`} />
        <Kpi icon={<Building2 className="w-4 h-4 text-slate-600" />} label="Off days" value={String(offDays)} />
        <Kpi icon={<AlertTriangle className="w-4 h-4 text-red-600" />} label="Absent days" value={String(absent)} />
      </div>

      <DailyAttendanceTable days={days} employees={[employee]} punches={punches} title={`My attendance · ${monthLabel}`} />
      <DailyAttendanceTable days={previousDays} employees={[employee]} punches={punches} title={`Previous month · ${previousMonthLabel}`} compact />
      <PunchTable punches={[...punches].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20)} employees={[employee]} geofences={geofences} title="My app activity" />
    </div>
  );
}

function PunchPresence({ employees, punches, geofences }: { employees: Employee[]; punches: AttendancePunch[]; geofences: Geofence[] }) {
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string | null>(null);
  const historyEmployee = employees.find((employee) => employee.id === historyEmployeeId);
  const historyPunches = historyEmployee ? punches.filter((p) => p.employeeId === historyEmployee.id) : [];
  const rows = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return employees.map((employee) => {
      const myPunches = punches.filter((p) => p.employeeId === employee.id);
      const latest = [...myPunches].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      const site = latest ? geofences.find((g) => g.id === latest.geofenceId || g.projectId === latest.projectId) : undefined;
      const isToday = latest?.timestamp.startsWith(todayStr) ?? false;
      const online = isToday && latest?.type === "in";
      const checkedOut = isToday && latest?.type === "out";
      return { employee, latest, myPunches, site, online, checkedOut };
    }).sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return (b.latest?.timestamp || "").localeCompare(a.latest?.timestamp || "");
    });
  }, [employees, punches, geofences]);

  const onlineCount = rows.filter((r) => r.online).length;

  return (
    <>
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Radar className="w-4 h-4 text-emerald-600" /> Live attendance from Firebase punches
          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">{onlineCount} on site now</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="text-left px-3 py-1.5">Employee</th><th className="text-left px-3 py-1.5">Status</th><th className="text-left px-3 py-1.5">Last punch</th><th className="text-left px-3 py-1.5">Site</th><th className="text-right px-3 py-1.5">Details</th></tr>
          </thead>
          <tbody>
            {rows.map(({ employee, latest, myPunches, site, online, checkedOut }) => (
              <tr key={employee.id} className="border-t border-slate-100">
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback></Avatar>
                    <div>
                      <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                      <div className="text-[10px] text-slate-500">{employee.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <Badge variant="outline" className={online ? "text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50" : checkedOut ? "text-[10px] border-slate-300 text-slate-700" : "text-[10px] border-amber-300 text-amber-700 bg-amber-50"}>
                    {online ? "Online" : checkedOut ? "Checked out" : "No punch today"}
                  </Badge>
                </td>
                <td className="px-3 py-1.5"><LastPunchCell punches={myPunches} /></td>
                <td className="px-3 py-1.5">{site?.name || latest?.projectId || "office"}</td>
                <td className="px-3 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Open attendance history"
                    onClick={() => setHistoryEmployeeId(employee.id)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
    <EmployeeAttendanceHistoryDialog
      employee={historyEmployee}
      punches={historyPunches}
      geofences={geofences}
      open={!!historyEmployee}
      onOpenChange={(open) => !open && setHistoryEmployeeId(null)}
    />
    </>
  );
}

function EmployeeAttendanceHistoryDialog({
  employee, punches, geofences, open, onOpenChange,
}: {
  employee?: Employee;
  punches: AttendancePunch[];
  geofences: Geofence[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const monthIndex0 = now.getUTCMonth();
  const monthStart = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-01`;
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const todayKey = now.toISOString().slice(0, 10);
  const monthPunches = punches.filter((p) => p.timestamp >= monthStart && p.timestamp.slice(0, 7) === monthStart.slice(0, 7));
  const punchDates = new Set(monthPunches.map((p) => p.timestamp.slice(0, 10)));
  const present = punchDates.size;
  const late = Array.from(punchDates).filter((date) => isLateDay(monthPunches, date)).length;
  const absent = Array.from({ length: Math.min(daysInMonth, now.getUTCDate()) }, (_, i) => `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`)
    .filter((date) => !isWeekendUTC(date) && !punchDates.has(date)).length;
  const rate = present + absent > 0 ? Math.round((present / (present + absent)) * 100) : 0;
  const todayPunches = monthPunches.filter((p) => p.timestamp.startsWith(todayKey)).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const checkIn = todayPunches.find((p) => p.type === "in");
  const checkOut = [...todayPunches].reverse().find((p) => p.type === "out");
  const site = checkIn ? geofences.find((g) => g.id === checkIn.geofenceId || g.projectId === checkIn.projectId) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <div className="bg-slate-950 text-white px-6 py-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Attendance History</DialogTitle>
            <DialogDescription className="text-slate-300">
              {employee ? `${employee.firstName} ${employee.lastName} · ${employee.code}` : "Employee"} · {monthLabel(year, monthIndex0)}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-4 bg-slate-50">
          <div className="grid grid-cols-4 gap-0 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <HistoryStat value={String(present)} label="Present" cls="text-emerald-600" />
            <HistoryStat value={String(late)} label="Late" />
            <HistoryStat value={String(absent)} label="Absent" cls="text-red-600" />
            <HistoryStat value={`${rate}%`} label="Rate" />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-center gap-2">
                <CalendarDays className="w-4 h-4" /> {monthLabel(year, monthIndex0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className={day === "Sun" || day === "Sat" ? "text-red-500 font-semibold" : "font-semibold"}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2 text-center">
                {calendarCells(year, monthIndex0).map((cell, index) => {
                  const date = cell ? `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(cell).padStart(2, "0")}` : "";
                  const hasPunch = date ? punchDates.has(date) : false;
                  const isToday = date === todayKey;
                  const lateDay = date ? isLateDay(monthPunches, date) : false;
                  return (
                    <div
                      key={index}
                      className={[
                        "h-9 flex items-center justify-center rounded-full text-sm tabular-nums",
                        !cell ? "text-transparent" : isToday ? "bg-slate-950 text-white font-semibold" : hasPunch ? lateDay ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700" : "text-slate-400",
                      ].join(" ")}
                    >
                      {cell || "."}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 mt-4">
                <LegendDot cls="bg-emerald-500" label="On time" />
                <LegendDot cls="bg-amber-500" label="Late" />
                <LegendDot cls="bg-slate-950" label="Today" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}</div>
                  <div className="text-sm text-slate-500">{checkIn ? (isLateDay(monthPunches, todayKey) ? "Late arrival" : "On time") : "No check-in yet"}{site ? ` · ${site.name}` : ""}</div>
                </div>
                <Badge variant="outline" className={checkIn && isLateDay(monthPunches, todayKey) ? "border-amber-300 text-amber-700" : "border-emerald-300 text-emerald-700"}>
                  {checkIn ? (isLateDay(monthPunches, todayKey) ? "Late" : "On time") : "No punch"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 items-center gap-3 mt-4">
                <div>
                  <div className="text-xl font-bold text-emerald-600">{checkIn ? timeOnly(checkIn.timestamp) : "—"}</div>
                  <div className="text-xs text-slate-500">Check In</div>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-slate-50">{checkIn && checkOut ? durationBetween(checkIn.timestamp, checkOut.timestamp) : "—"}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">{checkOut ? timeOnly(checkOut.timestamp) : "—"}</div>
                  <div className="text-xs text-slate-500">Check Out</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoryStat({ value, label, cls = "text-slate-950" }: { value: string; label: string; cls?: string }) {
  return (
    <div className="p-4 text-center border-r last:border-r-0 border-slate-100">
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function LegendDot({ cls, label }: { cls: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${cls}`} />{label}</span>;
}

function calendarCells(year: number, monthIndex0: number): Array<number | null> {
  const firstDay = new Date(Date.UTC(year, monthIndex0, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  return [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
}

function isWeekendUTC(date: string): boolean {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
}

function isLateDay(punches: AttendancePunch[], date: string): boolean {
  const firstIn = punches.filter((p) => p.type === "in" && p.timestamp.startsWith(date)).sort((a, b) => a.timestamp.localeCompare(b.timestamp))[0];
  if (!firstIn) return false;
  const d = new Date(firstIn.timestamp);
  return d.getUTCHours() > 9 || (d.getUTCHours() === 9 && d.getUTCMinutes() > 15);
}

function durationBetween(startIso: string, endIso: string): string {
  const minutes = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DailyAttendanceTable({
  days, employees, punches, title, compact = false,
}: {
  days: AttendanceDay[];
  employees: Employee[];
  punches: AttendancePunch[];
  title: string;
  compact?: boolean;
}) {
  const visibleDays = compact ? days.slice(0, 12) : days;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> {title}</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="text-left px-3 py-1.5">Date</th><th className="text-left px-3 py-1.5">Employee</th><th className="text-left px-3 py-1.5">Check in</th><th className="text-left px-3 py-1.5">Check out</th><th className="text-right px-3 py-1.5">Hours</th><th className="text-left px-3 py-1.5">Status</th><th className="text-left px-3 py-1.5">Off / flags</th></tr>
          </thead>
          <tbody>
            {visibleDays.map((d) => {
              const emp = employees.find((e) => e.id === d.employeeId);
              const dayPunches = punches.filter((p) => p.employeeId === d.employeeId && p.timestamp.startsWith(d.date));
              return (
                <tr key={`${d.employeeId}-${d.date}`} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 tabular-nums">{d.date}</td>
                  <td className="px-3 py-1.5">{emp ? `${emp.firstName} ${emp.lastName}` : d.employeeId}</td>
                  <td className="px-3 py-1.5 tabular-nums">{d.firstIn ? timeOnly(d.firstIn) : firstPunchTime(dayPunches, "in")}</td>
                  <td className="px-3 py-1.5 tabular-nums">{d.lastOut ? timeOnly(d.lastOut) : firstPunchTime(dayPunches, "out")}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{(d.totalMinutes / 60).toFixed(1)}</td>
                  <td className="px-3 py-1.5 capitalize">{d.status}</td>
                  <td className="px-3 py-1.5 space-x-1">{dayLabels(d).map((label) => <Badge key={label} variant="outline" className="text-[10px] capitalize">{label}</Badge>)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function PunchTable({ punches, employees, geofences, title }: { punches: AttendancePunch[]; employees: Employee[]; geofences: Geofence[]; title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> {title}</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="text-left px-3 py-1.5">When</th><th className="text-left px-3 py-1.5">Employee</th><th className="text-left px-3 py-1.5">Site</th><th className="text-left px-3 py-1.5">Type</th><th className="text-left px-3 py-1.5">Check</th><th className="text-left px-3 py-1.5">Device</th></tr>
          </thead>
          <tbody>
            {punches.map((p) => {
              const emp = employees.find((e) => e.id === p.employeeId);
              const site = geofences.find((g) => g.projectId === p.projectId || g.id === p.projectId);
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 tabular-nums">{formatDateTime(p.timestamp)}</td>
                  <td className="px-3 py-1.5">{emp ? `${emp.firstName} ${emp.lastName}` : p.employeeId}</td>
                  <td className="px-3 py-1.5">{site?.name || p.projectId || "office"}</td>
                  <td className="px-3 py-1.5 capitalize">{p.type}</td>
                  <td className="px-3 py-1.5"><Badge variant="outline" className={`text-[10px] capitalize ${p.geofenceCheck === "failed-out" ? "border-red-300 text-red-700" : ""}`}>{p.geofenceCheck.replace("-", " ")}</Badge></td>
                  <td className="px-3 py-1.5">{p.device || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">{icon}</div>
          <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-base font-bold leading-tight">{value}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}

function monthLabel(year: number, monthIndex0: number): string {
  return new Date(Date.UTC(year, monthIndex0, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function findAttendanceEmployee(currentUser: User | undefined, employees: Employee[]): Employee | undefined {
  if (!currentUser) return undefined;
  const candidates = [
    currentUser.employeeId,
    currentUser.username,
    currentUser.displayName,
  ].filter(Boolean).map((v) => normalizeIdentity(v));

  return employees.find((employee) => {
    const employeeValues = [
      employee.id,
      employee.email,
      employee.code,
      `${employee.firstName} ${employee.lastName}`,
    ].map((v) => normalizeIdentity(v));
    return candidates.some((candidate) => employeeValues.includes(candidate));
  });
}

function normalizeIdentity(value: unknown): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildSiteOptions(geofences: Geofence[], punches: AttendancePunch[], firebaseOptions: { id: string; name: string }[] = []): { id: string; name: string }[] {
  const sites = new Map<string, string>();
  for (const option of firebaseOptions) {
    if (option.id) sites.set(option.id, option.name || option.id);
  }
  for (const geofence of geofences) {
    if (geofence.projectId) sites.set(geofence.projectId, geofence.name || geofence.projectId);
  }
  for (const punch of punches) {
    if (punch.projectId && !sites.has(punch.projectId)) sites.set(punch.projectId, punch.projectId);
    const firebaseSite = firebaseSiteFromNote(punch.note);
    if (firebaseSite && !sites.has(firebaseSite)) sites.set(firebaseSite, firebaseSite);
  }
  return Array.from(sites.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function firebaseSiteFromNote(note?: string): string | undefined {
  const match = String(note || "").match(/Site:\s*([^·]+)/i);
  return match?.[1]?.trim() || undefined;
}

function dayLabels(day: AttendanceDay): string[] {
  const labels = [...day.flags.map((f) => f.replace("-", " "))];
  if (day.status === "weekend" || day.status === "holiday" || day.status === "leave") labels.unshift(day.status);
  if (day.status === "absent") labels.unshift("absent");
  return labels.length > 0 ? labels : ["clear"];
}

function firstPunchTime(punches: AttendancePunch[], type: "in" | "out"): string {
  const punch = punches.filter((p) => p.type === type).sort((a, b) => a.timestamp.localeCompare(b.timestamp))[0];
  return punch ? timeOnly(punch.timestamp) : "—";
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: true });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", hour12: true });
}

function formatDateShort(isoDay: string): string {
  return new Date(isoDay + "T00:00:00Z").toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// Summary of the most recent punch day: first IN, last OUT and total worked
// minutes (sum of closed in→out windows) — feeds the "Last punch" cells.
function lastPunchSummary(punches: AttendancePunch[]): { date: string; firstIn?: AttendancePunch; lastOut?: AttendancePunch; totalMin: number } | null {
  if (!punches.length) return null;
  const sorted = [...punches].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const day = sorted[sorted.length - 1].timestamp.slice(0, 10);
  const dayPunches = sorted.filter((p) => p.timestamp.startsWith(day));
  let firstIn: AttendancePunch | undefined;
  let lastOut: AttendancePunch | undefined;
  let open: AttendancePunch | null = null;
  let totalMin = 0;
  for (const p of dayPunches) {
    if (p.type === "in") {
      if (!firstIn) firstIn = p;
      if (!open) open = p;
    } else {
      lastOut = p;
      if (open) {
        totalMin += (new Date(p.timestamp).getTime() - new Date(open.timestamp).getTime()) / 60_000;
        open = null;
      }
    }
  }
  return { date: day, firstIn, lastOut, totalMin: Math.max(0, Math.round(totalMin)) };
}

// Shared renderer for the "Last punch" cells: IN + OUT of the latest punch
// day, plus the worked total once the employee has punched out.
function LastPunchCell({ punches }: { punches: AttendancePunch[] }) {
  const s = lastPunchSummary(punches);
  if (!s || (!s.firstIn && !s.lastOut)) return <>—</>;
  return (
    <div className="leading-tight">
      <div className="text-[10px] text-slate-500">{formatDateShort(s.date)}</div>
      <div className="tabular-nums">
        {s.firstIn && <span className="text-emerald-700">IN {formatTime(s.firstIn.timestamp)}</span>}
        {s.firstIn && s.lastOut && <span className="text-slate-400"> · </span>}
        {s.lastOut && <span className="text-slate-700">OUT {formatTime(s.lastOut.timestamp)}</span>}
      </div>
      {s.lastOut && s.totalMin > 0 && (
        <div className="text-[10px] text-slate-500">Total {formatDuration(s.totalMin)}</div>
      )}
    </div>
  );
}

/**
 * Firebase "Sync now" header button — pulls the latest punches from the RTDB
 * into the ERP, then refreshes the table. Disabled until the server reports
 * the Firebase source as connected; result is reported via toast.
 */
function FirebaseSyncButton({ isAttendanceAdmin, onSynced }: { isAttendanceAdmin: boolean; onSynced?: () => void }) {
  const { status, loading, syncing, error, sync } = useFirebaseAttendance();
  const connected = !!status?.connected;

  const handleSync = async () => {
    const res = await sync();
    if (res) {
      toast.success(`Imported ${res.inserted} new punch(es) · ${res.unmatched} unmatched staff · ${res.read} read`);
      onSynced?.();
    } else {
      toast.error(error || status?.reason || "Firebase sync failed");
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5"
      disabled={!isAttendanceAdmin || !connected || syncing || loading}
      onClick={handleSync}
      title={isAttendanceAdmin ? (connected ? "Pull the latest punches from Firebase into the ERP" : "Firebase not connected") : "Only Director and HR can sync company attendance"}
    >
      {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
      {syncing ? "Syncing…" : "Sync now"}
    </Button>
  );
}
