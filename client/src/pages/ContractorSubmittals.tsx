/**
 * Contractor Submittals — List view with SLA tracking, filters, routing matrix
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Search,
  Filter,
  FileText,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Timer,
  BarChart3,
  Table2,
} from "lucide-react";
import {
  SUBMITTAL_TYPES,
  DISCIPLINES,
  SITE_ROLES,
  RESPONSE_STATUS_COLORS,
  SLA_COLORS,
  SLA_BG_COLORS,
  getSLAStatus,
  getRoutingRule,
  type PortalSubmittal,
  type SiteRoleCode,
  type SubmittalTypeCode,
  type Discipline,
} from "@/lib/contractor-portal-data";
import { submittalsStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";

export default function ContractorSubmittals() {
  const DEMO_SUBMITTALS = useCollection(submittalsStore);
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [activeTab, setActiveTab] = useState("list");

  const filtered = DEMO_SUBMITTALS.filter((s) => {
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.ref.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && s.type !== filterType) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterDiscipline !== "all" && s.discipline !== filterDiscipline) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Submittals</h1>
          <p className="text-sm text-slate-500">{DEMO_SUBMITTALS.length} total • {DEMO_SUBMITTALS.filter(s => s.status === "Open" || s.status === "Under Review").length} open</p>
        </div>
        <Button onClick={() => navigate("/contractor-portal/new")} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
          <FileText className="w-4 h-4" /> New Submittal
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="list" className="gap-1"><FileText className="w-3 h-3" /> Submittals</TabsTrigger>
          <TabsTrigger value="routing" className="gap-1"><Table2 className="w-3 h-3" /> Routing Matrix</TabsTrigger>
          <TabsTrigger value="sla" className="gap-1"><Timer className="w-3 h-3" /> SLA Dashboard</TabsTrigger>
        </TabsList>

        {/* Submittals List */}
        <TabsContent value="list" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search by ref or title..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {SUBMITTAL_TYPES.map((t) => <SelectItem key={t.code} value={t.code}>{t.code}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {["Open", "Under Review", "Approved", "Approved with Comments", "Resubmit", "Rejected", "Need More Info"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Discipline" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Disciplines</SelectItem>
                {DISCIPLINES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          <div className="space-y-2">
            {filtered.map((s) => (
              <SubmittalRow key={s.id} submittal={s} onClick={() => navigate(`/contractor-portal/submittals/${s.id}`)} />
            ))}
            {filtered.length === 0 && (
              <Card className="border border-dashed"><CardContent className="p-8 text-center text-sm text-slate-500">No submittals match your filters</CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* Routing Matrix */}
        <TabsContent value="routing" className="mt-4">
          <RoutingMatrix />
        </TabsContent>

        {/* SLA Dashboard */}
        <TabsContent value="sla" className="mt-4">
          <SLADashboard submittals={DEMO_SUBMITTALS} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubmittalRow({ submittal, onClick }: { submittal: PortalSubmittal; onClick: () => void }) {
  const slaStatus = getSLAStatus(submittal.daysRemaining);
  return (
    <Card className={`border cursor-pointer hover:shadow-sm transition-all ${SLA_BG_COLORS[slaStatus]}`} onClick={onClick}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono font-semibold text-slate-800">{submittal.ref}</span>
              <Badge className={`text-[9px] px-1.5 ${RESPONSE_STATUS_COLORS[submittal.status]}`}>{submittal.status}</Badge>
              {submittal.priority === "Urgent" && <Badge className="text-[9px] px-1.5 bg-red-100 text-red-700">Urgent</Badge>}
              {submittal.revision > 1 && <Badge variant="outline" className="text-[9px]">Rev.{submittal.revision}</Badge>}
            </div>
            <p className="text-sm text-slate-700 truncate">{submittal.title}</p>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
              <span>{submittal.discipline}</span>
              <span>•</span>
              <span>Reviewer: {Array.isArray(submittal.primaryReviewer) ? submittal.primaryReviewer.join(" + ") : submittal.primaryReviewer}</span>
              <span>•</span>
              <span>{submittal.dateSubmitted}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${SLA_COLORS[slaStatus]}`}>
              <Clock className="w-3 h-3" />
              {submittal.daysRemaining <= 0 ? `${Math.abs(submittal.daysRemaining)}d overdue` : `${submittal.daysRemaining}d left`}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">{submittal.attachments.length} files</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RoutingMatrix() {
  const types = SUBMITTAL_TYPES.slice(0, 8);
  const disciplines = DISCIPLINES.slice(0, 6);

  return (
    <Card className="border border-slate-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Table2 className="w-4 h-4 text-teal-600" />
          Routing Rules Matrix
        </CardTitle>
        <p className="text-xs text-slate-500">Shows which Site Role reviews each submittal type per discipline</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-2 font-medium text-slate-600 sticky left-0 bg-white">Type \ Discipline</th>
                {disciplines.map((d) => (
                  <th key={d} className="text-center p-2 font-medium text-slate-600 whitespace-nowrap">{d.split(" ")[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.code} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2 font-medium text-slate-700 sticky left-0 bg-white">{t.code} <span className="text-slate-400">({t.sla}d)</span></td>
                  {disciplines.map((d) => {
                    const rule = getRoutingRule(t.code as SubmittalTypeCode, d as Discipline);
                    const reviewers = Array.isArray(rule.primaryReviewer) ? rule.primaryReviewer : [rule.primaryReviewer];
                    return (
                      <td key={d} className="p-2 text-center">
                        <div className="flex flex-wrap justify-center gap-0.5">
                          {reviewers.map((r) => (
                            <Badge key={r} variant="outline" className={`text-[9px] px-1 py-0 ${SITE_ROLES[r].color}`}>{r}</Badge>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">All submittals require PM approval. RE is always a watcher. Consulted roles vary by type.</p>
      </CardContent>
    </Card>
  );
}

function SLADashboard({ submittals }: { submittals: PortalSubmittal[] }) {
  const open = submittals.filter((s) => !["Approved", "Rejected"].includes(s.status));
  const within = open.filter((s) => getSLAStatus(s.daysRemaining) === "within");
  const approaching = open.filter((s) => getSLAStatus(s.daysRemaining) === "approaching");
  const breached = open.filter((s) => getSLAStatus(s.daysRemaining) === "breached");

  const avgResponseDays = 4.2;
  const complianceRate = open.length > 0 ? Math.round(((within.length + approaching.length) / open.length) * 100) : 100;

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-[11px] text-emerald-700">Within SLA</span></div>
            <p className="text-2xl font-bold font-data text-emerald-800">{within.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-amber-600" /><span className="text-[11px] text-amber-700">Approaching</span></div>
            <p className="text-2xl font-bold font-data text-amber-800">{approaching.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Timer className="w-4 h-4 text-red-600" /><span className="text-[11px] text-red-700">Breached</span></div>
            <p className="text-2xl font-bold font-data text-red-800">{breached.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-slate-600" /><span className="text-[11px] text-slate-600">Compliance</span></div>
            <p className="text-2xl font-bold font-data text-slate-800">{complianceRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Breakdown by Type */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">SLA Performance by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {SUBMITTAL_TYPES.slice(0, 8).map((t) => {
              const typeSubmittals = submittals.filter((s) => s.type === t.code);
              const typeOpen = typeSubmittals.filter((s) => !["Approved", "Rejected"].includes(s.status));
              const typeBreached = typeOpen.filter((s) => s.daysRemaining < 0);
              return (
                <div key={t.code} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-10 text-slate-600">{t.code}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${typeSubmittals.length > 0 ? ((typeSubmittals.length - typeBreached.length) / typeSubmittals.length * 100) : 100}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-500 w-16 text-right">{typeSubmittals.length} total</span>
                  <span className="text-[11px] text-slate-500 w-12 text-right">{t.sla}d SLA</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Breached Items */}
      {breached.length > 0 && (
        <Card className="border border-red-200 bg-red-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              SLA Breached — Escalated to PM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {breached.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded bg-white border border-red-200">
                  <div>
                    <p className="text-xs font-mono font-medium text-red-700">{s.ref}</p>
                    <p className="text-xs text-slate-600 truncate">{s.title}</p>
                  </div>
                  <Badge className="bg-red-100 text-red-700 text-[9px]">{Math.abs(s.daysRemaining)}d overdue</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
