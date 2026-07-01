import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Circle, Clock, ChevronRight, UserPlus } from "lucide-react";
import { employeesStore, onboardingStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import type { OnboardingRecord, OnboardingStepStatus } from "@/lib/hr/extra-types";

const STANDARD_STEPS = [
  { key: "offer", label: "Offer letter signed" },
  { key: "docs", label: "Personal documents collected (passport, photo, CV, certificates)" },
  { key: "visa", label: "Visa application submitted" },
  { key: "eid", label: "Emirates ID issued" },
  { key: "labour", label: "Labour card issued" },
  { key: "bank", label: "Bank account opened (WPS-compliant)" },
  { key: "assets", label: "Laptop, phone, software access provisioned" },
  { key: "induction", label: "HSE & company induction completed" },
  { key: "training", label: "Role-specific training assigned" },
  { key: "probation", label: "Probation tracker (90 days)" },
];

export default function Onboarding() {
  const actor = useCurrentActor();
  const employees = useCollection(employeesStore);
  const records = useCollection(onboardingStore);
  useCollection(auditStore);

  const [open, setOpen] = useState(false);
  const [empId, setEmpId] = useState<string>("");

  function startOnboarding() {
    if (!empId) return;
    const r: OnboardingRecord = {
      id: newId("ob"), employeeId: empId,
      startedAt: new Date().toISOString(),
      expectedJoinDate: new Date().toISOString().slice(0, 10),
      status: "in-progress",
      steps: STANDARD_STEPS.map((s) => ({ ...s, status: "pending" })),
    };
    onboardingStore.put(r);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: actor, module: "hr", action: "create", subject: `Onboarding started · ${empName(empId)}`, detail: `${STANDARD_STEPS.length} steps queued` });
    toast.success("Onboarding started");
    setOpen(false); setEmpId("");
  }
  function setStepStatus(rec: OnboardingRecord, key: string, status: OnboardingStepStatus) {
    const next: OnboardingRecord = {
      ...rec,
      steps: rec.steps.map((s) => s.key === key ? { ...s, status, completedAt: status === "complete" ? new Date().toISOString() : s.completedAt } : s),
    };
    if (next.steps.every((s) => s.status === "complete" || s.status === "skipped")) next.status = "complete";
    onboardingStore.put(next);
  }
  function empName(id: string) { const e = employees.find((x) => x.id === id); return e ? `${e.firstName} ${e.lastName}` : id; }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4" /> Onboarding</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><UserPlus className="w-3.5 h-3.5" /> Start onboarding</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {records.map((r) => {
          const e = employees.find((x) => x.id === r.employeeId);
          if (!e) return null;
          const progress = Math.round((r.steps.filter((s) => s.status === "complete").length / r.steps.length) * 100);
          return (
            <Card key={r.id}>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm">{e.firstName} {e.lastName} · {e.code}</CardTitle>
                <Badge variant="outline">{progress}% · {r.status}</Badge>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {r.steps.map((s) => (
                    <li key={s.key} className="flex items-center gap-2 group">
                      {s.status === "complete" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : s.status === "in-progress" ? <Clock className="w-4 h-4 text-amber-600" /> : <Circle className="w-4 h-4 text-slate-300" />}
                      <span className="flex-1">{s.label}</span>
                      {s.status !== "complete" && (
                        <Select value={s.status} onValueChange={(v) => setStepStatus(r, s.key, v as OnboardingStepStatus)}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In progress</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                            <SelectItem value="skipped">Skipped</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
        {records.length === 0 && <Card><CardContent className="p-6 text-sm text-slate-500 text-center">No active onboarding records.</CardContent></Card>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Start onboarding for an employee</DialogTitle></DialogHeader>
          <Label className="text-xs">Employee</Label>
          <Select value={empId} onValueChange={setEmpId}><SelectTrigger className="mt-1"><SelectValue placeholder="Pick employee" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.code}</SelectItem>)}</SelectContent></Select>
          <Button onClick={startOnboarding} className="w-full mt-3">Start <ChevronRight className="w-4 h-4 ml-1" /></Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
