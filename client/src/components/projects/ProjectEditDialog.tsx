import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { projectsStore, usersStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import { apiFetch } from "@/lib/backend/api";
import type { Project, ProjectStage, ProjectHealth } from "@/lib/projects/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  onSaved?: (project: Project) => void;
};

export default function ProjectEditDialog({ open, onOpenChange, projectId, onSaved }: Props) {
  const projects = useCollection(projectsStore);
  const users = useCollection(usersStore);
  const actor = useCurrentActor();
  const original = projects.find((p) => p.id === projectId);
  const [draft, setDraft] = useState<Partial<Project>>(original || {});

  useEffect(() => { if (original) setDraft(original); }, [original?.id, open]);

  if (!original) return null;

  async function syncTeamMembers(baseProject: Project, nextProject: Project) {
    const before = new Set(baseProject.teamUserIds || []);
    const after = new Set(nextProject.teamUserIds || []);
    const additions = [...after].filter((id) => !before.has(id));
    const removals = [...before].filter((id) => !after.has(id));

    await Promise.all([
      ...additions.map((userId) => apiFetch(`/projects/${baseProject.id}/team`, {
        method: "POST",
        body: { userId, roleOnProject: "Project team" },
      })),
      ...removals.map((userId) => apiFetch(`/projects/${baseProject.id}/team/${userId}`, {
        method: "DELETE",
      })),
    ]);
  }

  function projectPayload(p: Project) {
    return {
      code: p.code,
      nameEn: p.nameEn,
      nameAr: p.nameAr || undefined,
      stage: p.stage,
      health: p.health,
      type: p.type || undefined,
      plotNo: p.plotNo || undefined,
      community: p.community || undefined,
      emirate: p.emirate || undefined,
      authority: p.authority || undefined,
      client: p.client || undefined,
      contractValue: Number(p.contractValue || 0),
      feeType: p.feeType || undefined,
      startDate: p.startDate && p.startDate !== "—" ? p.startDate : undefined,
      targetCompletion: p.targetCompletion && p.targetCompletion !== "—" ? p.targetCompletion : undefined,
      gfa: Number(p.gfa || 0),
      plotArea: Number(p.plotArea || 0),
      floors: Number(p.floors || 0),
      currentSubStage: Number(p.currentSubStage || 0),
      progress: Number(p.progress || 0),
      budgetConsumed: Number(p.budgetConsumed || 0),
      hoursLogged: Number(p.hoursLogged || 0),
      hoursPlanned: Number(p.hoursPlanned || 0),
      daysToDeadline: Number(p.daysToDeadline || 0),
      openRfis: Number(p.openRFIs || 0),
      openNcrs: Number(p.openNCRs || 0),
      pendingApprovals: Number(p.pendingApprovals || 0),
      starred: !!p.starred,
      pmUserId: p.pmUserId || null,
    };
  }

  async function save() {
    if (!draft.nameEn?.trim()) { toast.error("Name required"); return; }
    const baseProject = original;
    if (!baseProject) return;
    const nextProject = { ...baseProject, ...draft } as Project;
    try {
      const saved = await apiFetch<Project>(`/projects/${baseProject.id}`, {
        method: "PATCH",
        body: projectPayload(nextProject),
      });
      await syncTeamMembers(baseProject, nextProject);
      projectsStore.refresh?.();
      onSaved?.({ ...nextProject, ...saved });
      auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "projects", action: "update", subject: `Project · ${draft.nameEn}`, detail: `Stage: ${draft.stage} · Health: ${draft.health}` });
      toast.success("Project updated");
      onOpenChange(false);
    } catch (err: any) {
      projectsStore.refresh?.();
      toast.error(err?.message || "Could not update project");
    }
  }
  function toggleTeamMember(userId: string) {
    setDraft((d) => {
      const team = new Set(d.teamUserIds || []);
      team.has(userId) ? team.delete(userId) : team.add(userId);
      return { ...d, teamUserIds: Array.from(team) };
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Edit project · <span className="font-mono text-sm text-slate-500">{original.code}</span></DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Name (EN)</Label><Input value={draft.nameEn || ""} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Name (AR)</Label><Input value={draft.nameAr || ""} onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Client</Label><Input value={draft.client || ""} onChange={(e) => setDraft({ ...draft, client: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Type</Label><Input value={draft.type || ""} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Plot No.</Label><Input value={draft.plotNo || ""} onChange={(e) => setDraft({ ...draft, plotNo: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Community</Label><Input value={draft.community || ""} onChange={(e) => setDraft({ ...draft, community: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Emirate</Label><Input value={draft.emirate || ""} onChange={(e) => setDraft({ ...draft, emirate: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Authority</Label><Input value={draft.authority || ""} onChange={(e) => setDraft({ ...draft, authority: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Stage</Label>
              <Select value={draft.stage} onValueChange={(v) => setDraft({ ...draft, stage: v as ProjectStage })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pipeline">Pipeline</SelectItem><SelectItem value="pre-contract">Pre-Contract</SelectItem><SelectItem value="post-contract">Post-Contract</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Health</Label>
              <Select value={draft.health} onValueChange={(v) => setDraft({ ...draft, health: v as ProjectHealth })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="on-track">On track</SelectItem><SelectItem value="at-risk">At risk</SelectItem><SelectItem value="delayed">Delayed</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Start date</Label><Input type="date" value={draft.startDate || ""} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Target completion</Label><Input type="date" value={draft.targetCompletion || ""} onChange={(e) => setDraft({ ...draft, targetCompletion: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Contract value (AED)</Label><Input type="number" value={draft.contractValue || 0} onChange={(e) => setDraft({ ...draft, contractValue: Number(e.target.value || 0) })} className="mt-1" /></div>
            <div><Label className="text-xs">GFA (sqm)</Label><Input type="number" value={draft.gfa || 0} onChange={(e) => setDraft({ ...draft, gfa: Number(e.target.value || 0) })} className="mt-1" /></div>
            <div><Label className="text-xs">Plot area</Label><Input type="number" value={draft.plotArea || 0} onChange={(e) => setDraft({ ...draft, plotArea: Number(e.target.value || 0) })} className="mt-1" /></div>
            <div><Label className="text-xs">Floors</Label><Input type="number" value={draft.floors || 0} onChange={(e) => setDraft({ ...draft, floors: Number(e.target.value || 0) })} className="mt-1" /></div>
            <div><Label className="text-xs">Project Manager</Label>
              <Select value={draft.pmUserId || ""} onValueChange={(v) => setDraft({ ...draft, pmUserId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="(none)" /></SelectTrigger>
                <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName} ({u.role})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Team members (controls who can see this project)</Label>
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-auto p-2 border border-slate-200 rounded">
              {users.map((u) => {
                const active = (draft.teamUserIds || []).includes(u.id);
                return (
                  <label key={u.id} className={`flex items-center gap-2 p-1 rounded cursor-pointer text-xs ${active ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                    <input type="checkbox" checked={active} onChange={() => toggleTeamMember(u.id)} className="accent-emerald-600" />
                    <span className="truncate">{u.displayName}</span>
                    <span className="ml-auto text-[9px] text-slate-500">{u.role}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
