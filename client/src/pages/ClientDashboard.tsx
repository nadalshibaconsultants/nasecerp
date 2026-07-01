import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCollection } from "@/lib/store";
import { projectsStore, documentsStore, tasksStore } from "@/lib/stores";
import { myClientProjects } from "@/lib/client-portal/api";
import {
  Building2,
  CheckCircle2,
  Clock,
  FileArchive,
  FolderKanban,
  ListChecks,
  LogOut,
} from "lucide-react";

const MODULE_LINKS = [
  { perm: "projects:read", label: "Projects", path: "/projects" },
  { perm: "documents:read", label: "Documents", path: "/documents" },
  { perm: "tasks:read", label: "Tasks", path: "/tasks" },
  { perm: "reports:read", label: "Reports", path: "/reports" },
  { perm: "finance:read", label: "Finance", path: "/finance" },
  { perm: "crm:read", label: "CRM", path: "/crm" },
] as const;

function clientCompany(displayName?: string) {
  if (!displayName) return "";
  const parts = displayName.split(/\s+[—-]\s+/);
  return (parts[1] || displayName).trim();
}

export default function ClientDashboard() {
  const { currentUser, logout, hasRole } = useAuth();
  const [, navigate] = useLocation();
  const projects = useCollection(projectsStore);
  const documents = useCollection(documentsStore);
  const tasks = useCollection(tasksStore);

  const company = clientCompany(currentUser?.displayName);
  // Director / PM open the portal in preview (admin) mode — they see every
  // project as a client would, without being scoped by client_project_access.
  const isPreview = !hasRole("client");

  // Authoritative project scope from the backend (client_project_access).
  // `null` = not loaded yet; on error we fall back to the legacy name match.
  const [assignedIds, setAssignedIds] = useState<Set<string> | null>(null);
  const [scopeFailed, setScopeFailed] = useState(false);
  useEffect(() => {
    if (isPreview) return; // preview mode shows all projects; skip the client-only API
    let alive = true;
    myClientProjects()
      .then((rows) => { if (alive) setAssignedIds(new Set(rows.map((r: any) => r.id))); })
      .catch(() => { if (alive) setScopeFailed(true); });
    return () => { alive = false; };
  }, [isPreview]);

  const myProjects = useMemo(() => {
    if (isPreview) return projects;                                       // admin preview: all projects
    if (assignedIds) return projects.filter((p) => assignedIds.has(p.id)); // backend scope
    if (scopeFailed) {                                                     // fallback: name match
      const q = company.toLowerCase();
      return projects.filter((p) => p.client.toLowerCase() === q || p.client.toLowerCase().includes(q));
    }
    return []; // loading
  }, [isPreview, assignedIds, scopeFailed, company, projects]);

  const projectIds = new Set(myProjects.map(p => p.id));
  const myDocs = documents
    .filter((d: any) => !d.projectId || projectIds.has(d.projectId))
    .slice(0, 6);
  const myTasks = tasks
    .filter((t: any) => !t.projectId || projectIds.has(t.projectId))
    .slice(0, 5);
  const avgProgress = myProjects.length
    ? Math.round(
        myProjects.reduce((sum, p) => sum + (p.progress || 0), 0) /
          myProjects.length
      )
    : 0;
  const pendingApprovals = myProjects.reduce(
    (sum, p) => sum + (p.pendingApprovals || 0),
    0
  );
  const openRisks = myProjects.reduce(
    (sum, p) => sum + (p.openRFIs || 0) + (p.openNCRs || 0),
    0
  );
  const allowedModules = MODULE_LINKS.filter((m) => currentUser?.extraPermissions?.includes(m.perm as any));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                NASEC Client Portal
                {isPreview && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px]">Preview · admin</Badge>}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {isPreview ? "Previewing the client view" : (company || "Client")}
              </div>
            </div>
          </div>
          {isPreview ? (
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/projects")}>
              <LogOut className="h-4 w-4" /> Exit preview
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">
                Client Dashboard
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {company || "Client"} project overview, deliverables, and current
              actions.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {currentUser?.username}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric
            icon={<FolderKanban className="h-4 w-4 text-blue-600" />}
            label="Projects"
            value={myProjects.length}
            sub="Visible to this client"
          />
          <Metric
            icon={<Clock className="h-4 w-4 text-amber-600" />}
            label="Pending approvals"
            value={pendingApprovals}
            sub="Awaiting action"
          />
          <Metric
            icon={<ListChecks className="h-4 w-4 text-emerald-600" />}
            label="Progress"
            value={`${avgProgress}%`}
            sub="Average completion"
          />
          <Metric
            icon={<FileArchive className="h-4 w-4 text-violet-600" />}
            label="Documents"
            value={myDocs.length}
            sub="Recent files"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myProjects.map(p => (
                <div
                  key={p.id}
                  className="w-full rounded-md border border-border bg-white p-3 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {p.nameEn}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {p.code} · {p.emirate} · {p.stage.replace("-", " ")}
                      </div>
                    </div>
                    <Badge
                      variant={p.health === "on-track" ? "default" : "outline"}
                      className="shrink-0 text-[10px]"
                    >
                      {p.health.replace("-", " ")}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={p.progress || 0} className="h-1.5" />
                    <span className="w-10 text-right text-xs tabular-nums">
                      {p.progress || 0}%
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    <span>RFIs {p.openRFIs}</span>
                    <span>NCRs {p.openNCRs}</span>
                    <span>Approvals {p.pendingApprovals}</span>
                  </div>
                </div>
              ))}
              {myProjects.length === 0 && (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No projects are linked to {company || "this client"} yet.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Client Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ActionRow
                  label="Approval requests"
                  value={pendingApprovals}
                  tone={pendingApprovals > 0 ? "amber" : "green"}
                />
                <ActionRow
                  label="Open RFI/NCR items"
                  value={openRisks}
                  tone={openRisks > 0 ? "amber" : "green"}
                />
                <ActionRow
                  label="Milestone reviews"
                  value={
                    myProjects.filter(p => p.stage === "pre-contract").length
                  }
                  tone="blue"
                />
              </CardContent>
            </Card>

            {allowedModules.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Allowed Modules</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {allowedModules.map((m) => (
                    <Button key={m.perm} variant="outline" size="sm" onClick={() => navigate(m.path)}>
                      {m.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {myDocs.map((d: any) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 rounded-md border p-2 text-xs"
                  >
                    <FileArchive className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">
                      {d.name || d.title || d.filename}
                    </span>
                    <Badge variant="outline" className="text-[9px]">
                      {d.status || "file"}
                    </Badge>
                  </div>
                ))}
                {myDocs.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No documents available.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tracked Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {myTasks.map((t: any) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-md border p-2 text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <Badge variant="outline" className="text-[9px]">
                      {t.status}
                    </Badge>
                  </div>
                ))}
                {myTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No tracked tasks yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-2 flex items-center gap-2">
          {icon}
          <span className="text-[11px] uppercase text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function ActionRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "green" | "blue";
}) {
  const colors = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <div className="flex items-center justify-between rounded-md border p-2 text-sm">
      <span>{label}</span>
      <Badge className={colors[tone]}>{value}</Badge>
    </div>
  );
}
