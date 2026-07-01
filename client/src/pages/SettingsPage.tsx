/**
 * Settings — HR/Admin user management + access-control matrix.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Shield, Plus, Trash2, KeyRound, UserCheck, UserX, Pencil } from "lucide-react";
import { usersStore, employeesStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { useAuth, useCurrentActor } from "@/lib/auth/AuthContext";
import BackendPanel from "@/components/auth/BackendPanel";
import OfficesPanel from "@/components/office/OfficesPanel";
import AccessControlPanel from "@/components/settings/AccessControlPanel";
import type { Role, User, Permission } from "@/lib/auth/types";

export default function SettingsPage() {
  const { hasRole } = useAuth();
  const canManageSettings = hasRole("director", "hr-manager");
  const users = useCollection(usersStore);
  const employees = useCollection(employeesStore);
  const actor = useCurrentActor();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | undefined>(undefined);
  const [draft, setDraft] = useState<Partial<User>>({ role: "employee", active: true });
  const [pwReset, setPwReset] = useState<User | undefined>(undefined);
  const [newPw, setNewPw] = useState("");

  function openAdd() { setEditing(undefined); setDraft({ role: "employee", active: true, avatarColor: "#64748b" }); setOpen(true); }
  function openEdit(u: User) { setEditing(u); setDraft({ ...u }); setOpen(true); }

  function save() {
    if (!draft.username || !draft.displayName || !draft.role) { toast.error("Fill required fields"); return; }
    const u: User = {
      id: editing?.id || newId("u"),
      username: draft.username!, displayName: draft.displayName!,
      role: draft.role as Role, active: draft.active ?? true,
      employeeId: draft.employeeId, avatarColor: draft.avatarColor || "#64748b",
      passwordHash: draft.passwordHash || editing?.passwordHash || "password",
      lastLoginAt: editing?.lastLoginAt,
    };
    usersStore.put(u);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: editing ? "update" : "create", subject: `User · ${u.displayName}`, detail: `Role: ${u.role}` });
    toast.success(editing ? "User updated" : "User created");
    setOpen(false);
  }
  function toggleActive(u: User) {
    usersStore.put({ ...u, active: !u.active });
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "update", subject: `User ${u.active ? "deactivated" : "activated"} · ${u.displayName}` });
    toast.success(u.active ? "Deactivated" : "Activated");
  }
  function resetPassword() {
    if (!pwReset || !newPw) { toast.error("Set a new password"); return; }
    usersStore.put({ ...pwReset, passwordHash: newPw });
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "update", subject: `Password reset · ${pwReset.displayName}` });
    toast.success("Password reset");
    setPwReset(undefined); setNewPw("");
  }
  function deleteUser(u: User) {
    if (!confirm(`Delete ${u.displayName}? Their audit history is preserved.`)) return;
    usersStore.remove(u.id);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "delete", subject: `User deleted · ${u.displayName}` });
    toast.success("Deleted");
  }

  if (!canManageSettings) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Settings access is restricted to HR and Admin users. You can view your own profile via the user menu.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="flex flex-wrap h-auto overflow-x-auto">
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" /> User management</TabsTrigger>
          <TabsTrigger value="access" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Access control</TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Permission matrix</TabsTrigger>
          <TabsTrigger value="company" className="gap-1.5">Company</TabsTrigger>
          <TabsTrigger value="backend" className="gap-1.5">Backend</TabsTrigger>
          <TabsTrigger value="offices" className="gap-1.5">Offices</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Users · {users.length}</h2>
            <Button size="sm" className="gap-1.5" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add user</Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">Email</th><th className="text-left px-3 py-2">Role</th><th className="text-left px-3 py-2">Linked employee</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Last login</th><th className="text-right px-3 py-2">Actions</th></tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const initials = u.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("");
                    const emp = employees.find((e) => e.id === u.employeeId);
                    return (
                      <tr key={u.id} className="border-t border-slate-100">
                        <td className="px-3 py-2"><div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] text-white" style={{ background: u.avatarColor }}>{initials}</AvatarFallback></Avatar><span className="font-medium">{u.displayName}</span></div></td>
                        <td className="px-3 py-2 text-xs">{u.username}</td>
                        <td className="px-3 py-2"><Badge variant="outline">{ROLE_LABELS[u.role]}</Badge></td>
                        <td className="px-3 py-2 text-xs">{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</td>
                        <td className="px-3 py-2">{u.active ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge> : <Badge className="bg-slate-100 text-slate-700 border-slate-200">Inactive</Badge>}</td>
                        <td className="px-3 py-2 text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-GB", { timeZone: "UTC", hour12: true }) : "—"}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => openEdit(u)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => { setPwReset(u); setNewPw(""); }}><KeyRound className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => toggleActive(u)}>{u.active ? <UserX className="w-3.5 h-3.5 text-amber-600" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}</Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => deleteUser(u)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-3 space-y-3">
          <div>
            <h2 className="text-base font-semibold">Access control</h2>
            <p className="text-xs text-muted-foreground">HR and Admin users can grant module access beyond a user's role.</p>
          </div>
          <AccessControlPanel />
        </TabsContent>

        <TabsContent value="permissions" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Role permission matrix</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-auto">
              <PermissionMatrix />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Company information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Company" value="Nadal Al Shiba Engineering Consultants" />
              <Field label="Trade Licence" value="DED-NSC-12345" />
              <Field label="Office" value="Office No. 1503, Business Bay, Dubai, UAE" />
              <Field label="Phone" value="+971 4 555 0000" />
              <Field label="Email" value="info@nasec.ae" />
              <Field label="Working week" value="Mon–Fri · 8h/day" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="backend" className="mt-3"><BackendPanel /></TabsContent>
        <TabsContent value="offices" className="mt-3"><OfficesPanel /></TabsContent>
      </Tabs>

      {/* Add/Edit user dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit user" : "Add user"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Display name</Label><Input value={draft.displayName || ""} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Email (login)</Label><Input value={draft.username || ""} onChange={(e) => setDraft({ ...draft, username: e.target.value })} placeholder="firstname@nasec.ae" className="mt-1" /></div>
            <div><Label className="text-xs">Role</Label>
              <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as Role })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(ROLE_LABELS) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Linked employee record (optional)</Label>
              <Select value={draft.employeeId || "none"} onValueChange={(v) => setDraft({ ...draft, employeeId: v === "none" ? undefined : v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">— none —</SelectItem>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!editing && <div><Label className="text-xs">Password</Label><Input value={draft.passwordHash || ""} onChange={(e) => setDraft({ ...draft, passwordHash: e.target.value })} placeholder="Leave blank to default to 'password'" className="mt-1" /></div>}
            <div className="flex items-center gap-2"><Switch checked={draft.active ?? true} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /><Label className="text-xs">Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password reset */}
      <Dialog open={!!pwReset} onOpenChange={(v) => !v && setPwReset(undefined)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reset password</DialogTitle><DialogDescription>{pwReset && `Set a new password for ${pwReset.displayName}.`}</DialogDescription></DialogHeader>
          <Input type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="new-password" />
          <DialogFooter><Button variant="outline" onClick={() => setPwReset(undefined)}>Cancel</Button><Button onClick={resetPassword}>Reset</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><Label className="text-[10px] text-slate-500">{label}</Label><div>{value}</div></div>;
}

function PermissionMatrix() {
  const rolesAll = Object.keys(ROLE_LABELS) as Role[];
  // Collect every distinct permission across roles
  const allPerms = new Set<Permission>();
  rolesAll.forEach((r) => ROLE_PERMISSIONS[r].forEach((p) => allPerms.add(p)));
  const perms = Array.from(allPerms).sort();
  return (
    <table className="w-full text-xs">
      <thead className="bg-slate-50 text-slate-600 sticky top-0">
        <tr><th className="text-left px-3 py-2">Permission</th>{rolesAll.map((r) => <th key={r} className="text-center px-2 py-2 whitespace-nowrap">{ROLE_LABELS[r]}</th>)}</tr>
      </thead>
      <tbody>
        {perms.map((p) => (
          <tr key={p} className="border-t border-slate-100">
            <td className="px-3 py-1.5 font-mono text-[11px]">{p}</td>
            {rolesAll.map((r) => {
              const has = ROLE_PERMISSIONS[r].includes(p) || ROLE_PERMISSIONS[r].includes("*");
              return <td key={r} className="text-center px-2 py-1.5">{has ? <span className="text-emerald-600">●</span> : <span className="text-slate-300">○</span>}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
