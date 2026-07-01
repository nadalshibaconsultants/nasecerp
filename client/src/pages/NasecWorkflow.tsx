/**
 * NASEC Workflow Engine — Full 8-Stage + 5-Gate Project Lifecycle
 * Design: Architectural Blueprint (Navy + Amber accents)
 * Integrates verbatim data from WF-TPL-001 Rev 02
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Building2, Users, CheckCircle2, FileText, Shield, BarChart3, HardHat,
  ChevronRight, ChevronDown, Plus, Search, Filter, Clock,
  AlertTriangle, Star, Lock, Unlock, Eye, ArrowRight, ArrowLeft,
  Calendar, MapPin, Briefcase, Target, Layers, GitBranch,
  ClipboardCheck, Globe, BookOpen, Zap, TrendingUp, Award
} from "lucide-react";
import {
  NASEC_ROLES, NASEC_STAGES, NASEC_RACI, NASEC_STAGE_WORKFLOW,
  NASEC_DELIVERABLES, DUBAI_AUTHORITIES, DUBAI_CODES, NASEC_MANUAL_REFS,
  NASEC_RECOMMENDATIONS, JURISDICTIONS, PROJECT_TYPES,
  getAuthoritiesForProject, getRoleActivityCounts, TEMPLATE_VERSION,
  type NasecRole, type NasecStage, type RaciActivity, type NasecDeliverable,
  type DubaiAuthority, type RaciValue
} from "@/data/nasecWorkflow";

// ═══════════════════════════════════════════════════════════════
// DEMO DATA — Simulates a project in Stage 3 (Schematic Design)
// ═══════════════════════════════════════════════════════════════
const DEMO_PROJECT = {
  id: "PRJ-2026-MHT-0042",
  name: "Marina Heights Tower",
  nameAr: "برج مارينا هايتس",
  client: "Al Habtoor Group",
  jurisdiction: "DM",
  projectType: "tower",
  nearAirport: false,
  currentStage: "S3",
  size: "Large",
  startDate: "2025-11-15",
  team: [
    { roleCode: "PM", name: "Ahmed Al Rashid", utilization: 85, status: "active" },
    { roleCode: "LA", name: "Sarah Johnson", utilization: 92, status: "active" },
    { roleCode: "LM", name: "Raj Patel", utilization: 78, status: "active" },
    { roleCode: "LE", name: "Omar Hassan", utilization: 81, status: "active" },
    { roleCode: "LS", name: "David Chen", utilization: 70, status: "active" },
    { roleCode: "CM", name: "Fatima Al Zahra", utilization: 65, status: "active" },
    { roleCode: "AE", name: "Mohammed Khalil", utilization: 88, status: "active" },
    { roleCode: "PE", name: "James Wilson", utilization: 90, status: "active" },
    { roleCode: "PCE", name: "Priya Sharma", utilization: 72, status: "active" },
    { roleCode: "BIM", name: "Ali Mahmoud", utilization: 85, status: "active" },
    { roleCode: "SM", name: "Karen Taylor", utilization: 55, status: "active" },
    { roleCode: "QS", name: "Hassan Noor", utilization: 60, status: "active" },
  ],
  stageGates: [
    { stageId: "S1", status: "completed", submittedDate: "2025-12-20", approvedDate: "2026-01-05", days: 10 },
    { stageId: "G1", status: "completed", submittedDate: "2026-01-05", approvedDate: "2026-01-15", days: 8 },
    { stageId: "S2", status: "completed", submittedDate: "2026-02-10", approvedDate: "2026-03-01", days: 14 },
    { stageId: "G2", status: "completed", submittedDate: "2026-03-01", approvedDate: "2026-03-18", days: 13 },
    { stageId: "S3", status: "in-progress", submittedDate: null, approvedDate: null, days: null },
  ],
  nocs: [
    { authority: "DM", type: "Preliminary Design Approval", status: "approved", submitted: "2026-03-20", approved: "2026-04-10", expiry: "2027-04-10", ref: "DM-PDA-2026-4521" },
    { authority: "DCD", type: "Civil Defence NOC (Preliminary)", status: "under-review", submitted: "2026-04-15", approved: null, expiry: null, ref: "DCD-NOC-2026-1187" },
    { authority: "DEWA", type: "Load Approval", status: "pending", submitted: null, approved: null, expiry: null, ref: null },
    { authority: "RTA", type: "Traffic Impact Study", status: "pending", submitted: null, approved: null, expiry: null, ref: null },
  ],
  deliverables: [
    { id: 1, status: "completed" }, { id: 2, status: "completed" }, { id: 3, status: "completed" },
    { id: 4, status: "completed" }, { id: 5, status: "completed" }, { id: 6, status: "completed" },
    { id: 7, status: "completed" }, { id: 8, status: "completed" }, { id: 9, status: "completed" },
    { id: 10, status: "completed" }, { id: 11, status: "in-progress" }, { id: 12, status: "in-progress" },
    { id: 13, status: "in-progress" }, { id: 14, status: "in-progress" }, { id: 15, status: "not-started" },
    { id: 16, status: "not-started" }, { id: 17, status: "not-started" }, { id: 18, status: "not-started" },
  ],
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
type MainTab = "overview" | "stages" | "raci" | "team" | "deliverables" | "authorities" | "gates" | "create" | "governance";

export default function NasecWorkflow() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [phase, setPhase] = useState<"pre-contract" | "post-contract">(() => {
    try { const v = window.localStorage.getItem("nasec-workflow-phase"); if (v === "post-contract") return v; } catch { /* noop */ }
    return "pre-contract";
  });
  function switchPhase(p: "pre-contract" | "post-contract") {
    setPhase(p);
    try { window.localStorage.setItem("nasec-workflow-phase", p); } catch { /* noop */ }
  }
  const [selectedStage, setSelectedStage] = useState<string>("S3");
  const [raciFilter, setRaciFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "PM Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "stages", label: "Stage Pipeline", icon: <GitBranch className="w-4 h-4" /> },
    { id: "raci", label: "RACI Matrix", icon: <Layers className="w-4 h-4" /> },
    { id: "team", label: "Team Setup", icon: <Users className="w-4 h-4" /> },
    { id: "deliverables", label: "Deliverables", icon: <FileText className="w-4 h-4" /> },
    { id: "authorities", label: "Authorities & NOCs", icon: <Globe className="w-4 h-4" /> },
    { id: "gates", label: "Stage Gates", icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: "create", label: "New Project", icon: <Plus className="w-4 h-4" /> },
    { id: "governance", label: "Governance", icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        {/* Pre/Post Contract phase toggle */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Phase</span>
          <div className="inline-flex rounded-md border border-slate-200 overflow-hidden">
            <button onClick={() => switchPhase("pre-contract")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${phase === "pre-contract" ? "bg-black text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
              🟢 Pre-Contract
            </button>
            <button onClick={() => switchPhase("post-contract")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${phase === "post-contract" ? "bg-black text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
              🟠 Post-Contract
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className="font-mono">{TEMPLATE_VERSION.code}</span>
              <span>•</span>
              <span>{TEMPLATE_VERSION.revision}</span>
              <span>•</span>
              <span>{TEMPLATE_VERSION.manualRef}</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">NASEC Workflow Engine</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              8-Stage + 5-Gate A&E Project Lifecycle — {DEMO_PROJECT.name} ({DEMO_PROJECT.id})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Current Stage</div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-semibold text-sm">S3 — Schematic Design + BODR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation — only on pre-contract for now */}
        {phase === "pre-contract" && <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {phase === "pre-contract" && <>
          {activeTab === "overview" && <PMDashboard />}
          {activeTab === "stages" && <StagePipeline selectedStage={selectedStage} onSelectStage={setSelectedStage} />}
          {activeTab === "raci" && <RACIMatrix filter={raciFilter} onFilterChange={setRaciFilter} search={searchTerm} onSearchChange={setSearchTerm} />}
          {activeTab === "team" && <TeamSetup />}
          {activeTab === "deliverables" && <DeliverablesTracker />}
          {activeTab === "authorities" && <AuthoritiesNOC />}
          {activeTab === "gates" && <StageGates />}
          {activeTab === "create" && <ProjectCreationWizard />}
          {activeTab === "governance" && <GovernancePanel />}
        </>}
        {phase === "post-contract" && <PostContractPlaceholder />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: PM DASHBOARD
// ═══════════════════════════════════════════════════════════════
function PMDashboard() {
  const completedStages = DEMO_PROJECT.stageGates.filter(g => g.status === "completed").length;
  const totalStages = NASEC_STAGES.length;
  const completedDeliverables = DEMO_PROJECT.deliverables.filter(d => d.status === "completed").length;
  const totalDeliverables = DEMO_PROJECT.deliverables.length;
  const approvedNocs = DEMO_PROJECT.nocs.filter(n => n.status === "approved").length;
  const totalNocs = DEMO_PROJECT.nocs.length;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Stage Progress" value={`${completedStages}/${totalStages}`} sub="S3 in progress" color="blue" />
        <KPICard label="Deliverables" value={`${completedDeliverables}/${totalDeliverables}`} sub={`${Math.round(completedDeliverables/totalDeliverables*100)}% complete`} color="green" />
        <KPICard label="NOCs Secured" value={`${approvedNocs}/${totalNocs}`} sub="1 under review" color="amber" />
        <KPICard label="Team Utilization" value="78%" sub="12 members active" color="purple" />
      </div>

      {/* Stage Timeline */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          Stage Pipeline — {DEMO_PROJECT.name}
        </h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {NASEC_STAGES.map((stage, i) => {
            const gateData = DEMO_PROJECT.stageGates.find(g => g.stageId === stage.id);
            const status = gateData?.status || "future";
            const isGate = stage.type === "gate";
            return (
              <div key={stage.id} className="flex items-center">
                <div className={`flex flex-col items-center ${isGate ? "mx-1" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    status === "completed" ? "bg-green-100 border-green-500 text-green-700" :
                    status === "in-progress" ? "bg-amber-100 border-amber-500 text-amber-700 animate-pulse" :
                    "bg-muted border-border text-muted-foreground"
                  } ${isGate ? "w-6 h-6" : ""}`}>
                    {status === "completed" ? "✓" : isGate ? "★" : stage.id.replace("S", "")}
                  </div>
                  <span className={`text-[9px] mt-1 max-w-[60px] text-center leading-tight ${
                    status === "in-progress" ? "font-semibold text-amber-700" : "text-muted-foreground"
                  }`}>
                    {stage.id}
                  </span>
                </div>
                {i < NASEC_STAGES.length - 1 && (
                  <div className={`w-4 h-0.5 ${status === "completed" ? "bg-green-500" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column: Team Roster + NOC Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team Roster */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Team Roster ({DEMO_PROJECT.team.length} members)
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {DEMO_PROJECT.team.map(member => {
              const role = NASEC_ROLES.find(r => r.code === member.roleCode);
              const counts = getRoleActivityCounts(member.roleCode);
              return (
                <div key={member.roleCode} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      role?.category === "core" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {member.roleCode}
                    </div>
                    <div>
                      <div className="text-xs font-medium">{member.name}</div>
                      <div className="text-[10px] text-muted-foreground">{role?.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] text-muted-foreground font-mono">
                      R:{counts.r} A:{counts.a} C:{counts.c}
                    </div>
                    <div className="w-12">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          member.utilization > 85 ? "bg-red-500" : member.utilization > 70 ? "bg-amber-500" : "bg-green-500"
                        }`} style={{ width: `${member.utilization}%` }} />
                      </div>
                      <div className="text-[9px] text-center mt-0.5">{member.utilization}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* NOC Tracker */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Authority NOC Status
          </h3>
          <div className="space-y-3">
            {DEMO_PROJECT.nocs.map((noc, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    noc.status === "approved" ? "bg-green-500" :
                    noc.status === "under-review" ? "bg-amber-500 animate-pulse" :
                    "bg-muted-foreground/30"
                  }`} />
                  <div>
                    <div className="text-xs font-medium">{noc.authority} — {noc.type}</div>
                    {noc.ref && <div className="text-[10px] text-muted-foreground font-mono">{noc.ref}</div>}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  noc.status === "approved" ? "bg-green-100 text-green-700" :
                  noc.status === "under-review" ? "bg-amber-100 text-amber-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {noc.status === "approved" ? "Approved" : noc.status === "under-review" ? "Under Review" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations Status */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          ERP Automation Recommendations ({NASEC_RECOMMENDATIONS.filter(r => r.status === "implemented").length}/14 implemented)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {NASEC_RECOMMENDATIONS.map(rec => (
            <div key={rec.id} className={`flex items-start gap-2 p-2 rounded border ${
              rec.status === "implemented" ? "border-green-200 bg-green-50" : "border-border bg-muted/30"
            }`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${
                rec.status === "implemented" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {rec.status === "implemented" ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-[8px]">{rec.id}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium truncate">{rec.title}</div>
                <div className="text-[9px] text-muted-foreground truncate">{rec.rationale.slice(0, 80)}...</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
    purple: "border-purple-200 bg-purple-50",
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1 font-mono">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: STAGE PIPELINE
// ═══════════════════════════════════════════════════════════════
function StagePipeline({ selectedStage, onSelectStage }: { selectedStage: string; onSelectStage: (s: string) => void }) {
  const stage = NASEC_STAGES.find(s => s.id === selectedStage);
  const workflow = NASEC_STAGE_WORKFLOW.find(w => w.stageId === selectedStage);
  const activities = NASEC_RACI.filter(r => r.stage === selectedStage);
  const deliverables = NASEC_DELIVERABLES.filter(d => d.stage === selectedStage);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Stage List */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">8 Stages + 5 Gates</h3>
        <div className="space-y-1">
          {NASEC_STAGES.map(s => {
            const gateData = DEMO_PROJECT.stageGates.find(g => g.stageId === s.id);
            const status = gateData?.status || "future";
            return (
              <button
                key={s.id}
                onClick={() => onSelectStage(s.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-2 ${
                  selectedStage === s.id ? "bg-primary text-primary-foreground" :
                  status === "completed" ? "bg-green-50 text-green-800 hover:bg-green-100" :
                  status === "in-progress" ? "bg-amber-50 text-amber-800 hover:bg-amber-100" :
                  "hover:bg-accent text-foreground"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                  s.type === "gate" ? "border-amber-400 bg-amber-50 text-amber-700" : "border-primary/30 bg-primary/5 text-primary"
                } ${selectedStage === s.id ? "border-primary-foreground/50 bg-primary-foreground/20 text-primary-foreground" : ""}`}>
                  {s.type === "gate" ? "★" : s.id.replace("S", "")}
                </span>
                <span className="truncate">{s.id} — {s.name.split("—")[1]?.trim() || s.name.split("—")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Detail */}
      <div className="space-y-4">
        {stage && (
          <>
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  stage.type === "gate" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                }`}>
                  {stage.id}
                </span>
                <h2 className="text-base font-bold">{stage.name}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{stage.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><span className="text-muted-foreground">Key Deliverable:</span><br/><span className="font-medium">{stage.keyDeliverable}</span></div>
                <div><span className="text-muted-foreground">Lead Role:</span><br/><span className="font-medium">{stage.leadRole}</span></div>
                <div><span className="text-muted-foreground">Approval Window:</span><br/><span className="font-medium">{stage.approvalWindow}</span></div>
                <div><span className="text-muted-foreground">Manual Ref:</span><br/><span className="font-mono">{stage.manualRef}</span></div>
              </div>
            </div>

            {/* Workflow Sequence */}
            {workflow && (
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold mb-3">Activity Sequence</h3>
                <div className="bg-muted/30 rounded p-3 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                  {workflow.activitySequence}
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
                  <div><span className="text-muted-foreground">Lead:</span> {workflow.lead}</div>
                  <div><span className="text-muted-foreground">Inputs:</span> {workflow.inputs}</div>
                  <div><span className="text-muted-foreground">Output:</span> {workflow.output}</div>
                </div>
              </div>
            )}

            {/* RACI for this stage */}
            {activities.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5 overflow-x-auto">
                <h3 className="text-sm font-semibold mb-3">RACI — {stage.id} Activities ({activities.length})</h3>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 px-2 font-medium">Activity</th>
                      {["PM","LA","LM","LE","LS","CM","AE","PE","BIM","SM","QS"].map(r => (
                        <th key={r} className="text-center py-1.5 px-1 font-medium w-8">{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((act, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="py-1.5 px-2 max-w-[300px] truncate">{act.activity}</td>
                        {(["PM","LA","LM","LE","LS","CM","AE","PE","BIM","SM","QS"] as const).map(role => (
                          <td key={role} className="text-center py-1.5 px-1">
                            <RaciBadge value={act[role] as RaciValue} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Deliverables for this stage */}
            {deliverables.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold mb-3">Deliverables — {stage.id} ({deliverables.length})</h3>
                <div className="space-y-2">
                  {deliverables.map(d => {
                    const projDel = DEMO_PROJECT.deliverables.find(pd => pd.id === d.id);
                    return (
                      <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            projDel?.status === "completed" ? "bg-green-500" :
                            projDel?.status === "in-progress" ? "bg-amber-500" : "bg-muted-foreground/30"
                          }`} />
                          <span className="text-xs">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{d.format}</span>
                          <span className="font-mono">{d.accountable}/{d.responsible}</span>
                          <span>{d.qualityGate}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: RACI MATRIX (Full 74 × 11)
// ═══════════════════════════════════════════════════════════════
function RACIMatrix({ filter, onFilterChange, search, onSearchChange }: {
  filter: string; onFilterChange: (f: string) => void;
  search: string; onSearchChange: (s: string) => void;
}) {
  const stages = ["all", ...Array.from(new Set(NASEC_RACI.map(r => r.stage)))];
  const filteredRaci = useMemo(() => {
    return NASEC_RACI.filter(r => {
      if (filter !== "all" && r.stage !== filter) return false;
      if (search && !r.activity.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filter, search]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search activities..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-md bg-background w-60"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {stages.map(s => (
            <button
              key={s}
              onClick={() => onFilterChange(s)}
              className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap ${
                filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {s === "all" ? "All Stages" : s}
            </button>
          ))}
        </div>
        <div className="ml-auto text-[10px] text-muted-foreground">
          {filteredRaci.length} of {NASEC_RACI.length} activities
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-[8px]">R</span> Responsible</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-600 text-white flex items-center justify-center font-bold text-[8px]">A</span> Accountable</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-amber-500 text-white flex items-center justify-center font-bold text-[8px]">C</span> Consulted</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gray-400 text-white flex items-center justify-center font-bold text-[8px]">I</span> Informed</span>
      </div>

      {/* Matrix Table */}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-medium w-10">Stage</th>
              <th className="text-left py-2 px-2 font-medium min-w-[250px]">Activity</th>
              {["PM","LA","LM","LE","LS","CM","AE","PE","BIM","SM","QS"].map(r => (
                <th key={r} className="text-center py-2 px-1 font-medium w-9">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRaci.map((act, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-accent/20">
                <td className="py-1.5 px-2 font-mono font-bold text-primary">{act.stage}</td>
                <td className="py-1.5 px-2">{act.activity}</td>
                {(["PM","LA","LM","LE","LS","CM","AE","PE","BIM","SM","QS"] as const).map(role => (
                  <td key={role} className="text-center py-1.5 px-1">
                    <RaciBadge value={act[role] as RaciValue} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RaciBadge({ value }: { value: RaciValue }) {
  if (!value) return null;
  const colors: Record<string, string> = {
    R: "bg-blue-600 text-white",
    A: "bg-red-600 text-white",
    C: "bg-amber-500 text-white",
    I: "bg-gray-400 text-white",
  };
  return (
    <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-bold ${colors[value]}`}>
      {value}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: TEAM SETUP
// ═══════════════════════════════════════════════════════════════
function TeamSetup() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
      {/* Role Slots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Role Slots — {DEMO_PROJECT.name}</h3>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Core (7)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> Support (5)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {NASEC_ROLES.map(role => {
            const member = DEMO_PROJECT.team.find(t => t.roleCode === role.code);
            const counts = getRoleActivityCounts(role.code);
            return (
              <div
                key={role.code}
                onClick={() => setSelectedRole(role.code)}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  selectedRole === role.code ? "border-primary bg-primary/5 ring-1 ring-primary" :
                  "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      role.category === "core" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>{role.code}</span>
                    <span className="text-xs font-medium">{role.title}</span>
                  </div>
                  {member && <span className="text-[10px] text-green-600 font-medium">● Assigned</span>}
                </div>
                {member && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">{member.name}</span>
                    <span className="text-[10px] text-muted-foreground">{member.utilization}% util.</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2 text-[9px] text-muted-foreground">
                  <span>R:{counts.r}</span>
                  <span>A:{counts.a}</span>
                  <span>C:{counts.c}</span>
                  <span>I:{counts.i}</span>
                  <span className="ml-auto">{role.department}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Detail Panel */}
      <div className="bg-card border border-border rounded-lg p-5">
        {selectedRole ? (
          <RoleDetailPanel roleCode={selectedRole} />
        ) : (
          <div className="text-center text-muted-foreground text-xs py-12">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Select a role to view details
          </div>
        )}
      </div>
    </div>
  );
}

function RoleDetailPanel({ roleCode }: { roleCode: string }) {
  const role = NASEC_ROLES.find(r => r.code === roleCode);
  const member = DEMO_PROJECT.team.find(t => t.roleCode === roleCode);
  const activities = NASEC_RACI.filter(r => {
    const val = r[roleCode as keyof RaciActivity];
    return val === "R" || val === "A";
  });

  if (!role) return null;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary">{role.code}</span>
          <h3 className="text-sm font-bold">{role.title}</h3>
        </div>
        <div className="text-[10px] text-muted-foreground">Reports to: {role.reportsTo}</div>
        <div className="text-[10px] text-muted-foreground">Min Grade: {role.minGrade}</div>
        <div className="text-[10px] text-muted-foreground font-mono">Ref: {role.manualRef}</div>
      </div>

      <div>
        <h4 className="text-xs font-semibold mb-1">Primary Function</h4>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{role.primaryFunction}</p>
      </div>

      {member && (
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <div className="text-xs font-medium text-green-800">Currently Assigned</div>
          <div className="text-sm font-semibold text-green-900">{member.name}</div>
          <div className="text-[10px] text-green-700">Utilization: {member.utilization}%</div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold mb-2">R/A Activities ({activities.length})</h4>
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {activities.map((act, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
              <RaciBadge value={act[roleCode as keyof RaciActivity] as RaciValue} />
              <span className="text-muted-foreground font-mono">{act.stage}</span>
              <span className="truncate">{act.activity}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => toast.info("Smart recommendation engine — feature coming soon")}
        className="w-full py-2 px-3 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
      >
        Find Best Candidate →
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 5: DELIVERABLES TRACKER
// ═══════════════════════════════════════════════════════════════
function DeliverablesTracker() {
  const [stageFilter, setStageFilter] = useState("all");
  const stages = ["all", ...Array.from(new Set(NASEC_DELIVERABLES.map(d => d.stage)))];

  const filtered = stageFilter === "all" ? NASEC_DELIVERABLES : NASEC_DELIVERABLES.filter(d => d.stage === stageFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Deliverables Master List ({NASEC_DELIVERABLES.length} items)</h3>
        <div className="flex gap-1">
          {stages.map(s => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`px-2 py-1 rounded text-[10px] font-medium ${
                stageFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-2 px-3 font-medium w-8">#</th>
              <th className="text-left py-2 px-3 font-medium w-12">Stage</th>
              <th className="text-left py-2 px-3 font-medium">Deliverable</th>
              <th className="text-left py-2 px-3 font-medium w-24">Format</th>
              <th className="text-left py-2 px-3 font-medium w-16">Acct.</th>
              <th className="text-left py-2 px-3 font-medium w-24">Responsible</th>
              <th className="text-left py-2 px-3 font-medium">Quality Gate</th>
              <th className="text-center py-2 px-3 font-medium w-20">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const projDel = DEMO_PROJECT.deliverables.find(pd => pd.id === d.id);
              const status = projDel?.status || "future";
              return (
                <tr key={d.id} className="border-b border-border/30 hover:bg-accent/20">
                  <td className="py-2 px-3 font-mono text-muted-foreground">{d.id}</td>
                  <td className="py-2 px-3 font-mono font-bold text-primary">{d.stage}</td>
                  <td className="py-2 px-3 font-medium">{d.name}</td>
                  <td className="py-2 px-3 text-muted-foreground">{d.format}</td>
                  <td className="py-2 px-3 font-mono">{d.accountable}</td>
                  <td className="py-2 px-3 text-muted-foreground">{d.responsible}</td>
                  <td className="py-2 px-3 text-muted-foreground">{d.qualityGate}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                      status === "completed" ? "bg-green-100 text-green-700" :
                      status === "in-progress" ? "bg-amber-100 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {status === "completed" ? "Done" : status === "in-progress" ? "WIP" : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 6: AUTHORITIES & NOCs
// ═══════════════════════════════════════════════════════════════
function AuthoritiesNOC() {
  const [view, setView] = useState<"authorities" | "codes">("authorities");
  const projectAuthorities = getAuthoritiesForProject(DEMO_PROJECT.jurisdiction, DEMO_PROJECT.projectType, DEMO_PROJECT.nearAirport);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView("authorities")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium ${view === "authorities" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          Dubai Authorities ({projectAuthorities.length} applicable)
        </button>
        <button
          onClick={() => setView("codes")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium ${view === "codes" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          Codes & Regulations ({DUBAI_CODES.length})
        </button>
      </div>

      {view === "authorities" ? (
        <div className="space-y-4">
          {/* NOC Status for this project */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3">NOC Status — {DEMO_PROJECT.name}</h3>
            <div className="space-y-3">
              {DEMO_PROJECT.nocs.map((noc, i) => (
                <div key={i} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{noc.authority}</span>
                      <span className="text-xs">{noc.type}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      noc.status === "approved" ? "bg-green-100 text-green-700" :
                      noc.status === "under-review" ? "bg-amber-100 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {noc.status === "approved" ? "✓ Approved" : noc.status === "under-review" ? "⏳ Under Review" : "○ Pending"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                    <div>Ref: <span className="font-mono">{noc.ref || "—"}</span></div>
                    <div>Submitted: {noc.submitted || "—"}</div>
                    <div>Approved: {noc.approved || "—"}</div>
                    <div>Expiry: {noc.expiry || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Authority List */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2 px-3 font-medium w-20">Code</th>
                  <th className="text-left py-2 px-3 font-medium">Authority</th>
                  <th className="text-left py-2 px-3 font-medium">NOC Type</th>
                  <th className="text-left py-2 px-3 font-medium">Trigger Stage</th>
                  <th className="text-left py-2 px-3 font-medium w-20">Owner</th>
                </tr>
              </thead>
              <tbody>
                {projectAuthorities.map(auth => (
                  <tr key={auth.code} className="border-b border-border/30 hover:bg-accent/20">
                    <td className="py-2 px-3 font-mono font-bold text-primary">{auth.code}</td>
                    <td className="py-2 px-3">{auth.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{auth.nocType}</td>
                    <td className="py-2 px-3 text-muted-foreground">{auth.triggerStage}</td>
                    <td className="py-2 px-3 font-mono">{auth.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2 px-3 font-medium">Code / Regulation</th>
                <th className="text-left py-2 px-3 font-medium w-32">Issuer</th>
                <th className="text-left py-2 px-3 font-medium">Scope</th>
                <th className="text-left py-2 px-3 font-medium w-28">Mandatory</th>
              </tr>
            </thead>
            <tbody>
              {DUBAI_CODES.map((code, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-accent/20">
                  <td className="py-2 px-3 font-medium">{code.name}</td>
                  <td className="py-2 px-3 text-muted-foreground">{code.issuer}</td>
                  <td className="py-2 px-3 text-muted-foreground">{code.scope}</td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                      code.mandatory === "Yes" ? "bg-red-100 text-red-700" :
                      code.mandatory.includes("Bronze") ? "bg-amber-100 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{code.mandatory}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 7: STAGE GATES
// ═══════════════════════════════════════════════════════════════
function StageGates() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Stage Gate Approval Forms</h3>
        <span className="text-[10px] text-muted-foreground">Rec #1: Electronic stage gate forms with SLA tracking</span>
      </div>

      <div className="space-y-3">
        {NASEC_STAGES.filter(s => s.type === "gate").map(gate => {
          const gateData = DEMO_PROJECT.stageGates.find(g => g.stageId === gate.id);
          const status = gateData?.status || "future";
          return (
            <div key={gate.id} className={`border rounded-lg p-4 ${
              status === "completed" ? "border-green-200 bg-green-50/50" :
              status === "in-progress" ? "border-amber-200 bg-amber-50/50" :
              "border-border"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 text-lg">★</span>
                  <div>
                    <div className="text-sm font-semibold">{gate.name}</div>
                    <div className="text-xs text-muted-foreground">{gate.description}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  status === "completed" ? "bg-green-100 text-green-700" :
                  status === "in-progress" ? "bg-amber-100 text-amber-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {status === "completed" ? "✓ Approved" : status === "in-progress" ? "Awaiting" : "Future"}
                </span>
              </div>
              {gateData && status === "completed" && (
                <div className="grid grid-cols-4 gap-3 mt-3 text-xs border-t border-border/50 pt-3">
                  <div><span className="text-muted-foreground">Submitted:</span><br/>{gateData.submittedDate}</div>
                  <div><span className="text-muted-foreground">Approved:</span><br/>{gateData.approvedDate}</div>
                  <div><span className="text-muted-foreground">Response (days):</span><br/><span className={`font-bold ${(gateData.days || 0) <= 10 ? "text-green-600" : (gateData.days || 0) <= 20 ? "text-amber-600" : "text-red-600"}`}>{gateData.days} WD</span></div>
                  <div><span className="text-muted-foreground">SLA Window:</span><br/>{gate.approvalWindow}</div>
                </div>
              )}
              {status === "future" && (
                <button
                  onClick={() => toast.info("Stage gate form — will be available when stage is reached")}
                  className="mt-2 px-3 py-1.5 border border-border rounded text-xs text-muted-foreground hover:bg-accent"
                >
                  Open Gate Form
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 8: PROJECT CREATION WIZARD
// ═══════════════════════════════════════════════════════════════
function ProjectCreationWizard() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "", nameAr: "", client: "", jurisdiction: "", projectType: "",
    nearAirport: false, size: "Large", startDate: "", bimRequired: true,
  });

  const applicableAuthorities = formData.jurisdiction && formData.projectType
    ? getAuthoritiesForProject(formData.jurisdiction, formData.projectType, formData.nearAirport)
    : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1,2,3,4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? "bg-primary text-primary-foreground" :
              step > s ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
            }`}>{step > s ? "✓" : s}</div>
            {s < 4 && <div className={`w-12 h-0.5 ${step > s ? "bg-green-500" : "bg-border"}`} />}
          </div>
        ))}
        <span className="ml-3 text-xs text-muted-foreground">
          {step === 1 ? "Project Info" : step === 2 ? "Jurisdiction" : step === 3 ? "Template Preview" : "Confirm & Create"}
        </span>
      </div>

      {step === 1 && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-semibold">Step 1: Project Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Project Name (EN)</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md text-sm" placeholder="Marina Heights Tower" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Project Name (AR)</label>
              <input type="text" value={formData.nameAr} onChange={e => setFormData({...formData, nameAr: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md text-sm" placeholder="برج مارينا هايتس" dir="rtl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Client</label>
              <input type="text" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md text-sm" placeholder="Al Habtoor Group" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Project Size</label>
              <select value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md text-sm bg-background">
                <option value="Mega">Mega (PD + PM + full team)</option>
                <option value="Large">Large (PM + full team)</option>
                <option value="Medium">Medium (PM + core leads)</option>
                <option value="Small">Small (PM + 2-3 leads)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Start Date</label>
              <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md text-sm" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" checked={formData.bimRequired} onChange={e => setFormData({...formData, bimRequired: e.target.checked})} className="rounded" />
              <label className="text-xs">BIM Required (adds BIM Manager role)</label>
            </div>
          </div>
          <button onClick={() => setStep(2)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium">
            Next: Jurisdiction →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-semibold">Step 2: Dubai Jurisdiction & Project Type</h3>
          <p className="text-xs text-muted-foreground">Rec #13: Jurisdiction selector auto-populates the authority list.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Jurisdiction</label>
              <select value={formData.jurisdiction} onChange={e => setFormData({...formData, jurisdiction: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md text-sm bg-background">
                <option value="">Select jurisdiction...</option>
                {JURISDICTIONS.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Project Type</label>
              <select value={formData.projectType} onChange={e => setFormData({...formData, projectType: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md text-sm bg-background">
                <option value="">Select type...</option>
                {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={formData.nearAirport} onChange={e => setFormData({...formData, nearAirport: e.target.checked})} className="rounded" />
            <label className="text-xs">Near airport (requires DCAA height clearance)</label>
          </div>

          {applicableAuthorities.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs font-semibold mb-2">Auto-populated Authorities ({applicableAuthorities.length})</div>
              <div className="flex flex-wrap gap-1">
                {applicableAuthorities.map(a => (
                  <span key={a.code} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">{a.code}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="px-4 py-2 border border-border rounded-md text-xs">← Back</button>
            <button onClick={() => setStep(3)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium">
              Next: Preview Template →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-semibold">Step 3: Template Preview</h3>
          <p className="text-xs text-muted-foreground">The following will be auto-created from WF-TPL-001:</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-border rounded p-3">
              <div className="text-xs font-semibold mb-2 flex items-center gap-1"><GitBranch className="w-3 h-3" /> Stages & Gates</div>
              <div className="text-[10px] text-muted-foreground">8 stages + 5 client approval gates</div>
              <div className="text-[10px] text-muted-foreground">74 RACI activities auto-assigned</div>
            </div>
            <div className="border border-border rounded p-3">
              <div className="text-xs font-semibold mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Role Slots</div>
              <div className="text-[10px] text-muted-foreground">
                {formData.size === "Mega" ? "12 roles (PD + full team)" :
                 formData.size === "Large" ? "12 roles (PM + full team)" :
                 formData.size === "Medium" ? "9 roles (PM + core + PE/PCE)" :
                 "5 roles (PM + 2-3 leads + CM)"}
              </div>
            </div>
            <div className="border border-border rounded p-3">
              <div className="text-xs font-semibold mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Deliverables</div>
              <div className="text-[10px] text-muted-foreground">43 deliverables with quality gates</div>
            </div>
            <div className="border border-border rounded p-3">
              <div className="text-xs font-semibold mb-2 flex items-center gap-1"><Globe className="w-3 h-3" /> Authorities</div>
              <div className="text-[10px] text-muted-foreground">{applicableAuthorities.length} authorities for {formData.jurisdiction || "—"}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="px-4 py-2 border border-border rounded-md text-xs">← Back</button>
            <button onClick={() => setStep(4)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium">
              Next: Confirm →
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-semibold">Step 4: Confirm & Create Project</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground">Name:</span> {formData.name || "—"}</div>
              <div><span className="text-muted-foreground">Client:</span> {formData.client || "—"}</div>
              <div><span className="text-muted-foreground">Jurisdiction:</span> {formData.jurisdiction || "—"}</div>
              <div><span className="text-muted-foreground">Type:</span> {formData.projectType || "—"}</div>
              <div><span className="text-muted-foreground">Size:</span> {formData.size}</div>
              <div><span className="text-muted-foreground">BIM:</span> {formData.bimRequired ? "Yes" : "No"}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="px-4 py-2 border border-border rounded-md text-xs">← Back</button>
            <button
              onClick={() => {
                toast.success("Project created with NASEC workflow template applied!");
                setStep(1);
                setFormData({ name: "", nameAr: "", client: "", jurisdiction: "", projectType: "", nearAirport: false, size: "Large", startDate: "", bimRequired: true });
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-xs font-medium"
            >
              ✓ Create Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 9: GOVERNANCE PANEL
// ═══════════════════════════════════════════════════════════════
function GovernancePanel() {
  return (
    <div className="space-y-6">
      {/* Template Version */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Template Governance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div><span className="text-muted-foreground">Template Code:</span><br/><span className="font-mono font-bold">{TEMPLATE_VERSION.code}</span></div>
          <div><span className="text-muted-foreground">Revision:</span><br/>{TEMPLATE_VERSION.revision}</div>
          <div><span className="text-muted-foreground">Manual Ref:</span><br/>{TEMPLATE_VERSION.manualRef}</div>
          <div><span className="text-muted-foreground">Status:</span><br/><span className="text-green-600 font-medium">{TEMPLATE_VERSION.issueStatus}</span></div>
        </div>
      </div>

      {/* Manual References */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          PMM Cross-References ({NASEC_MANUAL_REFS.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium w-32">Topic</th>
                <th className="text-left py-2 px-3 font-medium w-20">Section</th>
                <th className="text-left py-2 px-3 font-medium">Description</th>
                <th className="text-left py-2 px-3 font-medium">Relevance</th>
              </tr>
            </thead>
            <tbody>
              {NASEC_MANUAL_REFS.map((ref, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-accent/20">
                  <td className="py-1.5 px-3 font-medium">{ref.topic}</td>
                  <td className="py-1.5 px-3 font-mono text-primary">{ref.section}</td>
                  <td className="py-1.5 px-3 text-muted-foreground">{ref.description}</td>
                  <td className="py-1.5 px-3 text-muted-foreground">{ref.relevance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Implemented Recommendations */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Implemented Automations
        </h3>
        <div className="space-y-3">
          {NASEC_RECOMMENDATIONS.filter(r => r.status === "implemented").map(rec => (
            <div key={rec.id} className="border border-green-200 bg-green-50/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold">#{rec.id}: {rec.title}</span>
              </div>
              <p className="text-[11px] text-muted-foreground ml-6">{rec.rationale}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Al Sa'fat Checklist (Rec #14) */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-green-600" />
          Al Sa'fat Green Building Checklist (Rec #14)
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Mandatory Bronze rating minimum. Embedded into S3 BODR template.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["Energy Efficiency", "Water Conservation", "Indoor Air Quality", "Materials Selection", "Waste Management", "Site Ecology", "Innovation Credits", "Management"].map((cat, i) => (
            <div key={cat} className="border border-border rounded p-2 text-center">
              <div className={`w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center text-[10px] font-bold ${
                i < 4 ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
              }`}>{i < 4 ? "✓" : "○"}</div>
              <div className="text-[10px]">{cat}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// POST-CONTRACT WORKFLOW — awaiting client setup
// ═══════════════════════════════════════════════════════════════
function PostContractPlaceholder() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 bg-slate-50/50 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <HardHat className="w-8 h-8 text-orange-600" />
        </div>
        <div className="text-[11px] uppercase tracking-widest text-orange-700 font-semibold">Post-Contract Workflow</div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">Setup pending</h2>
        <p className="text-sm text-slate-600 mt-3 max-w-xl mx-auto">
          The Post-Contract (Construction Supervision) workflow will be configured here once you provide the setup — sub-stages,
          gates, RACI matrix for site roles (SA, SS, SM, SE, SC, RE, BIM, HSE, PM, CM), submittal types, authority approvals,
          handover steps, and DLP closeout.
        </p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-2 text-left text-xs text-slate-500">
          {[
            { code: "PC-1", name: "Mobilization" },
            { code: "PC-2", name: "IFC Issuance" },
            { code: "PC-3", name: "Substructure" },
            { code: "PC-4", name: "Superstructure" },
            { code: "PC-5", name: "MEP First Fix" },
            { code: "PC-6", name: "Façade" },
            { code: "PC-7", name: "Internal Finishes" },
            { code: "PC-8", name: "MEP T&C" },
            { code: "PC-9", name: "Authority Inspections" },
            { code: "PC-10", name: "Snagging" },
            { code: "PC-11", name: "Handover" },
            { code: "PC-12", name: "DLP / Closeout" },
          ].map((s) => (
            <div key={s.code} className="p-2 border border-slate-200 rounded bg-white opacity-60">
              <div className="font-mono text-[10px] text-slate-400">{s.code}</div>
              <div className="text-slate-600">{s.name}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-6">When ready, hand over the post-contract template (sub-stages, gates, RACI, submittal taxonomy) and this section gets wired up with the same depth as Pre-Contract.</p>
      </div>
    </div>
  );
}
