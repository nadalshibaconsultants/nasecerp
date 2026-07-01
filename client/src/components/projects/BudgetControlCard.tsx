/**
 * BudgetControlCard — project budget vs actual vs committed with overrun
 * alerts. Budget category lines are stored per-project on the backend
 * (project-items kind "budget-line"); actual/committed/labour figures come
 * live from /finance/projects/:id/budget-control.
 */
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wallet, AlertTriangle, Plus, X, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/backend/api";
import { useAuth } from "@/lib/auth/AuthContext";

const BUDGET_CATEGORIES = [
  "Design Team Cost",
  "MEP Team Cost",
  "Site Supervision Cost",
  "Software Cost",
  "Outsourcing Cost",
  "Authority Fees",
  "Miscellaneous",
];

type BudgetControl = {
  budgetLines: { id: string; category: string; amount: number }[];
  totals: { budget: number; actual: number; committed: number; remaining: number };
  breakdown: { vendorCost: number; laborCost: number; laborHours: number };
  revenue: { invoiced: number; collected: number; outstanding: number; marginPct: number | null };
  alerts: { kind: string; severity: "critical" | "warning"; message: string }[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;

export default function BudgetControlCard({ projectId }: { projectId: string }) {
  const { canAny } = useAuth();
  const canEdit = canAny(["finance:write", "projects:write"] as any);
  const isLive = UUID_RE.test(projectId);

  const [data, setData] = useState<BudgetControl | null>(null);
  const [loading, setLoading] = useState(true);
  const [addCat, setAddCat] = useState(BUDGET_CATEGORIES[0]);
  const [addAmount, setAddAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isLive) { setLoading(false); return; }
    try {
      setData(await apiFetch<BudgetControl>(`/finance/projects/${projectId}/budget-control`));
    } catch (err) {
      console.warn("[BudgetControl] load failed", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, isLive]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function addLine() {
    const amount = Number(addAmount);
    if (!amount || amount <= 0) { toast.error("Enter a budget amount"); return; }
    setBusy(true);
    try {
      await apiFetch("/project-items", { method: "POST", body: { kind: "budget-line", projectId, category: addCat, amount } });
      toast.success(`${addCat} budget set`);
      setAddAmount("");
      await refresh();
    } catch (err: any) { toast.error(err?.message || "Could not save budget line"); }
    finally { setBusy(false); }
  }

  async function removeLine(id: string) {
    try {
      await apiFetch(`/project-items/${id}`, { method: "DELETE" });
      await refresh();
    } catch (err: any) { toast.error(err?.message || "Could not remove line"); }
  }

  if (!isLive) return null;

  const t = data?.totals ?? { budget: 0, actual: 0, committed: 0, remaining: 0 };
  const utilization = t.budget > 0 ? Math.min(150, Math.round((t.actual / t.budget) * 100)) : 0;
  const barColor = utilization > 100 ? "bg-red-500" : utilization > 80 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <Card className="border border-emerald-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-600" /> Budget Control</span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Refresh" onClick={() => refresh()}><RefreshCw className="w-3.5 h-3.5" /></Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-xs text-muted-foreground">Loading budget…</p> : (
          <>
            {/* Alerts */}
            {(data?.alerts ?? []).length > 0 && (
              <div className="space-y-1.5">
                {data!.alerts.map((a) => (
                  <div key={a.kind} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${a.severity === "critical" ? "border-red-300 bg-red-50 text-red-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {a.message}
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-muted-foreground">Budget</p><p className="text-lg font-bold font-data">{aed(t.budget)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-muted-foreground">Actual Cost</p><p className="text-lg font-bold font-data">{aed(t.actual)}</p><p className="text-[10px] text-muted-foreground">vendors {aed(data?.breakdown.vendorCost ?? 0)} · labour {aed(data?.breakdown.laborCost ?? 0)} ({Math.round(data?.breakdown.laborHours ?? 0)}h)</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-muted-foreground">Committed (unpaid)</p><p className="text-lg font-bold font-data">{aed(t.committed)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-muted-foreground">Remaining Budget</p><p className={`text-lg font-bold font-data ${t.remaining < 0 ? "text-red-600" : "text-emerald-700"}`}>{aed(t.remaining)}</p></div>
            </div>

            {/* Utilization bar */}
            {t.budget > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Budget utilization</span><span className="font-data">{utilization}%</span></div>
                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, utilization)}%` }} />
                </div>
              </div>
            )}

            {/* Revenue line */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground border-t border-slate-100 pt-3">
              <span>Invoiced: <strong className="text-foreground font-data">{aed(data?.revenue.invoiced ?? 0)}</strong></span>
              <span>Collected: <strong className="text-foreground font-data">{aed(data?.revenue.collected ?? 0)}</strong></span>
              <span>Outstanding: <strong className="text-foreground font-data">{aed(data?.revenue.outstanding ?? 0)}</strong></span>
              {data?.revenue.marginPct !== null && data?.revenue.marginPct !== undefined && (
                <span>Margin: <strong className={`font-data ${data.revenue.marginPct < 20 ? "text-red-600" : "text-emerald-700"}`}>{data.revenue.marginPct}%</strong></span>
              )}
            </div>

            {/* Budget lines by category */}
            <div className="space-y-1.5">
              {(data?.budgetLines ?? []).map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>{l.category}</span>
                  <span className="flex items-center gap-2 font-data">{aed(l.amount)}
                    {canEdit && <button className="text-slate-400 hover:text-red-500" title="Remove line" onClick={() => removeLine(l.id)}><X className="w-3.5 h-3.5" /></button>}
                  </span>
                </div>
              ))}
              {(data?.budgetLines ?? []).length === 0 && <p className="text-xs text-muted-foreground">No budget set yet{canEdit ? " — add category budgets below." : "."}</p>}
            </div>

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <Select value={addCat} onValueChange={setAddCat}>
                  <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>{BUDGET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="h-9 w-40" type="number" placeholder="Amount (AED)" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} />
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={addLine}>
                  <Plus className="w-3.5 h-3.5" /> {busy ? "Saving…" : "Add budget line"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
