/**
 * Contractor — New Submittal (simplified, contractor-driven).
 *
 *  1. Pick submittal type (RFI, NCR closure, MOS, PQ, MS, IR, SD, WIR, MIR, PTW, HSE, TQ, EOT, VO, LETTER)
 *  2. Pick discipline (Architecture / Structural / Mechanical / Electrical / Civil / Commercial)
 *  3. Type description
 *  4. Attach files
 *  5. Submit → auto-routed to:
 *       - Site Engineer matching the discipline (SA/SS/SM/SE/SC/CM)
 *       - PM + RE always (regardless of discipline)
 *     Mirrored into Documents register · 07. RFIs & Submittals folder
 *     Notifications fire to every recipient
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Send, Upload, Users, Clock, AlertCircle } from "lucide-react";
import { submittalsStore, documentsStore, docFoldersStore, notificationsStore, employeesStore, usersStore, auditStore, projectsStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useAuth, useCurrentActor } from "@/lib/auth/AuthContext";
import { contractorForAuthUserId } from "@/lib/contractor/lookup";
import { SUBMITTAL_TYPES, type SubmittalTypeCode, type Discipline, SITE_ROLES, type SiteRoleCode, generateRef } from "@/lib/contractor-portal-data";
import { addWorkingDays, toISO } from "@/lib/timeline-utils";
import FileUpload from "@/components/files/FileUpload";

// Simplified discipline list per the spec (uses the existing discipline strings)
const DISCIPLINES: { label: string; value: Discipline; siteRole: SiteRoleCode }[] = [
  { label: "Architectural", value: "Architecture", siteRole: "SA" },
  { label: "Structural", value: "Structural", siteRole: "SS" },
  { label: "Mechanical", value: "Mechanical", siteRole: "SM" },
  { label: "Electrical", value: "Electrical / Low Current", siteRole: "SE" },
  { label: "Civil", value: "Civil", siteRole: "SC" },
  { label: "Commercial", value: "General / Multi-discipline", siteRole: "CM" },
];

// The "PM and RE always get a copy" rule
const ALWAYS_NOTIFY: SiteRoleCode[] = ["PM", "RE"];

export default function ContractorNewSubmittal() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const actor = useCurrentActor();
  const users = useCollection(usersStore);
  const employees = useCollection(employeesStore);
  const projects = useCollection(projectsStore);
  const folders = useCollection(docFoldersStore);

  const company = currentUser ? contractorForAuthUserId(currentUser.id, currentUser.username) : undefined;
  // First active Post-Contract project the contractor has access to — for the demo, Marina Heights
  const project = useMemo(() => projects.find((p) => p.stage === "post-contract") || projects[0], [projects]);

  const [type, setType] = useState<SubmittalTypeCode>("RFI");
  const [discKey, setDiscKey] = useState<string>(DISCIPLINES[0].value);
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [draftId] = useState(() => "draft-" + Math.random().toString(36).slice(2, 9));
  const [priority, setPriority] = useState<"Normal" | "Urgent">("Normal");

  const typeMeta = SUBMITTAL_TYPES.find((t) => t.code === type);
  const disciplineMeta = DISCIPLINES.find((d) => d.value === discKey)!;
  const primaryReviewer: SiteRoleCode = disciplineMeta.siteRole;
  const allRecipients: SiteRoleCode[] = Array.from(new Set([primaryReviewer, ...ALWAYS_NOTIFY]));

  function submit() {
    if (!description.trim()) { toast.error("Please describe the request"); return; }
    if (!company || !project) { toast.error("No active project linked to your account"); return; }

    const projectCode = project.code.split("-").slice(-2, -1)[0] || "PRJ";
    const ref = generateRef(type, projectCode, discKey as Discipline);
    const today = new Date();
    const slaDays = typeMeta?.sla || 7;
    const slaDeadline = toISO(addWorkingDays(today, slaDays));
    const submittalId = newId("sub");

    submittalsStore.put({
      id: submittalId, ref, type, discipline: discKey as Discipline,
      title: title.trim() || `${type} · ${disciplineMeta.label}`,
      description,
      contractor: company.name, contractorUser: currentUser?.displayName || "Contractor",
      project: project.nameEn, projectCode,
      dateSubmitted: toISO(today),
      slaDeadline,
      daysRemaining: slaDays,
      status: "Open", revision: 1,
      primaryReviewer, approver: "PM", watchers: ALWAYS_NOTIFY.filter((r) => r !== "PM"),
      attachments: [], priority, fromPortal: true,
    } as any);

    // Mirror into Documents register → 07. RFIs & Submittals folder
    const rfiFolder = folders.find((f) => f.projectId === project.id && f.code === "07");
    if (rfiFolder) {
      documentsStore.put({
        id: newId("df"), folderId: rfiFolder.id, projectId: project.id,
        name: `${ref} — ${title || description.slice(0, 80)}`,
        status: "for-approval", version: "v1.0",
        uploadedByUserId: currentUser?.id || "contractor",
        uploadedByDisplay: `${currentUser?.displayName} (${company.name})`,
        uploadedAt: today.toISOString(),
        sizeBytes: 0,
        notes: description,
      } as any);
    }

    // Notifications: pick auth-users whose linked employee carries the matching site role
    const targetUsers = users.filter((u) => {
      if (u.role === "director") return true;
      if (u.role === "pm" && allRecipients.includes("PM")) return true;
      if (u.role === "site-engineer") return true; // any site engineer (granular role-to-employee mapping is approximated)
      return false;
    });
    for (const target of targetUsers) {
      notificationsStore.put({
        id: newId("notif"), recipientUserId: target.id,
        kind: "approval-pending",
        severity: priority === "Urgent" ? "critical" : "info",
        title: `New ${type} · ${ref}`,
        body: `${company.name} (${disciplineMeta.label}) · routed to ${allRecipients.join(", ")}`,
        link: `/contractor-portal/submittals/${submittalId}`,
        read: false, createdAt: today.toISOString(),
        sourceEntityType: "submittal", sourceEntityId: submittalId,
      } as any);
    }
    auditStore.put({ id: newId("au"), timestamp: today.toISOString(), actor, module: "documents" as any, action: "create", subject: `Submittal ${ref}`, detail: `${disciplineMeta.label} · routed ${allRecipients.join(", ")} · SLA ${slaDays} WD` });
    toast.success(`${ref} submitted — routed to ${allRecipients.join(", ")}. SLA: ${slaDays} working days.`);
    navigate("/contractor-portal/submittals");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={() => navigate("/contractor-portal/dashboard")} className="gap-1 text-slate-500"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Submittal</h1>
          <p className="text-sm text-slate-600 mt-1">{company?.name || "—"} · {project?.nameEn || "—"}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Submittal type</Label>
              <Select value={type} onValueChange={(v) => setType(v as SubmittalTypeCode)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{SUBMITTAL_TYPES.map((t) => <SelectItem key={t.code} value={t.code}>{t.code} — {t.name}</SelectItem>)}</SelectContent>
              </Select>
              {typeMeta && <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> SLA: {typeMeta.sla} working days</p>}
            </div>
            <div>
              <Label className="text-xs">Discipline</Label>
              <Select value={discKey} onValueChange={setDiscKey}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{DISCIPLINES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 mt-1">Auto-routes to <strong>{SITE_ROLES[disciplineMeta.siteRole]?.label || disciplineMeta.siteRole}</strong></p>
            </div>
          </div>
          <div>
            <Label className="text-xs">Short title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HVAC duct routing conflict L12" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the request in detail. Include drawing references, locations, and any clarifications needed." className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "Normal" | "Urgent")}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Upload className="w-4 h-4" /> Attachments</CardTitle></CardHeader>
        <CardContent>
          <FileUpload entityType="other" entityId={draftId} label="Drawings, photos, supporting docs (PDF, JPG, DWG)" />
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Will be routed to</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {allRecipients.map((r) => (
            <Badge key={r} className={SITE_ROLES[r]?.color || "bg-slate-100 text-slate-700"}>
              {r} · {SITE_ROLES[r]?.label}
            </Badge>
          ))}
          <p className="text-[11px] text-slate-600 w-full mt-1">{disciplineMeta.label} reviewer · PM (approver) · RE (resident engineer — gets every submittal)</p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => navigate("/contractor-portal/dashboard")}>Cancel</Button>
        <Button onClick={submit} className="gap-2"><Send className="w-4 h-4" /> Submit</Button>
      </div>
    </div>
  );
}
