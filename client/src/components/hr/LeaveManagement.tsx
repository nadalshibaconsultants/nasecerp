import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plane, Plus, Check, X, CalendarDays, Clock, Heart, Baby, BookOpen, Users, Pencil } from "lucide-react";
import { employeesStore, leavesStore, leaveHandoversStore, auditStore } from "@/lib/stores";
import HandoverDialog from "./HandoverDialog";
import { useCollection, newId } from "@/lib/store";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import { ENTITLEMENT_DAYS, leaveBalance, daysBetween, type LeaveType } from "@/lib/hr/leave-utils";
import type { LeaveRequest } from "@/lib/attendance/types";
import type { Employee } from "@/lib/hr/types";
import { apiFetch } from "@/lib/backend/api";

export default function LeaveManagement() {
  const actor = useCurrentActor();
  const employees = useCollection(employeesStore);
  const leaves = useCollection(leavesStore);
  const handovers = useCollection(leaveHandoversStore);
  useCollection(auditStore);

  // DB-stored entitlements keyed by employeeId -> leaveType -> days
  const [dbEntitlements, setDbEntitlements] = useState<Record<string, Record<string, number>>>({});
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [editAnnual, setEditAnnual] = useState("");
  const [editSick, setEditSick] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const isHR = actor?.role === "director" || actor?.role === "hr-manager";
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!isHR) return;
    apiFetch(`/hr/leaves/balances?year=${currentYear}`)
      .then((rows: any[]) => {
        const map: Record<string, Record<string, number>> = {};
        for (const r of rows) {
          if (!map[r.employeeId]) map[r.employeeId] = {};
          map[r.employeeId][r.leaveType] = Number(r.entitlement);
        }
        setDbEntitlements(map);
      })
      .catch(() => {});
  }, [leaves.length, isHR]);

  function openEdit(e: Employee) {
    const ent = dbEntitlements[e.id] || {};
    const b = leaveBalance(e, []);
    setEditAnnual(String(ent.annual !== undefined ? ent.annual : b.annual.entitled));
    setEditSick(String(ent.sick !== undefined ? ent.sick : b.sick.entitled));
    setEditTarget(e);
  }

  async function saveBalance() {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await apiFetch(`/hr/leaves/balances/${editTarget.id}?year=${currentYear}`, {
        method: "PUT",
        body: { annual: Number(editAnnual), sick: Number(editSick) },
      });
      setDbEntitlements((prev) => ({
        ...prev,
        [editTarget.id]: { ...(prev[editTarget.id] || {}), annual: Number(editAnnual), sick: Number(editSick) },
      }));
      toast.success("Leave balance updated");
      setEditTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Could not save balance");
    } finally {
      setEditSaving(false);
    }
  }

  const [reqOpen, setReqOpen] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<{ leave: LeaveRequest; employee: Employee } | null>(null);
  const [empId, setEmpId] = useState<string>(employees[0]?.id || "");
  const [type, setType] = useState<LeaveType>("annual");
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reqNote, setReqNote] = useState("");
  const [permStart, setPermStart] = useState("16:30");
  const [permEnd, setPermEnd] = useState("18:30");
  const [effectiveDate, setEffectiveDate] = useState("");
  useEffect(() => {
    if (type === "permission") return;
    setEffectiveDate(nextDay(toDate));
  }, [toDate, type]);

  async function submit() {
    const employeeId = empId || employees[0]?.id;
    if (!employeeId) { toast.error("Pick an employee"); return; }
    try {
      await apiFetch("/hr/leaves", {
        method: "POST",
        body: {
          employeeId,
          type,
          fromDate,
          toDate: type === "permission" ? fromDate : toDate,
          startTime: type === "permission" ? permStart : undefined,
          endTime: type === "permission" ? permEnd : undefined,
          effectiveDate: type !== "permission" ? (effectiveDate || undefined) : undefined,
          note: reqNote || undefined,
        },
      });
      leavesStore.refresh?.();
      auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: actor, module: "leave", action: "create", subject: `${type} leave - ${empName(employeeId, employees)}`, detail: `${fromDate} -> ${toDate} (${daysBetween(fromDate, toDate)}d)` });
      toast.success("Leave request submitted");
      setReqOpen(false); setReqNote("");
    } catch (err: any) {
      toast.error(err?.message || "Could not submit leave request");
    }
  }
  async function decide(id: string, approved: boolean) {
    const r = leaves.find((x) => x.id === id);
    if (!r) return;
    try {
      await apiFetch(`/hr/leaves/${id}/${approved ? "approve" : "reject"}`, { method: "POST" });
      leavesStore.refresh?.();
      auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: actor, module: "leave", action: approved ? "approve" : "reject", subject: `${r.type} leave - ${empName(r.employeeId, employees)}`, detail: `${r.fromDate} -> ${r.toDate}` });
      toast.success(approved ? "Leave approved" : "Leave rejected");
    } catch (err: any) {
      toast.error(err?.message || "Could not update leave request");
    }
  }
  const queue = leaves.filter((r) => r.status === "submitted").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const recent = [...leaves].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2"><Plane className="w-4 h-4" /> Leave Management</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setReqOpen(true)}><Plus className="w-3.5 h-3.5" /> New leave request</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pending approvals - {queue.length}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {queue.length === 0 && <p className="text-xs text-slate-500">No pending requests.</p>}
            {queue.map((r) => {
              const ho = handovers.find((h) => h.leaveRequestId === r.id);
              return (
                <div key={r.id} className="p-2 border border-amber-200 bg-amber-50/40 rounded">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">{empName(r.employeeId, employees)}</span>
                      <span className="ml-2 text-xs"><Badge variant="outline" className="capitalize">{r.type}</Badge></span>
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">{r.type === "permission" ? `${r.fromDate} · ${r.startTime || ""}–${r.endTime || ""} (${Number(r.hours || 0)}h)` : `${r.fromDate} - ${r.toDate} (${daysBetween(r.fromDate, r.toDate)}d)${r.effectiveDate ? ` · back on duty ${r.effectiveDate}` : ""}`}</div>
                  </div>
                  {r.note && <p className="text-xs text-slate-600 mt-1">{r.note}</p>}
                  {ho && (
                    <p className="text-[10px] text-slate-600 mt-1">
                      Handover: <Badge variant="outline" className="text-[9px] capitalize">{ho.status}</Badge> - {ho.coverAssignments.length} task(s)
                    </p>
                  )}
                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => {
                        const emp = employees.find((e) => e.id === r.employeeId);
                        if (emp) setHandoverTarget({ leave: r, employee: emp });
                      }}
                    >
                      <Users className="w-3 h-3 mr-1" /> Hand over tasks
                    </Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => decide(r.id, false)}><X className="w-3 h-3 mr-1" /> Reject</Button>
                    <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => decide(r.id, true)}><Check className="w-3 h-3 mr-1" /> Approve</Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Balances by employee</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-2 py-1.5">Employee</th>
                  <th className="text-right px-2 py-1.5">Annual</th>
                  <th className="text-right px-2 py-1.5">Sick</th>
                  <th className="text-right px-2 py-1.5">Pending</th>
                  {isHR && <th className="px-2 py-1.5" />}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => {
                  const b = leaveBalance(e, leaves);
                  const dbEnt = dbEntitlements[e.id] || {};
                  const annualEnt = dbEnt.annual !== undefined ? dbEnt.annual : b.annual.entitled;
                  const sickEnt = dbEnt.sick !== undefined ? dbEnt.sick : b.sick.entitled;
                  const annualRem = Math.max(0, Math.round((annualEnt - b.annual.taken) * 100) / 100);
                  const sickRem = Math.max(0, Math.round((sickEnt - b.sick.taken) * 100) / 100);
                  const pending = Object.values(b).reduce((a, x) => a + x.pending, 0);
                  return (
                    <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-2 py-1.5 font-medium">{e.firstName} {e.lastName}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{annualRem} / {annualEnt}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{sickRem} / {sickEnt}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{pending > 0 ? <Badge variant="outline" className="text-[10px]">{pending}d pending</Badge> : "-"}</td>
                      {isHR && (
                        <td className="px-2 py-1.5 text-right">
                          <button
                            onClick={() => openEdit(e)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                            title="Edit leave balance"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Recent leave activity</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="text-left px-3 py-1.5">When requested</th><th className="text-left px-3 py-1.5">Employee</th><th className="text-left px-3 py-1.5">Type</th><th className="text-left px-3 py-1.5">Dates</th><th className="text-left px-3 py-1.5">Days</th><th className="text-left px-3 py-1.5">Status</th></tr></thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 tabular-nums">{new Date(r.createdAt).toLocaleString("en-GB", { timeZone: "UTC", hour12: true })}</td>
                  <td className="px-3 py-1.5">{empName(r.employeeId, employees)}</td>
                  <td className="px-3 py-1.5 capitalize"><LeaveTypeIcon type={r.type} /></td>
                  <td className="px-3 py-1.5">{r.fromDate} - {r.toDate}</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.type === "permission" ? `${r.startTime || ""}–${r.endTime || ""} (${Number(r.hours || 0)}h)` : daysBetween(r.fromDate, r.toDate)}</td>
                  <td className="px-3 py-1.5"><LeaveStatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New leave request</DialogTitle><DialogDescription>Submit a leave request - manager will review.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Employee</Label>
              <Select value={empId} onValueChange={setEmpId}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">Leave type</Label>
              <Select value={type} onValueChange={(v) => setType(v as LeaveType)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual ({ENTITLEMENT_DAYS.annual}d/yr)</SelectItem>
                  <SelectItem value="sick">Sick ({ENTITLEMENT_DAYS.sick}d/yr)</SelectItem>
                  <SelectItem value="maternity">Maternity ({ENTITLEMENT_DAYS.maternity}d)</SelectItem>
                  <SelectItem value="paternity">Paternity ({ENTITLEMENT_DAYS.paternity}d)</SelectItem>
                  <SelectItem value="compassionate">Compassionate ({ENTITLEMENT_DAYS.compassionate}d)</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="permission">Temporary permission (1–3h, from annual)</SelectItem>
                </SelectContent></Select>
            </div>
            {type === "permission" ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Date</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs">Start time</Label><Input type="time" min="08:50" max="18:30" value={permStart} onChange={(e) => setPermStart(e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs">End time</Label><Input type="time" min="08:50" max="18:30" value={permEnd} onChange={(e) => setPermEnd(e.target.value)} className="mt-1" /></div>
                </div>
                <p className="text-xs text-slate-600 rounded bg-amber-50 border border-amber-200 px-2 py-1.5">
                  {permissionSummary(permStart, permEnd)}
                </p>
              </>
            ) : (
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">From</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">To</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1" /></div>
            </div>
            )}
            {type !== "permission" && (
              <div>
                <Label className="text-xs">Effective date (back on duty)</Label>
                <Input type="date" min={nextDay(toDate)} value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">Duty resumes on this date — defaults to the day after the last leave day.</p>
              </div>
            )}
            <div><Label className="text-xs">Note</Label><Textarea value={reqNote} onChange={(e) => setReqNote(e.target.value)} rows={2} className="mt-1" /></div>
            <div className="text-xs text-slate-600">Total: <strong>{type === "permission" ? `${permStart}–${permEnd}` : `${daysBetween(fromDate, toDate)} days`}</strong></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setReqOpen(false)}>Cancel</Button><Button onClick={submit}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <HandoverDialog
        open={!!handoverTarget}
        onClose={() => setHandoverTarget(null)}
        leave={handoverTarget?.leave}
        employee={handoverTarget?.employee}
      />

      {/* Edit leave balance dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit leave balance</DialogTitle>
            <DialogDescription>
              {editTarget ? `${editTarget.firstName} ${editTarget.lastName} — ${currentYear}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Annual entitlement (days)</Label>
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={editAnnual}
                  onChange={(e) => setEditAnnual(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Sick entitlement (days)</Label>
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={editSick}
                  onChange={(e) => setEditSick(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-2.5 py-2">
              Changing the entitlement updates the total days available. Used days (approved requests) are automatically deducted from this figure.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={saveBalance} disabled={editSaving}>
              {editSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function empName(id: string, employees: Employee[]): string {
  const e = employees.find((x) => x.id === id);
  return e ? `${e.firstName} ${e.lastName}` : id;
}

function LeaveTypeIcon({ type }: { type: LeaveType }) {
  const icons: Record<LeaveType, React.ReactNode> = {
    annual: <Plane className="w-3 h-3 inline mr-1 text-blue-600" />,
    sick: <Heart className="w-3 h-3 inline mr-1 text-red-600" />,
    maternity: <Baby className="w-3 h-3 inline mr-1 text-pink-600" />,
    paternity: <Baby className="w-3 h-3 inline mr-1 text-purple-600" />,
    unpaid: <BookOpen className="w-3 h-3 inline mr-1 text-slate-600" />,
    compassionate: <Heart className="w-3 h-3 inline mr-1 text-amber-600" />,
    permission: <Clock className="w-3 h-3 inline mr-1 text-emerald-600" />,
  };
  return <span>{icons[type]}{type}</span>;
}

function LeaveStatusBadge({ status }: { status: LeaveRequest["status"] }) {
  const map: Record<LeaveRequest["status"], string> = {
    submitted: "border-amber-300 text-amber-700",
    approved: "border-emerald-300 text-emerald-700",
    rejected: "border-red-300 text-red-700",
  };
  return <Badge variant="outline" className={`text-[10px] capitalize ${map[status]}`}>{status}</Badge>;
}

// Temporary permission summary — duration + annual-leave deduction for the
// selected window inside the 08:50–18:30 working day.
function permissionSummary(start: string, end: string): string {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const startMin = toMin(start), endMin = toMin(end);
  if (startMin < toMin("08:50") || endMin > toMin("18:30")) return "Permission must be within the working day 08:50–18:30.";
  if (endMin <= startMin) return "End time must be after the start time.";
  const dur = endMin - startMin;
  if (dur > 180) return "A temporary permission is limited to 3 hours.";
  const h = Math.floor(dur / 60), m = dur % 60;
  const days = (dur / 60 / (9 + 40 / 60)).toFixed(2);
  return `Working day 08:50–18:30 — away ${start}–${end} (${h}h${m ? ` ${m}m` : ""}). Deducted from the annual balance (≈ ${days} day).`;
}

function nextDay(iso: string): string {
  return new Date(new Date(iso + "T00:00:00Z").getTime() + 86_400_000).toISOString().slice(0, 10);
}
