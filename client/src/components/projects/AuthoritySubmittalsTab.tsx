/**
 * Authority Submittals tracker — spreadsheet-style table per project.
 * Inline-editable Status, dates, remarks. Status drives row colour.
 * Group-header rows shown bold with grey background.
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Landmark, Download, Search } from "lucide-react";
import { authoritySubmittalsStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import {
  STATUS_LABEL, STATUS_CLASS, AUTHORITY_LABEL,
  type AuthoritySubmittal, type AuthoritySubmittalStatus, type AuthorityKey,
} from "@/lib/authority/types";

type Props = { projectId: string };

const STATUS_OPTIONS: AuthoritySubmittalStatus[] = ["to-start", "in-progress", "approved", "rejected", "completed"];
const AUTHORITY_OPTIONS: AuthorityKey[] = ["DDA", "DEWA", "ETISALAT", "Du", "DCD", "RTA", "Empower", "DM", "Trakheesi", "Other"];

const STATUS_ROW_BG: Record<AuthoritySubmittalStatus, string> = {
  "to-start": "bg-white",
  "in-progress": "bg-yellow-50/60",
  approved: "bg-emerald-50/40",
  rejected: "bg-red-50/40",
  completed: "bg-emerald-50/60",
};

export default function AuthoritySubmittalsTab({ projectId }: Props) {
  const rows = useCollection(authoritySubmittalsStore);
  useCollection(auditStore);
  const actor = useCurrentActor();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const mine = useMemo(() => {
    return rows
      .filter((r) => r.projectId === projectId)
      .filter((r) => {
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        const q = search.trim().toLowerCase();
        return !q || r.name.toLowerCase().includes(q) || (r.remarks || "").toLowerCase().includes(q);
      })
      .sort((a, b) => a.order - b.order);
  }, [rows, projectId, search, filterStatus]);

  const totals = useMemo(() => {
    const m = mine.filter((r) => !r.isGroupHeader);
    return {
      total: m.length,
      completed: m.filter((r) => r.status === "completed" || r.status === "approved").length,
      inProgress: m.filter((r) => r.status === "in-progress").length,
      rejected: m.filter((r) => r.status === "rejected").length,
      toStart: m.filter((r) => r.status === "to-start").length,
    };
  }, [mine]);

  function update<K extends keyof AuthoritySubmittal>(row: AuthoritySubmittal, field: K, value: AuthoritySubmittal[K]) {
    authoritySubmittalsStore.put({ ...row, [field]: value });
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "documents" as any, action: "update", subject: `Authority · ${row.name}`, detail: `${String(field)} → ${String(value)}` });
  }
  function addRow() {
    const maxOrder = Math.max(0, ...rows.filter((r) => r.projectId === projectId).map((r) => r.order));
    const newRow: AuthoritySubmittal = {
      id: newId("auth"),
      projectId,
      order: maxOrder + 1,
      name: "New submittal item",
      status: "to-start",
      milestoneStatus: "to-start",
    };
    authoritySubmittalsStore.put(newRow);
    toast.success("Row added — click the name to edit");
  }
  function deleteRow(r: AuthoritySubmittal) {
    if (!confirm(`Delete "${r.name}"?`)) return;
    authoritySubmittalsStore.remove(r.id);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "documents" as any, action: "delete", subject: `Authority · ${r.name}` });
    toast.success("Removed");
  }
  function exportCSV() {
    const lines = ["Name,Authority,Status,Start,Target,Actual,Milestone,Remarks"];
    for (const r of mine) {
      lines.push([r.name, r.authority || "", STATUS_LABEL[r.status], r.startDate || "", r.targetFinishDate || "", r.actualFinishDate || "", STATUS_LABEL[r.milestoneStatus || r.status], (r.remarks || "").replace(/,/g, ";")].map((v) => `"${v}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `authority-submittals-${projectId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Landmark className="w-5 h-5" /> Design Authorities Submission statuses</h2>
          <p className="text-xs text-slate-600 mt-0.5">Every DDA / DEWA / ETISALAT / Du / DCD / RTA / Empower / DM interaction tracked end-to-end with dates and remarks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5"><Download className="w-3.5 h-3.5" /> Export CSV</Button>
          <Button size="sm" onClick={addRow} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add row</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Kpi label="Total" value={totals.total} bg="bg-slate-50" />
        <Kpi label="Completed / Approved" value={totals.completed} bg="bg-emerald-50" />
        <Kpi label="In-Progress" value={totals.inProgress} bg="bg-yellow-50" />
        <Kpi label="Rejected" value={totals.rejected} bg="bg-red-50" tone={totals.rejected > 0 ? "bad" : undefined} />
        <Kpi label="Not started" value={totals.toStart} bg="bg-slate-100" />
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
            <Input className="pl-8 h-9 w-64" placeholder="Search name or remarks…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-slate-500">{mine.length} of {rows.filter((r) => r.projectId === projectId).length} rows</div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-xs text-slate-700">
                <th className="text-left px-3 py-2 border-y border-slate-300 sticky left-0 bg-slate-100 min-w-[260px]">Name</th>
                <th className="px-2 py-2 border-y border-slate-300 w-32">Status</th>
                <th className="px-2 py-2 border-y border-slate-300 w-32">Start Date</th>
                <th className="px-2 py-2 border-y border-slate-300 w-36">Target Finish Date</th>
                <th className="px-2 py-2 border-y border-slate-300 w-32">Actual Finish Date</th>
                <th className="px-2 py-2 border-y border-slate-300 w-36">Milestone Status</th>
                <th className="text-left px-3 py-2 border-y border-slate-300 min-w-[280px]">Remarks</th>
                <th className="px-2 py-2 border-y border-slate-300 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {mine.map((r) => (
                <tr key={r.id} className={`${r.isGroupHeader ? "bg-slate-200 font-semibold" : STATUS_ROW_BG[r.status]} hover:bg-slate-50/80 transition-colors border-b border-slate-200`}>
                  <td className="px-3 py-1.5 border-r border-slate-200 sticky left-0 bg-inherit">
                    <Input
                      value={r.name}
                      onChange={(e) => update(r, "name", e.target.value)}
                      className={`h-7 border-0 shadow-none px-1 bg-transparent ${r.isGroupHeader ? "font-bold" : ""}`}
                    />
                  </td>
                  <td className="px-1 py-1 border-r border-slate-200">
                    <Select value={r.status} onValueChange={(v) => update(r, "status", v as AuthoritySubmittalStatus)}>
                      <SelectTrigger className={`h-7 text-xs border ${STATUS_CLASS[r.status]} px-2`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1 py-1 border-r border-slate-200">
                    <Input type="date" value={r.startDate || ""} onChange={(e) => update(r, "startDate", e.target.value)} className="h-7 border-0 shadow-none px-1 bg-transparent text-xs" />
                  </td>
                  <td className="px-1 py-1 border-r border-slate-200">
                    <Input type="date" value={r.targetFinishDate || ""} onChange={(e) => update(r, "targetFinishDate", e.target.value)} className="h-7 border-0 shadow-none px-1 bg-transparent text-xs" />
                  </td>
                  <td className="px-1 py-1 border-r border-slate-200">
                    <Input type="date" value={r.actualFinishDate || ""} onChange={(e) => update(r, "actualFinishDate", e.target.value)} className="h-7 border-0 shadow-none px-1 bg-transparent text-xs" />
                  </td>
                  <td className="px-1 py-1 border-r border-slate-200">
                    <Select value={r.milestoneStatus || r.status} onValueChange={(v) => update(r, "milestoneStatus", v as AuthoritySubmittalStatus)}>
                      <SelectTrigger className={`h-7 text-xs border ${STATUS_CLASS[r.milestoneStatus || r.status]} px-2`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1 py-1 border-r border-slate-200">
                    <Input
                      value={r.remarks || ""}
                      onChange={(e) => update(r, "remarks", e.target.value)}
                      className="h-7 border-0 shadow-none px-1 bg-transparent text-xs"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteRow(r)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
              {mine.length === 0 && (
                <tr><td colSpan={8} className="text-center text-sm text-slate-500 py-8">No rows match the filter. Add one with the button above.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span>Status colours:</span>
        {STATUS_OPTIONS.map((s) => (
          <Badge key={s} variant="outline" className={STATUS_CLASS[s]}>{STATUS_LABEL[s]}</Badge>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, bg, tone }: { label: string; value: number; bg: string; tone?: "bad" }) {
  return (
    <div className={`${bg} ${tone === "bad" && value > 0 ? "ring-1 ring-red-300" : ""} rounded-lg p-3`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${tone === "bad" && value > 0 ? "text-red-700" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}
