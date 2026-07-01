/**
 * Approval Workflows - Unified inbox for all pending approvals.
 *
 * Static demo items are merged with live leave-handover records pending
 * Design Manager approval. Approving a handover triggers automatic task
 * reassignment to the appointed covers.
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Plane,
  Receipt,
  FileText,
  DollarSign,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  leaveHandoversStore,
  tasksStore,
  usersStore,
  notificationsStore,
  auditStore,
} from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthContext";
import type { LeaveHandover } from "@/lib/handover/types";

type DemoItem = {
  id: string;
  type: "leave" | "expense" | "timesheet" | "invoice" | "document" | "handover";
  title: string;
  requester: string;
  initials: string;
  date: string;
  details: string;
  amount?: string;
  urgency: "normal" | "urgent";
  isLive?: boolean;
  liveId?: string;
};

const demoApprovals: DemoItem[] = [
  { id: "1", type: "leave", title: "Annual Leave Request", requester: "Fatima Al Zahra", initials: "FA", date: "May 20-24", details: "5 days annual leave", urgency: "normal" },
  { id: "2", type: "expense", title: "Site Visit Expenses", requester: "Mohammed Hassan", initials: "MH", date: "May 5", details: "3 items - Client meeting + transport", amount: "AED 1,240", urgency: "normal" },
  { id: "3", type: "timesheet", title: "Weekly Timesheet", requester: "James Wilson", initials: "JW", date: "Apr 28 - May 2", details: "42 hours logged - 38h billable", urgency: "urgent" },
  { id: "4", type: "timesheet", title: "Weekly Timesheet", requester: "Sarah Johnson", initials: "SJ", date: "Apr 28 - May 2", details: "40 hours logged - 36h billable", urgency: "normal" },
  { id: "5", type: "invoice", title: "Invoice Approval", requester: "Finance Team", initials: "FT", date: "May 6", details: "INV-2026-089 - Al Wasl Tower DD milestone", amount: "AED 240,000", urgency: "urgent" },
  { id: "6", type: "leave", title: "Sick Leave (Retroactive)", requester: "David Chen", initials: "DC", date: "May 3-4", details: "2 days sick leave with medical certificate", urgency: "normal" },
  { id: "7", type: "document", title: "Drawing Issue Approval", requester: "Ahmed Al Maktoum", initials: "AM", date: "May 6", details: "AR-AWT-002 Rev P03 - For Authority Submission", urgency: "urgent" },
];

const typeIcons: Record<string, React.ReactNode> = {
  leave: <Plane className="w-4 h-4" />,
  expense: <Receipt className="w-4 h-4" />,
  timesheet: <Clock className="w-4 h-4" />,
  invoice: <DollarSign className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  handover: <Users className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  leave: "bg-blue-50 text-blue-600",
  expense: "bg-amber-50 text-amber-600",
  timesheet: "bg-purple-50 text-purple-600",
  invoice: "bg-emerald-50 text-emerald-600",
  document: "bg-red-50 text-red-600",
  handover: "bg-indigo-50 text-indigo-600",
};

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Approvals() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const handovers = useCollection(leaveHandoversStore);
  useCollection(usersStore);
  useCollection(tasksStore);

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");

  const liveHandoverItems: DemoItem[] = useMemo(() => {
    return handovers
      .filter((h) => h.status === "submitted")
      .map((h) => ({
        id: `live-${h.id}`,
        type: "handover" as const,
        title: "Leave Handover Approval",
        requester: h.employeeDisplay || "Employee",
        initials: initialsFromName(h.employeeDisplay || "EM"),
        date: `${h.fromDate} -> ${h.toDate}`,
        details: `${h.coverAssignments.length} task(s) to reassign${h.revertOnReturn ? " - revert on return" : ""}${h.decisionNote ? " - " + h.decisionNote : ""}`,
        urgency: "urgent" as const,
        isLive: true,
        liveId: h.id,
      }));
  }, [handovers]);

  const allItems = useMemo(() => {
    return [...liveHandoverItems, ...demoApprovals].filter((i) => !dismissed.has(i.id));
  }, [liveHandoverItems, dismissed]);

  const filteredItems = filter === "all" ? allItems : allItems.filter((i) => i.type === filter);

  function commitHandoverDecision(handover: LeaveHandover, approved: boolean) {
    const now = new Date().toISOString();
    if (approved) {
      for (const ca of handover.coverAssignments) {
        const t = tasksStore.get(ca.taskId);
        if (!t) continue;
        tasksStore.put({
          ...t,
          assigneeUserId: ca.coverUserId,
          updatedAt: now,
        });
        notificationsStore.put({
          id: newId("ntf"),
          recipientUserId: ca.coverUserId,
          kind: "task-overdue",
          severity: "info",
          title: "Task assigned during handover",
          body: `${t.title}${t.dueDate ? ` - due ${t.dueDate}` : ""}`,
          link: "/my-tasks",
          read: false,
          createdAt: now,
          sourceEntityType: "task",
          sourceEntityId: t.id,
        });
      }
    }

    leaveHandoversStore.put({
      ...handover,
      status: approved ? "approved" : "rejected",
      approverUserId: currentUser?.id,
      approverDisplay: currentUser?.displayName,
      decidedAt: now,
      activatedAt: approved ? now : undefined,
      updatedAt: now,
    });

    notificationsStore.put({
      id: newId("ntf"),
      recipientUserId: handover.employeeUserId,
      kind: "leave-decided",
      severity: approved ? "info" : "warning",
      title: approved ? "Handover approved" : "Handover rejected",
      body: approved
        ? `Your tasks will be covered ${handover.fromDate} -> ${handover.toDate}`
        : "Please revise your handover plan",
      link: "/leave",
      read: false,
      createdAt: now,
      sourceEntityType: "leave-handover",
      sourceEntityId: handover.id,
    });

    auditStore.put({
      id: newId("au"),
      timestamp: now,
      actor: currentUser?.displayName || "System",
      module: "leave",
      action: approved ? "approve" : "reject",
      subject: `Handover ${approved ? "approved" : "rejected"} - ${handover.employeeDisplay || ""}`,
      detail: `${handover.fromDate} -> ${handover.toDate} - ${handover.coverAssignments.length} task(s)`,
    });
  }

  const handleApprove = (item: DemoItem) => {
    if (item.isLive && item.liveId) {
      const ho = handovers.find((h) => h.id === item.liveId);
      if (ho) commitHandoverDecision(ho, true);
      toast.success("Handover approved", {
        description: `Tasks reassigned for ${item.requester}`,
      });
      return;
    }
    setDismissed((s) => { const n = new Set(s); n.add(item.id); return n; });
    toast.success("Approved", { description: `${item.title} from ${item.requester}` });
  };

  const handleReject = (item: DemoItem) => {
    if (item.isLive && item.liveId) {
      const ho = handovers.find((h) => h.id === item.liveId);
      if (ho) commitHandoverDecision(ho, false);
      toast.error("Handover rejected", { description: item.requester });
      return;
    }
    setDismissed((s) => { const n = new Set(s); n.add(item.id); return n; });
    toast.error("Rejected", { description: `${item.title} from ${item.requester}` });
  };

  const handleBulkApprove = () => {
    const count = filteredItems.length;
    for (const item of filteredItems) handleApprove(item);
    toast.success(`${count} items approved`, { description: "All pending approvals processed" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {allItems.length} pending approvals - {allItems.filter((i) => i.urgency === "urgent").length} urgent
            {liveHandoverItems.length > 0 && (
              <span className="ml-2 text-indigo-600 font-medium">
                - {liveHandoverItems.length} live handover{liveHandoverItems.length === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>
        <Button onClick={handleBulkApprove} className="gap-2" disabled={filteredItems.length === 0}>
          <CheckCircle2 className="w-4 h-4" />
          Approve All ({filteredItems.length})
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { type: "all", label: "All", count: allItems.length },
          { type: "handover", label: "Handover", count: allItems.filter((i) => i.type === "handover").length },
          { type: "leave", label: "Leave", count: allItems.filter((i) => i.type === "leave").length },
          { type: "expense", label: "Expenses", count: allItems.filter((i) => i.type === "expense").length },
          { type: "timesheet", label: "Timesheets", count: allItems.filter((i) => i.type === "timesheet").length },
          { type: "invoice", label: "Invoices", count: allItems.filter((i) => i.type === "invoice").length },
        ].map((cat) => (
          <button
            key={cat.type}
            onClick={() => setFilter(cat.type)}
            className={`p-3 rounded-lg border text-center transition-all ${
              filter === cat.type ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30"
            }`}
          >
            <p className="text-xl font-mono font-bold">{cat.count}</p>
            <p className="text-xs text-muted-foreground">{cat.label}</p>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-semibold">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">No pending approvals in this category.</p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className={`border ${item.urgency === "urgent" ? "border-amber-300 bg-amber-50/30" : "border-border"}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[item.type]}`}>
                    {typeIcons[item.type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold">{item.title}</p>
                      {item.urgency === "urgent" && <Badge className="bg-red-100 text-red-700 text-[9px]">Urgent</Badge>}
                      {item.isLive && <Badge className="bg-indigo-100 text-indigo-700 text-[9px]">Live</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-semibold">{item.initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{item.requester}</span>
                      <span className="text-xs text-muted-foreground">-</span>
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.details}</p>
                    {item.amount && <p className="text-sm font-data font-bold mt-1">{item.amount}</p>}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReject(item)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(item)}
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
