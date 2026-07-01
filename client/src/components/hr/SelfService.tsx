import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserCircle, Plane, Wallet, GraduationCap, Laptop, FileSignature, FolderOpen, AlertTriangle, Send, History, ChevronRight, Clock, CheckCircle2, XCircle, TrendingUp, Lock } from "lucide-react";
import type { LeaveRequest } from "@/lib/attendance/types";
import { incrementRequestsStore, fetchIncrementEligibility, submitIncrementRequest, decideIncrementRequest, type IncrementRequest, type IncrementEligibility } from "@/lib/hr/increment";
import FileUpload from "@/components/files/FileUpload";
import { employeesStore, leavesStore, lettersStore, trainingStore, assetsStore, punchesStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { aggregateDays } from "@/lib/attendance/utils";
import { monthlyPayroll } from "@/lib/payroll/utils";
import { ENTITLEMENT_DAYS, leaveBalance, daysBetween, type LeaveType } from "@/lib/hr/leave-utils";
import { expiryStatus, expiryColorClass, grossSalary } from "@/lib/hr/types";
import { useAuth, useCurrentActor } from "@/lib/auth/AuthContext";
import { apiFetch } from "@/lib/backend/api";
import type { IssuedLetter } from "@/lib/hr/extra-types";

import TwoFactorSetup from "@/components/security/TwoFactorSetup";

export default function SelfService() {
  const { currentUser, hasRole } = useAuth();
  const actor = useCurrentActor();
  const canReviewAll = hasRole("director", "hr-manager");
  const employees = useCollection(employeesStore);
  const leaves = useCollection(leavesStore);
  const letters = useCollection(lettersStore);
  const training = useCollection(trainingStore);
  const assets = useCollection(assetsStore);
  const punches = useCollection(punchesStore);
  useCollection(auditStore);

  const ownEmployeeId = currentUser?.employeeId;
  // Non-HR users must act as their own employee record only — never fall back
  // to another employee (the server rejects mismatched submissions with 403).
  const defaultEmpId = canReviewAll ? employees[0]?.id || "" : ownEmployeeId || "";
  const [empId, setEmpId] = useState<string>(defaultEmpId);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [detailReq, setDetailReq] = useState<MyRequest | null>(null);
  // Salary increment request
  const incrementRequests = useCollection(incrementRequestsStore);
  const [incrementOpen, setIncrementOpen] = useState(false);
  const [incrementReason, setIncrementReason] = useState("");
  const [incrementPercent, setIncrementPercent] = useState("");
  const [incrementBusy, setIncrementBusy] = useState(false);
  const [eligibility, setEligibility] = useState<IncrementEligibility | null>(null);
  useEffect(() => { fetchIncrementEligibility().then(setEligibility).catch(() => setEligibility(null)); }, [empId, incrementRequests.length]);
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [leaveFrom, setLeaveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [leaveTo, setLeaveTo] = useState(new Date().toISOString().slice(0, 10));
  const [leaveNote, setLeaveNote] = useState("");
  const [permStart, setPermStart] = useState("16:30");
  const [permEnd, setPermEnd] = useState("18:30");
  const [effectiveDate, setEffectiveDate] = useState("");
  // Default the back-on-duty date to the day after the leave ends
  useEffect(() => {
    if (leaveType === "permission") return;
    setEffectiveDate(nextDay(leaveTo));
  }, [leaveTo, leaveType]);
  const [letterType, setLetterType] = useState<IssuedLetter["type"]>("salary-certificate");
  const [letterRecipient, setLetterRecipient] = useState("");
  const [letterNote, setLetterNote] = useState("");
  const [letterBusy, setLetterBusy] = useState(false);
  const emp = employees.find((e) => e.id === empId);
  useEffect(() => {
    if (!employees.length) return;
    if (!canReviewAll && ownEmployeeId && empId !== ownEmployeeId) setEmpId(ownEmployeeId);
    else if (!empId) setEmpId(defaultEmpId);
  }, [canReviewAll, defaultEmpId, employees.length, empId, ownEmployeeId]);
  const today = new Date();
  const year = today.getUTCFullYear();
  const m0 = today.getUTCMonth();
  const fromDate = `${year}-${String(m0 + 1).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, m0 + 1, 0));
  const toDate = last.toISOString().slice(0, 10);
  const days = useMemo(() => aggregateDays({ punches, employeeIds: emp ? [emp.id] : [], fromDate, toDate, leaves }), [punches, emp, fromDate, toDate, leaves]);

  if (!emp) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Your account is not linked to an employee record yet — ask HR to link it (HR → Employees → edit → linked user) to use self-service.
        </CardContent>
      </Card>
    );
  }
  const balance = leaveBalance(emp.id, leaves);
  const myLetters = letters.filter((l) => l.employeeId === emp.id);
  const myLeaves = leaves.filter((l) => l.employeeId === emp.id);
  const pendingLetters = myLetters.filter((l) => l.requestStatus === "submitted");
  const pendingLeaves = myLeaves.filter((l) => l.status === "submitted");

  // Unified history of everything this employee has requested (leave + certificates),
  // newest first — rendered in the "My requests" widget, each row opens a detail dialog.
  const myRequests: MyRequest[] = [
    ...myLeaves.map((l): MyRequest => ({
      kind: "leave",
      id: l.id,
      when: l.createdAt || l.fromDate,
      title: `${l.type.replace("-", " ")} leave`,
      subtitle: l.type === "permission" ? `${l.fromDate} · ${l.startTime}–${l.endTime}` : `${l.fromDate} → ${l.toDate}`,
      status: l.status,
      leave: l,
    })),
    ...myLetters
      // Letters that were requested by the employee (have a request lifecycle) or already issued.
      .map((l): MyRequest => ({
        kind: "certificate",
        id: l.id,
        when: l.requestedAt || l.issueDate || "",
        title: `${l.type.replace("-", " ")} certificate`,
        subtitle: l.recipient ? `for ${l.recipient}` : l.reference,
        status: l.requestStatus || "issued",
        letter: l,
      })),
    ...incrementRequests
      .filter((r) => r.employeeId === emp.id)
      .map((r): MyRequest => ({
        kind: "increment",
        id: r.id,
        when: r.requestedAt || r.createdAt || "",
        title: "salary increment",
        subtitle: r.requestedPercent ? `requested +${r.requestedPercent}%` : (r.reason || "review pending"),
        status: r.status,
        increment: r,
      })),
  ].sort((a, b) => (b.when || "").localeCompare(a.when || ""));
  const myTraining = training.filter((t) => t.employeeId === emp.id);
  const myAssets = assets.filter((a) => a.employeeId === emp.id && !a.returnedDate);
  const payroll = monthlyPayroll(emp, days, year, m0);
  const expiringDocs = [
    { kind: "Passport", date: emp.passportExpiry, ref: emp.passportNo },
    { kind: "Emirates ID", date: emp.emiratesIdExpiry, ref: emp.emiratesIdNo },
    { kind: "Visa", date: emp.visaExpiry, ref: emp.visaNo },
    { kind: "Labour Card", date: emp.labourCardExpiry, ref: emp.labourCardNo },
  ].filter((d) => ["expired", "critical", "warning"].includes(expiryStatus(d.date)));

  async function submitLeave() {
    if (!emp) {
      toast.error("Employee profile is not ready");
      return;
    }
    try {
      await apiFetch("/hr/leaves", {
        method: "POST",
        body: {
          employeeId: emp.id,
          type: leaveType,
          fromDate: leaveFrom,
          toDate: leaveType === "permission" ? leaveFrom : leaveTo,
          startTime: leaveType === "permission" ? permStart : undefined,
          endTime: leaveType === "permission" ? permEnd : undefined,
          effectiveDate: leaveType !== "permission" ? (effectiveDate || undefined) : undefined,
          note: leaveNote || undefined,
        },
      });
      leavesStore.refresh?.();
      auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "leave", action: "create", subject: `Self-service leave · ${emp.firstName} ${emp.lastName}`, detail: `${leaveType} · ${leaveFrom} -> ${leaveTo}` });
      toast.success("Leave request sent to HR");
      setLeaveOpen(false);
      setLeaveNote("");
    } catch (err: any) {
      toast.error(err?.message || "Could not submit leave request");
    }
  }

  async function submitLetterRequest() {
    if (!emp) {
      toast.error("Employee profile is not ready");
      return;
    }
    setLetterBusy(true);
    try {
      await apiFetch("/hr/letters/requests", {
        method: "POST",
        body: {
          employeeId: emp.id,
          type: letterType,
          recipient: letterRecipient || undefined,
          note: letterNote || undefined,
        },
      });
      lettersStore.refresh?.();
      toast.success("Certificate request sent to HR");
      setLetterOpen(false);
      setLetterRecipient("");
      setLetterNote("");
    } catch (err: any) {
      toast.error(err?.message || "Could not submit certificate request");
    } finally {
      setLetterBusy(false);
    }
  }

  async function submitIncrement() {
    setIncrementBusy(true);
    try {
      await submitIncrementRequest({
        reason: incrementReason || undefined,
        requestedPercent: incrementPercent ? Number(incrementPercent) : undefined,
      });
      toast.success("Salary increment request sent to HR");
      setIncrementOpen(false);
      setIncrementReason("");
      setIncrementPercent("");
      fetchIncrementEligibility().then(setEligibility).catch(() => {});
    } catch (err: any) {
      toast.error(err?.message || "Could not submit increment request");
    } finally {
      setIncrementBusy(false);
    }
  }

  async function decideIncrement(id: string, decision: "approve" | "reject") {
    try {
      await decideIncrementRequest(id, decision);
      toast.success(decision === "approve" ? "Increment approved" : "Increment rejected");
      setDetailReq(null);
    } catch (err: any) {
      toast.error(err?.message || "Could not update request");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2"><UserCircle className="w-4 h-4" /> My HR</h3>
        <div className="flex flex-wrap items-center gap-2">
          {canReviewAll && (
            <>
              <span className="text-xs text-slate-500">View as:</span>
              <Select value={empId} onValueChange={setEmpId}>
                <SelectTrigger className="h-9 w-64"><SelectValue /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setLeaveOpen(true)}><Plane className="w-3.5 h-3.5" /> Request leave</Button>
          <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={() => setLetterOpen(true)}><FileSignature className="w-3.5 h-3.5" /> Request certificate</Button>
          {empId === ownEmployeeId && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              disabled={!eligibility?.eligible}
              title={eligibility?.eligible ? "Request a salary increment" : (eligibility?.reason || "Eligible after 1 year of service")}
              onClick={() => setIncrementOpen(true)}
            >
              {eligibility?.eligible ? <TrendingUp className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />} Request salary increment
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <Avatar className="h-14 w-14"><AvatarFallback>{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="text-lg font-bold">{emp.firstName} {emp.lastName}</div>
            <div className="text-sm text-slate-500">{emp.jobTitle} · {emp.department}</div>
            <div className="text-xs text-slate-500 mt-1">Joined {emp.joinDate} · Code {emp.code} · Site {emp.assignedProjectId || "office"}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Gross monthly</div>
            <div className="text-lg font-bold">AED {grossSalary(emp.salary).toLocaleString()}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="lg:col-span-2 border-blue-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Send className="w-4 h-4 text-blue-600" /> My requests and actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <RequestTile label="Pending leave" value={`${pendingLeaves.length}`} detail={pendingLeaves[0] ? `${pendingLeaves[0].fromDate} - ${pendingLeaves[0].toDate}` : "No pending leave"} />
            <RequestTile label="Pending certificates" value={`${pendingLetters.length}`} detail={pendingLetters[0]?.type.replace("-", " ") || "No pending certificates"} />
            <RequestTile label="Documents to renew" value={`${expiringDocs.length}`} detail={expiringDocs[0] ? `${expiringDocs[0].kind} · ${expiringDocs[0].date}` : "Nothing urgent"} tone={expiringDocs.length ? "warn" : undefined} />
          </CardContent>
        </Card>

        {/* My requests history — leave + certificate, with status; click a row for full details */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-slate-600" /> My requests <span className="text-xs font-normal text-slate-400">({myRequests.length})</span></CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {myRequests.length === 0 ? (
              <p className="text-xs text-slate-500 px-4 pb-4">You haven't submitted any requests yet. Use “Request leave” or “Request certificate” above.</p>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-72 overflow-auto">
                {myRequests.map((r) => (
                  <li key={`${r.kind}-${r.id}`}>
                    <button
                      type="button"
                      onClick={() => setDetailReq(r)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.kind === "leave" ? "bg-blue-50 text-blue-600" : r.kind === "increment" ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600"}`}>
                        {r.kind === "leave" ? <Plane className="w-4 h-4" /> : r.kind === "increment" ? <TrendingUp className="w-4 h-4" /> : <FileSignature className="w-4 h-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-sm font-medium capitalize block truncate">{r.title}</span>
                        <span className="text-xs text-slate-500 block truncate">{r.subtitle}{r.when ? ` · ${fmtDate(r.when)}` : ""}</span>
                      </span>
                      <RequestStatusBadge status={r.status} />
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Plane className="w-4 h-4" /> My leave balance</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(["annual", "sick", "maternity", "paternity", "compassionate"] as const).map((t) => (
                <div key={t} className="p-2 border border-slate-200 rounded">
                  <div className="text-[10px] text-slate-500 capitalize">{t}</div>
                  <div className="text-base font-bold">{balance[t].remaining} <span className="text-xs text-slate-500">/ {balance[t].entitled}d</span></div>
                  {balance[t].pending > 0 && <Badge variant="outline" className="text-[10px] mt-1">{balance[t].pending}d pending</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4" /> This month's pay (preview)</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Working days" value={`${payroll.daysPresent} present / ${payroll.daysAbsent} absent / ${payroll.daysLeave} leave`} />
            <Row label="Hours on site" value={`${payroll.totalNormalHours.toFixed(1)}h normal · ${payroll.totalOvertimeHours.toFixed(1)}h OT`} />
            <Row label="Gross" value={`AED ${payroll.grossBeforeAdjustments.toLocaleString()}`} />
            {payroll.absenceDeduction > 0 && <Row label="Absence deduction" value={`−AED ${payroll.absenceDeduction.toLocaleString()}`} tone="bad" />}
            {payroll.overtimePay > 0 && <Row label="Overtime pay" value={`+AED ${payroll.overtimePay.toLocaleString()}`} tone="good" />}
            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-semibold"><span>Net pay</span><span className="text-emerald-700">AED {payroll.netPay.toLocaleString()}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4" /> My training & certifications</CardTitle></CardHeader>
          <CardContent>
            {myTraining.length === 0 && <p className="text-xs text-slate-500">No training records.</p>}
            <ul className="text-sm space-y-1">
              {myTraining.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <span>{t.name}{t.provider && <span className="text-xs text-slate-500 ml-1">· {t.provider}</span>}</span>
                  <Badge className={`border ${expiryColorClass(expiryStatus(t.expiryDate))}`}>{t.expiryDate || "no expiry"}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Laptop className="w-4 h-4" /> My assigned assets</CardTitle></CardHeader>
          <CardContent>
            {myAssets.length === 0 && <p className="text-xs text-slate-500">No active assets.</p>}
            <ul className="text-sm space-y-1">
              {myAssets.map((a) => <li key={a.id} className="flex items-center justify-between"><span>{a.description}</span><Badge variant="outline" className="text-[10px] capitalize">{a.type}</Badge></li>)}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileSignature className="w-4 h-4" /> My HR letters</CardTitle></CardHeader>
          <CardContent>
            {myLetters.length === 0 && <p className="text-xs text-slate-500">No letters issued.</p>}
            <ul className="text-sm space-y-1">
              {myLetters.map((l) => (
                <li key={l.id} className="flex items-center justify-between">
                  <span>{l.type.replace("-", " ")} · <span className="font-mono text-xs text-slate-500">{l.reference}</span></span>
                  <span className="text-xs text-slate-500">{l.requestStatus === "submitted" ? "pending approval" : l.issueDate}{l.recipient ? ` · for ${l.recipient}` : ""}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><FolderOpen className="w-4 h-4 text-amber-600" /> My documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">Documents HR keeps on file for you. Employees can view and download only; HR and Director can upload or delete.</p>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <MyDocumentSection
                employeeId={emp.id}
                category="contract"
                title="Contract"
                detail="Offer letter, signed contract, amendments."
                readOnly={!canReviewAll}
              />
              <MyDocumentSection
                employeeId={emp.id}
                category="id-visa"
                title="ID & visa"
                detail="Passport, Emirates ID, visa, labour card."
                readOnly={!canReviewAll}
              />
              <MyDocumentSection
                employeeId={emp.id}
                category="bank-family"
                title="Bank & family"
                detail="IBAN, bank letters, dependent documents."
                readOnly={!canReviewAll}
              />
              <MyDocumentSection
                employeeId={emp.id}
                category="documents"
                title="Documents"
                detail="Qualifications, certificates, HR memos."
                readOnly={!canReviewAll}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request leave</DialogTitle><DialogDescription>Your request will appear in Leave Management for HR/director approval.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Leave type</Label>
              <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual ({ENTITLEMENT_DAYS.annual}d/yr)</SelectItem>
                  <SelectItem value="sick">Sick ({ENTITLEMENT_DAYS.sick}d/yr)</SelectItem>
                  <SelectItem value="maternity">Maternity</SelectItem>
                  <SelectItem value="paternity">Paternity</SelectItem>
                  <SelectItem value="compassionate">Compassionate</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="permission">Temporary permission (1–3h, from annual)</SelectItem>
                </SelectContent></Select>
            </div>
            {leaveType === "permission" ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Date</Label><Input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs">Start time</Label><Input type="time" min="08:50" max="18:30" value={permStart} onChange={(e) => setPermStart(e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs">End time</Label><Input type="time" min="08:50" max="18:30" value={permEnd} onChange={(e) => setPermEnd(e.target.value)} className="mt-1" /></div>
                </div>
                <p className="text-xs text-slate-600 rounded bg-amber-50 border border-amber-200 px-2 py-1.5">
                  {permissionSummary(permStart, permEnd)}
                </p>
              </>
            ) : (
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">From</Label><Input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">To</Label><Input type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} className="mt-1" /></div>
            </div>
            )}
            {leaveType !== "permission" && (
              <div>
                <Label className="text-xs">Effective date (back on duty)</Label>
                <Input type="date" min={nextDay(leaveTo)} value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">The day you resume duty after the leave — defaults to the day after your last leave day.</p>
              </div>
            )}
            <div><Label className="text-xs">Note</Label><Textarea rows={2} value={leaveNote} onChange={(e) => setLeaveNote(e.target.value)} className="mt-1" /></div>
            <p className="text-xs text-slate-600">Total: <strong>{daysBetween(leaveFrom, leaveTo)} days</strong></p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button><Button onClick={submitLeave}>Send request</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={letterOpen} onOpenChange={setLetterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request certificate</DialogTitle><DialogDescription>HR/director can approve and issue the certificate from HR Letters.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Certificate type</Label>
              <Select value={letterType} onValueChange={(v) => setLetterType(v as IssuedLetter["type"])}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary-certificate">Salary certificate</SelectItem>
                  <SelectItem value="noc">No-objection certificate</SelectItem>
                  <SelectItem value="experience-letter">Experience letter</SelectItem>
                  <SelectItem value="employment-contract">Employment contract summary</SelectItem>
                </SelectContent></Select>
            </div>
            <div><Label className="text-xs">Recipient / purpose</Label><Input value={letterRecipient} onChange={(e) => setLetterRecipient(e.target.value)} className="mt-1" placeholder="Bank, embassy, landlord..." /></div>
            <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={letterNote} onChange={(e) => setLetterNote(e.target.value)} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setLetterOpen(false)}>Cancel</Button><Button disabled={letterBusy} onClick={submitLetterRequest}>{letterBusy ? "Sending..." : "Send request"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request salary increment */}
      <Dialog open={incrementOpen} onOpenChange={setIncrementOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Request salary increment</DialogTitle>
            <DialogDescription>Available after 1 year of service. HR will review and decide.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {eligibility?.joinDate && (
              <p className="text-xs text-slate-600 rounded bg-emerald-50 border border-emerald-200 px-2 py-1.5">
                Joined {eligibility.joinDate} — eligible since {eligibility.eligibleDate}. ✅
              </p>
            )}
            <div><Label className="text-xs">Requested increase (%) — optional</Label><Input type="number" min="0" step="0.5" value={incrementPercent} onChange={(e) => setIncrementPercent(e.target.value)} className="mt-1" placeholder="e.g. 10" /></div>
            <div><Label className="text-xs">Reason / justification</Label><Textarea rows={3} value={incrementReason} onChange={(e) => setIncrementReason(e.target.value)} className="mt-1" placeholder="Performance, added responsibilities, market rate…" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIncrementOpen(false)}>Cancel</Button><Button disabled={incrementBusy} onClick={submitIncrement}>{incrementBusy ? "Sending…" : "Send request"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request details — opened from the "My requests" widget */}
      <Dialog open={!!detailReq} onOpenChange={(o) => { if (!o) setDetailReq(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              {detailReq?.kind === "leave" ? <Plane className="w-4 h-4 text-blue-600" /> : detailReq?.kind === "increment" ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <FileSignature className="w-4 h-4 text-violet-600" />}
              {detailReq?.title}
            </DialogTitle>
            <DialogDescription>Request details and current status.</DialogDescription>
          </DialogHeader>
          {detailReq && (
            <div className="space-y-2 text-sm">
              <DetailRow label="Status" value={<RequestStatusBadge status={detailReq.status} />} />
              {detailReq.kind === "leave" && detailReq.leave && (
                <>
                  <DetailRow label="Type" value={<span className="capitalize">{detailReq.leave.type.replace("-", " ")}</span>} />
                  {detailReq.leave.type === "permission" ? (
                    <>
                      <DetailRow label="Date" value={detailReq.leave.fromDate} />
                      <DetailRow label="Window" value={`${detailReq.leave.startTime} – ${detailReq.leave.endTime}`} />
                      {detailReq.leave.hours != null && <DetailRow label="Hours" value={`${detailReq.leave.hours}h`} />}
                    </>
                  ) : (
                    <>
                      <DetailRow label="From" value={detailReq.leave.fromDate} />
                      <DetailRow label="To" value={detailReq.leave.toDate} />
                      <DetailRow label="Total" value={`${daysBetween(detailReq.leave.fromDate, detailReq.leave.toDate)} day(s)`} />
                      {detailReq.leave.effectiveDate && <DetailRow label="Back on duty" value={detailReq.leave.effectiveDate} />}
                    </>
                  )}
                  {detailReq.leave.note && <DetailRow label="Note" value={detailReq.leave.note} />}
                  {detailReq.leave.approvedBy && <DetailRow label="Reviewed by" value={detailReq.leave.approvedBy} />}
                  {detailReq.leave.createdAt && <DetailRow label="Submitted" value={fmtDate(detailReq.leave.createdAt)} />}
                </>
              )}
              {detailReq.kind === "certificate" && detailReq.letter && (
                <>
                  <DetailRow label="Type" value={<span className="capitalize">{detailReq.letter.type.replace("-", " ")}</span>} />
                  <DetailRow label="Reference" value={<span className="font-mono text-xs">{detailReq.letter.reference}</span>} />
                  {detailReq.letter.recipient && <DetailRow label="Recipient / purpose" value={detailReq.letter.recipient} />}
                  {detailReq.letter.requestNote && <DetailRow label="Note" value={detailReq.letter.requestNote} />}
                  {detailReq.letter.requestedAt && <DetailRow label="Requested" value={fmtDate(detailReq.letter.requestedAt)} />}
                  {detailReq.letter.approvedBy && <DetailRow label="Approved by" value={detailReq.letter.approvedBy} />}
                  {detailReq.status === "issued" && detailReq.letter.issueDate && <DetailRow label="Issued" value={fmtDate(detailReq.letter.issueDate)} />}
                </>
              )}
              {detailReq.kind === "increment" && detailReq.increment && (
                <>
                  <DetailRow label="Employee" value={`${detailReq.increment.employeeName || ""}${detailReq.increment.employeeCode ? ` · ${detailReq.increment.employeeCode}` : ""}`} />
                  {detailReq.increment.joinDate && <DetailRow label="Join date" value={detailReq.increment.joinDate} />}
                  {detailReq.increment.requestedPercent != null && <DetailRow label="Requested" value={`+${detailReq.increment.requestedPercent}%`} />}
                  {detailReq.increment.reason && <DetailRow label="Reason" value={detailReq.increment.reason} />}
                  {detailReq.increment.requestedAt && <DetailRow label="Requested" value={fmtDate(detailReq.increment.requestedAt)} />}
                  {detailReq.increment.reviewedByEmail && <DetailRow label="Reviewed by" value={detailReq.increment.reviewedByEmail} />}
                  {detailReq.increment.reviewedAt && <DetailRow label="Reviewed" value={fmtDate(detailReq.increment.reviewedAt)} />}
                  {detailReq.increment.decisionNote && <DetailRow label="HR note" value={detailReq.increment.decisionNote} />}
                </>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {detailReq?.kind === "increment" && canReviewAll && detailReq.status === "submitted" && (
              <>
                <Button variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => decideIncrement(detailReq.id, "reject")}>Reject</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => decideIncrement(detailReq.id, "approve")}>Approve</Button>
              </>
            )}
            <Button variant="outline" onClick={() => setDetailReq(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TwoFactorSetup />
    </div>
  );
}
function RequestTile({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "warn" }) {
  return (
    <div className={`rounded-lg border p-3 ${tone === "warn" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{label}</p>
        {tone === "warn" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-slate-500 truncate">{detail}</p>
    </div>
  );
}
function Row({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "";
  return <div className="flex justify-between"><span className="text-slate-600">{label}</span><span className={`tabular-nums ${cls}`}>{value}</span></div>;
}

// Unified shape for the "My requests" widget — a leave request or a certificate request.
type MyRequest = {
  kind: "leave" | "certificate" | "increment";
  id: string;
  when: string;
  title: string;
  subtitle: string;
  status: string;
  leave?: LeaveRequest;
  letter?: IssuedLetter;
  increment?: IncrementRequest;
};

function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    submitted: { cls: "border-amber-300 text-amber-700 bg-amber-50", icon: <Clock className="w-3 h-3" />, label: "pending" },
    approved: { cls: "border-emerald-300 text-emerald-700 bg-emerald-50", icon: <CheckCircle2 className="w-3 h-3" />, label: "approved" },
    issued: { cls: "border-emerald-300 text-emerald-700 bg-emerald-50", icon: <CheckCircle2 className="w-3 h-3" />, label: "issued" },
    rejected: { cls: "border-red-300 text-red-700 bg-red-50", icon: <XCircle className="w-3 h-3" />, label: "rejected" },
  };
  const m = map[status] || { cls: "border-slate-300 text-slate-600 bg-slate-50", icon: null, label: status };
  return <Badge variant="outline" className={`text-[10px] gap-1 capitalize shrink-0 ${m.cls}`}>{m.icon}{m.label}</Badge>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  // Date-only strings (YYYY-MM-DD) shouldn't show a misleading time.
  return iso.length <= 10
    ? d.toLocaleDateString("en-GB", { timeZone: "UTC" })
    : d.toLocaleString("en-GB", { timeZone: "UTC" });
}

function MyDocumentSection({
  employeeId,
  category,
  title,
  detail,
  readOnly,
}: {
  employeeId: string;
  category: string;
  title: string;
  detail: string;
  readOnly: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
      <div className="mb-2">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      <FileUpload entityType="employee" entityId={employeeId} category={category} readOnly={readOnly} compact />
    </div>
  );
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
