/**
 * Derive a notifications list from current state.
 * Auto-generators are pure: same inputs → same notifications.
 * The store-backed notifications collection captures user-specific
 * read/dismiss state on top of the derived feed.
 */
import type { Notification } from "./types";
import { expiryStatus } from "@/lib/hr/types";
import type { Employee } from "@/lib/hr/types";
import type { TrainingRecord } from "@/lib/hr/extra-types";
import type { LeaveRequest, AttendancePunch } from "@/lib/attendance/types";
import type { Task } from "@/lib/tasks/types";
import type { User, Role } from "@/lib/auth/types";

export type DeriveInput = {
  tasks?: Task[];
  employees: Employee[];
  training: TrainingRecord[];
  leaves: LeaveRequest[];
  punches: AttendancePunch[];
  users: User[];
};

function userIdsByRole(users: User[], roles: Role[]): string[] {
  return users.filter((u) => roles.includes(u.role) && u.active).map((u) => u.id);
}
function userIdForEmployee(users: User[], employeeId: string): string | undefined {
  return users.find((u) => u.employeeId === employeeId)?.id;
}

export function deriveAlerts(input: DeriveInput): Notification[] {
  const out: Notification[] = [];
  const hrIds = userIdsByRole(input.users, ["hr-manager", "director"]);

  // 1) Document expiry — visa, EID, passport, labour card
  for (const e of input.employees) {
    const checks: { label: string; date?: string }[] = [
      { label: "Visa", date: e.visaExpiry },
      { label: "Emirates ID", date: e.emiratesIdExpiry },
      { label: "Passport", date: e.passportExpiry },
      { label: "Labour Card", date: e.labourCardExpiry },
    ];
    for (const c of checks) {
      const s = expiryStatus(c.date);
      if (s !== "warning" && s !== "critical" && s !== "expired") continue;
      const sev = s === "expired" ? "critical" : s === "critical" ? "critical" : "warning";
      const targets = new Set(hrIds);
      const empUid = userIdForEmployee(input.users, e.id);
      if (empUid) targets.add(empUid);
      for (const recipient of Array.from(targets)) {
        out.push({
          id: `doc-expiry::${recipient}::${e.id}::${c.label}`,
          recipientUserId: recipient, kind: "doc-expiry", severity: sev as Notification["severity"],
          title: `${c.label} expiring · ${e.firstName} ${e.lastName}`,
          body: `${c.label} expires ${c.date}.`,
          link: `/hr`,
          read: false,
          createdAt: new Date().toISOString(),
          sourceEntityType: "employee", sourceEntityId: e.id,
        });
      }
    }
  }

  // 2) Training expiry
  for (const t of input.training) {
    const s = expiryStatus(t.expiryDate);
    if (s !== "warning" && s !== "critical" && s !== "expired") continue;
    const emp = input.employees.find((e) => e.id === t.employeeId);
    const empUid = userIdForEmployee(input.users, t.employeeId);
    const targets = new Set([...hrIds]); if (empUid) targets.add(empUid);
    for (const recipient of Array.from(targets)) {
      out.push({
        id: `training-expiry::${recipient}::${t.id}`,
        recipientUserId: recipient, kind: "training-expiry",
        severity: s === "expired" ? "critical" : s === "critical" ? "critical" : "warning",
        title: `${t.name} expiring · ${emp?.firstName || ""} ${emp?.lastName || ""}`,
        body: `${t.name} expires ${t.expiryDate}.`,
        link: `/hr`,
        read: false, createdAt: new Date().toISOString(),
        sourceEntityType: "training", sourceEntityId: t.id,
      });
    }
  }

  // 3) Pending leave requests → managers
  const managers = userIdsByRole(input.users, ["pm", "hr-manager", "director"]);
  for (const l of input.leaves.filter((x) => x.status === "submitted")) {
    const emp = input.employees.find((e) => e.id === l.employeeId);
    for (const recipient of managers) {
      out.push({
        id: `leave-pending::${recipient}::${l.id}`,
        recipientUserId: recipient, kind: "leave-pending", severity: "info",
        title: `Leave request · ${emp?.firstName} ${emp?.lastName}`,
        body: `${l.type} · ${l.fromDate} → ${l.toDate}`,
        link: "/hr", read: false, createdAt: l.createdAt,
        sourceEntityType: "leave", sourceEntityId: l.id,
      });
    }
  }

  // 4) Out-of-geofence punches → HR Manager + employee
  for (const p of input.punches.filter((x) => x.geofenceCheck === "failed-out")) {
    const emp = input.employees.find((e) => e.id === p.employeeId);
    const empUid = userIdForEmployee(input.users, p.employeeId);
    const targets = new Set([...hrIds]); if (empUid) targets.add(empUid);
    for (const recipient of Array.from(targets)) {
      out.push({
        id: `punch-out::${recipient}::${p.id}`,
        recipientUserId: recipient, kind: "punch-out-of-fence", severity: "warning",
        title: `Punch outside geofence · ${emp?.firstName} ${emp?.lastName}`,
        body: `${p.type.toUpperCase()} at ${new Date(p.timestamp).toLocaleString("en-GB", { timeZone: "UTC", hour12: true })}`,
        link: "/attendance", read: false, createdAt: p.timestamp,
        sourceEntityType: "punch", sourceEntityId: p.id,
      });
    }
  }


  // 5) Overdue tasks → assignee gets a critical notification
  const today = new Date().toISOString().slice(0, 10);
  for (const t of (input.tasks || [])) {
    if (t.status === "done" || !t.assigneeUserId || !t.dueDate) continue;
    if (t.dueDate < today) {
      const ageDays = Math.max(1, Math.round((Date.now() - new Date(t.dueDate).getTime()) / 86_400_000));
      out.push({
        id: `task-overdue::${t.assigneeUserId}::${t.id}`,
        recipientUserId: t.assigneeUserId,
        kind: "task-overdue",
        severity: "critical",
        title: `Task overdue · ${t.title}`,
        body: `${ageDays} day${ageDays === 1 ? "" : "s"} past due (${t.dueDate})`,
        link: "/my-tasks",
        read: false,
        createdAt: t.updatedAt || new Date().toISOString(),
        sourceEntityType: "task", sourceEntityId: t.id,
      });
    }
  }

  return out;
}
