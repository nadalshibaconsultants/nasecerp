/**
 * Client Portal tab (inside Project detail).
 * Preserves the original UI exactly — "Client Portal" header + "Open Portal"
 * button, a "Portal Access" card listing client cards (initials, name, email,
 * role badge), and an "Invite Client" button — and makes it fully functional:
 * real data from /client-portal, working Invite modal, per-card actions
 * (Edit / Reset Password / Disable / Delete) and Status + Last Login display.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ExternalLink, Plus, MoreVertical, Pencil, KeyRound, Ban, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  listProjectClients, inviteClient, editClientAccess, resetClientPassword,
  setClientStatus, deleteClient, type PortalClient,
} from "@/lib/client-portal/api";

export default function ClientPortalTab({ project }: { project: { id: string; client: string } }) {
  const { can } = useAuth();
  const [, navigate] = useLocation();
  const canManage = can("projects:write");
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setClients(await listProjectClients(project.id)); }
    catch { /* keep current */ }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, [project.id]);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [iName, setIName] = useState("");
  const [iEmail, setIEmail] = useState("");
  const [iPassword, setIPassword] = useState("");
  const [iRole, setIRole] = useState<"admin" | "viewer">("viewer");
  const [iSendEmail, setISendEmail] = useState(true);
  const [iBusy, setIBusy] = useState(false);

  async function submitInvite() {
    if (!iName.trim() || !iEmail.trim() || iPassword.length < 6) {
      toast.error("Name, email and a password (min 6 chars) are required");
      return;
    }
    setIBusy(true);
    try {
      const res = await inviteClient({ projectId: project.id, name: iName.trim(), email: iEmail.trim(), password: iPassword, role: iRole, sendEmail: iSendEmail });
      toast.success(`Client invited${res.emailed ? " · email sent" : ""}`);
      setInviteOpen(false);
      setIName(""); setIEmail(""); setIPassword(""); setIRole("viewer"); setISendEmail(true);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Could not invite client");
    } finally { setIBusy(false); }
  }

  // Edit modal
  const [editing, setEditing] = useState<PortalClient | null>(null);
  const [eName, setEName] = useState("");
  const [eRole, setERole] = useState<"admin" | "viewer">("viewer");
  function openEdit(c: PortalClient) { setEditing(c); setEName(c.name); setERole(c.role); }
  async function saveEdit() {
    if (!editing?.accessId) return;
    try {
      await editClientAccess(editing.accessId, { name: eName.trim() || undefined, role: eRole });
      toast.success("Client updated");
      setEditing(null);
      await refresh();
    } catch (e: any) { toast.error(e?.message || "Update failed"); }
  }

  // Reset password modal
  const [resetting, setResetting] = useState<PortalClient | null>(null);
  const [rPassword, setRPassword] = useState("");
  async function doReset(viaEmail: boolean) {
    if (!resetting) return;
    if (!viaEmail && rPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    try {
      await resetClientPassword(resetting.id, viaEmail ? { sendEmail: true } : { password: rPassword });
      toast.success(viaEmail ? "Reset link emailed to client" : "Password updated");
      setResetting(null); setRPassword("");
    } catch (e: any) { toast.error(e?.message || "Reset failed"); }
  }

  async function toggleStatus(c: PortalClient) {
    try {
      await setClientStatus(c.id, c.rawStatus === "active" ? "disabled" : "active");
      toast.success(c.rawStatus === "active" ? "Client disabled" : "Client enabled");
      await refresh();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  async function removeClient(c: PortalClient) {
    if (!window.confirm(`Delete client ${c.name}? This removes their portal account entirely.`)) return;
    try { await deleteClient(c.id); toast.success("Client deleted"); await refresh(); }
    catch (e: any) { toast.error(e?.message || "Delete failed"); }
  }

  const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString("en-GB") : "Never";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Client Portal</h2>
        <Button size="sm" className="gap-1" onClick={() => navigate("/client-portal")}><ExternalLink className="w-3 h-3" /> Open Portal</Button>
      </div>
      <Card className="border border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Portal Access</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {loading && clients.length === 0 && <p className="text-xs text-muted-foreground">Loading…</p>}
            {!loading && clients.length === 0 && <p className="text-xs text-muted-foreground">No client access yet. Invite a client to grant portal access to this project.</p>}
            {clients.map((c) => (
              <div key={c.accessId || c.id} className="flex items-center justify-between p-2 border border-border rounded">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{initials(c.name)}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.email}</p>
                    <p className="text-[10px] text-muted-foreground">Status: <span className={c.rawStatus === "active" ? "text-emerald-600" : "text-red-600"}>{c.status}</span> · Last Login: {fmt(c.lastLogin)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] capitalize">{c.role}</Badge>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit Client</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setResetting(c); setRPassword(""); }}><KeyRound className="w-3.5 h-3.5 mr-2" /> Reset Password</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(c)}>
                          {c.rawStatus === "active" ? <><Ban className="w-3.5 h-3.5 mr-2" /> Disable Client</> : <><CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Enable Client</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => removeClient(c)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Client</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
          {canManage && (
            <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => setInviteOpen(true)}><Plus className="w-3 h-3" /> Invite Client</Button>
          )}
        </CardContent>
      </Card>

      {/* Invite Client */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite Client</DialogTitle><DialogDescription>Create a client account and grant portal access to this project.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Full Name *</Label><Input value={iName} onChange={(e) => setIName(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Email *</Label><Input type="email" value={iEmail} onChange={(e) => setIEmail(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Password *</Label><Input type="text" value={iPassword} onChange={(e) => setIPassword(e.target.value)} className="mt-1" placeholder="min 6 characters" /></div>
            <div><Label className="text-xs">Role</Label>
              <Select value={iRole} onValueChange={(v) => setIRole(v as "admin" | "viewer")}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={iSendEmail} onCheckedChange={(v) => setISendEmail(!!v)} /> Send Invitation Email
            </label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button><Button disabled={iBusy} onClick={submitInvite}>{iBusy ? "Inviting…" : "Invite"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Full Name</Label><Input value={eName} onChange={(e) => setEName(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">Role</Label>
              <Select value={eRole} onValueChange={(v) => setERole(v as "admin" | "viewer")}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveEdit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={!!resetting} onOpenChange={(o) => { if (!o) setResetting(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reset Password</DialogTitle><DialogDescription>Set a new password for {resetting?.name}, or email them a secure reset link.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">New password</Label><Input type="text" value={rPassword} onChange={(e) => setRPassword(e.target.value)} className="mt-1" placeholder="min 6 characters" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => doReset(true)}>Email reset link</Button>
            <Button onClick={() => doReset(false)}>Set password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
