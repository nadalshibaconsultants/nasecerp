/**
 * ProjectTeamCard — live project membership backed by /projects/:id/team.
 * HR managers and the Director (plus PMs/design leads with projects:write)
 * assign real users to the project; assigned users then see the project in
 * their own Projects list (server scopes the list by membership).
 */
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, UserPlus, X } from "lucide-react";
import { apiFetch } from "@/lib/backend/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCollection } from "@/lib/store";
import { userDirectoryStore } from "@/lib/stores";

type TeamRow = { id: string; projectId: string; userId: string; roleOnProject?: string | null; removedAt?: string | null };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProjectTeamCard({ projectId }: { projectId: string }) {
  const { canAny } = useAuth();
  const directory = useCollection(userDirectoryStore);
  const canManage = canAny(["projects:write", "hr:write"] as any);

  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("");
  const [busy, setBusy] = useState(false);

  const isLive = UUID_RE.test(projectId);

  const refresh = useCallback(async () => {
    if (!isLive) { setLoading(false); return; }
    try {
      const data = await apiFetch<TeamRow[]>(`/projects/${projectId}/team`);
      setRows(data.filter((r) => !r.removedAt));
    } catch (err) {
      console.warn("[ProjectTeamCard] load failed", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, isLive]);

  useEffect(() => { void refresh(); }, [refresh]);

  const userOf = (id: string) => directory.find((u) => u.id === id);
  const available = directory.filter((u) => !rows.some((r) => r.userId === u.id));

  async function addMember() {
    if (!addUserId) { toast.error("Pick a user to assign"); return; }
    setBusy(true);
    try {
      await apiFetch(`/projects/${projectId}/team`, { method: "POST", body: { userId: addUserId, roleOnProject: addRole.trim() || undefined } });
      toast.success(`${userOf(addUserId)?.displayName || "User"} assigned to the project — it now appears in their Projects list`);
      setAddUserId(""); setAddRole("");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Could not assign user");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(r: TeamRow) {
    if (!confirm(`Remove ${userOf(r.userId)?.displayName || "this user"} from the project team?`)) return;
    try {
      await apiFetch(`/projects/${projectId}/team/${r.userId}`, { method: "DELETE" });
      toast.success("Removed from project team");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Could not remove user");
    }
  }

  if (!isLive) {
    return (
      <Card className="border border-border">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Team assignment is available once the project is saved on the backend.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-emerald-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /> Project Team</span>
          <Badge variant="outline" className="text-[10px]">{rows.length} member{rows.length === 1 ? "" : "s"}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Assigned members see this project in their own Projects list.
          {canManage ? " Add or remove people below." : " Only HR, the Director or the PM can change the team."}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading team…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No one is assigned to this project yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rows.map((r) => {
              const u = userOf(r.userId);
              const initials = (u?.displayName || "?").split(" ").map((s) => s[0]).slice(0, 2).join("");
              return (
                <div key={r.id} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                  <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{initials}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{u?.displayName || r.userId.slice(0, 8)}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{r.roleOnProject || u?.role || "Team member"}</div>
                  </div>
                  {canManage && (
                    <button className="text-slate-400 hover:text-red-500" title="Remove from project" onClick={() => removeMember(r)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {canManage && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
            <Select value={addUserId} onValueChange={setAddUserId}>
              <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Pick a user to assign…" /></SelectTrigger>
              <SelectContent>
                {available.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className="h-9 w-48" placeholder="Role on project (optional)" value={addRole} onChange={(e) => setAddRole(e.target.value)} />
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={addMember}>
              <UserPlus className="w-3.5 h-3.5" /> {busy ? "Adding…" : "Add to project"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
