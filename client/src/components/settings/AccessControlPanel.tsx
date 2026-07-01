/**
 * Director/HR access control. Lists the real backend users (GET /admin/users),
 * lets Director/HR add client portal users, and lets them grant extra module access per user on top of their role
 * (PATCH /admin/users/:id { extraPermissions }). Role-granted modules are shown
 * locked; everything else is a toggle.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, ShieldCheck, Lock, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/backend/api";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { listClientProjects, saveClientProjects } from "@/lib/client-portal/api";
import { projectsStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import type { Permission, Role } from "@/lib/auth/types";

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  office?: string | null;
  status: string;
  extraPermissions?: string[];
};

// Module-level grants a Director can hand out.
const GRANTS: { perm: Permission; label: string }[] = [
  { perm: "hr:read", label: "HR & Workforce" },
  { perm: "hr:payroll:read", label: "Payroll (read)" },
  { perm: "attendance:read", label: "Attendance" },
  { perm: "finance:read", label: "Finance" },
  { perm: "finance:write", label: "Finance — edit" },
  { perm: "finance:invoices:write", label: "Finance — invoices" },
  { perm: "projects:read", label: "Projects" },
  { perm: "projects:write", label: "Projects — edit" },
  { perm: "tasks:read", label: "Tasks" },
  { perm: "tasks:write", label: "Tasks — edit" },
  { perm: "crm:read", label: "CRM" },
  { perm: "crm:write", label: "CRM — edit" },
  { perm: "documents:read", label: "Documents" },
  { perm: "documents:write", label: "Documents — edit" },
  { perm: "reports:read", label: "Reports & BI" },
];

export default function AccessControlPanel() {
  const projects = useCollection(projectsStore);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [clientDraft, setClientDraft] = useState({
    company: "",
    contact: "",
    email: "",
    password: "password",
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientProjectIds, setClientProjectIds] = useState<Set<string>>(new Set());
  const [draftClientProjectIds, setDraftClientProjectIds] = useState<Set<string>>(new Set());
  const [loadingClientProjects, setLoadingClientProjects] = useState(false);
  const [savingClientProjects, setSavingClientProjects] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const rows = await apiFetch<AdminUser[]>("/admin/users");
      setUsers(rows);
    } catch {
      toast.error("Couldn't load users");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const selected = users.find(u => u.id === selectedId);
  const roleHas = (perm: Permission) => {
    const rp = ROLE_PERMISSIONS[selected?.role ?? "employee"] || [];
    return rp.includes("*") || rp.includes(perm);
  };

  function select(u: AdminUser) {
    setSelectedId(u.id);
    setDraft(new Set(u.extraPermissions ?? []));
  }
  useEffect(() => {
    if (!selected || selected.role !== "client") {
      setClientProjectIds(new Set());
      setDraftClientProjectIds(new Set());
      return;
    }
    let cancelled = false;
    setLoadingClientProjects(true);
    listClientProjects(selected.id)
      .then((rows) => {
        if (cancelled) return;
        const ids = new Set(rows.map((p: any) => p.id));
        setClientProjectIds(ids);
        setDraftClientProjectIds(new Set(ids));
      })
      .catch(() => toast.error("Couldn't load client project access"))
      .finally(() => {
        if (!cancelled) setLoadingClientProjects(false);
      });
    return () => { cancelled = true; };
  }, [selected?.id, selected?.role]);

  function toggle(perm: Permission) {
    setDraft(prev => {
      const next = new Set(prev);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return next;
    });
  }
  function toggleClientProject(projectId: string) {
    setDraftClientProjectIds(prev => {
      const next = new Set(prev);
      next.has(projectId) ? next.delete(projectId) : next.add(projectId);
      return next;
    });
  }
  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const extraPermissions = Array.from(draft);
      await apiFetch(`/admin/users/${selected.id}`, {
        method: "PATCH",
        body: { extraPermissions },
      });
      setUsers(us =>
        us.map(u => (u.id === selected.id ? { ...u, extraPermissions } : u))
      );
      toast.success(`Access updated for ${selected.displayName}`);
    } catch {
      toast.error("Couldn't save access changes");
    } finally {
      setSaving(false);
    }
  }
  async function createClient() {
    if (
      !clientDraft.company.trim() ||
      !clientDraft.contact.trim() ||
      !clientDraft.email.trim()
    ) {
      toast.error("Company, contact, and email are required");
      return;
    }
    setCreatingClient(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: {
          email: clientDraft.email.trim(),
          password: clientDraft.password,
          displayName: `${clientDraft.contact.trim()} - ${clientDraft.company.trim()}`,
          role: "client",
          office: "dubai",
        },
      });
      toast.success(`Client login created for ${clientDraft.company}`);
      setClientOpen(false);
      setClientDraft({
        company: "",
        contact: "",
        email: "",
        password: "password",
      });
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't create client");
    } finally {
      setCreatingClient(false);
    }
  }
  async function saveProjectsForClient() {
    if (!selected || selected.role !== "client") return;
    setSavingClientProjects(true);
    try {
      const projectIds = Array.from(draftClientProjectIds);
      await saveClientProjects(selected.id, { projectIds, role: "viewer" });
      setClientProjectIds(new Set(projectIds));
      toast.success(`Project access updated for ${selected.displayName}`);
    } catch {
      toast.error("Couldn't save project access");
    } finally {
      setSavingClientProjects(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      u =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const dirty = useMemo(() => {
    if (!selected) return false;
    const cur = new Set(selected.extraPermissions ?? []);
    if (cur.size !== draft.size) return true;
    for (const p of Array.from(draft)) if (!cur.has(p)) return true;
    return false;
  }, [selected, draft]);
  const projectsDirty = useMemo(() => {
    if (!selected || selected.role !== "client") return false;
    if (clientProjectIds.size !== draftClientProjectIds.size) return true;
    for (const id of Array.from(draftClientProjectIds)) if (!clientProjectIds.has(id)) return true;
    return false;
  }, [selected, clientProjectIds, draftClientProjectIds]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-3">
      {/* User list */}
      <Card>
        <CardContent className="p-3">
          <Button
            size="sm"
            className="mb-2 w-full gap-2"
            onClick={() => setClientOpen(true)}
          >
            <UserPlus className="h-4 w-4" /> Add client
          </Button>
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="pl-7 h-9"
            />
          </div>
          <div className="max-h-[480px] overflow-auto -mx-1">
            {loading && (
              <p className="text-xs text-muted-foreground px-2 py-4">
                Loading users…
              </p>
            )}
            {!loading &&
              filtered.map(u => (
                <button
                  key={u.id}
                  onClick={() => select(u)}
                  className={`w-full text-left px-2 py-2 rounded flex items-center justify-between gap-2 transition-colors ${selectedId === u.id ? "bg-primary/10" : "hover:bg-muted"}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {u.displayName}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {u.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(u.extraPermissions?.length ?? 0) > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px]">
                        +{u.extraPermissions!.length}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[9px]">
                      {ROLE_LABELS[u.role]}
                    </Badge>
                  </div>
                </button>
              ))}
            {!loading && filtered.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4">
                No users match.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grant editor */}
      <Card>
        <CardContent className="p-4">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
              <ShieldCheck className="w-8 h-8 mb-2" />
              <p className="text-sm">
                Select a user to manage which modules they can access.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h3 className="text-base font-semibold">
                    {selected.displayName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selected.email} · {ROLE_LABELS[selected.role]}
                  </p>
                </div>
                <Button size="sm" onClick={save} disabled={!dirty || saving}>
                  {saving ? "Saving…" : "Save access"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Modules from the role are <Lock className="w-3 h-3 inline" />{" "}
                locked. Tick any extra module to grant this user access to it.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GRANTS.map(({ perm, label }) => {
                  const fromRole = roleHas(perm);
                  const checked = fromRole || draft.has(perm);
                  return (
                    <label
                      key={perm}
                      className={`flex items-center gap-2 p-2.5 rounded border text-sm ${fromRole ? "bg-muted/50 border-border cursor-default" : "border-border hover:border-primary/40 cursor-pointer"}`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={fromRole}
                        onCheckedChange={() => toggle(perm)}
                      />
                      <span className="flex-1">{label}</span>
                      {fromRole ? (
                        <Badge variant="outline" className="text-[9px] gap-1">
                          <Lock className="w-2.5 h-2.5" /> role
                        </Badge>
                      ) : (
                        draft.has(perm) && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px]">
                            granted
                          </Badge>
                        )
                      )}
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                Changes apply on the user's next page load (or immediately after
                they re-open the app).
              </p>
              {selected.role === "client" && (
                <div className="mt-5 border-t pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold">Client project access</h4>
                      <p className="text-xs text-muted-foreground">
                        Select exactly which project information this client can open.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={saveProjectsForClient}
                      disabled={!projectsDirty || savingClientProjects || loadingClientProjects}
                    >
                      {savingClientProjects ? "Saving..." : "Save projects"}
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {projects.map((project) => (
                      <label
                        key={project.id}
                        className="flex items-center gap-2 p-2.5 rounded border border-border hover:border-primary/40 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={draftClientProjectIds.has(project.id)}
                          onCheckedChange={() => toggleClientProject(project.id)}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {project.code ? `${project.code} - ${project.nameEn}` : project.nameEn}
                        </span>
                      </label>
                    ))}
                    {!loadingClientProjects && projects.length === 0 && (
                      <p className="text-xs text-muted-foreground">No projects found.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={clientOpen} onOpenChange={setClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add client login</DialogTitle>
            <DialogDescription>
              Create a client portal account. The client will land on the client
              dashboard after login.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Client company</Label>
              <Input
                className="mt-1"
                value={clientDraft.company}
                onChange={e =>
                  setClientDraft({ ...clientDraft, company: e.target.value })
                }
                placeholder="Emaar Properties"
              />
            </div>
            <div>
              <Label className="text-xs">Contact name</Label>
              <Input
                className="mt-1"
                value={clientDraft.contact}
                onChange={e =>
                  setClientDraft({ ...clientDraft, contact: e.target.value })
                }
                placeholder="Reem Al Falasi"
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                className="mt-1"
                value={clientDraft.email}
                onChange={e =>
                  setClientDraft({ ...clientDraft, email: e.target.value })
                }
                placeholder="client@example.com"
              />
            </div>
            <div>
              <Label className="text-xs">Temporary password</Label>
              <Input
                className="mt-1"
                type="password"
                value={clientDraft.password}
                onChange={e =>
                  setClientDraft({ ...clientDraft, password: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createClient} disabled={creatingClient}>
              {creatingClient ? "Creating..." : "Create client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
