/**
 * Project Management — store-driven, ACL-aware.
 * Pipeline · Pre-Contract · Post-Contract · Completed.
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Plus, FolderKanban, Clock, CheckCircle2, HardHat, Pencil, Trash2, ArrowRight, Calendar, Users, Search, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { projectsStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { visibleProjects, canEditProject } from "@/lib/projects/acl";
import { useAuth, useCurrentActor } from "@/lib/auth/AuthContext";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { toast } from "sonner";
import type { Project, ProjectStage } from "@/lib/projects/types";

const stageColors: Record<ProjectStage, string> = {
  pipeline: "bg-blue-100 text-blue-700 border-blue-200",
  "pre-contract": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "post-contract": "bg-orange-100 text-orange-700 border-orange-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
};
const healthColors: Record<string, string> = {
  "on-track": "bg-emerald-100 text-emerald-700",
  "at-risk": "bg-amber-100 text-amber-700",
  "delayed": "bg-red-100 text-red-700",
};

export default function ProjectsModule() {
  const [, navigate] = useLocation();
  const { currentUser, hasRole, can } = useAuth();
  const actor = useCurrentActor();
  const all = useCollection(projectsStore);
  const visible = useMemo(() => visibleProjects(all, currentUser), [all, currentUser]);
  const [search, setSearch] = useState("");
  const isClient = currentUser?.role === "client";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((p) => p.nameEn.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.client.toLowerCase().includes(q));
  }, [visible, search]);

  const byStage = (s: ProjectStage) => filtered.filter((p) => p.stage === s);
  const pipeline = byStage("pipeline");
  const pre = byStage("pre-contract");
  const post = byStage("post-contract");
  const completed = byStage("completed");

  function deleteProject(p: Project) {
    if (!confirm(`Delete ${p.nameEn}? This is irreversible.`)) return;
    projectsStore.remove(p.id);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "delete", subject: `Project deleted · ${p.nameEn}`, detail: p.code });
    toast.success("Project deleted");
  }

  const canCreate = can("projects:write");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isClient
              ? `Showing ${visible.length} assigned project${visible.length === 1 ? "" : "s"}.`
              : hasRole("director","hr-manager","finance-manager","bd-manager")
              ? `Showing all ${all.length} projects.`
              : `Showing ${visible.length} project${visible.length === 1 ? "" : "s"} you're on out of ${all.length} total.`}
          </p>
        </div>
        {canCreate && !isClient && <Button onClick={() => navigate("/projects/new")} className="gap-2"><Plus className="w-4 h-4" /> New Project</Button>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={<FolderKanban className="w-5 h-5 text-blue-600" />} label="Pipeline" value={pipeline.length} bg="bg-blue-50" />
        <KPI icon={<Clock className="w-5 h-5 text-emerald-600" />} label="Pre-Contract (Design)" value={pre.length} bg="bg-emerald-50" />
        <KPI icon={<HardHat className="w-5 h-5 text-orange-600" />} label="Post-Contract (Construction)" value={post.length} bg="bg-orange-50" />
        <KPI icon={<CheckCircle2 className="w-5 h-5 text-slate-600" />} label="Completed" value={completed.length} bg="bg-slate-50" />
      </div>

      <Card>
        <CardContent className="p-3 flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
            <Input className="pl-8 h-9 w-72" placeholder="Search name, code, client…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {!hasRole("director","hr-manager","finance-manager","bd-manager") && (
            <Badge variant="outline" className="ml-auto text-[10px]"><Lock className="w-3 h-3 mr-1" /> ACL: only your assigned projects · {ROLE_LABELS[currentUser!.role]}</Badge>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline ({pipeline.length})</TabsTrigger>
          <TabsTrigger value="pre">Pre-Contract ({pre.length})</TabsTrigger>
          <TabsTrigger value="post">Post-Contract ({post.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-3"><Grid projects={pipeline} onEdit={(p) => navigate(`/projects/pipeline/${p.id}`)} onDelete={deleteProject} canEdit={(p) => !isClient && canEditProject(p, currentUser)} stage="pipeline" /></TabsContent>
        <TabsContent value="pre" className="mt-3"><Grid projects={pre} onEdit={(p) => navigate(`/projects/pre-contract/${p.id}`)} onDelete={deleteProject} canEdit={(p) => !isClient && canEditProject(p, currentUser)} stage="pre-contract" /></TabsContent>
        <TabsContent value="post" className="mt-3"><Grid projects={post} onEdit={(p) => navigate(`/projects/post-contract/${p.id}`)} onDelete={deleteProject} canEdit={(p) => !isClient && canEditProject(p, currentUser)} stage="post-contract" /></TabsContent>
        <TabsContent value="completed" className="mt-3"><Grid projects={completed} onEdit={(p) => navigate(`/projects/completed/${p.id}`)} onDelete={deleteProject} canEdit={(p) => !isClient && canEditProject(p, currentUser)} stage="completed" /></TabsContent>
      </Tabs>
    </div>
  );
}

function Grid({ projects, onEdit, onDelete, canEdit, stage }: { projects: Project[]; onEdit: (p: Project) => void; onDelete: (p: Project) => void; canEdit: (p: Project) => boolean; stage: ProjectStage }) {
  if (projects.length === 0) return <Card><CardContent className="p-6 text-sm text-slate-500 text-center">No projects in this stage.</CardContent></Card>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {projects.map((p) => (
        <Card key={p.id} className="hover:border-slate-300 transition">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><Badge className={`border ${stageColors[stage]}`}>{stage.replace("-", " ")}</Badge>{p.health && <Badge className={`${healthColors[p.health]}`}>{p.health.replace("-", " ")}</Badge>}</div>
                <div className="font-semibold mt-1 truncate">{p.nameEn}</div>
                <div className="text-xs text-slate-500 font-mono">{p.code}</div>
              </div>
              <div className="flex">
                {canEdit(p) && <Button size="sm" variant="ghost" className="h-7" onClick={() => onEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>}
                {canEdit(p) && <Button size="sm" variant="ghost" className="h-7" onClick={() => onDelete(p)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div><span className="text-slate-500">Client</span><div className="font-medium truncate">{p.client}</div></div>
              <div><span className="text-slate-500">Type</span><div>{p.type}</div></div>
              <div><span className="text-slate-500">Fee</span><div className="tabular-nums">AED {p.contractValue.toLocaleString()}</div></div>
              <div><span className="text-slate-500">Team</span><div className="flex items-center gap-1"><Users className="w-3 h-3" />{(p.teamUserIds || []).length}</div></div>
              <div className="col-span-2"><span className="text-slate-500">Schedule</span><div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {p.startDate} → {p.targetCompletion}</div></div>
            </div>
            {stage !== "pipeline" && stage !== "completed" && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1"><span>Progress</span><span>{p.progress}%</span></div>
                <Progress value={p.progress} className="h-1.5" />
              </div>
            )}
            <div className="flex justify-end mt-3"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onEdit(p)}>Open <ArrowRight className="w-3 h-3 ml-1" /></Button></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KPI({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
      <div><p className="text-2xl font-bold font-data">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
    </CardContent></Card>
  );
}
