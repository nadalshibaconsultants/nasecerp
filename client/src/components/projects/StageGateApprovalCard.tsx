/**
 * Internal Gate Approval card — shown on the active pre-contract stage.
 * Three slots: LA, PM, DM. Any user with the matching role can act on a slot.
 * Once all three approve, the card transitions to "Ready for Client Gate".
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, ShieldCheck, AlertCircle, Send, RefreshCw } from "lucide-react";
import { stageApprovalsStore, usersStore, notificationsStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useAuth, useCurrentActor } from "@/lib/auth/AuthContext";
import { apiFetch, ApiError } from "@/lib/backend/api";
import {
  APPROVER_LABEL, APPROVER_ROLE, STAGE_TO_GATE,
  type StageGateApproval, type ApproverKind, type ApproverSlot,
} from "@/lib/projects/stage-approval";

type Props = { projectId: string; stageCode: string; stageName: string; projectStage?: string; onAllApproved?: () => void };

const DECISION_TONE: Record<ApproverSlot["status"], { cls: string; icon: React.ReactNode; label: string }> = {
  pending: { cls: "border-amber-300 bg-amber-50/60 text-amber-800", icon: <Clock className="w-3.5 h-3.5" />, label: "Pending" },
  approved: { cls: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Approved" },
  rejected: { cls: "border-red-300 bg-red-50 text-red-800", icon: <XCircle className="w-3.5 h-3.5" />, label: "Rejected" },
};

export default function StageGateApprovalCard({ projectId, stageCode, stageName, projectStage, onAllApproved }: Props) {
  const all = useCollection(stageApprovalsStore);
  const users = useCollection(usersStore);
  const { currentUser, hasRole } = useAuth();
  const actor = useCurrentActor();
  const [decideTarget, setDecideTarget] = useState<{ slot: ApproverKind; action: "approve" | "reject" } | undefined>(undefined);
  const [note, setNote] = useState("");
  const [savingDirectorApproval, setSavingDirectorApproval] = useState(false);

  const gateCode = STAGE_TO_GATE[stageCode];
  if (!gateCode) return null; // S6/S7/S8 don't feed a client gate in the same way

  const record = useMemo(() => all.find((g) => g.projectId === projectId && g.stageCode === stageCode), [all, projectId, stageCode]);


  const isDirector = hasRole("director");

  async function saveDirectorApprovedRecord(existing?: StageGateApproval) {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const rec: StageGateApproval = {
      ...(existing ?? { id: crypto.randomUUID() }),
      projectId, stageCode, gateCode,
      requesterUserId: currentUser.id,
      requesterDisplay: currentUser.displayName,
      status: "approved",
      approvals: (["LA", "PM", "DM"] as ApproverKind[]).map((k) => ({
        kind: k, role: APPROVER_ROLE[k], status: "approved",
        decidedByUserId: currentUser.id, decidedByDisplay: currentUser.displayName,
        decidedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    };
    setSavingDirectorApproval(true);
    try {
      const saved = existing
        ? await apiFetch<StageGateApproval>(`/projects/approvals/${existing.id}`, { method: "PATCH", body: rec })
        : await apiFetch<StageGateApproval>("/projects/approvals", { method: "POST", body: rec });
      stageApprovalsStore.put(saved);
      stageApprovalsStore.refresh?.();
      auditStore.put({ id: newId("au"), timestamp: now, actor, module: "hr", action: "approve", subject: `Director direct approval · ${stageCode} → ${gateCode}`, detail: stageName });
      toast.success(`${stageCode} approved — ready for ${gateCode} client review`);
      onAllApproved?.();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not save the internal gate approval";
      toast.error(message);
      console.error("[StageGateApprovalCard] director approval failed", err);
    } finally {
      setSavingDirectorApproval(false);
    }
  }

  function directorApproveAll() {
    void saveDirectorApprovedRecord();
  }

  function requestApproval() {
    if (!currentUser) return;
    const rec: StageGateApproval = {
      id: crypto.randomUUID(),
      projectId, stageCode, gateCode,
      requesterUserId: currentUser.id,
      requesterDisplay: currentUser.displayName,
      status: "in-review",
      approvals: (["LA", "PM", "DM"] as ApproverKind[]).map((k) => ({ kind: k, role: APPROVER_ROLE[k], status: "pending" })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    stageApprovalsStore.put(rec);
    const targets = users.filter((u) => u.active && (u.role === "design-lead" || u.role === "pm" || u.role === "director"));
    for (const t of targets) {
      notificationsStore.put({
        id: newId("notif"), recipientUserId: t.id, kind: "approval-pending",
        severity: "info",
        title: `${stageCode} → ${gateCode}: approval requested`,
        body: `${stageName} · ${currentUser.displayName} requested LA/PM/DM sign-off`,
        link: `/projects/${projectStage ?? "pre-contract"}/${projectId}`,
        read: false, createdAt: new Date().toISOString(),
        sourceEntityType: "stage-approval", sourceEntityId: rec.id,
      } as any);
    }
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "create", subject: `Internal approval requested · ${stageCode} → ${gateCode}`, detail: stageName });
    toast.success("Approval requested — LA, PM and DM notified");
  }

  function commitDecision() {
    if (!decideTarget || !record || !currentUser) return;
    const { slot, action } = decideTarget;
    if (action === "reject" && !note.trim()) { toast.error("Rejection reason required"); return; }
    const next: StageGateApproval = {
      ...record,
      approvals: record.approvals.map((a) => a.kind === slot ? {
        ...a, status: action === "approve" ? "approved" : "rejected", note,
        decidedByUserId: currentUser.id, decidedByDisplay: currentUser.displayName,
        decidedAt: new Date().toISOString(),
      } : a),
      updatedAt: new Date().toISOString(),
    };
    const allApproved = next.approvals.every((a) => a.status === "approved");
    const anyRejected = next.approvals.some((a) => a.status === "rejected");
    if (allApproved) { next.status = "approved"; next.completedAt = new Date().toISOString(); }
    if (anyRejected) { next.status = "rejected"; }
    stageApprovalsStore.put(next);
    if (allApproved) { onAllApproved?.(); }
    // Notify requester
    notificationsStore.put({
      id: newId("notif"), recipientUserId: next.requesterUserId,
      kind: action === "approve" ? "leave-decided" : "approval-pending",
      severity: action === "reject" ? "critical" : (allApproved ? "info" : "info"),
      title: allApproved ? `${stageCode} → ${gateCode}: All 3 approvers signed off` : action === "reject" ? `${slot} rejected ${stageCode} → ${gateCode}` : `${slot} approved ${stageCode} → ${gateCode}`,
      body: allApproved ? "Ready to submit to client for gate review" : note || "",
      link: `/projects/${projectStage ?? "pre-contract"}/${projectId}`,
      read: false, createdAt: new Date().toISOString(),
      sourceEntityType: "stage-approval", sourceEntityId: next.id,
    } as any);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: action === "approve" ? "approve" : "reject", subject: `${slot} · ${stageCode} → ${gateCode}`, detail: note });
    toast.success(action === "approve" ? `${slot} approved` : `${slot} rejected`);
    setDecideTarget(undefined); setNote("");
  }

  function withdraw() {
    if (!record) return;
    stageApprovalsStore.put({ ...record, status: "withdrawn", updatedAt: new Date().toISOString() });
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "update", subject: `Approval withdrawn · ${stageCode} → ${gateCode}` });
    toast.success("Approval withdrawn");
  }

  function resubmit() {
    if (!record) return;
    stageApprovalsStore.put({
      ...record,
      status: "in-review",
      approvals: record.approvals.map((a) => ({ ...a, status: "pending", note: undefined, decidedByUserId: undefined, decidedAt: undefined, decidedByDisplay: undefined })),
      updatedAt: new Date().toISOString(),
      completedAt: undefined,
    });
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "update", subject: `Approval resubmitted · ${stageCode} → ${gateCode}` });
    toast.success("Resubmitted — all 3 slots reset to pending");
  }

  function userDisplay(id?: string) { if (!id) return "—"; const u = users.find((x) => x.id === id); return u ? u.displayName : id; }
  function initials(name?: string) { if (!name) return "?"; return name.split(" ").map((s) => s[0]).slice(0, 2).join(""); }

  if (!record || record.status === "withdrawn") {
    return (
      <Card className={`border-2 border-dashed ${isDirector ? "border-emerald-400 bg-emerald-50/40" : "border-slate-300 bg-slate-50/60"}`}>
        <CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className={`w-5 h-5 shrink-0 ${isDirector ? "text-emerald-600" : "text-slate-500"}`} />
          <div className="flex-1">
            <div className="text-sm font-semibold">Internal sign-off before client gate</div>
            {isDirector ? (
              <div className="text-xs text-emerald-700">You have director authority to approve <strong>{stageCode}</strong> directly and advance to <strong>{gateCode}</strong> client review.</div>
            ) : (
              <div className="text-xs text-slate-600">Request approval from Lead Architect, Project Manager and Design Manager before submitting <strong>{stageCode}</strong> deliverables to client for <strong>{gateCode}</strong> review.</div>
            )}
          </div>
          {isDirector ? (
            <Button onClick={directorApproveAll} disabled={savingDirectorApproval} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              {savingDirectorApproval ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve Internal Gate
            </Button>
          ) : (
            <Button onClick={requestApproval} className="gap-1.5"><Send className="w-3.5 h-3.5" /> Request approval</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const summary = (() => {
    if (record.status === "approved") return { cls: "border-emerald-300 bg-emerald-50/40", label: "All 3 approved — Ready for client gate", icon: <CheckCircle2 className="w-5 h-5 text-emerald-700" /> };
    if (record.status === "rejected") return { cls: "border-red-300 bg-red-50/40", label: "Rejected — please revise + resubmit", icon: <AlertCircle className="w-5 h-5 text-red-700" /> };
    if (record.status === "withdrawn") return { cls: "border-slate-300 bg-slate-50/40", label: "Approval withdrawn", icon: <RefreshCw className="w-5 h-5 text-slate-700" /> };
    return { cls: "border-amber-300 bg-amber-50/30", label: `${record.approvals.filter((a) => a.status === "approved").length} / 3 approvals collected`, icon: <Clock className="w-5 h-5 text-amber-700" /> };
  })();

  return (
    <Card className={`border-2 ${summary.cls}`}>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          {summary.icon} Internal Gate Approval · {stageCode} → {gateCode}
        </CardTitle>
        <Badge variant="outline" className="text-[10px]">{summary.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {record.approvals.map((slot) => {
            const tone = DECISION_TONE[slot.status];
            const iAmEligible = hasRole(APPROVER_ROLE[slot.kind]) || hasRole("director");
            return (
              <div key={slot.kind} className={`p-3 rounded-lg border ${tone.cls}`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold">{APPROVER_LABEL[slot.kind]}</div>
                  <Badge className={`text-[10px] gap-1 border ${tone.cls}`}>{tone.icon} {tone.label}</Badge>
                </div>
                {slot.decidedByUserId ? (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{initials(slot.decidedByDisplay)}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{slot.decidedByDisplay}</div>
                      <div className="text-[10px] text-slate-500">{slot.decidedAt && new Date(slot.decidedAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 mt-1">Awaiting any user with role <code className="bg-white/60 px-1 rounded">{slot.role}</code></div>
                )}
                {slot.note && <div className="text-[10px] italic text-slate-700 mt-1">"{slot.note}"</div>}
                {slot.status === "pending" && iAmEligible && record.status === "in-review" && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" className="h-9 min-w-0 gap-1.5 border-red-300 text-sm text-red-700" onClick={() => { setDecideTarget({ slot: slot.kind, action: "reject" }); setNote(""); }}><XCircle className="h-4 w-4 shrink-0" /> Reject</Button>
                    <Button size="sm" className="h-9 min-w-0 gap-1.5 bg-emerald-600 text-sm hover:bg-emerald-700" onClick={() => { setDecideTarget({ slot: slot.kind, action: "approve" }); setNote(""); }}><CheckCircle2 className="h-4 w-4 shrink-0" /> Approve</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <div className="text-xs text-slate-600">
            Requested by <strong>{record.requesterDisplay}</strong> · {new Date(record.createdAt).toLocaleString("en-GB", { timeZone: "UTC", hour12: true })}
          </div>
          <div className="flex gap-2">
            {record.status === "in-review" && isDirector && record.approvals.some((a) => a.status === "pending") && (
              <Button size="sm" disabled={savingDirectorApproval} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => void saveDirectorApprovedRecord(record)}>
                {savingDirectorApproval ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve All
              </Button>
            )}
            {record.status === "in-review" && currentUser?.id === record.requesterUserId && (
              <Button size="sm" variant="ghost" onClick={withdraw} className="text-xs">Withdraw</Button>
            )}
            {record.status === "rejected" && (
              <Button size="sm" onClick={resubmit} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Resubmit</Button>
            )}
            {record.status === "approved" && (
              <Badge className="bg-emerald-600 text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Ready for {gateCode} client review</Badge>
            )}
          </div>
        </div>
      </CardContent>

      {/* Decision dialog */}
      <Dialog open={!!decideTarget} onOpenChange={(v) => !v && setDecideTarget(undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{decideTarget?.action === "approve" ? "Approve" : "Reject"} as {decideTarget?.slot}</DialogTitle>
            <DialogDescription>{stageCode} → {gateCode} · {stageName}</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} placeholder={decideTarget?.action === "reject" ? "Required — reason for rejection" : "Optional note"} value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecideTarget(undefined)}>Cancel</Button>
            <Button onClick={commitDecision} className={decideTarget?.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}>
              Confirm {decideTarget?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
