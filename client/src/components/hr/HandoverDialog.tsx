/**
 * Hand-Over Dialog — when an employee goes on leave, the Design Manager
 * picks a stand-in for each of the employee's open tasks. The handover
 * record is submitted for DM approval; on approval, tasks are reassigned
 * to the appointed covers automatically.
 */
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  tasksStore,
  leaveHandoversStore,
  usersStore,
  employeesStore,
  notificationsStore,
  auditStore,
} from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Task } from "@/lib/tasks/types";
import type { LeaveHandover, CoverAssignment } from "@/lib/handover/types";
import type { LeaveRequest } from "@/lib/attendance/types";
import type { Employee } from "@/lib/hr/types";

type Props = {
  open: boolean;
  onClose: () => void;
  leave?: LeaveRequest;     // optional: pre-fill from a leave request
  employee?: Employee;
};

export default function HandoverDialog({ open, onClose, leave, employee }: Props) {
  const { currentUser } = useAuth();
  const users = useCollection(usersStore);
  const employees = useCollection(employeesStore);
  const tasks = useCollection(tasksStore);
  const handovers = useCollection(leaveHandoversStore);

  // Resolve the user going on leave
  const targetUser = useMemo(() => {
    if (!employee) return undefined;
    return users.find((u) => u.employeeId === employee.id);
  }, [employee, users]);

  // Open tasks assigned to this user
  const openTasks = useMemo(() => {
    if (!targetUser) return [] as Task[];
    return tasks
      .filter((t) => t.assigneeUserId === targetUser.id && t.status !== "done")
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  }, [tasks, targetUser]);

  // Eligible covers: every active user except the leave-taker and contractors
  const candidates = useMemo(() => {
    return users.filter((u) => u.active && u.role !== "contractor" && u.id !== targetUser?.id);
  }, [users, targetUser]);

  // Detect existing handover for this leave
  const existing = useMemo(
    () => handovers.find((h) => leave && h.leaveRequestId === leave.id),
    [handovers, leave]
  );

  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    if (existing) for (const c of existing.coverAssignments) r[c.taskId] = c.coverUserId;
    return r;
  });
  const [bulkCover, setBulkCover] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [revertOnReturn, setRevertOnReturn] = useState<boolean>(existing?.revertOnReturn ?? true);
  const [fromDate, setFromDate] = useState<string>(existing?.fromDate || leave?.fromDate || "");
  const [toDate, setToDate] = useState<string>(existing?.toDate || leave?.toDate || "");

  function applyBulkCover() {
    if (!bulkCover) return;
    const r: Record<string, string> = {};
    for (const t of openTasks) r[t.id] = bulkCover;
    setAssignments(r);
  }

  function submit() {
    if (!targetUser) return toast.error("No matching ERP user for this employee");
    if (!fromDate || !toDate) return toast.error("Please set both dates");
    const unassigned = openTasks.filter((t) => !assignments[t.id]);
    if (unassigned.length > 0) {
      return toast.error(`Pick a cover for all ${openTasks.length} task(s)`, {
        description: `${unassigned.length} task(s) still unassigned`,
      });
    }

    const coverAssignments: CoverAssignment[] = openTasks.map((t) => ({
      taskId: t.id,
      coverUserId: assignments[t.id],
    }));

    const now = new Date().toISOString();
    const record: LeaveHandover = {
      id: existing?.id || newId("hov"),
      leaveRequestId: leave?.id,
      employeeUserId: targetUser.id,
      employeeDisplay: targetUser.displayName,
      fromDate,
      toDate,
      coverAssignments,
      status: "submitted",
      revertOnReturn,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      decisionNote: note || undefined,
    };
    leaveHandoversStore.put(record);

    // Notify directors (Design Manager) for approval
    const directors = users.filter((u) => u.role === "director" && u.active);
    for (const d of directors) {
      notificationsStore.put({
        id: newId("ntf"),
        recipientUserId: d.id,
        kind: "approval-pending",
        severity: "warning",
        title: "Leave handover awaiting approval",
        body: `${targetUser.displayName} • ${fromDate} → ${toDate} • ${coverAssignments.length} task(s) to reassign`,
        link: "/approvals",
        read: false,
        createdAt: now,
        sourceEntityType: "leave-handover",
        sourceEntityId: record.id,
      });
    }

    auditStore.put({
      id: newId("au"),
      timestamp: now,
      actor: currentUser?.displayName || "System",
      module: "leave",
      action: "create",
      subject: `Handover prepared · ${targetUser.displayName}`,
      detail: `${fromDate} → ${toDate} • ${coverAssignments.length} task(s)`,
    });

    toast.success("Handover submitted for Design Manager approval");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Hand over tasks during leave</DialogTitle>
          <DialogDescription>
            Appoint a stand-in for each of {employee ? `${employee.firstName} ${employee.lastName}` : "this employee"}'s open tasks. The Design Manager will review and approve.
          </DialogDescription>
        </DialogHeader>

        {!targetUser && (
          <div className="p-3 border border-amber-300 bg-amber-50 rounded text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            <span>This employee has no matching ERP login user — no tasks can be reassigned. Create a user first in Settings → Users.</span>
          </div>
        )}

        {existing && (
          <div className="p-3 border border-blue-300 bg-blue-50/50 rounded text-xs">
            Existing handover record • status: <strong className="capitalize">{existing.status}</strong>
            {existing.decisionNote && <p className="mt-1 italic">{existing.decisionNote}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1" />
          </div>
        </div>

        {openTasks.length > 0 && (
          <div className="flex items-end gap-2 p-2 bg-slate-50 rounded">
            <div className="flex-1">
              <Label className="text-xs">Bulk-assign all to</Label>
              <Select value={bulkCover} onValueChange={setBulkCover}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick one cover for everything" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.displayName} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" onClick={applyBulkCover} disabled={!bulkCover}>Apply to all</Button>
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-600">Open tasks ({openTasks.length})</p>
          {openTasks.length === 0 && (
            <p className="text-xs text-slate-500 italic px-2 py-3">No open tasks — handover can still be submitted for record-keeping.</p>
          )}
          {openTasks.map((t) => (
            <div key={t.id} className="p-2 border border-slate-200 rounded space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-medium">{t.title}</span>
                  {t.dueDate && <span className="ml-2 text-slate-500">Due {t.dueDate}</span>}
                </div>
                <Badge variant="outline" className="text-[9px] capitalize">{t.priority}</Badge>
              </div>
              <Select value={assignments[t.id] || ""} onValueChange={(v) => setAssignments({ ...assignments, [t.id]: v })}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Pick a cover…" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((u) => {
                    const emp = employees.find((e) => e.id === u.employeeId);
                    const dept = emp?.department ? ` · ${emp.department}` : "";
                    return <SelectItem key={u.id} value={u.id}>{u.displayName} ({u.role}){dept}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
          <div>
            <p className="text-xs font-semibold">Revert tasks on return</p>
            <p className="text-[10px] text-slate-500">Reassign tasks back to original owner when the employee returns</p>
          </div>
          <Switch checked={revertOnReturn} onCheckedChange={setRevertOnReturn} />
        </div>

        <div>
          <Label className="text-xs">Note for Design Manager</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1" placeholder="Optional context — priorities, deadlines, etc." />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!targetUser}>Submit for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
