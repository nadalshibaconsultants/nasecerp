/**
 * RisksTab — Dubai AEC Risk Management Plan
 *
 * Implements ISO 31000:2018 risk management workflow tailored for AEC
 * consultancies in Dubai/UAE: 5x5 inherent vs residual scoring, treatment
 * strategy (avoid/transfer/mitigate/accept), mitigation actions, review
 * cadence, escalation thresholds and authority/regulatory tagging.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertTriangle, Plus, Shield, Activity, TrendingDown, TrendingUp, Flame,
  CheckCircle2, ListChecks, Clock4, Building2, X, FileDown, Edit3,
} from "lucide-react";
import { risksStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  inherentScore, residualScore, riskZone, riskZoneColor, escalationLevel,
  PROB_LABELS, IMPACT_LABELS, RISK_CATEGORY_LABEL, TREATMENT_LABELS, STATUS_LABELS,
  type ProjectRisk, type RiskCategory, type RiskLevel, type RiskTreatment,
  type RiskStatus, type RiskPhase, type MitigationAction,
} from "@/lib/risks/types";

type Props = { projectId: string; phase: RiskPhase };

const CATEGORIES: RiskCategory[] = [
  "design", "technical", "authority", "regulatory", "commercial", "contractual",
  "financial", "schedule", "hse", "environmental", "sustainability", "geotechnical",
  "stakeholder", "third-party", "resource", "quality", "ip-data", "force-majeure", "reputational",
];
const STATUSES: RiskStatus[] = ["identified", "assessed", "treated", "monitoring", "escalated", "closed", "realised"];
const TREATMENTS: RiskTreatment[] = ["avoid", "transfer", "mitigate", "accept"];

export default function RisksTab({ projectId, phase }: Props) {
  const { currentUser } = useAuth();
  const allRisks = useCollection(risksStore);
  const risks = useMemo(
    () => allRisks.filter((r) =>
      r.projectId === projectId && (r.phase === phase || r.phase === "both")
    ),
    [allRisks, projectId, phase]
  );

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterZone, setFilterZone] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<ProjectRisk | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [drilldown, setDrilldown] = useState<ProjectRisk | null>(null);

  const filtered = useMemo(() => {
    return risks.filter((r) => {
      if (filterCategory !== "all" && r.category !== filterCategory) return false;
      if (filterStatus === "active" && (r.status === "closed" || r.status === "realised")) return false;
      else if (filterStatus !== "all" && filterStatus !== "active" && r.status !== filterStatus) return false;
      if (filterZone !== "all" && riskZone(residualScore(r)) !== filterZone) return false;
      if (search && !`${r.code} ${r.title} ${r.description}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => residualScore(b) - residualScore(a));
  }, [risks, filterCategory, filterStatus, filterZone, search]);

  // KPI calculations
  const kpis = useMemo(() => {
    const active = risks.filter((r) => r.status !== "closed" && r.status !== "realised");
    const extreme = active.filter((r) => riskZone(residualScore(r)) === "extreme").length;
    const high = active.filter((r) => riskZone(residualScore(r)) === "high").length;
    const moderate = active.filter((r) => riskZone(residualScore(r)) === "moderate").length;
    const low = active.filter((r) => riskZone(residualScore(r)) === "low").length;
    const totalExposure = active.reduce((s, r) => s + (r.costImpactAED || 0) * (residualScore(r) / 25), 0);
    const totalScheduleExposure = active.reduce((s, r) => s + (r.scheduleImpactDays || 0) * (residualScore(r) / 25), 0);
    const overdueReviews = active.filter((r) => r.nextReviewDate && r.nextReviewDate < new Date().toISOString().slice(0, 10)).length;
    return { active: active.length, extreme, high, moderate, low, totalExposure, totalScheduleExposure, overdueReviews };
  }, [risks]);

  // Heat map data — count risks per (probability, impact) cell using residual
  const heatmap = useMemo(() => {
    const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    const active = risks.filter((r) => r.status !== "closed" && r.status !== "realised");
    for (const r of active) {
      const p = (r.residualProbability ?? r.inherentProbability) - 1;
      const i = (r.residualImpact ?? r.inherentImpact) - 1;
      if (p >= 0 && p < 5 && i >= 0 && i < 5) grid[i][p]++;
    }
    return grid;
  }, [risks]);

  function saveRisk(r: ProjectRisk) {
    risksStore.put(r);
    auditStore.put({
      id: newId("au"),
      timestamp: new Date().toISOString(),
      actor: currentUser?.displayName || "System",
      module: "projects",
      action: "edit",
      subject: `Risk ${r.code} - ${r.title}`,
      detail: `${RISK_CATEGORY_LABEL[r.category]} - residual score ${residualScore(r)}`,
    });
  }

  function deleteRisk(r: ProjectRisk) {
    if (!confirm(`Close out risk ${r.code}?`)) return;
    const closed = { ...r, status: "closed" as const, closedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    saveRisk(closed);
    toast.success("Risk closed", { description: r.code });
  }

  function exportCSV() {
    const headers = ["Code", "Title", "Category", "Phase", "Authority", "Status", "Treatment",
      "InhP", "InhI", "InhScore", "ResP", "ResI", "ResScore", "Zone", "Cost AED",
      "Schedule Days", "Owner", "Next Review"];
    const rows = filtered.map((r) => [
      r.code, r.title, RISK_CATEGORY_LABEL[r.category], r.phase, r.authorityRef || "",
      STATUS_LABELS[r.status], TREATMENT_LABELS[r.treatment],
      r.inherentProbability, r.inherentImpact, inherentScore(r),
      r.residualProbability ?? "", r.residualImpact ?? "", residualScore(r),
      riskZone(residualScore(r)),
      r.costImpactAED ?? "", r.scheduleImpactDays ?? "",
      r.ownerDisplay || "", r.nextReviewDate || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risk-register-${projectId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Risk register exported");
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-amber-600" /> Risk Management Plan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ISO 31000:2018 framework - 5x5 probability/impact matrix - Dubai DM/DCD/DEWA/Trakhees aligned
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1"><FileDown className="w-3.5 h-3.5" /> Export CSV</Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1"><Plus className="w-3.5 h-3.5" /> New Risk</Button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <KpiCard label="Active Risks" value={kpis.active} icon={<Activity className="w-4 h-4" />} />
        <KpiCard label="Extreme" value={kpis.extreme} icon={<Flame className="w-4 h-4 text-red-600" />} className="border-red-300" />
        <KpiCard label="High" value={kpis.high} icon={<TrendingUp className="w-4 h-4 text-orange-600" />} className="border-orange-300" />
        <KpiCard label="Moderate" value={kpis.moderate} icon={<AlertTriangle className="w-4 h-4 text-amber-600" />} className="border-amber-300" />
        <KpiCard label="Low" value={kpis.low} icon={<TrendingDown className="w-4 h-4 text-emerald-600" />} className="border-emerald-300" />
        <KpiCard label="Cost Exposure" value={`AED ${(kpis.totalExposure / 1000).toFixed(0)}k`} icon={<Building2 className="w-4 h-4" />} />
        <KpiCard label="Overdue Reviews" value={kpis.overdueReviews} icon={<Clock4 className="w-4 h-4 text-red-600" />} className={kpis.overdueReviews > 0 ? "border-red-300" : ""} />
      </div>

      <Tabs defaultValue="register" className="space-y-4">
        <TabsList>
          <TabsTrigger value="register">Risk Register</TabsTrigger>
          <TabsTrigger value="matrix">Heat Map (5x5)</TabsTrigger>
          <TabsTrigger value="framework">Framework</TabsTrigger>
        </TabsList>

        {/* REGISTER TAB */}
        <TabsContent value="register" className="space-y-3">
          <Card>
            <CardContent className="p-3 flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[180px]">
                <Label className="text-[10px]">Search</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code, title, description..." className="h-8" />
              </div>
              <div>
                <Label className="text-[10px]">Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{RISK_CATEGORY_LABEL[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active only</SelectItem>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Risk Zone</Label>
                <Select value={filterZone} onValueChange={setFilterZone}>
                  <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All zones</SelectItem>
                    <SelectItem value="extreme">Extreme</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground self-center">
                {filtered.length} of {risks.length}
              </div>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
              No risks match the current filters.
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="text-left px-2 py-2 w-[90px]">Code</th>
                      <th className="text-left px-2 py-2">Risk</th>
                      <th className="text-left px-2 py-2 w-[100px]">Category</th>
                      <th className="text-center px-2 py-2 w-[80px]">Inherent</th>
                      <th className="text-center px-2 py-2 w-[80px]">Residual</th>
                      <th className="text-center px-2 py-2 w-[80px]">Zone</th>
                      <th className="text-left px-2 py-2 w-[90px]">Treatment</th>
                      <th className="text-left px-2 py-2 w-[110px]">Owner</th>
                      <th className="text-left px-2 py-2 w-[100px]">Status</th>
                      <th className="text-left px-2 py-2 w-[80px]">Next Review</th>
                      <th className="text-right px-2 py-2 w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const iScore = inherentScore(r);
                      const rScore = residualScore(r);
                      const zone = riskZone(rScore);
                      const reviewOverdue = r.nextReviewDate && r.nextReviewDate < new Date().toISOString().slice(0, 10);
                      return (
                        <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer" onClick={() => setDrilldown(r)}>
                          <td className="px-2 py-2 font-mono font-semibold">{r.code}</td>
                          <td className="px-2 py-2">
                            <div className="font-medium">{r.title}</div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1">{r.description}</div>
                            {r.authorityRef && (
                              <Badge variant="outline" className="text-[9px] mt-0.5 border-blue-300 text-blue-700">{r.authorityRef}</Badge>
                            )}
                          </td>
                          <td className="px-2 py-2"><Badge variant="outline" className="text-[10px]">{RISK_CATEGORY_LABEL[r.category]}</Badge></td>
                          <td className="px-2 py-2 text-center">
                            <span className="text-[10px]">{r.inherentProbability}xP {r.inherentImpact}I</span>
                            <div className="font-mono font-bold text-sm">{iScore}</div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="text-[10px]">{r.residualProbability ?? r.inherentProbability}xP {r.residualImpact ?? r.inherentImpact}I</span>
                            <div className="font-mono font-bold text-sm">{rScore}</div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Badge className={`text-[9px] uppercase font-semibold ${riskZoneColor(zone)}`}>{zone}</Badge>
                          </td>
                          <td className="px-2 py-2"><Badge variant="outline" className="text-[10px]">{TREATMENT_LABELS[r.treatment]}</Badge></td>
                          <td className="px-2 py-2 text-[11px]">{r.ownerDisplay || "—"}</td>
                          <td className="px-2 py-2"><Badge variant="outline" className="text-[10px] capitalize">{STATUS_LABELS[r.status]}</Badge></td>
                          <td className="px-2 py-2 text-[10px]">
                            {r.nextReviewDate ? (
                              <span className={reviewOverdue ? "text-red-600 font-semibold" : ""}>{r.nextReviewDate}</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Button size="sm" variant="ghost" className="h-6 px-1" onClick={(e) => { e.stopPropagation(); setEditTarget(r); }}>
                              <Edit3 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* HEAT MAP TAB */}
        <TabsContent value="matrix" className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Residual Risk Heat Map (Dubai DM 5x5)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="text-[10px] text-muted-foreground writing-vertical-rl rotate-180" style={{ writingMode: "vertical-rl" }}>
                  IMPACT
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="text-xs">
                    <tbody>
                      {[5, 4, 3, 2, 1].map((imp) => (
                        <tr key={imp}>
                          <td className="pr-2 text-right text-[10px] font-semibold w-[120px]">{imp} - {IMPACT_LABELS[imp as RiskLevel]}</td>
                          {[1, 2, 3, 4, 5].map((prob) => {
                            const score = prob * imp;
                            const zone = riskZone(score);
                            const count = heatmap[imp - 1][prob - 1];
                            return (
                              <td key={prob} className={`border border-white p-2 text-center min-w-[70px] h-[60px] ${riskZoneColor(zone)}`}>
                                <div className="text-[9px] opacity-75">{score}</div>
                                <div className="text-lg font-bold">{count > 0 ? count : ""}</div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr>
                        <td></td>
                        {[1, 2, 3, 4, 5].map((p) => (
                          <td key={p} className="text-center text-[10px] font-semibold pt-1">
                            {p}<br /><span className="text-[8px] font-normal">{PROB_LABELS[p as RiskLevel].split(" ")[0]}</span>
                          </td>
                        ))}
                      </tr>
                      <tr><td></td><td colSpan={5} className="text-center text-[10px] text-muted-foreground pt-1">PROBABILITY -&gt;</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                <Badge className={riskZoneColor("low")}>Low (1-3) - team-level</Badge>
                <Badge className={riskZoneColor("moderate")}>Moderate (4-6) - PM review</Badge>
                <Badge className={riskZoneColor("high")}>High (8-12) - Director escalation</Badge>
                <Badge className={riskZoneColor("extreme")}>Extreme (15+) - Client/Board</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FRAMEWORK TAB */}
        <TabsContent value="framework" className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Risk Management Framework</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-xs">
              <FrameworkRow num="1" title="Identify"
                body="Capture risks from design reviews, authority pre-consultations, lessons-learned register, BIM clash reports and stage-gate workshops." />
              <FrameworkRow num="2" title="Analyse"
                body="Score Probability (1-5) and Impact (1-5) for the inherent (untreated) risk. Document trigger conditions, KRIs and early-warning signs." />
              <FrameworkRow num="3" title="Evaluate"
                body="Plot inherent score on the 5x5 matrix. Risks scoring &ge; 15 (Extreme) are escalated immediately; &ge; 8 (High) escalated to Director within 5 WD." />
              <FrameworkRow num="4" title="Treat"
                body="Select one of: Avoid (re-design out), Transfer (insurance/VO/contract), Mitigate (action plan to reduce P or I) or Accept (with rationale). Re-score for residual risk." />
              <FrameworkRow num="5" title="Monitor"
                body="Each risk has a review cadence (weekly/fortnightly/monthly/stage-gate). PM closes out actions; residual score updated. KRIs feed early-warning bell notifications." />
              <FrameworkRow num="6" title="Communicate"
                body="Top 5 residual risks reported in every monthly client report; extreme risks reported within 48 hours. Lessons-learned recorded at risk closure." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Reference Standards</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <p>- <strong>ISO 31000:2018</strong> - Risk management principles &amp; guidelines</p>
              <p>- <strong>ISO 45001:2018</strong> - Occupational health &amp; safety management</p>
              <p>- <strong>ISO 19650</strong> - BIM information management (clash / coordination risks)</p>
              <p>- <strong>Dubai Building Code 2021</strong> + <strong>UAE Fire &amp; Life Safety Code 2024</strong></p>
              <p>- <strong>FIDIC</strong> Red/Yellow/Silver Books - allocation of contractual risk</p>
              <p>- <strong>RIBA Plan of Work 2020</strong> - design-stage risk gates</p>
              <p>- <strong>LEED v4.1</strong> / <strong>Estidama Pearl</strong> - sustainability risk</p>
              <p>- Dubai authority frameworks: DM, DCD, DEWA, DDA, Trakhees, RTA, DLD/RERA</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DRILL-DOWN PANEL */}
      {drilldown && (
        <RiskDetailDialog
          risk={drilldown}
          onClose={() => setDrilldown(null)}
          onSave={saveRisk}
          onClose_={() => deleteRisk(drilldown)}
        />
      )}

      {/* EDIT DIALOG */}
      {editTarget && (
        <RiskFormDialog
          initial={editTarget}
          projectId={projectId}
          phase={phase}
          onClose={() => setEditTarget(null)}
          onSave={(r) => { saveRisk(r); setEditTarget(null); toast.success(`Risk ${r.code} updated`); }}
        />
      )}

      {/* CREATE DIALOG */}
      {createOpen && (
        <RiskFormDialog
          projectId={projectId}
          phase={phase}
          onClose={() => setCreateOpen(false)}
          onSave={(r) => {
            saveRisk(r);
            setCreateOpen(false);
            toast.success(`Risk ${r.code} added to register`);
          }}
        />
      )}
    </div>
  );
}

// ===== KPI Card =====
function KpiCard({ label, value, icon, className = "" }: { label: string; value: string | number; icon: React.ReactNode; className?: string; }) {
  return (
    <Card className={`border ${className}`}>
      <CardContent className="p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-lg font-bold font-mono">{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

function FrameworkRow({ num, title, body }: { num: string; title: string; body: string; }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold flex-shrink-0">{num}</div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

// ===== RISK FORM DIALOG =====
function RiskFormDialog({
  initial, projectId, phase, onClose, onSave,
}: {
  initial?: ProjectRisk;
  projectId: string;
  phase: RiskPhase;
  onClose: () => void;
  onSave: (r: ProjectRisk) => void;
}) {
  const isEdit = !!initial;
  const now = new Date().toISOString();
  const [r, setR] = useState<ProjectRisk>(initial || {
    id: newId("rsk"),
    projectId,
    code: `RSK-${projectId.slice(0, 3).toUpperCase()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    title: "",
    description: "",
    category: "design",
    phase,
    inherentProbability: 3,
    inherentImpact: 3,
    treatment: "mitigate",
    status: "identified",
    raisedAt: now,
    actions: [],
    reviews: [],
    reviewFrequency: "fortnightly",
    createdAt: now,
    updatedAt: now,
  });

  function set<K extends keyof ProjectRisk>(k: K, v: ProjectRisk[K]) { setR({ ...r, [k]: v, updatedAt: new Date().toISOString() }); }
  function setLevel(k: "inherentProbability" | "inherentImpact" | "residualProbability" | "residualImpact", v: string) {
    const n = parseInt(v, 10) as RiskLevel;
    setR({ ...r, [k]: n, updatedAt: new Date().toISOString() });
  }

  function submit() {
    if (!r.title.trim()) return toast.error("Title required");
    if (!r.description.trim()) return toast.error("Description required");
    onSave(r);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Risk" : "New Risk"}</DialogTitle>
          <DialogDescription>ISO 31000 risk record - inherent vs residual scoring</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Code</Label>
            <Input value={r.code} onChange={(e) => set("code", e.target.value)} className="h-8 font-mono" />
          </div>
          <div>
            <Label className="text-xs">Title *</Label>
            <Input value={r.title} onChange={(e) => set("title", e.target.value)} className="h-8" />
          </div>
        </div>

        <div>
          <Label className="text-xs">Description *</Label>
          <Textarea value={r.description} onChange={(e) => set("description", e.target.value)} rows={3} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={r.category} onValueChange={(v) => set("category", v as RiskCategory)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{RISK_CATEGORY_LABEL[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Phase</Label>
            <Select value={r.phase} onValueChange={(v) => set("phase", v as RiskPhase)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pre-contract">Pre-Contract</SelectItem>
                <SelectItem value="post-contract">Post-Contract</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Authority (optional)</Label>
            <Input value={r.authorityRef || ""} onChange={(e) => set("authorityRef", e.target.value)} className="h-8" placeholder="DM, DCD, DEWA..." />
          </div>
        </div>

        {/* INHERENT */}
        <div className="border border-amber-200 bg-amber-50/40 rounded p-3 space-y-2">
          <p className="text-xs font-semibold">Inherent Risk (before treatment)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Probability</Label>
              <Select value={String(r.inherentProbability)} onValueChange={(v) => setLevel("inherentProbability", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} - {PROB_LABELS[n as RiskLevel]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Impact</Label>
              <Select value={String(r.inherentImpact)} onValueChange={(v) => setLevel("inherentImpact", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} - {IMPACT_LABELS[n as RiskLevel]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[10px]">Score: <strong>{inherentScore(r)}</strong> - Zone: <Badge className={`text-[9px] ${riskZoneColor(riskZone(inherentScore(r)))}`}>{riskZone(inherentScore(r))}</Badge></p>
        </div>

        {/* TREATMENT */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Treatment Strategy</Label>
            <Select value={r.treatment} onValueChange={(v) => set("treatment", v as RiskTreatment)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{TREATMENTS.map((t) => <SelectItem key={t} value={t}>{TREATMENT_LABELS[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={r.status} onValueChange={(v) => set("status", v as RiskStatus)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Treatment Rationale</Label>
          <Textarea value={r.treatmentRationale || ""} onChange={(e) => set("treatmentRationale", e.target.value)} rows={2} />
        </div>

        {/* RESIDUAL */}
        <div className="border border-emerald-200 bg-emerald-50/40 rounded p-3 space-y-2">
          <p className="text-xs font-semibold">Residual Risk (after treatment - optional)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Probability</Label>
              <Select value={r.residualProbability ? String(r.residualProbability) : ""} onValueChange={(v) => setLevel("residualProbability", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} - {PROB_LABELS[n as RiskLevel]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Impact</Label>
              <Select value={r.residualImpact ? String(r.residualImpact) : ""} onValueChange={(v) => setLevel("residualImpact", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} - {IMPACT_LABELS[n as RiskLevel]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[10px]">Residual Score: <strong>{residualScore(r)}</strong> - Zone: <Badge className={`text-[9px] ${riskZoneColor(riskZone(residualScore(r)))}`}>{riskZone(residualScore(r))}</Badge> - Escalation: <strong className="capitalize">{escalationLevel(riskZone(residualScore(r)))}</strong></p>
        </div>

        {/* IMPACTS */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Cost Impact (AED) if realised</Label>
            <Input type="number" value={r.costImpactAED ?? ""} onChange={(e) => set("costImpactAED", e.target.value ? Number(e.target.value) : undefined)} className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Schedule Impact (days)</Label>
            <Input type="number" value={r.scheduleImpactDays ?? ""} onChange={(e) => set("scheduleImpactDays", e.target.value ? Number(e.target.value) : undefined)} className="h-8" />
          </div>
        </div>

        {/* OWNERSHIP */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Risk Owner</Label>
            <Input value={r.ownerDisplay || ""} onChange={(e) => set("ownerDisplay", e.target.value)} className="h-8" placeholder="Name" />
          </div>
          <div>
            <Label className="text-xs">Review Frequency</Label>
            <Select value={r.reviewFrequency} onValueChange={(v) => set("reviewFrequency", v as ProjectRisk["reviewFrequency"])}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="fortnightly">Fortnightly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="stage-gate">At Stage Gate</SelectItem>
                <SelectItem value="ad-hoc">Ad-hoc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* TRIGGERS / KRIs */}
        <div>
          <Label className="text-xs">Trigger Conditions</Label>
          <Textarea value={r.triggerConditions || ""} onChange={(e) => set("triggerConditions", e.target.value)} rows={2} placeholder="What conditions indicate this risk is being realised?" />
        </div>
        <div>
          <Label className="text-xs">Early Warning Signs (KRIs)</Label>
          <Textarea value={r.earlyWarningSigns || ""} onChange={(e) => set("earlyWarningSigns", e.target.value)} rows={2} />
        </div>
        <div>
          <Label className="text-xs">Contingency Plan</Label>
          <Textarea value={r.contingencyPlan || ""} onChange={(e) => set("contingencyPlan", e.target.value)} rows={2} placeholder="Plan B if the risk is realised" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{isEdit ? "Save Changes" : "Create Risk"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== RISK DETAIL / DRILL-DOWN =====
function RiskDetailDialog({
  risk, onClose, onSave, onClose_,
}: {
  risk: ProjectRisk;
  onClose: () => void;
  onSave: (r: ProjectRisk) => void;
  onClose_: () => void;
}) {
  const [actionText, setActionText] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDue, setActionDue] = useState("");

  function addAction() {
    if (!actionText.trim()) return toast.error("Action description required");
    const newAction: MitigationAction = {
      id: newId("act"),
      description: actionText,
      ownerDisplay: actionOwner || undefined,
      dueDate: actionDue || undefined,
      status: "open",
    };
    onSave({ ...risk, actions: [...risk.actions, newAction], updatedAt: new Date().toISOString() });
    setActionText(""); setActionOwner(""); setActionDue("");
    toast.success("Mitigation action added");
  }

  function updateActionStatus(id: string, status: MitigationAction["status"]) {
    const actions = risk.actions.map((a) => a.id === id
      ? { ...a, status, completedAt: status === "done" ? new Date().toISOString() : undefined }
      : a);
    onSave({ ...risk, actions, updatedAt: new Date().toISOString() });
  }

  const iScore = inherentScore(risk);
  const rScore = residualScore(risk);
  const reduction = iScore > 0 ? Math.round(((iScore - rScore) / iScore) * 100) : 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className="font-mono">{risk.code}</Badge>
            {risk.title}
          </DialogTitle>
          <DialogDescription>{RISK_CATEGORY_LABEL[risk.category]} - {risk.phase}{risk.authorityRef ? ` - ${risk.authorityRef}` : ""}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Inherent Score</p>
            <p className="text-2xl font-bold font-mono">{iScore}</p>
            <Badge className={`text-[9px] ${riskZoneColor(riskZone(iScore))}`}>{riskZone(iScore)}</Badge>
          </CardContent></Card>
          <Card><CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Residual Score</p>
            <p className="text-2xl font-bold font-mono">{rScore}</p>
            <Badge className={`text-[9px] ${riskZoneColor(riskZone(rScore))}`}>{riskZone(rScore)}</Badge>
          </CardContent></Card>
          <Card><CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Reduction</p>
            <p className="text-2xl font-bold font-mono text-emerald-600">{reduction}%</p>
            <Badge variant="outline" className="text-[9px]">{TREATMENT_LABELS[risk.treatment]}</Badge>
          </CardContent></Card>
        </div>

        <Section title="Description">{risk.description}</Section>
        {risk.treatmentRationale && <Section title="Treatment Rationale">{risk.treatmentRationale}</Section>}
        {risk.triggerConditions && <Section title="Trigger Conditions">{risk.triggerConditions}</Section>}
        {risk.earlyWarningSigns && <Section title="Early Warning Signs (KRIs)">{risk.earlyWarningSigns}</Section>}
        {risk.contingencyPlan && <Section title="Contingency Plan">{risk.contingencyPlan}</Section>}

        <Section title={`Mitigation Actions (${risk.actions.length})`}>
          <div className="space-y-1">
            {risk.actions.map((a) => (
              <div key={a.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded">
                <input type="checkbox" checked={a.status === "done"} onChange={(e) => updateActionStatus(a.id, e.target.checked ? "done" : "open")} />
                <div className="flex-1">
                  <p className={`text-xs ${a.status === "done" ? "line-through text-muted-foreground" : ""}`}>{a.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.ownerDisplay || "Unassigned"}{a.dueDate ? ` - due ${a.dueDate}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px] capitalize">{a.status}</Badge>
              </div>
            ))}
            {risk.actions.length === 0 && <p className="text-xs text-muted-foreground italic">No actions yet.</p>}
          </div>
          <div className="mt-2 p-2 border border-dashed rounded space-y-1">
            <Input value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder="Action description" className="h-8" />
            <div className="grid grid-cols-2 gap-1">
              <Input value={actionOwner} onChange={(e) => setActionOwner(e.target.value)} placeholder="Owner" className="h-8" />
              <Input type="date" value={actionDue} onChange={(e) => setActionDue(e.target.value)} className="h-8" />
            </div>
            <Button size="sm" onClick={addAction} className="w-full gap-1"><Plus className="w-3 h-3" /> Add action</Button>
          </div>
        </Section>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-muted-foreground">Owner:</span> {risk.ownerDisplay || "—"}</div>
          <div><span className="text-muted-foreground">Review:</span> {risk.reviewFrequency}</div>
          <div><span className="text-muted-foreground">Next review:</span> {risk.nextReviewDate || "—"}</div>
          <div><span className="text-muted-foreground">Cost exposure:</span> {risk.costImpactAED ? `AED ${risk.costImpactAED.toLocaleString()}` : "—"}</div>
          <div><span className="text-muted-foreground">Schedule:</span> {risk.scheduleImpactDays ? `${risk.scheduleImpactDays} days` : "—"}</div>
          <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[risk.status]}</Badge></div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose_} className="gap-1 text-red-600"><X className="w-3.5 h-3.5" /> Close Risk</Button>
          <Button variant="outline" onClick={onClose} className="gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground flex items-center gap-1">
        <ListChecks className="w-3 h-3" /> {title}
      </p>
      <div className="text-xs">{children}</div>
    </div>
  );
}
