/**
 * Project Creation Wizard — Full data-entry form for AEC projects
 * Design: Multi-step wizard with progressive disclosure
 * Target: < 10 minutes for a standard villa project
 * 
 * Steps: 1) Basic Info  2) Authority & Scope  3) Commercial  4) Timeline & Risk  5) Phase Template
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { projectsStore, auditStore } from "@/lib/stores";
import { newId } from "@/lib/store";
import { useAuth, useCurrentActor } from "@/lib/auth/AuthContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  Layers,
  AlertTriangle,
  Sparkles,
  Clock,
  FileText,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// Dubai communities
const communities = [
  "Downtown Dubai", "Dubai Marina", "Palm Jumeirah", "MBR City", "DIFC",
  "JVC", "JLT", "Business Bay", "Dubai Hills", "Al Barsha",
  "Deira", "Jumeirah", "Dubai Creek Harbour", "Dubai South",
  "DAMAC Hills", "Arabian Ranches", "Motor City", "Sports City",
  "Meydan", "Al Quoz", "Dubai Design District", "Expo City",
];

const projectTypes = [
  "Villa", "Tower", "Mixed-Use", "Hospitality", "Retail", "F&B",
  "Interior Fit-Out", "Master Plan", "Landscape", "Industrial", "Government",
  "Healthcare", "Education", "Residential Complex", "Office Building",
];

const authorities = [
  "Dubai Municipality (Trakheesi)", "DDA (Dubai Development Authority)",
  "TECOM", "JAFZA", "DMCC", "Nakheel", "Dubai South",
  "Emaar (Master Developer)", "Meraas", "DIFC Authority",
  "Meydan", "Dubai Sports City", "Expo City Dubai",
];

const nocTypes = [
  { id: "dewa", label: "DEWA (Electricity & Water)" },
  { id: "etisalat", label: "Etisalat/du (Telecom)" },
  { id: "dcd", label: "Dubai Civil Defence (Fire & Life Safety)" },
  { id: "rta", label: "RTA (Roads & Transport)" },
  { id: "drainage", label: "DM Drainage" },
  { id: "empower", label: "Empower/Tabreed (District Cooling)" },
  { id: "aviation", label: "GCAA (Aviation Height Restriction)" },
  { id: "heritage", label: "Dubai Culture (Heritage Zone)" },
];

const disciplines = [
  "Architecture", "Structural", "MEP", "Interior Design",
  "Landscape", "BIM Management", "Sustainability/LEED/Estidama",
  "Quantity Surveying", "Site Supervision", "Lighting Design",
];

const feeTypes = ["Lump Sum", "Percentage of Construction Cost", "Hourly Rate", "Hybrid"];

const phaseTemplates = [
  {
    id: "standard",
    name: "Standard Architectural Services",
    phases: ["Concept Design", "Schematic Design", "Design Development", "Authority Submission", "Tender Documentation", "Construction Supervision", "Handover", "DLP"],
    desc: "Full-service architecture from concept to defects liability",
  },
  {
    id: "fasttrack",
    name: "Fast-Track / Design-Build",
    phases: ["Concept + Schematic (Combined)", "DD + Tender (Overlapping)", "Authority Submission", "Construction (Concurrent)", "Handover"],
    desc: "Accelerated delivery with overlapping phases",
  },
  {
    id: "fitout",
    name: "Interior Fit-Out",
    phases: ["Concept Design", "Design Development", "Authority Submission", "Procurement", "Site Supervision", "Handover + Snagging"],
    desc: "Interior-focused with procurement phase",
  },
  {
    id: "masterplan",
    name: "Master Planning",
    phases: ["Site Analysis", "Vision & Strategy", "Concept Master Plan", "Detailed Master Plan", "Design Guidelines", "Infrastructure Design", "Authority Approval"],
    desc: "Large-scale urban/community planning",
  },
  {
    id: "asbuilt",
    name: "As-Built / Renovation",
    phases: ["Site Survey & As-Built", "Concept Design", "Design Development", "Authority Submission", "Tender", "Construction Supervision", "Handover"],
    desc: "Existing building modification with survey phase",
  },
];

const riskFlags = [
  { id: "competition", label: "Design Competition" },
  { id: "fasttrack", label: "Fast-Track Schedule" },
  { id: "complex_authority", label: "Complex Authority Approvals" },
  { id: "foreign_client", label: "Foreign Client" },
  { id: "payment_risk", label: "Payment Risk" },
  { id: "high_rise", label: "High-Rise (>25 floors)" },
  { id: "heritage", label: "Heritage Zone Restrictions" },
];

function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Similar past projects for benchmarking
const similarProjects = [
  { name: "Meydan Villa Cluster (2025)", type: "Villa", fee: "AED 1.4M", hours: 4200, gfa: "12,000 sqm" },
  { name: "Palm Villas Phase 1 (2024)", type: "Villa", fee: "AED 980K", hours: 3100, gfa: "8,500 sqm" },
  { name: "Arabian Ranches Ext. (2024)", type: "Villa", fee: "AED 650K", hours: 2200, gfa: "5,800 sqm" },
];

export default function ProjectCreate() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const actor = useCurrentActor();
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Form state
  const [projectName, setProjectName] = useState("");
  const [projectNameAr, setProjectNameAr] = useState("");
  const [projectType, setProjectType] = useState("");
  const [plotNumber, setPlotNumber] = useState("");
  const [community, setCommunity] = useState("");
  const [emirate, setEmirate] = useState("Dubai");
  const [authority, setAuthority] = useState("");
  const [selectedNocs, setSelectedNocs] = useState<string[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [estimatedFee, setEstimatedFee] = useState("");
  const [feeType, setFeeType] = useState("");
  const [vatApplicable, setVatApplicable] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [targetCompletion, setTargetCompletion] = useState("");
  const [winProbability, setWinProbability] = useState([50]);
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [gfa, setGfa] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientType, setClientType] = useState("");

  // Auto-generated project code
  const projectCode = useMemo(() => {
    const typePrefix = projectType ? projectType.substring(0, 3).toUpperCase() : "XXX";
    return `AR-2026-${typePrefix}-${String(Math.floor(Math.random() * 9000) + 1000).substring(0, 4)}`;
  }, [projectType]);

  const handleNocToggle = (nocId: string) => {
    setSelectedNocs(prev =>
      prev.includes(nocId) ? prev.filter(n => n !== nocId) : [...prev, nocId]
    );
  };

  const handleDisciplineToggle = (disc: string) => {
    setSelectedDisciplines(prev =>
      prev.includes(disc) ? prev.filter(d => d !== disc) : [...prev, disc]
    );
  };

  const handleRiskToggle = (riskId: string) => {
    setSelectedRisks(prev =>
      prev.includes(riskId) ? prev.filter(r => r !== riskId) : [...prev, riskId]
    );
  };

  const handleSubmit = () => {
    const id = makeUuid();
    const fee = Number(estimatedFee.replace(/[^0-9.]/g, "")) || 0;
    projectsStore.put({
      id, code: projectCode,
      nameEn: projectName || "Untitled Project",
      nameAr: projectNameAr || "",
      stage: "pipeline",
      health: "on-track",
      type: projectType || "—",
      plotNo: plotNumber || "—",
      community: community || "—",
      emirate, authority: authority || "—",
      client: clientName || "—",
      contractValue: fee, feeType: feeType || "TBD",
      startDate: startDate || "—", targetCompletion: targetCompletion || "—",
      gfa: Number(gfa) || 0, plotArea: 0, floors: 0,
      currentSubStage: 0, progress: 0, budgetConsumed: 0,
      hoursLogged: 0, hoursPlanned: 0, daysToDeadline: 0,
      openRFIs: 0, openNCRs: 0, pendingApprovals: 0, starred: false,
      pmUserId: currentUser?.id, teamUserIds: currentUser ? [currentUser.id] : [],
    });
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "create", subject: `Project created · ${projectName}`, detail: projectCode });
    toast.success("Project created successfully!", { description: `${projectName} (${projectCode}) has been added to your pipeline.` });
    navigate(`/projects/pipeline/${id}`);
  };

  const nextStep = () => setStep(Math.min(step + 1, totalSteps));
  const prevStep = () => setStep(Math.max(step - 1, 1));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Step {step} of {totalSteps} — {
              step === 1 ? "Basic Information" :
              step === 2 ? "Authority & Scope" :
              step === 3 ? "Commercial Terms" :
              step === 4 ? "Timeline & Risk" :
              "Phase Template"
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Auto-saving</span>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s < step ? "bg-emerald-500 text-white" :
                s === step ? "bg-primary text-primary-foreground" :
                "bg-secondary text-muted-foreground"
              }`}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 5 && <div className={`hidden sm:block w-12 lg:w-20 h-0.5 ${s < step ? "bg-emerald-500" : "bg-secondary"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Basic Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Code (auto-generated) */}
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Project Code (Auto-Generated)</p>
                  <p className="text-lg font-mono font-bold mt-1">{projectCode}</p>
                </div>
                <Badge variant="outline" className="text-xs">Auto</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Project Name (English) *</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Al Wasl Tower"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Project Name (Arabic)</Label>
                <Input
                  value={projectNameAr}
                  onChange={(e) => setProjectNameAr(e.target.value)}
                  placeholder="اسم المشروع"
                  className="h-11"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Project Type *</Label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">GFA (sqm)</Label>
                <Input
                  value={gfa}
                  onChange={(e) => setGfa(e.target.value)}
                  placeholder="e.g., 12000"
                  type="number"
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Plot Number</Label>
                <Input
                  value={plotNumber}
                  onChange={(e) => setPlotNumber(e.target.value)}
                  placeholder="e.g., 123-456"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Community / Area *</Label>
                <Select value={community} onValueChange={setCommunity}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select community" />
                  </SelectTrigger>
                  <SelectContent>
                    {communities.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Emirate</Label>
                <Select value={emirate} onValueChange={setEmirate}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dubai">Dubai</SelectItem>
                    <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                    <SelectItem value="Sharjah">Sharjah</SelectItem>
                    <SelectItem value="Ajman">Ajman</SelectItem>
                    <SelectItem value="RAK">Ras Al Khaimah</SelectItem>
                    <SelectItem value="Fujairah">Fujairah</SelectItem>
                    <SelectItem value="UAQ">Umm Al Quwain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Client */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>Client Information</span>
                <Badge variant="outline" className="text-[10px]">Pull from CRM</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Client Name *</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Start typing to search CRM..."
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Client Type</Label>
                  <Select value={clientType} onValueChange={setClientType}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="end-user">End User</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Smart suggestion */}
            {projectType && (
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Similar Past Projects (Fee Benchmarking)</p>
                    <div className="mt-2 space-y-1">
                      {similarProjects.filter(p => p.type === projectType || projectType === "Villa").map((p, i) => (
                        <p key={i} className="text-xs text-amber-700">
                          {p.name} — {p.fee} · {p.hours} hrs · {p.gfa}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Authority & Scope */}
      {step === 2 && (
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Authority, Jurisdiction & Scope
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Approving Authority *</Label>
              <Select value={authority} onValueChange={setAuthority}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select authority (auto-suggested from location)" />
                </SelectTrigger>
                <SelectContent>
                  {authorities.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {community && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Auto-suggested based on {community} location
                </p>
              )}
            </div>

            {/* Expected NOCs */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Expected NOCs Required</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {nocTypes.map(noc => (
                  <label
                    key={noc.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedNocs.includes(noc.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Checkbox
                      checked={selectedNocs.includes(noc.id)}
                      onCheckedChange={() => handleNocToggle(noc.id)}
                    />
                    <span className="text-sm">{noc.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Disciplines */}
            <div className="space-y-3 border-t border-border pt-4">
              <Label className="text-sm font-medium">Disciplines Involved *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {disciplines.map(disc => (
                  <label
                    key={disc}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                      selectedDisciplines.includes(disc)
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Checkbox
                      checked={selectedDisciplines.includes(disc)}
                      onCheckedChange={() => handleDisciplineToggle(disc)}
                    />
                    {disc}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Commercial */}
      {step === 3 && (
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Commercial Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Estimated Fee (AED) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">AED</span>
                  <Input
                    value={estimatedFee}
                    onChange={(e) => setEstimatedFee(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    className="h-11 pl-12 font-data"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fee Type *</Label>
                <Select value={feeType} onValueChange={setFeeType}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select fee structure" />
                  </SelectTrigger>
                  <SelectContent>
                    {feeTypes.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Checkbox
                checked={vatApplicable}
                onCheckedChange={(v) => setVatApplicable(v as boolean)}
              />
              <div>
                <p className="text-sm font-medium">VAT Applicable (5%)</p>
                <p className="text-xs text-muted-foreground">Standard UAE VAT rate per FTA regulations</p>
              </div>
            </div>

            {/* Payment Milestones */}
            <div className="space-y-3 border-t border-border pt-4">
              <Label className="text-sm font-medium">Payment Milestones (% per Phase)</Label>
              <div className="space-y-2">
                {["Concept Design", "Schematic Design", "Design Development", "Authority Submission", "Tender Documentation", "Construction Supervision"].map((phase, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-48 truncate">{phase}</span>
                    <Input
                      type="number"
                      placeholder="%"
                      className="h-9 w-20 font-data text-center"
                      defaultValue={[15, 15, 20, 15, 15, 20][i]}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Total must equal 100%. Auto-calculates AED amount per milestone.</p>
            </div>

            {/* Auto-calculated man-hours */}
            {estimatedFee && gfa && (
              <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">AI-Calculated Estimate</p>
                    <div className="mt-2 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-emerald-600">Estimated Man-Hours</p>
                        <p className="text-lg font-mono font-bold text-emerald-800">
                          {Math.round(parseInt(gfa) * 0.35).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600">Avg. Rate / Hour</p>
                        <p className="text-lg font-mono font-bold text-emerald-800">
                          AED {estimatedFee ? Math.round(parseInt(estimatedFee) / (parseInt(gfa) * 0.35)) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600">Team Size (est.)</p>
                        <p className="text-lg font-mono font-bold text-emerald-800">
                          {Math.max(3, Math.round(parseInt(gfa) * 0.35 / 1800))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Timeline & Risk */}
      {step === 4 && (
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Timeline & Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Start Date *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Target Completion *</Label>
                <Input
                  type="date"
                  value={targetCompletion}
                  onChange={(e) => setTargetCompletion(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Win Probability */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Win Probability</Label>
                <span className="text-lg font-mono font-bold">{winProbability[0]}%</span>
              </div>
              <Slider
                value={winProbability}
                onValueChange={setWinProbability}
                max={100}
                step={5}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low (0%)</span>
                <span>Medium (50%)</span>
                <span>High (100%)</span>
              </div>
            </div>

            {/* Risk Flags */}
            <div className="space-y-3 border-t border-border pt-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Risk Flags
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {riskFlags.map(risk => (
                  <label
                    key={risk.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRisks.includes(risk.id)
                        ? "border-amber-400 bg-amber-50"
                        : "border-border hover:border-amber-200"
                    }`}
                  >
                    <Checkbox
                      checked={selectedRisks.includes(risk.id)}
                      onCheckedChange={() => handleRiskToggle(risk.id)}
                    />
                    <span className="text-sm">{risk.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Phase Template */}
      {step === 5 && (
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Phase Template Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a pre-loaded phase template. Each template auto-creates deliverables, drawing register skeleton, milestone payments, default task list, and estimated man-hours per discipline.
            </p>

            <div className="space-y-3">
              {phaseTemplates.map(template => (
                <label
                  key={template.id}
                  className={`block p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="template"
                      value={template.id}
                      checked={selectedTemplate === template.id}
                      onChange={() => setSelectedTemplate(template.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{template.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{template.desc}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {template.phases.map((phase, pi) => (
                          <Badge key={pi} variant="secondary" className="text-[10px] font-normal">
                            {pi + 1}. {phase}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Auto-created items preview */}
            {selectedTemplate && (
              <div className="p-4 rounded-lg border border-border bg-secondary/30 mt-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Auto-Created on Project Setup:
                </h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-500" /> Deliverables checklist per phase</li>
                  <li className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-500" /> Drawing register skeleton (ISO 19650)</li>
                  <li className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-500" /> Milestone payment schedule linked to phases</li>
                  <li className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-500" /> Default task list per discipline</li>
                  <li className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-500" /> Estimated man-hours per discipline per phase</li>
                  <li className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-500" /> Authority submission checklist</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 1}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {step}/{totalSteps}
          </span>
          <Progress value={(step / totalSteps) * 100} className="w-24 h-2 hidden sm:block" />
        </div>

        {step < totalSteps ? (
          <Button onClick={nextStep} className="gap-2">
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Check className="w-4 h-4" />
            Create Project
          </Button>
        )}
      </div>
    </div>
  );
}
