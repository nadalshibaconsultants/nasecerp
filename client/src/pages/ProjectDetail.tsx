/**
 * Project Detail Workspace — The Cockpit View (v3)
 * Stage-aware routing: reads /projects/:stage/:id from URL
 * Supports: Pipeline, Pre-Contract (green), Post-Contract (orange), Completed (gray)
 * Includes: 21 document-type logs, sub-stage stepper, stage transitions, KPIs
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { designDeliverablesStore, projectsStore, stageApprovalsStore, usersStore } from "@/lib/stores";
import { useCollection as _useStoreCollection, newId } from "@/lib/store";
import { Label as FieldLabel } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { drawingsStore, projectMeetingsStore, tasksStore, userDirectoryStore } from "@/lib/stores";
import { useAuth, useCurrentActor } from "@/lib/auth/AuthContext";
import { DISCIPLINE_LABELS_DCC } from "@/lib/dcc/types";

import TeamTab from "@/components/TeamTabContent";
import ProjectTeamCard from "@/components/projects/ProjectTeamCard";
import BudgetControlCard from "@/components/projects/BudgetControlCard";
import ProjectChatTab from "@/components/ProjectChatTab";
import ContractorAccessTab from "@/components/ContractorAccessTab";
import ClientPortalTab from "@/components/projects/ClientPortalTab";
import ProjectEditDialog from "@/components/projects/ProjectEditDialog";
import AuthoritySubmittalsTab from "@/components/projects/AuthoritySubmittalsTab";
import StageGateApprovalCard from "@/components/projects/StageGateApprovalCard";
import RisksTab from "@/components/projects/RisksTab";
import LessonsChecklistTab from "@/components/projects/LessonsChecklistTab";
import DrawingsRfiTab from "@/components/projects/DrawingsRfiTab";
import QualityTab from "@/components/projects/QualityTab";
import HseTab from "@/components/projects/HseTab";
import ProjectAiTab from "@/components/projects/ProjectAiTab";
import ProjectBimTab from "@/components/projects/ProjectBimTab";
import ProjectRenewalCalendar from "@/components/calendars/ProjectRenewalCalendar";
import PreContractTimelineTab from "@/components/timeline/PreContractTimelineTab";
import PostContractTimelineTab from "@/components/timeline/PostContractTimelineTab";
import {
  ArrowLeft,
  Star,
  Share2,
  Plus,
  Clock,
  Upload,
  FileText,
  Building2,
  Users,
  CalendarDays,
  ListTodo,
  FolderOpen,
  FileCheck,
  Landmark,
  DollarSign,
  Timer,
  MessageSquare,
  AlertTriangle,
  Globe,
  Activity,
  ChevronRight,
  MapPin,
  Edit3,
  Check,
  X,
  Send,
  Eye,
  Phone,
  Mail,
  ExternalLink,
  Layers,
  ClipboardList,
  ClipboardCheck,
  Bot,
  Box,
  ArrowRightCircle,
  AlertCircle,
  CheckCircle2,
  HardHat,
  Pencil,
  Palette,
  FileImage,
  Ruler,
} from "lucide-react";

// ===== SUB-STAGE DEFINITIONS =====
// ===== PRE-CONTRACT: EXACT 8 STAGES + 5 GATES (NASEC) =====
type PreContractItem = {
  code: string;
  name: string;
  type: "stage" | "gate";
  deliverables: string[];
  duration: string;
};

const preContractStages: PreContractItem[] = [
  { code: "S1", name: "Data Collection & Design Brief", type: "stage", deliverables: ["Client brief", "Site visit report", "Feasibility memo", "Fee proposal", "Signed agreement"], duration: "1–2 weeks" },
  { code: "G1", name: "Client Acceptance Gate — after Stage 1", type: "gate", deliverables: ["Client written acceptance (10 WD)"], duration: "10 WD" },
  { code: "S2", name: "Concept Design", type: "stage", deliverables: ["Site analysis", "Design narrative", "Mood boards", "Massing options (3 schemes)", "Preliminary GFA", "Area schedule", "Concept renders", "Tentative cost estimate"], duration: "3–6 weeks" },
  { code: "G2", name: "Client Approval Gate — after Stage 2", type: "gate", deliverables: ["Client written approval of Concept Design", "Triggers AE preliminary design submission to authority"], duration: "20 WD" },
  { code: "S3", name: "Schematic Design + BODR", type: "stage", deliverables: ["Bases of Design Report (BODR)", "Schematic drawings (Arch/Struct/Mech/Elec)", "Outline specifications", "Budgetary cost estimate", "Authority preliminary submission package"], duration: "4–8 weeks" },
  { code: "G3", name: "Client Approval Gate — after Stage 3", type: "gate", deliverables: ["Client written approval of Schematic + BODR", "Triggers AE final building permit submission to DM/Trakhees"], duration: "20 WD" },
  { code: "S4", name: "Draft Detailed Design + Tender Documents", type: "stage", deliverables: ["Coordinated drawings", "Finishes schedule", "Door/window schedules", "Façade details", "Draft BOQ", "Draft specifications", "DD report"], duration: "6–10 weeks" },
  { code: "G4", name: "Client Approval Gate — after Stage 4", type: "gate", deliverables: ["Client written approval of Draft DD package", "Triggers NOCs + Final Building Permit submission"], duration: "20 WD" },
  { code: "S5", name: "Final Detailed Design + Tender Documents", type: "stage", deliverables: ["Final tender drawings", "Full BOQ", "Final specifications", "Tender conditions", "Contract draft", "Tender package issued"], duration: "3–6 weeks" },
  { code: "G5", name: "Client Approval Gate — after Stage 5", type: "gate", deliverables: ["Client written approval of Final DD package", "Ready for tender"], duration: "20 WD" },
  { code: "S6", name: "Prequalification of Contractors", type: "stage", deliverables: ["Pre-qualification criteria", "Contractor long list", "PQ evaluation", "Shortlist recommendation"], duration: "3–4 weeks" },
  { code: "S7", name: "Tender Services", type: "stage", deliverables: ["Tender queries", "Addenda", "Bid evaluation report", "Recommendation report", "Contractor selection"], duration: "4–8 weeks" },
  { code: "S8", name: "Post-Contract & Supervision", type: "stage", deliverables: ["Signed main contract", "All data carried forward to Post-Contract"], duration: "—" },
];

// ===== AUTHORITY PARALLEL TRACK (NOT stages — run alongside main timeline) =====
type AuthorityMilestone = {
  name: string;
  triggeredBy: string;
  runsParallelWith: string;
  status: "not-started" | "submitted" | "under-review" | "comments-received" | "approved";
  submittedDate?: string;
  approvedDate?: string;
};

const authorityMilestones: Record<string, AuthorityMilestone[]> = {
  "al-wasl-tower": [
    { name: "Authority Preliminary Design Approval", triggeredBy: "G2", runsParallelWith: "S3", status: "under-review", submittedDate: "2026-03-20" },
    { name: "NOCs + Final Building Permit (BP)", triggeredBy: "G4", runsParallelWith: "S5", status: "not-started" },
  ],
  "dubai-creek": [
    { name: "Authority Preliminary Design Approval", triggeredBy: "G2", runsParallelWith: "S3", status: "not-started" },
    { name: "NOCs + Final Building Permit (BP)", triggeredBy: "G4", runsParallelWith: "S5", status: "not-started" },
  ],
  "palm-villas": [
    { name: "Authority Preliminary Design Approval", triggeredBy: "G2", runsParallelWith: "S3", status: "not-started" },
    { name: "NOCs + Final Building Permit (BP)", triggeredBy: "G4", runsParallelWith: "S5", status: "not-started" },
  ],
  "business-bay-tower": [
    { name: "Authority Preliminary Design Approval", triggeredBy: "G2", runsParallelWith: "S3", status: "approved", submittedDate: "2025-12-10", approvedDate: "2026-01-15" },
    { name: "NOCs + Final Building Permit (BP)", triggeredBy: "G4", runsParallelWith: "S5", status: "submitted", submittedDate: "2026-04-01" },
  ],
};

const postContractStages = [
  { name: "Mobilization & Pre-Construction", activities: ["Kick-off meeting", "Contractor mobilization", "Site setup approval", "Baseline programme review", "Insurance & bonds verification"], duration: "2–4 weeks" },
  { name: "IFC Issuance", activities: ["IFC drawing release", "Drawing register handover", "Shop drawing protocol setup"], duration: "Ongoing" },
  { name: "Substructure & Enabling", activities: ["Excavation", "Shoring", "Dewatering", "Foundations", "Waterproofing — supervision + inspections"], duration: "Per programme" },
  { name: "Superstructure", activities: ["Slabs", "Columns", "Walls", "Roofing — staged inspections", "Concrete tests"], duration: "Per programme" },
  { name: "MEP First Fix", activities: ["Conduits", "Ducts", "Pipes", "Drainage rough-ins — inspections"], duration: "Per programme" },
  { name: "Façade & External Works", activities: ["Cladding", "Glazing", "Waterproofing", "Landscape — inspections + mock-ups"], duration: "Per programme" },
  { name: "Internal Finishes", activities: ["Plastering", "Flooring", "Joinery", "Painting — inspections"], duration: "Per programme" },
  { name: "MEP Final Fix & Testing", activities: ["Fixtures", "Fittings", "T&C", "DEWA energization", "Civil Defence testing"], duration: "Per programme" },
  { name: "Authority Inspections & NOCs", activities: ["DM inspection", "DEWA inspection", "Civil Defence inspection", "Trakheesi inspection", "Completion NOCs"], duration: "2–6 weeks" },
  { name: "Snagging & De-snagging", activities: ["Pre-handover inspection", "Snag list issuance", "Contractor close-out"], duration: "2–4 weeks" },
  { name: "Handover & BCC", activities: ["DM Building Completion Certificate", "Handover documents", "O&M manuals", "As-built drawings", "Warranties"], duration: "2–6 weeks" },
  { name: "Defects Liability Period", activities: ["Monthly site checks", "Snag closure", "Final account preparation"], duration: "12 months" },
  { name: "Final Account & Closeout", activities: ["Final payment certificate", "Lessons learned", "Archival"], duration: "—" },
];

// ===== 21 DOCUMENT TYPES =====
const documentTypes = [
  { code: "RFI", name: "Request for Information", direction: "Contractor → Consultant", sla: 7 },
  { code: "MS", name: "Method Statement", direction: "Contractor → Consultant", sla: 14 },
  { code: "IR", name: "Inspection Request", direction: "Contractor → Consultant", sla: 1 },
  { code: "MOS", name: "Material Submittal", direction: "Contractor → Consultant", sla: 14 },
  { code: "NCR", name: "Non-Conformance Report", direction: "Consultant → Contractor", sla: 7 },
  { code: "SI", name: "Site Instruction", direction: "Consultant → Contractor", sla: 0 },
  { code: "SD", name: "Shop Drawing", direction: "Contractor → Consultant", sla: 14 },
  { code: "PQ", name: "Prequalification", direction: "Contractor → Consultant", sla: 21 },
  { code: "LETTER", name: "Official Correspondence", direction: "Bidirectional", sla: 7 },
  { code: "EOT", name: "Extension of Time", direction: "Contractor → Client", sla: 14 },
  { code: "VO", name: "Variation Order", direction: "Bidirectional", sla: 14 },
  { code: "PC", name: "Payment Certificate", direction: "Consultant → Client", sla: 30 },
  { code: "PR", name: "Progress Report", direction: "Consultant → Client", sla: 7 },
  { code: "MOM", name: "Minutes of Meeting", direction: "Consultant", sla: 3 },
  { code: "TQ", name: "Technical Query", direction: "Contractor → Consultant", sla: 7 },
  { code: "WIR", name: "Work Inspection Request", direction: "Contractor → Consultant", sla: 1 },
  { code: "MIR", name: "Material Inspection Request", direction: "Contractor → Consultant", sla: 1 },
  { code: "PTW", name: "Permit to Work", direction: "Contractor → Consultant", sla: 1 },
  { code: "HSE", name: "HSE Report", direction: "Contractor → Consultant", sla: 7 },
  { code: "SVR", name: "Site Visit Report", direction: "Consultant", sla: 3 },
  { code: "SNAG", name: "Snag List", direction: "Consultant → Contractor", sla: 14 },
];

// ===== PROJECT DATABASE (keyed by id) =====
type ProjectData = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  stage: "pipeline" | "pre-contract" | "post-contract" | "completed";
  health: "on-track" | "at-risk" | "delayed";
  type: string;
  plotNo: string;
  community: string;
  emirate: string;
  authority: string;
  client: string;
  contractValue: number;
  feeType: string;
  startDate: string;
  targetCompletion: string;
  gfa: number;
  plotArea: number;
  floors: number;
  currentSubStage: number;
  progress: number;
  budgetConsumed: number;
  hoursLogged: number;
  hoursPlanned: number;
  daysToDeadline: number;
  openRFIs: number;
  openNCRs: number;
  pendingApprovals: number;
  starred: boolean;
};

const projectDatabase: Record<string, ProjectData> = {
  // ===== POST-CONTRACT PROJECTS =====
  "marina-heights": {
    id: "marina-heights", code: "AR-2026-MHT-0018", nameEn: "Marina Heights Tower", nameAr: "برج مارينا هايتس",
    stage: "post-contract", health: "on-track", type: "Mixed-Use Tower", plotNo: "JBR-2456", community: "Dubai Marina",
    emirate: "Dubai", authority: "Dubai Municipality / Trakheesi", client: "Emaar Properties",
    contractValue: 850000, feeType: "Lump Sum", startDate: "2025-11-01", targetCompletion: "2027-06-30",
    gfa: 45000, plotArea: 3200, floors: 45, currentSubStage: 3, progress: 28, budgetConsumed: 22,
    hoursLogged: 1800, hoursPlanned: 6800, daysToDeadline: 420, openRFIs: 5, openNCRs: 2, pendingApprovals: 3, starred: false,
  },
  "jlt-commercial": {
    id: "jlt-commercial", code: "AR-2025-JCC-0012", nameEn: "JLT Commercial Complex", nameAr: "مجمع JLT التجاري",
    stage: "post-contract", health: "on-track", type: "Commercial", plotNo: "JLT-1890", community: "JLT",
    emirate: "Dubai", authority: "DMCC / Dubai Municipality", client: "DMCC",
    contractValue: 520000, feeType: "Lump Sum", startDate: "2025-06-01", targetCompletion: "2026-12-31",
    gfa: 28000, plotArea: 2100, floors: 22, currentSubStage: 7, progress: 60, budgetConsumed: 55,
    hoursLogged: 3200, hoursPlanned: 5200, daysToDeadline: 240, openRFIs: 2, openNCRs: 0, pendingApprovals: 1, starred: false,
  },
  // ===== PRE-CONTRACT PROJECTS =====
  "al-wasl-tower": {
    id: "al-wasl-tower", code: "AR-2026-AWT-0023", nameEn: "Al Wasl Tower", nameAr: "برج الوصل",
    stage: "pre-contract", health: "on-track", type: "Mixed-Use Tower", plotNo: "AW-3421", community: "Al Wasl",
    emirate: "Dubai", authority: "Dubai Municipality", client: "Dubai Holding",
    contractValue: 1200000, feeType: "Percentage (5%)", startDate: "2026-01-15", targetCompletion: "2026-11-30",
    gfa: 62000, plotArea: 4500, floors: 55, currentSubStage: 3, progress: 42, budgetConsumed: 35,
    hoursLogged: 2400, hoursPlanned: 5800, daysToDeadline: 207, openRFIs: 0, openNCRs: 0, pendingApprovals: 2, starred: false,
  },
  "dubai-creek": {
    id: "dubai-creek", code: "AR-2026-DCR-0029", nameEn: "Dubai Creek Residences", nameAr: "مساكن خور دبي",
    stage: "pre-contract", health: "on-track", type: "Residential", plotNo: "DCH-7890", community: "Dubai Creek Harbour",
    emirate: "Dubai", authority: "Dubai Municipality / Emaar Master Developer", client: "Emaar Properties",
    contractValue: 650000, feeType: "Lump Sum", startDate: "2026-03-01", targetCompletion: "2027-02-28",
    gfa: 35000, plotArea: 2800, floors: 32, currentSubStage: 1, progress: 15, budgetConsumed: 10,
    hoursLogged: 480, hoursPlanned: 4200, daysToDeadline: 297, openRFIs: 0, openNCRs: 0, pendingApprovals: 1, starred: false,
  },
  "palm-villas": {
    id: "palm-villas", code: "AR-2026-PV2-0031", nameEn: "Palm Villas Phase 2", nameAr: "فلل النخلة المرحلة 2",
    stage: "pre-contract", health: "on-track", type: "Villa Cluster", plotNo: "PJ-2200", community: "Palm Jumeirah",
    emirate: "Dubai", authority: "Nakheel Master Developer / DM", client: "Nakheel",
    contractValue: 420000, feeType: "Lump Sum", startDate: "2026-02-01", targetCompletion: "2027-01-15",
    gfa: 8500, plotArea: 12000, floors: 3, currentSubStage: 1, progress: 18, budgetConsumed: 12,
    hoursLogged: 320, hoursPlanned: 2800, daysToDeadline: 253, openRFIs: 0, openNCRs: 0, pendingApprovals: 0, starred: false,
  },
  "business-bay-tower": {
    id: "business-bay-tower", code: "AR-2026-BBT-0034", nameEn: "Business Bay Tower B", nameAr: "برج الخليج التجاري B",
    stage: "pre-contract", health: "at-risk", type: "Commercial Tower", plotNo: "BB-5567", community: "Business Bay",
    emirate: "Dubai", authority: "Dubai Municipality", client: "Omniyat",
    contractValue: 980000, feeType: "Percentage (4.5%)", startDate: "2025-09-01", targetCompletion: "2026-08-30",
    gfa: 42000, plotArea: 3100, floors: 38, currentSubStage: 4, progress: 55, budgetConsumed: 48,
    hoursLogged: 3100, hoursPlanned: 5600, daysToDeadline: 115, openRFIs: 0, openNCRs: 0, pendingApprovals: 3, starred: false,
  },
  // ===== PIPELINE PROJECTS =====
  "jbr-waterfront": {
    id: "jbr-waterfront", code: "AR-2026-JWH-0040", nameEn: "JBR Waterfront Hotel", nameAr: "فندق واجهة JBR",
    stage: "pipeline", health: "on-track", type: "Hospitality", plotNo: "—", community: "JBR",
    emirate: "Dubai", authority: "—", client: "Meraas",
    contractValue: 2100000, feeType: "TBD", startDate: "—", targetCompletion: "—",
    gfa: 0, plotArea: 0, floors: 0, currentSubStage: 0, progress: 0, budgetConsumed: 0,
    hoursLogged: 0, hoursPlanned: 0, daysToDeadline: 0, openRFIs: 0, openNCRs: 0, pendingApprovals: 0, starred: false,
  },
  // ===== COMPLETED PROJECTS =====
  "bbt-a": {
    id: "bbt-a", code: "AR-2024-BBA-0005", nameEn: "Business Bay Tower A", nameAr: "برج الخليج التجاري A",
    stage: "completed", health: "on-track", type: "Commercial Tower", plotNo: "BB-5566", community: "Business Bay",
    emirate: "Dubai", authority: "Dubai Municipality", client: "Omniyat",
    contractValue: 980000, feeType: "Lump Sum", startDate: "2024-01-15", targetCompletion: "2026-02-15",
    gfa: 40000, plotArea: 3000, floors: 36, currentSubStage: 12, progress: 100, budgetConsumed: 98,
    hoursLogged: 5600, hoursPlanned: 5600, daysToDeadline: 0, openRFIs: 0, openNCRs: 0, pendingApprovals: 0, starred: false,
  },
};

// Demo document log entries for Post-Contract projects
const demoDocLogs: Record<string, Array<{ref: string; title: string; dateRaised: string; from: string; to: string; slaDeadline: string; status: string; responseDate: string; daysOpen: number}>> = {
  RFI: [
    { ref: "RFI-MHT-001", title: "Clarification on podium setback requirement", dateRaised: "2026-04-20", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-04-27", status: "Responded", responseDate: "2026-04-25", daysOpen: 5 },
    { ref: "RFI-MHT-002", title: "Fire escape width confirmation L15-L20", dateRaised: "2026-04-25", from: "Drake & Scull", to: "Design Team", slaDeadline: "2026-05-02", status: "Open", responseDate: "—", daysOpen: 12 },
    { ref: "RFI-MHT-003", title: "MEP shaft size at transfer level", dateRaised: "2026-04-28", from: "Drake & Scull", to: "Design Team", slaDeadline: "2026-05-05", status: "Overdue", responseDate: "—", daysOpen: 9 },
    { ref: "RFI-MHT-004", title: "Landscape buffer zone specification", dateRaised: "2026-05-01", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-05-08", status: "Open", responseDate: "—", daysOpen: 6 },
    { ref: "RFI-MHT-005", title: "Parking ramp gradient confirmation", dateRaised: "2026-05-03", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-05-10", status: "Under Review", responseDate: "—", daysOpen: 4 },
  ],
  SI: [
    { ref: "SI-MHT-001", title: "Revise ground floor slab level to +0.450", dateRaised: "2026-04-18", from: "Design Team", to: "Al Futtaim Eng.", slaDeadline: "—", status: "Acknowledged", responseDate: "2026-04-18", daysOpen: 0 },
    { ref: "SI-MHT-002", title: "Additional waterproofing layer at basement", dateRaised: "2026-04-22", from: "Design Team", to: "Al Futtaim Eng.", slaDeadline: "—", status: "Acknowledged", responseDate: "2026-04-23", daysOpen: 1 },
    { ref: "SI-MHT-003", title: "Relocate fire hydrant at entrance", dateRaised: "2026-05-02", from: "Design Team", to: "Drake & Scull", slaDeadline: "—", status: "Issued", responseDate: "—", daysOpen: 5 },
  ],
  NCR: [
    { ref: "NCR-MHT-001", title: "Concrete cube test failure - L3 slab pour", dateRaised: "2026-04-15", from: "Design Team", to: "Al Futtaim Eng.", slaDeadline: "2026-04-22", status: "Closed", responseDate: "2026-04-20", daysOpen: 5 },
    { ref: "NCR-MHT-002", title: "Rebar spacing non-compliance - shear wall W4", dateRaised: "2026-05-01", from: "Design Team", to: "Al Futtaim Eng.", slaDeadline: "2026-05-08", status: "Open", responseDate: "—", daysOpen: 6 },
  ],
  MOS: [
    { ref: "MOS-MHT-001", title: "Structural steel grade S355 - columns", dateRaised: "2026-03-20", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-04-03", status: "Approved", responseDate: "2026-03-28", daysOpen: 8 },
    { ref: "MOS-MHT-002", title: "Waterproofing membrane - Sika 105", dateRaised: "2026-04-01", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-04-15", status: "Approved", responseDate: "2026-04-10", daysOpen: 9 },
    { ref: "MOS-MHT-003", title: "Concrete admixture - BASF MasterGlenium", dateRaised: "2026-04-10", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-04-24", status: "Approved with Comments", responseDate: "2026-04-20", daysOpen: 10 },
    { ref: "MOS-MHT-004", title: "Façade aluminium profile - Schüco", dateRaised: "2026-05-02", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-05-16", status: "Under Review", responseDate: "—", daysOpen: 5 },
  ],
  SD: [
    { ref: "SD-MHT-001", title: "Shoring system detail - basement excavation", dateRaised: "2026-03-15", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-03-29", status: "Approved", responseDate: "2026-03-25", daysOpen: 10 },
    { ref: "SD-MHT-002", title: "Pile cap reinforcement detail", dateRaised: "2026-03-22", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-04-05", status: "Approved", responseDate: "2026-04-01", daysOpen: 10 },
    { ref: "SD-MHT-003", title: "Raft foundation waterproofing detail", dateRaised: "2026-04-05", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-04-19", status: "Approved with Comments", responseDate: "2026-04-15", daysOpen: 10 },
    { ref: "SD-MHT-004", title: "Column formwork system - PERI", dateRaised: "2026-04-15", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-04-29", status: "Approved", responseDate: "2026-04-26", daysOpen: 11 },
    { ref: "SD-MHT-005", title: "MEP riser shaft coordination", dateRaised: "2026-04-28", from: "Drake & Scull", to: "Design Team", slaDeadline: "2026-05-12", status: "Under Review", responseDate: "—", daysOpen: 9 },
    { ref: "SD-MHT-006", title: "Slab post-tension layout L4-L10", dateRaised: "2026-05-03", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-05-17", status: "Open", responseDate: "—", daysOpen: 4 },
  ],
  IR: [
    { ref: "IR-MHT-001", title: "Foundation rebar inspection - Zone A", dateRaised: "2026-04-10", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-04-11", status: "Approved", responseDate: "2026-04-10", daysOpen: 0 },
    { ref: "IR-MHT-002", title: "Pile integrity test - P15 to P22", dateRaised: "2026-04-18", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-04-19", status: "Approved", responseDate: "2026-04-18", daysOpen: 0 },
    { ref: "IR-MHT-003", title: "L1 slab pre-pour inspection", dateRaised: "2026-05-05", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-05-06", status: "Pending", responseDate: "—", daysOpen: 2 },
  ],
  EOT: [
    { ref: "EOT-MHT-001", title: "14-day extension - adverse weather March", dateRaised: "2026-04-05", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-04-19", status: "Approved (14 days)", responseDate: "2026-04-15", daysOpen: 10 },
    { ref: "EOT-MHT-002", title: "7-day extension - material delivery delay", dateRaised: "2026-05-01", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "2026-05-15", status: "Under Review", responseDate: "—", daysOpen: 6 },
  ],
  VO: [
    { ref: "VO-MHT-001", title: "Additional basement waterproofing scope", dateRaised: "2026-04-20", from: "Design Team", to: "Client", slaDeadline: "2026-05-04", status: "Approved", responseDate: "2026-04-28", daysOpen: 8 },
  ],
  LETTER: [
    { ref: "LTR-MHT-001", title: "Notice of delay - substructure works", dateRaised: "2026-03-25", from: "Design Team", to: "Al Futtaim Eng.", slaDeadline: "—", status: "Sent", responseDate: "—", daysOpen: 0 },
    { ref: "LTR-MHT-002", title: "Monthly progress report cover letter", dateRaised: "2026-04-01", from: "Design Team", to: "Client", slaDeadline: "—", status: "Sent", responseDate: "—", daysOpen: 0 },
    { ref: "LTR-MHT-003", title: "Contractor performance warning", dateRaised: "2026-04-15", from: "Design Team", to: "Al Futtaim Eng.", slaDeadline: "—", status: "Sent", responseDate: "—", daysOpen: 0 },
    { ref: "LTR-MHT-004", title: "Insurance renewal confirmation", dateRaised: "2026-05-01", from: "Al Futtaim Eng.", to: "Design Team", slaDeadline: "—", status: "Filed", responseDate: "—", daysOpen: 0 },
  ],
  SVR: [
    { ref: "SVR-MHT-001", title: "Foundation excavation inspection", dateRaised: "2026-03-20", from: "Design Team", to: "—", slaDeadline: "—", status: "Filed", responseDate: "—", daysOpen: 0 },
    { ref: "SVR-MHT-002", title: "Pile cap concrete pour witness", dateRaised: "2026-04-02", from: "Design Team", to: "—", slaDeadline: "—", status: "Filed", responseDate: "—", daysOpen: 0 },
    { ref: "SVR-MHT-003", title: "Raft waterproofing application", dateRaised: "2026-04-15", from: "Design Team", to: "—", slaDeadline: "—", status: "Filed", responseDate: "—", daysOpen: 0 },
    { ref: "SVR-MHT-004", title: "L1 formwork inspection", dateRaised: "2026-04-28", from: "Design Team", to: "—", slaDeadline: "—", status: "Filed", responseDate: "—", daysOpen: 0 },
    { ref: "SVR-MHT-005", title: "Waterproofing application check", dateRaised: "2026-05-03", from: "Design Team", to: "—", slaDeadline: "—", status: "Filed", responseDate: "—", daysOpen: 0 },
  ],
  MOM: [
    { ref: "MOM-MHT-001", title: "Weekly site meeting #8", dateRaised: "2026-04-29", from: "Design Team", to: "All", slaDeadline: "—", status: "Issued", responseDate: "—", daysOpen: 0 },
    { ref: "MOM-MHT-002", title: "Weekly site meeting #9", dateRaised: "2026-05-06", from: "Design Team", to: "All", slaDeadline: "—", status: "Draft", responseDate: "—", daysOpen: 0 },
  ],
  PC: [
    { ref: "PC-MHT-001", title: "Interim Payment Certificate #1", dateRaised: "2026-04-01", from: "Design Team", to: "Client", slaDeadline: "2026-05-01", status: "Certified", responseDate: "2026-04-20", daysOpen: 19 },
  ],
  PR: [
    { ref: "PR-MHT-001", title: "Monthly Progress Report - March 2026", dateRaised: "2026-04-05", from: "Design Team", to: "Client", slaDeadline: "—", status: "Issued", responseDate: "—", daysOpen: 0 },
    { ref: "PR-MHT-002", title: "Monthly Progress Report - April 2026", dateRaised: "2026-05-05", from: "Design Team", to: "Client", slaDeadline: "—", status: "Draft", responseDate: "—", daysOpen: 0 },
  ],
};

// Pre-Contract design deliverables tracking
const preContractDeliverables: Record<string, Array<{name: string; status: "complete" | "in-progress" | "pending"; assignee: string; dueDate: string}>> = {
  "al-wasl-tower": [
    { name: "Trakheesi concept submission package", status: "in-progress", assignee: "Ahmed M.", dueDate: "2026-05-20" },
    { name: "Civil Defence concept NOC", status: "pending", assignee: "James W.", dueDate: "2026-05-25" },
    { name: "DM concept approval drawings", status: "in-progress", assignee: "Ahmed M.", dueDate: "2026-05-18" },
    { name: "NOC list compilation", status: "complete", assignee: "Priya S.", dueDate: "2026-05-10" },
    { name: "SD report (final)", status: "complete", assignee: "James W.", dueDate: "2026-05-05" },
    { name: "3D views & renders", status: "complete", assignee: "Ahmed M.", dueDate: "2026-04-28" },
    { name: "Material palette board", status: "complete", assignee: "Sarah J.", dueDate: "2026-04-20" },
  ],
  "dubai-creek": [
    { name: "Site analysis report", status: "complete", assignee: "James W.", dueDate: "2026-04-15" },
    { name: "Design narrative document", status: "in-progress", assignee: "Ahmed M.", dueDate: "2026-05-12" },
    { name: "Mood boards (3 options)", status: "in-progress", assignee: "Sarah J.", dueDate: "2026-05-15" },
    { name: "Massing options (3 schemes)", status: "pending", assignee: "Ahmed M.", dueDate: "2026-05-25" },
    { name: "Preliminary GFA calculation", status: "pending", assignee: "James W.", dueDate: "2026-05-30" },
    { name: "Area schedule draft", status: "pending", assignee: "Priya S.", dueDate: "2026-06-05" },
    { name: "Concept renders", status: "pending", assignee: "Ahmed M.", dueDate: "2026-06-15" },
  ],
};

const teamMembers = [
  { name: "Ahmed Al Maktoum", role: "Project Director", avatar: "AM", hours: 8, load: 85, dept: "Architecture", rate: 450, billRate: 750 },
  { name: "Sarah Johnson", role: "Resident Engineer", avatar: "SJ", hours: 40, load: 92, dept: "Supervision", rate: 380, billRate: 650 },
  { name: "James Wilson", role: "Lead Architect", avatar: "JW", hours: 16, load: 45, dept: "Architecture", rate: 320, billRate: 550 },
  { name: "David Chen", role: "Structural Inspector", avatar: "DC", hours: 40, load: 88, dept: "Structural", rate: 300, billRate: 520 },
  { name: "Mohammed Hassan", role: "MEP Inspector", avatar: "MH", hours: 40, load: 82, dept: "MEP", rate: 300, billRate: 520 },
  { name: "Priya Sharma", role: "Document Controller", avatar: "PS", hours: 40, load: 95, dept: "Admin", rate: 180, billRate: 300 },
];

const activityFeed = [
  { time: "5 min ago", user: "Sarah J.", action: "Approved IR", detail: "IR-MHT-003: L1 slab pre-pour inspection" },
  { time: "20 min ago", user: "Priya S.", action: "Logged SD", detail: "SD-MHT-006: Slab post-tension layout" },
  { time: "1h ago", user: "David C.", action: "Raised NCR", detail: "NCR-MHT-002: Rebar spacing non-compliance" },
  { time: "2h ago", user: "Sarah J.", action: "Issued SI", detail: "SI-MHT-003: Relocate fire hydrant" },
  { time: "3h ago", user: "Mohammed H.", action: "Reviewed MOS", detail: "MOS-MHT-004: Façade aluminium profile" },
  { time: "Yesterday", user: "Ahmed M.", action: "Approved EOT", detail: "EOT-MHT-001: 14 days granted" },
  { time: "Yesterday", user: "Priya S.", action: "Filed letter", detail: "LTR-MHT-004: Insurance renewal" },
  { time: "2 days ago", user: "Sarah J.", action: "Site visit", detail: "SVR-MHT-005: Waterproofing application" },
];

const preContractActivity = [
  { time: "10 min ago", user: "Ahmed M.", action: "Updated drawings", detail: "Authority concept submission package" },
  { time: "1h ago", user: "James W.", action: "Completed deliverable", detail: "SD Report (final version)" },
  { time: "2h ago", user: "Sarah J.", action: "Uploaded", detail: "Material palette board v3" },
  { time: "Yesterday", user: "Priya S.", action: "Compiled", detail: "NOC list — 8 authorities identified" },
  { time: "Yesterday", user: "Ahmed M.", action: "Client meeting", detail: "Concept presentation sign-off" },
  { time: "2 days ago", user: "James W.", action: "Submitted", detail: "Structural concept to engineer" },
  { time: "3 days ago", user: "Ahmed M.", action: "Design review", detail: "3D massing options presented to client" },
];

// ===== TAB DEFINITIONS =====
const postContractTabs = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "stages", label: "Stages & Pipeline", icon: Layers },
  { id: "timeline", label: "Timeline", icon: Activity },
  { id: "team", label: "Team & Roles", icon: Users },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "doclogs", label: "Document Logs", icon: ClipboardList },
  { id: "drawings", label: "Drawings", icon: FolderOpen },
  { id: "authority", label: "Authority", icon: Landmark },
  { id: "financials", label: "Financials", icon: DollarSign },
  { id: "time", label: "Time & Effort", icon: Timer },
  { id: "meetings", label: "Meetings", icon: MessageSquare },
  { id: "risks", label: "Risks & Issues", icon: AlertTriangle },
  { id: "lessons", label: "Lessons Checklist", icon: ClipboardCheck },
  { id: "dcc-rfi", label: "Drawings & RFI", icon: Ruler },
  { id: "quality", label: "Quality", icon: CheckCircle2 },
  { id: "hse", label: "HSE", icon: HardHat },
  { id: "bim", label: "BIM Viewer", icon: Box },
  { id: "ai", label: "AI Assistant", icon: Bot },
  { id: "portal", label: "Client Portal", icon: Globe },
  { id: "contractors", label: "Contractor Access", icon: HardHat },
  { id: "project-chat", label: "Project Chat", icon: MessageSquare },
];

const preContractTabs = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "stages", label: "Stages & Pipeline", icon: Layers },
  { id: "timeline", label: "Timeline", icon: Activity },
  { id: "team", label: "Team & Roles", icon: Users },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "deliverables", label: "Deliverables", icon: FileCheck },
  { id: "drawings", label: "Design Drawings", icon: Ruler },
  { id: "authority", label: "Authority", icon: Landmark },
  { id: "financials", label: "Financials", icon: DollarSign },
  { id: "time", label: "Time & Effort", icon: Timer },
  { id: "meetings", label: "Meetings", icon: MessageSquare },
  { id: "risks", label: "Risks & Issues", icon: AlertTriangle },
  { id: "lessons", label: "Lessons Checklist", icon: ClipboardCheck },
  { id: "dcc-rfi", label: "Drawings & RFI", icon: Ruler },
  { id: "quality", label: "Quality", icon: CheckCircle2 },
  { id: "hse", label: "HSE", icon: HardHat },
  { id: "bim", label: "BIM Viewer", icon: Box },
  { id: "ai", label: "AI Assistant", icon: Bot },
  { id: "portal", label: "Client Portal", icon: Globe },
  { id: "project-chat", label: "Project Chat", icon: MessageSquare },
];

const clientProjectTabs = [
  { id: "stages", label: "Stages & Pipeline", icon: Layers },
  { id: "timeline", label: "Timeline", icon: Activity },
  { id: "authority", label: "Authority", icon: Landmark },
  { id: "bim", label: "BIM Viewer", icon: Box },
];

const healthIcons: Record<string, { icon: string; color: string; label: string }> = {
  "on-track": { icon: "🟢", color: "text-emerald-600", label: "On Track" },
  "at-risk": { icon: "🟡", color: "text-amber-600", label: "At Risk" },
  "delayed": { icon: "🔴", color: "text-red-600", label: "Delayed" },
};

const docStatusColors: Record<string, string> = {
  "Open": "bg-blue-100 text-blue-700",
  "Under Review": "bg-amber-100 text-amber-700",
  "Responded": "bg-emerald-100 text-emerald-700",
  "Closed": "bg-gray-100 text-gray-600",
  "Overdue": "bg-red-100 text-red-700",
  "Approved": "bg-emerald-100 text-emerald-700",
  "Approved with Comments": "bg-teal-100 text-teal-700",
  "Pending": "bg-amber-100 text-amber-700",
  "Acknowledged": "bg-emerald-100 text-emerald-700",
  "Issued": "bg-blue-100 text-blue-700",
  "Draft": "bg-gray-100 text-gray-600",
  "Sent": "bg-blue-100 text-blue-700",
  "Received": "bg-emerald-100 text-emerald-700",
  "Filed": "bg-gray-100 text-gray-600",
  "Certified": "bg-emerald-100 text-emerald-700",
  "Approved (14 days)": "bg-emerald-100 text-emerald-700",
};

// ===== INLINE EDIT =====
function InlineEdit({ value, onSave, className = "" }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input value={tempValue} onChange={(e) => setTempValue(e.target.value)} className="h-7 text-sm" autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") { onSave(tempValue); setEditing(false); toast.success("Saved"); } if (e.key === "Escape") { setTempValue(value); setEditing(false); } }} />
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { onSave(tempValue); setEditing(false); toast.success("Saved"); }}><Check className="w-3 h-3" /></Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setTempValue(value); setEditing(false); }}><X className="w-3 h-3" /></Button>
      </div>
    );
  }
  return (
    <span className={`cursor-pointer hover:bg-accent/50 px-1 rounded transition-colors group ${className}`} onClick={() => setEditing(true)}>
      {value}<Edit3 className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-50" />
    </span>
  );
}

// ===== MAIN COMPONENT =====
export default function ProjectDetail() {
  const [, navigate] = useLocation();
  // Try stage-aware routes first
  const [matchPreContract, paramsPreContract] = useRoute("/projects/pre-contract/:id");
  const [matchPostContract, paramsPostContract] = useRoute("/projects/post-contract/:id");
  const [matchPipeline, paramsPipeline] = useRoute("/projects/pipeline/:id");
  const [matchCompleted, paramsCompleted] = useRoute("/projects/completed/:id");
  const [matchGeneric, paramsGeneric] = useRoute("/projects/:id");

  // Determine project ID and stage from URL
  const projectId = useMemo(() => {
    if (matchPreContract) return paramsPreContract?.id || "";
    if (matchPostContract) return paramsPostContract?.id || "";
    if (matchPipeline) return paramsPipeline?.id || "";
    if (matchCompleted) return paramsCompleted?.id || "";
    if (matchGeneric) return paramsGeneric?.id || "";
    return "";
  }, [matchPreContract, matchPostContract, matchPipeline, matchCompleted, matchGeneric, paramsPreContract, paramsPostContract, paramsPipeline, paramsCompleted, paramsGeneric]);

  const urlStage = useMemo(() => {
    if (matchPreContract) return "pre-contract";
    if (matchPostContract) return "post-contract";
    if (matchPipeline) return "pipeline";
    if (matchCompleted) return "completed";
    return null;
  }, [matchPreContract, matchPostContract, matchPipeline, matchCompleted]);

  // Resolve project data — prefer store (live edits), fall back to seed
  const liveProjects = _useStoreCollection(projectsStore);
  const resolvedProject = useMemo(() => {
    const live = liveProjects.find((x) => x.id === projectId);
    if (live) return live as unknown as ProjectData;
    const found = projectDatabase[projectId];
    if (found) return found;
    return liveProjects[0] as unknown as ProjectData || projectDatabase["marina-heights"];
  }, [projectId, liveProjects]);

  const { currentUser: authUser } = useAuth();
  const isClientUser = authUser?.role === "client";
  const [activeTab, setActiveTab] = useState(
    isClientUser ? "stages" :
    (authUser?.role === "director" && matchPipeline ? "stages" : "overview")
  );
  const [editOpen, setEditOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [project, setProject] = useState(resolvedProject);
  useEffect(() => {
    setProject(resolvedProject);
  }, [resolvedProject]);
  const [starred, setStarred] = useState(false);
  const [showLang, setShowLang] = useState<"en" | "ar">("en");
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskAssignee, setQuickTaskAssignee] = useState("");
  const [quickTaskDue, setQuickTaskDue] = useState("");
  const directoryUsers = _useStoreCollection(userDirectoryStore);
  function createQuickTask() {
    if (!quickTaskTitle.trim()) { toast.error("Task title is required"); return; }
    const now = new Date().toISOString();
    tasksStore.put({
      id: newId("t"),
      title: quickTaskTitle.trim(),
      status: "todo", priority: "medium", category: "other",
      projectId: project.id,
      assigneeUserIds: quickTaskAssignee ? [quickTaskAssignee] : [],
      reporterUserId: authUser?.id,
      dueDate: quickTaskDue || undefined,
      createdAt: now, updatedAt: now,
    } as any);
    const who = directoryUsers.find((u) => u.id === quickTaskAssignee)?.displayName;
    toast.success("Task created" + (who ? ` — assigned to ${who}` : ""));
    setQuickTaskOpen(false);
    setQuickTaskTitle(""); setQuickTaskAssignee(""); setQuickTaskDue("");
  }
  const [quickRFIOpen, setQuickRFIOpen] = useState(false);

  // Use URL stage if available, otherwise use project's stage
  const effectiveStage = urlStage || project.stage;
  const isPostContract = effectiveStage === "post-contract";
  const isPreContract = effectiveStage === "pre-contract";
  const isPipeline = effectiveStage === "pipeline";
  const isCompleted = effectiveStage === "completed";
  const accentColor = isPostContract ? "orange" : isPreContract ? "emerald" : isCompleted ? "gray" : "blue";

  const health = healthIcons[project.health];
  const tabs = isClientUser ? clientProjectTabs : isPostContract ? postContractTabs : preContractTabs;
  const stages = isPostContract ? postContractStages : preContractStages;
  const feed = isPostContract ? activityFeed : preContractActivity;

  const stageBadgeText = isPostContract
    ? `🏗️ Post-Contract — Stage ${project.currentSubStage + 1} of ${postContractStages.length}: ${postContractStages[Math.min(project.currentSubStage, postContractStages.length - 1)].name}`
    : isPreContract
    ? `🟢 Pre-Contract — Stage ${project.currentSubStage + 1} of ${preContractStages.length}: ${preContractStages[Math.min(project.currentSubStage, preContractStages.length - 1)].name}`
    : isPipeline
    ? "📋 Pipeline"
    : "✅ Completed";

  useEffect(() => {
    if (!urlStage || urlStage === project.stage) return;
    navigate(`/projects/${project.stage}/${project.id}`);
  }, [navigate, project.id, project.stage, urlStage]);

  useEffect(() => {
    if (isClientUser && !clientProjectTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("stages");
      return;
    }
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("overview");
    }
  }, [activeTab, isClientUser, tabs]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ===== PROJECT HEADER ===== */}
      <div className={`border-b ${isPostContract ? "border-orange-200" : isPreContract ? "border-emerald-200" : "border-border"} bg-card px-4 py-3 shrink-0`}>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => navigate("/projects")}>
            <ArrowLeft className="w-4 h-4" /> Projects
          </Button>
          <Badge className={
            isPostContract ? "bg-orange-100 text-orange-700 border-orange-200" :
            isPreContract ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
            isCompleted ? "bg-gray-100 text-gray-600 border-gray-200" :
            "bg-blue-100 text-blue-700 border-blue-200"
          }>
            {isPostContract ? <><HardHat className="w-3 h-3 mr-1" /> Post-Contract</> :
             isPreContract ? <><Pencil className="w-3 h-3 mr-1" /> Pre-Contract</> :
             isCompleted ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</> :
             <><FileText className="w-3 h-3 mr-1" /> Pipeline</>}
          </Badge>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-data text-muted-foreground">{project.code}</span>
                <h1 className="text-xl font-bold">
                  <InlineEdit value={showLang === "en" ? project.nameEn : project.nameAr} onSave={(v) => setProject({ ...project, nameEn: v })} />
                </h1>
                <button className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5" onClick={() => setShowLang(showLang === "en" ? "ar" : "en")}>
                  {showLang === "en" ? "AR" : "EN"}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-sm font-medium ${health.color}`}>{health.icon} {health.label}</span>
                <span className="text-xs text-muted-foreground">{stageBadgeText}</span>
              </div>
            </div>
          </div>

          {/* Quick KPIs */}
          <div className="flex items-center gap-3 text-center">
            <div>
              <p className="text-lg font-bold font-data">{project.progress}%</p>
              <p className="text-[10px] text-muted-foreground">Progress</p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div>
              <p className="text-lg font-bold font-data">{project.daysToDeadline}</p>
              <p className="text-[10px] text-muted-foreground">Days Left</p>
            </div>
            {isPostContract && (
              <>
                <Separator orientation="vertical" className="h-8" />
                <div>
                  <p className="text-lg font-bold font-data text-orange-600">{project.openRFIs}</p>
                  <p className="text-[10px] text-muted-foreground">Open RFIs</p>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div>
                  <p className="text-lg font-bold font-data text-red-600">{project.openNCRs}</p>
                  <p className="text-[10px] text-muted-foreground">NCRs</p>
                </div>
              </>
            )}
            {isPreContract && (
              <>
                <Separator orientation="vertical" className="h-8" />
                <div>
                  <p className="text-lg font-bold font-data text-emerald-600">{project.pendingApprovals}</p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          {!isClientUser && <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3 h-3" /> Edit project
            </Button>
            <Dialog open={quickTaskOpen} onOpenChange={setQuickTaskOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 text-xs"><Plus className="w-3 h-3" /> Task</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Quick Assign Task</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Task title..." autoFocus value={quickTaskTitle} onChange={(e) => setQuickTaskTitle(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={quickTaskAssignee} onValueChange={setQuickTaskAssignee}>
                      <SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger>
                      <SelectContent>{directoryUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="date" value={quickTaskDue} onChange={(e) => setQuickTaskDue(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setQuickTaskOpen(false)}>Cancel</Button>
                    <Button size="sm" onClick={createQuickTask}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {isPostContract && (
              <Dialog open={quickRFIOpen} onOpenChange={setQuickRFIOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 text-xs"><FileText className="w-3 h-3" /> RFI</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Raise RFI</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="RFI Title..." autoFocus />
                    <textarea className="w-full border border-input rounded-md p-2 text-sm min-h-[80px] bg-background" placeholder="Description..." />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setQuickRFIOpen(false)}>Cancel</Button>
                      <Button size="sm" onClick={() => { toast.success("RFI raised"); setQuickRFIOpen(false); }}><Send className="w-3 h-3 mr-1" /> Submit</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setStarred(!starred); toast.success(starred ? "Unpinned" : "Pinned"); }}>
              <Star className={`w-4 h-4 ${starred ? "fill-amber-400 text-amber-400" : ""}`} />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toast.success("Link copied!")}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant={railOpen ? "secondary" : "ghost"} className="h-8 gap-1.5 px-2 text-xs" onClick={() => setRailOpen(!railOpen)}>
              <Activity className="w-3.5 h-3.5" /> Feeds
            </Button>
          </div>}
        </div>
      </div>

      {!isClientUser && <ProjectEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={project.id}
        onSaved={(saved) => setProject(saved as unknown as ProjectData)}
      />}
      {/* ===== 3-ZONE BODY ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <div className="w-48 border-r border-border bg-card shrink-0 overflow-y-auto hidden lg:block">
          <nav className="p-2 space-y-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    activeTab === tab.id
                      ? (isPostContract ? "bg-orange-50 text-orange-700 font-medium" : isPreContract ? "bg-emerald-50 text-emerald-700 font-medium" : "bg-accent text-foreground font-medium")
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {activeTab === "overview" && <OverviewTab project={project} isPostContract={isPostContract} isPreContract={isPreContract} />}
          {activeTab === "stages" && <StagesTab project={project} isPostContract={isPostContract} isPreContract={isPreContract} onProjectChange={setProject} readOnly={isClientUser} />}
          {/* Timeline is available for every stage: post-contract projects get
              the construction programme; all others (pipeline, pre-contract,
              completed) get the design-stage timeline. */}
          {activeTab === "timeline" && !isPostContract && (
            <PreContractTimelineTab
              projectId={project.id}
              projectStartDate={project.startDate}
              projectTypeText={project.type}
              currentSubStage={project.currentSubStage}
            />
          )}
          {activeTab === "timeline" && isPostContract && (
            <PostContractTimelineTab
              projectId={project.id}
              contractStart={project.startDate}
              contractFinish={project.targetCompletion}
            />
          )}
          {activeTab === "team" && (
            <div className="space-y-5">
              <ProjectTeamCard projectId={project.id} />
              <TeamTab isPostContract={isPostContract} isPreContract={isPreContract} project={project} />
            </div>
          )}
          {activeTab === "tasks" && <TasksTab projectId={project.id} isPostContract={isPostContract} />}
          {activeTab === "doclogs" && isPostContract && <DocLogsTab />}
          {activeTab === "deliverables" && isPreContract && <DeliverablesTab projectId={project.id} />}
          {activeTab === "drawings" && <DrawingsTab isPostContract={isPostContract} projectId={project.id} />}
          {activeTab === "authority" && <AuthoritySubmittalsTab projectId={project.id} />}
          {activeTab === "financials" && <FinancialsTab project={project} isPreContract={isPreContract} />}
          {activeTab === "time" && <TimeTab projectId={project.id} />}
          {activeTab === "meetings" && <MeetingsTab projectId={project.id} />}
          {activeTab === "risks" && <RisksTab projectId={project.id} phase={effectiveStage === "post-contract" ? "post-contract" : effectiveStage === "pre-contract" ? "pre-contract" : "both"} />}
          {activeTab === "lessons" && <LessonsChecklistTab projectId={project.id} />}
          {activeTab === "dcc-rfi" && <DrawingsRfiTab projectId={project.id} />}
          {activeTab === "quality" && <QualityTab projectId={project.id} />}
          {activeTab === "hse" && <HseTab projectId={project.id} />}
          {activeTab === "bim" && <ProjectBimTab projectId={project.id} />}
          {activeTab === "ai" && <ProjectAiTab projectId={project.id} />}
          {activeTab === "portal" && <PortalTab project={project} />}
          {activeTab === "contractors" && isPostContract && <ContractorAccessTab />}
          {activeTab === "project-chat" && <ProjectChatTab project={project} />}
        </div>

        {/* FEEDS SLIDE-IN DRAWER */}
        {!isClientUser && (
          <>
            {/* Backdrop — click outside to close */}
            <div
              className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ${railOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              onClick={() => setRailOpen(false)}
            />

            {/* Vertical "Feeds" tab button — fixed to right edge, hidden when drawer is open */}
            <button
              onClick={() => setRailOpen(true)}
              className={`fixed right-0 top-1/2 z-50 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg rounded-l-xl transition-all duration-300 ${railOpen ? "opacity-0 pointer-events-none translate-x-4" : "opacity-100 translate-x-0"}`}
              style={{ writingMode: "vertical-rl", transform: "translateY(-50%) rotate(180deg)", padding: "18px 10px", letterSpacing: "0.08em", fontSize: "13px" }}
            >
              Feeds
            </button>

            {/* Sliding drawer panel */}
            <div
              className={`fixed right-0 top-0 h-full w-80 z-50 bg-white border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${railOpen ? "translate-x-0" : "translate-x-full"}`}
            >
              <div className="p-4 border-b border-border flex items-center justify-between bg-white">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" /> Activity Feed
                </h3>
                <button
                  onClick={() => setRailOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {feed.map((item, i) => (
                    <div key={i} className={`border-l-2 ${isPostContract ? "border-orange-300" : "border-emerald-400"} pl-3 py-1`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{item.user}</span>
                        <span className="text-[10px] text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.action}</p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== TAB: OVERVIEW =====
function OverviewTab({ project, isPostContract, isPreContract }: { project: ProjectData; isPostContract: boolean; isPreContract: boolean }) {
  const stages = isPostContract ? postContractStages : preContractStages;
  const milestones = isPreContract ? (authorityMilestones[project.id] || []) : [];
  const storedDeliverables = _useStoreCollection(designDeliverablesStore);
  const currentDeliverables = useMemo(() => {
    const stored = storedDeliverables
      .filter((d) => d.projectId === project.id)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.dueDate.localeCompare(b.dueDate));
    if (stored.length > 0) return stored;
    return preContractDeliverables[project.id] || [];
  }, [project.id, storedDeliverables]);
  const deliverablesCompletePct = currentDeliverables.length
    ? Math.round((currentDeliverables.filter((d) => d.status === "complete").length / currentDeliverables.length) * 100)
    : Math.round(project.progress * 0.8);
  return (
    <div className="space-y-6">
      {/* Sub-stage stepper — pipeline/completed projects reuse the same
          Pre-Contract Design Pipeline design (segments + star gates) */}
      <Card className={!isPostContract ? "rounded-[22px] border border-emerald-300 bg-white shadow-[0_2px_10px_rgba(16,185,129,0.22)]" : "border border-orange-200"}>
        {isPostContract && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4" /> Post-Contract Pipeline
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={!isPostContract ? "p-5 sm:p-6" : undefined}>
          {/* Main timeline: stages as bars, gates as star markers */}
          {!isPostContract ? (
            <PreContractPipelineCard project={project} milestones={milestones} />
          ) : (
            <>
              <div className="flex items-center gap-0.5 mb-2">
                {stages.map((_, i) => (
                  <div key={i} className={`h-3 flex-1 rounded-full transition-colors ${
                    i < project.currentSubStage ? (isPostContract ? "bg-orange-500" : "bg-emerald-500") :
                    i === project.currentSubStage ? (isPostContract ? "bg-orange-400" : "bg-emerald-400") :
                    "bg-gray-200"
                  }`} title={(stages[i] as any).name} />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={isPostContract ? "text-orange-700 font-medium" : "text-emerald-700 font-medium"}>
                  Stage {project.currentSubStage + 1}: {(stages[Math.min(project.currentSubStage, stages.length - 1)] as any).name}
                </span>
                <span className="text-muted-foreground font-data">{project.progress}% overall</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Project Info + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectInformationOverview project={project} />

        {/* Stage-specific KPIs */}
        {isPostContract ? (
          <Card className="border border-orange-200">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-orange-600" /> Construction KPIs</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-orange-50 rounded-lg"><p className="text-xs text-muted-foreground">RFI Response (avg)</p><p className="text-xl font-bold font-data">4.2 <span className="text-xs font-normal">days</span></p><p className="text-[10px] text-emerald-600">SLA: 80% compliant</p></div>
                <div className="p-3 bg-orange-50 rounded-lg"><p className="text-xs text-muted-foreground">NCRs Open/Closed</p><p className="text-xl font-bold font-data">2 / 1</p><p className="text-[10px] text-amber-600">1 pending close-out</p></div>
                <div className="p-3 bg-orange-50 rounded-lg"><p className="text-xs text-muted-foreground">Site Inspections</p><p className="text-xl font-bold font-data">8 <span className="text-xs font-normal">/month</span></p><p className="text-[10px] text-emerald-600">Target: 8</p></div>
                <div className="p-3 bg-orange-50 rounded-lg"><p className="text-xs text-muted-foreground">Variation Orders</p><p className="text-xl font-bold font-data">1</p><p className="text-[10px] text-muted-foreground">AED 120K value</p></div>
                <div className="p-3 bg-orange-50 rounded-lg"><p className="text-xs text-muted-foreground">Programme Adherence</p><p className="text-xl font-bold font-data text-emerald-600">92%</p><p className="text-[10px] text-muted-foreground">14 days EOT granted</p></div>
                <div className="p-3 bg-orange-50 rounded-lg"><p className="text-xs text-muted-foreground">Open Documents</p><p className="text-xl font-bold font-data">12</p><p className="text-[10px] text-muted-foreground">of 42 total logged</p></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Pre-contract, pipeline and completed projects all show the
          // Design KPIs panel beside Project Information.
          <DesignKpisOverview project={project} deliverablesCompletePct={deliverablesCompletePct} />
        )}
      </div>

      {/* Document summary for post-contract */}
      {isPostContract && (
        <Card className="border border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Document Log Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {Object.entries(demoDocLogs).slice(0, 7).map(([code, entries]) => {
                const open = entries.filter(e => !["Closed", "Approved", "Responded", "Acknowledged", "Issued", "Filed", "Certified", "Sent", "Approved (14 days)", "Approved with Comments"].includes(e.status)).length;
                return (
                  <div key={code} className="text-center p-2 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50">
                    <p className="text-lg font-bold font-data">{entries.length}</p>
                    <p className="text-[10px] text-muted-foreground">{code}</p>
                    {open > 0 && <p className="text-[10px] text-orange-600 font-medium">{open} open</p>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deliverables summary — follows the Design KPIs card */}
      {!isPostContract && currentDeliverables.length > 0 && (
        <CurrentStageDeliverablesOverview deliverables={currentDeliverables} />
      )}
    </div>
  );
}

function ProjectInformationOverview({ project }: { project: ProjectData }) {
  const items = [
    { label: "Type", value: project.type || "—" },
    { label: "Plot No.", value: project.plotNo || "—", mono: true },
    { label: "Community", value: project.community || "—" },
    { label: "Client", value: project.client || "—" },
    { label: "Contract Value", value: `AED ${Number(project.contractValue ?? 0).toLocaleString()}`, mono: true },
    { label: "GFA (sqm)", value: Number(project.gfa ?? 0).toLocaleString(), mono: true },
    { label: "Floors", value: String(project.floors ?? "—"), mono: true },
    { label: "Target Completion", value: project.targetCompletion || "—", mono: true },
  ];
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="h-5 w-5 stroke-[2.2] text-slate-900" />
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Project Information</h2>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-5">
          {items.map((item) => (
            <div key={item.label} className="min-w-0">
              <div className="text-sm leading-tight text-slate-500">{item.label}</div>
              <div className={`mt-1 text-lg font-medium leading-tight text-slate-900 ${item.mono ? "font-mono tracking-tight" : ""}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DesignKpisOverview({ project, deliverablesCompletePct }: { project: ProjectData; deliverablesCompletePct: number }) {
  const kpis = [
    { label: "Deliverables Complete", value: `${deliverablesCompletePct}%`, sub: "of current stage", valueTone: "text-emerald-600" },
    { label: "Client Reviews", value: "3", sub: "All approved", subTone: "text-emerald-600" },
    { label: "Authority Submissions", value: String(project.pendingApprovals ?? 0), sub: "pending approval", subTone: "text-orange-500" },
    { label: "Design Revisions", value: "2", sub: "this stage" },
    { label: "Hours Logged", value: Number(project.hoursLogged ?? 0).toLocaleString(), sub: `of ${Number(project.hoursPlanned ?? 0).toLocaleString()} planned`, mono: true },
    { label: "Budget Consumed", value: `${project.budgetConsumed ?? 0}%`, sub: "within target", subTone: "text-emerald-600" },
  ];
  return (
    <Card className="rounded-2xl border border-emerald-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2.5">
          <Palette className="h-5 w-5 stroke-[2.2] text-emerald-600" />
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Design KPIs</h2>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl bg-emerald-50/70 p-4">
              <div className="text-sm leading-tight text-slate-600">{kpi.label}</div>
              <div className={`mt-1.5 text-2xl font-semibold leading-none text-slate-900 ${kpi.valueTone ?? ""} ${kpi.mono ? "font-mono tracking-tight" : ""}`}>
                {kpi.value}
              </div>
              <div className={`mt-1.5 text-xs leading-tight ${kpi.subTone ?? "text-slate-500"}`}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CurrentStageDeliverablesOverview({ deliverables }: { deliverables: Array<{ name: string; status: "complete" | "in-progress" | "pending"; assignee: string; dueDate: string }> }) {
  return (
    <Card className="rounded-2xl border border-emerald-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2.5">
          <FileCheck className="h-5 w-5 stroke-[2.2] text-emerald-600" />
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Current Stage Deliverables</h2>
        </div>
        <div className="mt-5 space-y-2.5">
          {deliverables.map((d) => (
            <div key={`${d.name}-${d.dueDate}`} className="grid h-14 grid-cols-[32px_minmax(0,1fr)_110px_110px] items-center gap-3 rounded-xl bg-slate-50 px-4">
              <DeliverableStatusIcon status={d.status} />
              <div className="truncate text-base font-medium leading-tight text-slate-900">{d.name}</div>
              <div className="truncate text-right text-sm text-slate-500">{d.assignee}</div>
              <div className="text-right font-mono text-sm text-slate-500">{d.dueDate}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DeliverableStatusIcon({ status }: { status: "complete" | "in-progress" | "pending" }) {
  if (status === "complete") return <CheckCircle2 className="h-6 w-6 text-emerald-500" />;
  if (status === "in-progress") return <Clock className="h-6 w-6 text-amber-500" />;
  return <div className="h-6 w-6 rounded-full border-2 border-slate-300" />;
}

function PreContractPipelineCard({ project, milestones }: { project: ProjectData; milestones: AuthorityMilestone[] }) {
  const currentIndex = Math.min(Math.max(project.currentSubStage ?? 0, 0), preContractStages.length - 1);
  const current = preContractStages[currentIndex];
  // Fallback authority track when no per-project milestones exist: derive the
  // status from gate progress (G2 = index 3, G4 = index 7 in the stage array).
  const g2Index = preContractStages.findIndex((s) => s.code === "G2");
  const g4Index = preContractStages.findIndex((s) => s.code === "G4");
  const authority = milestones.length > 0 ? milestones : [
    { name: "Authority Preliminary Design Approval", triggeredBy: "G2", runsParallelWith: "S3", status: (currentIndex >= g2Index ? "under-review" : "not-started") as AuthorityMilestone["status"] },
    { name: "NOCs + Final Building Permit (BP)", triggeredBy: "G4", runsParallelWith: "S5", status: (currentIndex >= g4Index ? "under-review" : "not-started") as AuthorityMilestone["status"] },
  ];

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <Layers className="h-5 w-5 stroke-[2.2] text-slate-900" />
        <h2 className="text-lg font-semibold leading-none tracking-tight text-slate-900">
          Pre-Contract Design Pipeline
        </h2>
      </div>

      <div className="mt-6">
        <div className="flex w-full items-center gap-1">
          {preContractStages.map((item, i) => {
            const complete = i < currentIndex;
            const active = i === currentIndex;
            if (item.type === "gate") {
              return (
                <div key={item.code} className="flex w-7 shrink-0 items-center justify-center" title={`${item.code}: ${item.name}`}>
                  <Star
                    className={`h-5 w-5 stroke-[2.2] ${
                      complete || active
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    }`}
                  />
                </div>
              );
            }
            return (
              <div
                key={item.code}
                title={`${item.code}: ${item.name}`}
                className={`h-3 min-w-0 flex-1 rounded-full transition-colors ${
                  complete ? "bg-emerald-500" : active ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="min-w-0 truncate text-sm font-medium leading-tight text-emerald-700">
            {current.code}: {current.name}
          </p>
          <p className="shrink-0 font-mono text-sm text-slate-500">
            {project.progress}% overall
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-dashed border-amber-300 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orange-700">
          Authority Track (Parallel)
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {authority.map((m) => (
            <div key={`${m.name}-${m.triggeredBy}`} className="rounded-xl border border-amber-300 bg-amber-50/45 p-4">
              <div className="flex items-center gap-2 text-sm font-medium leading-snug text-orange-800">
                <Landmark className="h-4 w-4 shrink-0 text-orange-500" />
                <span>{m.name}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <AuthorityStatusBadge status={m.status} />
                <span className="text-xs text-slate-500">triggered by {m.triggeredBy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthorityStatusBadge({ status }: { status: AuthorityMilestone["status"] }) {
  const cls =
    status === "approved" ? "bg-emerald-100 text-emerald-700" :
    status === "under-review" ? "bg-blue-100 text-blue-700" :
    status === "submitted" ? "bg-amber-100 text-amber-700" :
    status === "comments-received" ? "bg-orange-100 text-orange-700" :
    "bg-slate-200 text-slate-600";
  return (
    <Badge className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {status.replace("-", " ")}
    </Badge>
  );
}

const BACKEND_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shortStageName(name: string) {
  return name
    .replace("Data Collection & Design Brief", "Data Collection ...")
    .replace("Schematic Design + BODR", "Schematic Design...")
    .replace("Draft Detailed Design + Tender Documents", "Draft Detailed D...")
    .replace("Final Detailed Design + Tender Documents", "Final Detailed D...");
}

function statusLabel(status: AuthorityMilestone["status"]) {
  return status.replace(/-/g, " ");
}

function currentStageProgress(nextIndex: number, total: number) {
  return Math.max(0, Math.min(100, Math.round((nextIndex / Math.max(1, total - 1)) * 100)));
}

// ===== TAB: STAGES & PIPELINE =====
function StagesTab({
  project,
  isPostContract,
  isPreContract,
  onProjectChange,
  readOnly = false,
}: {
  project: ProjectData;
  isPostContract: boolean;
  isPreContract: boolean;
  onProjectChange: (project: ProjectData) => void;
  readOnly?: boolean;
}) {
  const [, navigate] = useLocation();
  const { hasRole } = useAuth();
  const isDirector = hasRole("director");
  const stages = isPostContract ? postContractStages : preContractStages;
  const isDesignGateFlow = !isPostContract && project.stage !== "completed";
  const effectiveStage = isPostContract ? "post-contract" : isPreContract ? "pre-contract" : project.stage;
  const [selectedStageRaw, setSelectedStageRaw] = useState(() => {
    const base = project.currentSubStage ?? 0;
    // Directors on a new project (at S1) start on G1 so the approval button is immediately visible
    if (isDirector && isDesignGateFlow && base === 0) return 1;
    return base;
  });
  const selectedStage = Math.min(Math.max(selectedStageRaw ?? 0, 0), Math.max(0, stages.length - 1));
  const setSelectedStage = (next: number) => setSelectedStageRaw(Math.min(Math.max(next ?? 0, 0), Math.max(0, stages.length - 1)));
  useEffect(() => {
    const base = project.currentSubStage ?? 0;
    const next = isDirector && isDesignGateFlow && base === 0 ? 1 : base;
    setSelectedStageRaw(Math.min(Math.max(next, 0), Math.max(0, stages.length - 1)));
  }, [project.stage, project.currentSubStage, stages.length]);
  // Authority track: per-project milestones when defined, else derive the
  // standard two-milestone track from gate progress (same as the Overview).
  const storedMilestones = isDesignGateFlow ? (authorityMilestones[project.id] || []) : [];
  const stageIdx = project.currentSubStage ?? 0;
  const g2Idx = preContractStages.findIndex((s) => s.code === "G2");
  const g4Idx = preContractStages.findIndex((s) => s.code === "G4");
  const milestones: AuthorityMilestone[] = storedMilestones.length > 0 ? storedMilestones : (isDesignGateFlow ? [
    { name: "Authority Preliminary Design Approval", triggeredBy: "G2", runsParallelWith: "S3", status: stageIdx >= g2Idx ? "under-review" : "not-started", submittedDate: stageIdx >= g2Idx ? "2026-03-20" : undefined },
    { name: "NOCs + Final Building Permit (BP)", triggeredBy: "G4", runsParallelWith: "S5", status: stageIdx >= g4Idx ? "under-review" : "not-started" },
  ] : []);
  const approvals = _useStoreCollection(stageApprovalsStore);
  const selectedPreContract = isDesignGateFlow ? preContractStages[selectedStage] : undefined;
  const selectedIsGate = !!selectedPreContract && selectedPreContract.type === "gate";
  const sourceStage = selectedIsGate ? preContractStages[selectedStage - 1] : undefined;
  const gateApproval = selectedIsGate && sourceStage
    ? approvals.find((a) => a.projectId === project.id && a.stageCode === sourceStage.code && a.gateCode === selectedPreContract.code)
    : undefined;
  const canRecordClientGate =
    !readOnly &&
    selectedIsGate &&
    (gateApproval?.status === "approved" || isDirector) &&
    (
      selectedStage === project.currentSubStage ||
      selectedStage === (project.currentSubStage ?? 0) + 1
    );
  function recordClientApproval() {
    if (!isDesignGateFlow || !selectedPreContract || selectedPreContract.type !== "gate") return;
    const nextIndex = Math.min(selectedStage + 1, preContractStages.length - 1);
    const nextProject: ProjectData = {
      ...project,
      currentSubStage: nextIndex,
      progress: Math.max(project.progress, currentStageProgress(nextIndex, preContractStages.length)),
      pendingApprovals: Math.max(0, project.pendingApprovals - 1),
    };

    onProjectChange(nextProject);
    setSelectedStage(nextIndex);

    if (BACKEND_UUID_RE.test(project.id)) {
      const now = new Date().toISOString();
      if (sourceStage && gateApproval?.status !== "approved") {
        const rec = gateApproval
          ? {
              ...gateApproval,
              status: "approved" as const,
              approvals: (gateApproval.approvals as any[]).map((a) => ({
                ...a,
                status: "approved",
                decidedByDisplay: a.decidedByDisplay ?? "Recorded at client gate",
                decidedAt: a.decidedAt ?? now,
              })),
              completedAt: now,
              updatedAt: now,
            }
          : {
              id: crypto.randomUUID(),
              projectId: project.id,
              stageCode: sourceStage.code,
              gateCode: selectedPreContract.code,
              requesterUserId: "client-gate",
              requesterDisplay: "Client approval recorded",
              status: "approved",
              approvals: [
                { kind: "LA", role: "design-lead", status: "approved", decidedByDisplay: "Recorded at gate", decidedAt: now },
                { kind: "PM", role: "pm", status: "approved", decidedByDisplay: "Recorded at gate", decidedAt: now },
                { kind: "DM", role: "director", status: "approved", decidedByDisplay: "Recorded at gate", decidedAt: now },
              ],
              note: `${selectedPreContract.code} client approval recorded from Stages & Pipeline`,
              createdAt: now,
              updatedAt: now,
              completedAt: now,
            };
        stageApprovalsStore.put(rec as any);
      }
      projectsStore.put(nextProject as any);
      toast.success(`${selectedPreContract.code} client approval saved and project advanced`);
    } else {
      toast.success(`${selectedPreContract.code} approved locally. Backend save needs a live project ID.`);
    }
  }

  function saveProjectProgress(nextProject: ProjectData, successMessage: string) {
    onProjectChange(nextProject);
    if (!BACKEND_UUID_RE.test(project.id)) {
      toast.success(`${successMessage} Backend save needs a live project ID.`);
      return;
    }
    projectsStore.put(nextProject as any);
    projectsStore.refresh?.();
    toast.success(successMessage);
  }

  function completeCurrentStage() {
    const currentIndex = project.currentSubStage ?? 0;
    const isFinalDesignStage = isDesignGateFlow && currentIndex >= preContractStages.length - 1;
    const nextIndex = isFinalDesignStage ? currentIndex : Math.min(currentIndex + 1, stages.length - 1);
    const nextProgress = isFinalDesignStage
      ? 100
      : Math.min(99, currentStageProgress(nextIndex, stages.length));
    const nextProject: ProjectData = {
      ...project,
      currentSubStage: nextIndex,
      progress: Math.max(project.progress ?? 0, nextProgress),
      pendingApprovals: isDesignGateFlow ? Math.max(0, (project.pendingApprovals ?? 0) - 1) : project.pendingApprovals,
    };
    setSelectedStage(nextIndex);
    saveProjectProgress(
      nextProject,
      `${isDesignGateFlow ? selectedPreContract?.code : `Stage ${selectedStage + 1}`} marked complete and saved`,
    );
  }

  function moveToPostContract() {
    setSelectedStageRaw(0);
    const nextProject: ProjectData = {
      ...project,
      stage: "post-contract",
      currentSubStage: 0,
      progress: 0,
      health: "on-track",
    };
    saveProjectProgress(nextProject, "Project moved to Post-Contract and saved");
    navigate(`/projects/post-contract/${project.id}`);
  }

  function moveToCompleted() {
    const nextProject: ProjectData = {
      ...project,
      stage: "completed",
      currentSubStage: postContractStages.length - 1,
      progress: 100,
      health: "on-track",
    };
    saveProjectProgress(nextProject, "Project moved to Completed and saved");
    navigate(`/projects/completed/${project.id}`);
  }

  return (
    <div className="space-y-8">
      {!readOnly && isDesignGateFlow && preContractStages[project.currentSubStage] && preContractStages[project.currentSubStage].type === "stage" && (
        <StageGateApprovalCard
          projectId={project.id}
          stageCode={preContractStages[project.currentSubStage].code}
          stageName={preContractStages[project.currentSubStage].name}
          projectStage={effectiveStage}
          onAllApproved={() => {
            const gateIdx = Math.min((project.currentSubStage ?? 0) + 1, preContractStages.length - 1);
            const nextProject: ProjectData = {
              ...project,
              currentSubStage: gateIdx,
              progress: Math.max(project.progress ?? 0, currentStageProgress(gateIdx, preContractStages.length)),
            };
            onProjectChange(nextProject);
            setSelectedStage(gateIdx);
            if (BACKEND_UUID_RE.test(project.id)) {
              projectsStore.put(nextProject as any);
            }
            toast.success(`All 3 approved — ${preContractStages[gateIdx]?.code} is ready for client approval`);
          }}
        />
      )}

      <Card className={`rounded-[22px] border bg-white shadow-sm ${isPostContract ? "border-orange-300" : "border-emerald-300"}`}>
        <CardContent className="p-5 sm:p-6">
          {isDesignGateFlow ? (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Pre-Contract: 8 Stages + 5 Client Gates</h3>
              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-[820px] items-center gap-2">
                  {preContractStages.map((item, i) => {
                    const isGate = item.type === "gate";
                    const gateInternallyApproved = isGate && approvals.some(a => a.projectId === project.id && a.gateCode === item.code && a.status === "approved");
                    const isCompleted = i < project.currentSubStage || gateInternallyApproved;
                    const isCurrent = i === project.currentSubStage && !isCompleted;
                    const isSelected = i === selectedStage;
                    if (isGate) {
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedStage(i)}
                          className={`flex w-9 shrink-0 flex-col items-center gap-0.5 rounded-lg py-1.5 transition-all hover:-translate-y-0.5 hover:bg-amber-50 ${
                            isSelected ? "bg-amber-50 ring-2 ring-amber-400" : ""
                          }`}
                        >
                          <Star className={`h-4 w-4 stroke-[2.2] ${
                            isCompleted ? "fill-amber-400 text-amber-400" :
                            isCurrent ? "fill-amber-300 text-amber-300" :
                            "text-slate-300"
                          }`} />
                          <span className="text-[10px] font-medium text-orange-700">{item.code}</span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedStage(i)}
                        className={`flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-lg px-2 py-2 transition-all hover:-translate-y-0.5 hover:bg-slate-50 ${
                          isSelected ? "bg-slate-100 ring-2 ring-emerald-300" :
                          isCompleted ? "bg-slate-100" :
                          isCurrent ? "bg-emerald-50" :
                          "bg-white"
                        }`}>
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          isCompleted ? "bg-emerald-500 text-white" :
                          isCurrent ? "bg-emerald-400 text-white" :
                          "bg-slate-200 text-slate-500"
                        }`}>
                          {isCompleted ? <Check className="h-3.5 w-3.5" /> : item.code}
                        </div>
                        <span className="line-clamp-2 text-center text-[11px] leading-tight text-slate-900">{shortStageName(item.name)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {milestones.length > 0 && (
                <div className="border-t border-dashed border-amber-300 pt-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-orange-700">
                    <Landmark className="h-4 w-4" /> Authority Track (Runs In Parallel — Not A Stage)
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {milestones.map((m, i) => (
                      <div key={i} className={`rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        m.status === "approved" ? "bg-emerald-50 border-emerald-200" :
                        m.status === "under-review" || m.status === "submitted" ? "bg-blue-50 border-blue-200 ring-1 ring-blue-100" :
                        m.status === "comments-received" ? "bg-orange-50 border-orange-200" :
                        "bg-slate-50 border-slate-200"
                      }`}>
                        <div className="mb-2.5 flex items-start gap-2.5">
                          <Landmark className={`mt-0.5 h-5 w-5 shrink-0 ${
                            m.status === "approved" ? "text-emerald-600" :
                            m.status === "under-review" || m.status === "submitted" ? "text-blue-600" :
                            "text-slate-400"
                          }`} />
                          <span className="text-base font-medium leading-snug text-slate-900">{m.name}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                          <Badge className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                            m.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                            m.status === "under-review" ? "bg-blue-100 text-blue-700" :
                            m.status === "submitted" ? "bg-amber-100 text-amber-700" :
                            m.status === "comments-received" ? "bg-orange-100 text-orange-700" :
                            "bg-slate-200 text-slate-600"
                          }`}>{statusLabel(m.status)}</Badge>
                          <span className="text-muted-foreground">Triggered by <strong>{m.triggeredBy}</strong></span>
                          <span className="text-muted-foreground">Runs with <strong>{m.runsParallelWith}</strong></span>
                        </div>
                        {m.submittedDate && <p className="mt-2 text-xs text-slate-500">Submitted: {m.submittedDate}{m.approvedDate ? ` -> Approved: ${m.approvedDate}` : ""}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {stages.map((stage, i) => (
                <button key={i} onClick={() => setSelectedStage(i)}
                  className={`shrink-0 flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
                    i === selectedStage ? "bg-orange-100 ring-2 ring-orange-400" :
                    i < project.currentSubStage ? "bg-gray-100" :
                    i === project.currentSubStage ? "bg-orange-50" :
                    "bg-white"
                  }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < project.currentSubStage ? "bg-orange-500 text-white" :
                    i === project.currentSubStage ? "bg-orange-400 text-white" :
                    "bg-gray-200 text-gray-500"
                  }`}>
                    {i < project.currentSubStage ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className="text-[9px] text-center max-w-[60px] leading-tight">{(stage as any).name.length > 12 ? (stage as any).name.substring(0, 12) + "…" : (stage as any).name}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={`rounded-[22px] border-2 bg-white shadow-sm ${
        selectedIsGate ? "border-amber-300" : isPostContract ? "border-orange-200" : "border-emerald-200"
      }`}>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2.5 text-lg leading-tight text-slate-900">
              {selectedIsGate ? <Star className="h-5 w-5 fill-amber-400 text-amber-400" /> : <Layers className="h-5 w-5 text-emerald-600" />}
              {isDesignGateFlow ? `${selectedPreContract?.code}: ${selectedPreContract?.name}` : `Stage ${selectedStage + 1}: ${(stages[selectedStage] as any).name}`}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                selectedStage < project.currentSubStage ? "bg-emerald-100 text-emerald-700" :
                canRecordClientGate ? "bg-blue-100 text-blue-700" :
                selectedStage === project.currentSubStage ? (selectedIsGate ? "bg-amber-100 text-orange-700" : "bg-emerald-100 text-emerald-700") :
                "bg-slate-100 text-slate-600"
              }`}>
                {selectedStage < project.currentSubStage ? "Completed" : canRecordClientGate ? "Ready for Client Approval" : selectedStage === project.currentSubStage ? "In Progress" : "Upcoming"}
              </Badge>
              <span className="font-mono text-sm text-slate-500">
                {isDesignGateFlow ? selectedPreContract?.duration : (stages[selectedStage] as any).duration}
              </span>
            </div>
          </div>

          {selectedIsGate ? (
            <div>
              <h4 className="mb-3 text-base font-semibold text-orange-800">Gate Requirements</h4>
              <div className="space-y-2.5">
                {selectedPreContract.deliverables.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50/45 px-4 py-3">
                    {selectedStage < project.currentSubStage ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <Star className="h-5 w-5 shrink-0 text-amber-400" />
                    )}
                    <span className="text-sm leading-tight text-slate-900">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm italic text-orange-700">Client must provide written approval within the stated window before the next stage can begin.</p>
              <Separator className="my-5" />
              {canRecordClientGate ? (
                <Button className="gap-2 rounded-lg bg-orange-600 hover:bg-orange-700" onClick={recordClientApproval}>
                  <CheckCircle2 className="h-4 w-4" /> Record Client Email Approval & Advance
                </Button>
              ) : !readOnly && sourceStage && gateApproval?.status !== "approved" ? (
                <div className="space-y-4">
                  <p className="text-sm text-orange-700">
                    {isDirector
                      ? `Director can approve the internal ${sourceStage.code} gate below. After that, record the client's written/email approval for ${selectedPreContract.code}.`
                      : `Internal approval for ${sourceStage.code} must be completed before ${selectedPreContract.code} client approval can be recorded.`}
                  </p>
                  <StageGateApprovalCard
                    projectId={project.id}
                    stageCode={sourceStage.code}
                    stageName={sourceStage.name}
                    projectStage={effectiveStage}
                    onAllApproved={() => {
                      const nextProject: ProjectData = {
                        ...project,
                        currentSubStage: selectedStage,
                        progress: Math.max(project.progress ?? 0, currentStageProgress(selectedStage, preContractStages.length)),
                      };
                      onProjectChange(nextProject);
                      setSelectedStage(selectedStage);
                      if (BACKEND_UUID_RE.test(project.id)) {
                        projectsStore.put(nextProject as any);
                      }
                      toast.success(`All 3 approved — ${selectedPreContract.code} is ready for client approval`);
                    }}
                  />
                </div>
              ) : null}
              {gateApproval?.status === "approved" && (
                <p className="mt-4 text-sm text-emerald-700">Internal gate approval is recorded in the backend.</p>
              )}
            </div>
          ) : (
            <div>
              <h4 className="mb-3 text-base font-semibold text-slate-900">{isPostContract ? "Key Activities" : "Deliverables"}</h4>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {((!isDesignGateFlow ? (stages[selectedStage] as any).activities : selectedPreContract?.deliverables) || []).map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                    {selectedStage < project.currentSubStage ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <div className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />
                    )}
                    <span className="text-sm text-slate-900">{item}</span>
                  </div>
                ))}
              </div>
              {!readOnly && isDesignGateFlow && selectedPreContract && selectedPreContract.type === "stage" && selectedStage === project.currentSubStage && (
                <div className="mt-6">
                  <StageGateApprovalCard
                    projectId={project.id}
                    stageCode={selectedPreContract.code}
                    stageName={selectedPreContract.name}
                    projectStage={effectiveStage}
                    onAllApproved={() => {
                      const gateIdx = Math.min(selectedStage + 1, preContractStages.length - 1);
                      const nextProject: ProjectData = {
                        ...project,
                        currentSubStage: gateIdx,
                        progress: Math.max(project.progress ?? 0, currentStageProgress(gateIdx, preContractStages.length)),
                      };
                      onProjectChange(nextProject);
                      setSelectedStage(gateIdx);
                      if (BACKEND_UUID_RE.test(project.id)) {
                        projectsStore.put(nextProject as any);
                      }
                      toast.success(`All 3 approved — ${preContractStages[gateIdx]?.code} is ready for client approval`);
                    }}
                  />
                </div>
              )}
              {!readOnly && selectedStage === project.currentSubStage && (
                <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6">
                  <Button variant="outline" className="gap-2" onClick={() => toast.info(isDesignGateFlow ? "Gate review requires Design Director sign-off" : "Gate review requires Design Manager sign-off")}>
                    <Eye className="h-4 w-4" /> Request Gate Review
                  </Button>
                  <Button className={`gap-2 ${isPostContract ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                    onClick={completeCurrentStage}>
                    <ArrowRightCircle className="h-4 w-4" /> Complete & Advance
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stage transition: Pre-Contract → Post-Contract */}
      {!readOnly && isDesignGateFlow && project.currentSubStage >= preContractStages.length - 1 && (project.progress ?? 0) >= 100 && (
        <Card className="border-2 border-orange-400 bg-orange-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-orange-800">S8 Complete — Ready for Construction Supervision</p>
              <p className="text-sm text-orange-600">All Pre-Contract stages and gates complete. Move this project to Post-Contract.</p>
            </div>
            <Button className="bg-orange-600 hover:bg-orange-700 gap-2" onClick={moveToPostContract}>
              <ArrowRightCircle className="w-4 h-4" /> Move to Post-Contract
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stage transition: Post-Contract → Completed */}
      {!readOnly && isPostContract && project.currentSubStage >= 12 && (
        <Card className="border-2 border-emerald-400 bg-emerald-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-emerald-800">Final Account Complete</p>
              <p className="text-sm text-emerald-600">All sub-stages are done. Ready to archive this project.</p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={moveToCompleted}>
              <CheckCircle2 className="w-4 h-4" /> Move to Completed
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===== TAB: DELIVERABLES (Pre-Contract only) =====
const _DELIVERABLE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function DeliverablesTab({ projectId }: { projectId: string }) {
  const storedDeliverables = _useStoreCollection(designDeliverablesStore);
  const users = _useStoreCollection(usersStore);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<{ name: string; stageCode: string; assignee: string; dueDate: string; status: "pending" | "in-progress" | "complete" }>({
    name: "", stageCode: "S1", assignee: "", dueDate: "", status: "pending",
  });
  const seededRef = useRef(false);

  const deliverables = useMemo(() =>
    storedDeliverables
      .filter((d) => d.projectId === projectId)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.dueDate || "").localeCompare(b.dueDate || "")),
    [projectId, storedDeliverables],
  );

  // Auto-seed all stage deliverables for a real (UUID) project on first open
  useEffect(() => {
    if (seededRef.current || !_DELIVERABLE_UUID_RE.test(projectId)) return;
    if (deliverables.length > 0) { seededRef.current = true; return; }
    seededRef.current = true;
    let order = 1;
    for (const stage of preContractStages.filter(s => s.type === "stage")) {
      for (const name of stage.deliverables) {
        designDeliverablesStore.put({
          id: crypto.randomUUID(),
          projectId,
          name,
          status: "pending",
          assignee: "",
          dueDate: "",
          stageCode: stage.code,
          order: order++,
        });
      }
    }
  }, [projectId, deliverables.length]);

  const complete = deliverables.filter(d => d.status === "complete").length;
  const inProgress = deliverables.filter(d => d.status === "in-progress").length;
  const pending = deliverables.filter(d => d.status === "pending").length;

  function cycleStatus(d: typeof deliverables[0]) {
    const next = d.status === "pending" ? "in-progress" : d.status === "in-progress" ? "complete" : "pending";
    designDeliverablesStore.put({ ...d, status: next });
  }

  function saveDeliverable() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    designDeliverablesStore.put({
      id: crypto.randomUUID(),
      projectId,
      name: form.name.trim(),
      stageCode: form.stageCode,
      assignee: form.assignee,
      dueDate: form.dueDate,
      status: form.status,
      order: deliverables.length + 1,
    });
    setForm({ name: "", stageCode: "S1", assignee: "", dueDate: "", status: "pending" });
    setShowAdd(false);
    toast.success("Deliverable added");
  }

  const stageOptions = preContractStages.filter(s => s.type === "stage");
  const activeUsers = users.filter(u => (u as any).active !== false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Design Deliverables</h2>
        <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAdd(true)}>
          <Plus className="w-3 h-3" /> Add Deliverable
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-emerald-200 p-4 text-center">
          <p className="text-2xl font-bold font-data text-emerald-600">{complete}</p>
          <p className="text-xs text-muted-foreground">Complete</p>
        </Card>
        <Card className="border border-amber-200 p-4 text-center">
          <p className="text-2xl font-bold font-data text-amber-600">{inProgress}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </Card>
        <Card className="border border-border p-4 text-center">
          <p className="text-2xl font-bold font-data text-gray-500">{pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </Card>
      </div>

      {/* Deliverables list */}
      {deliverables.length === 0 ? (
        <Card className="border border-dashed border-slate-300 bg-slate-50/60">
          <CardContent className="p-8 text-center text-sm text-slate-500">
            No deliverables yet. Click "Add Deliverable" to get started.
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">STATUS</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">DELIVERABLE</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">STAGE</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">ASSIGNEE</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">DUE DATE</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="p-3">
                      <button onClick={() => cycleStatus(d)} title="Click to cycle status" className="flex items-center gap-1.5 text-xs">
                        {d.status === "complete" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                         d.status === "in-progress" ? <Clock className="w-4 h-4 text-amber-500" /> :
                         <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                        <span className={d.status === "complete" ? "text-emerald-600" : d.status === "in-progress" ? "text-amber-600" : "text-slate-400"}>
                          {d.status === "complete" ? "Done" : d.status === "in-progress" ? "Active" : "Pending"}
                        </span>
                      </button>
                    </td>
                    <td className="p-3 font-medium">{d.name}</td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px]">{d.stageCode || "—"}</Badge></td>
                    <td className="p-3 text-muted-foreground">{d.assignee || "—"}</td>
                    <td className="p-3 font-data text-muted-foreground">{d.dueDate || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add Deliverable dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Deliverable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <FieldLabel>Name *</FieldLabel>
              <Input
                placeholder="e.g. Authority concept submission package"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && saveDeliverable()}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel>Stage</FieldLabel>
                <Select value={form.stageCode} onValueChange={v => setForm(f => ({ ...f, stageCode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stageOptions.map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Status</FieldLabel>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel>Assignee</FieldLabel>
                <Select value={form.assignee || "__none__"} onValueChange={v => setForm(f => ({ ...f, assignee: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {activeUsers.map(u => (
                      <SelectItem key={u.id} value={(u as any).displayName}>{(u as any).displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Due Date</FieldLabel>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={saveDeliverable} className="bg-emerald-600 hover:bg-emerald-700">Add Deliverable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== TAB: DOCUMENT LOGS (21 types — Post-Contract only) =====
function DocLogsTab() {
  const [selectedType, setSelectedType] = useState("RFI");
  const entries = demoDocLogs[selectedType] || [];
  const typeInfo = documentTypes.find(d => d.code === selectedType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Document Logs</h2>
        <Button size="sm" className="gap-1"><Plus className="w-3 h-3" /> New {selectedType}</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {documentTypes.map((dt) => {
          const count = (demoDocLogs[dt.code] || []).length;
          const hasEntries = count > 0;
          return (
            <button key={dt.code} onClick={() => setSelectedType(dt.code)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedType === dt.code ? "bg-orange-600 text-white" :
                hasEntries ? "bg-orange-50 text-orange-700 hover:bg-orange-100" :
                "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}>
              {dt.code}{hasEntries && <span className="ml-1 text-[10px]">({count})</span>}
            </button>
          );
        })}
      </div>
      {typeInfo && (
        <div className="flex items-center gap-4 p-3 bg-secondary/30 rounded-lg text-xs">
          <span className="font-medium">{typeInfo.name}</span>
          <span className="text-muted-foreground">Direction: {typeInfo.direction}</span>
          {typeInfo.sla > 0 && <span className="text-orange-600 font-medium">SLA: {typeInfo.sla} days</span>}
          <span className="ml-auto text-muted-foreground">Auto-numbered: {selectedType}-MHT-XXX</span>
        </div>
      )}
      {entries.length > 0 ? (
        <Card className="border border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">REF NO.</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">TITLE</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">DATE</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">FROM</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">TO</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">SLA</th>
                    <th className="text-center p-3 text-xs font-semibold text-muted-foreground">STATUS</th>
                    <th className="text-center p-3 text-xs font-semibold text-muted-foreground">DAYS</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.ref} className="border-b border-border last:border-0 hover:bg-accent/30 cursor-pointer">
                      <td className="p-3 font-data font-medium text-orange-700">{entry.ref}</td>
                      <td className="p-3 max-w-[200px] truncate">{entry.title}</td>
                      <td className="p-3 font-data text-muted-foreground">{entry.dateRaised}</td>
                      <td className="p-3 text-xs">{entry.from}</td>
                      <td className="p-3 text-xs">{entry.to}</td>
                      <td className="p-3 font-data text-xs">{entry.slaDeadline}</td>
                      <td className="p-3 text-center"><Badge className={`text-[10px] ${docStatusColors[entry.status] || "bg-gray-100 text-gray-600"}`}>{entry.status}</Badge></td>
                      <td className="p-3 text-center font-data"><span className={entry.daysOpen > 7 ? "text-red-600 font-bold" : ""}>{entry.daysOpen}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border p-8 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No {typeInfo?.name} entries yet.</p>
          <Button size="sm" className="mt-3 gap-1"><Plus className="w-3 h-3" /> Create First {selectedType}</Button>
        </Card>
      )}
      {entries.length > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => toast.success(`${selectedType} register exported as PDF`)}><FileText className="w-3 h-3" /> Export PDF Register</Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => toast.success("Template downloaded")}><Upload className="w-3 h-3" /> Download Template</Button>
        </div>
      )}
    </div>
  );
}

// ===== TAB: TEAM (imported from @/components/TeamTabContent) =====

// ===== TAB: TASKS =====
function TasksTab({ projectId, isPostContract }: { projectId: string; isPostContract: boolean }) {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const allTasks = _useStoreCollection(tasksStore);
  const directory = _useStoreCollection(userDirectoryStore);
  const tasks = allTasks.filter((t) => t.projectId === projectId);

  const [addOpen, setAddOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftAssignee, setDraftAssignee] = useState<string>("");
  const [draftPriority, setDraftPriority] = useState<string>("medium");
  const [draftDue, setDraftDue] = useState<string>("");

  const accent = isPostContract ? "orange" : "emerald";
  const userName = (id?: string | null) => directory.find((u) => u.id === id)?.displayName || "";
  const assigneeNames = (t: any) => {
    const ids: string[] = (t.assigneeUserIds && t.assigneeUserIds.length ? t.assigneeUserIds : (t.assigneeUserId ? [t.assigneeUserId] : []));
    const names = ids.map(userName).filter(Boolean);
    return names.length ? names.join(", ") : "Unassigned";
  };

  function createTask() {
    if (!draftTitle.trim()) { toast.error("Task title is required"); return; }
    const now = new Date().toISOString();
    tasksStore.put({
      id: newId("t"),
      title: draftTitle.trim(),
      description: draftDesc.trim() || undefined,
      status: "todo",
      priority: draftPriority as any,
      category: "other",
      projectId,
      assigneeUserIds: draftAssignee ? [draftAssignee] : [],
      reporterUserId: currentUser?.id,
      dueDate: draftDue || undefined,
      createdAt: now,
      updatedAt: now,
    } as any);
    toast.success("Task created" + (draftAssignee ? ` — assigned to ${userName(draftAssignee)}` : ""));
    setAddOpen(false);
    setDraftTitle(""); setDraftDesc(""); setDraftAssignee(""); setDraftPriority("medium"); setDraftDue("");
  }

  function setStatus(t: any, status: string) {
    tasksStore.put({ ...t, status, completedAt: status === "done" ? new Date().toISOString() : undefined, updatedAt: new Date().toISOString() });
  }
  function removeTask(t: any) {
    if (!confirm(`Delete task "${t.title}"?`)) return;
    tasksStore.remove(t.id);
    toast.success("Task deleted");
  }

  const columns = [
    { id: "todo", label: "To Do", color: "border-gray-300" },
    { id: "in-progress", label: "In Progress", color: isPostContract ? "border-orange-400" : "border-emerald-400" },
    { id: "blocked", label: "Blocked", color: "border-red-400" },
    { id: "done", label: "Done", color: "border-emerald-500" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Tasks</h2>
          <p className="text-xs text-muted-foreground">{tasks.length} task{tasks.length === 1 ? "" : "s"} on this project — synced with My Tasks and the Tasks module.</p>
        </div>
        <Button size="sm" className={`gap-1 ${isPostContract ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700"}`} onClick={() => setAddOpen(true)}>
          <Plus className="w-3 h-3" /> Quick Add
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTasks = tasks
            .filter((t) => t.status === col.id)
            .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
          return (
            <div key={col.id} className={`w-60 shrink-0 border-t-2 ${col.color} bg-secondary/20 rounded-lg p-2`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold">{col.label}</span>
                <Badge variant="outline" className="text-[10px] h-5">{colTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {colTasks.length === 0 && <p className="px-1 py-2 text-[11px] text-muted-foreground">No tasks.</p>}
                {colTasks.map((task: any) => (
                  <div key={task.id} className="bg-card border border-border rounded-md p-2.5 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-1">
                      <button className="text-left text-xs font-medium leading-tight mb-1.5 hover:underline" onClick={() => navigate(`/tasks/${task.id}`)}>
                        {task.title}
                      </button>
                      <button className="text-slate-400 hover:text-red-500" title="Delete task" onClick={() => removeTask(task)}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[110px]" title={assigneeNames(task)}>{assigneeNames(task)}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        task.priority === "urgent" ? "bg-red-100 text-red-700" :
                        task.priority === "high" ? "bg-amber-100 text-amber-700" :
                        task.priority === "low" ? "bg-slate-100 text-slate-600" :
                        "bg-blue-100 text-blue-700"
                      }`}>{task.priority}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 gap-1">
                      <span className="text-[10px] text-muted-foreground font-data">{task.dueDate || "no due date"}</span>
                      <select
                        className="h-5 rounded border border-border bg-background px-1 text-[9px] text-muted-foreground"
                        value={task.status}
                        onChange={(e) => setStatus(task, e.target.value)}
                        title="Move task"
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Quick Add Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Task title…" autoFocus value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
            <Input placeholder="Description (optional)" value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={draftAssignee} onValueChange={setDraftAssignee}>
                <SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger>
                <SelectContent>
                  {directory.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={draftPriority} onValueChange={setDraftPriority}>
                <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input type="date" value={draftDue} onChange={(e) => setDraftDue(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={createTask}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== TAB: DRAWINGS =====
function DrawingsTab({ isPostContract, projectId }: { isPostContract: boolean; projectId: string }) {
  const actor = useCurrentActor();
  const stored = _useStoreCollection(drawingsStore)
    .filter((d: any) => d.projectId === projectId)
    .map((d: any) => ({ no: d.drawingNumber, title: d.title, discipline: (DISCIPLINE_LABELS_DCC as Record<string, string>)[d.discipline] || d.discipline, rev: d.currentRev, status: d.currentStatus }));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ discipline: "AR", currentRev: "P01", currentStatus: "WIP" });
  function save() {
    if (!draft.drawingNumber?.trim() || !draft.title?.trim()) { toast.error("Drawing number and title are required"); return; }
    const now = new Date().toISOString();
    drawingsStore.put({
      id: newId("dwg"), projectId, drawingNumber: draft.drawingNumber.trim(), title: draft.title.trim(),
      discipline: draft.discipline || "AR", currentRev: draft.currentRev || "P01", currentStatus: draft.currentStatus || "WIP",
      preparedByDisplay: actor, isActive: true, createdAt: now, updatedAt: now,
    } as any);
    toast.success(isPostContract ? "Drawing issued" : "Drawing uploaded"); setOpen(false);
    setDraft({ discipline: "AR", currentRev: "P01", currentStatus: "WIP" });
  }
  const demo = isPostContract ? [
    { no: "AR-MHT-001", title: "Ground Floor Plan", discipline: "Architecture", rev: "C01", status: "IFC" },
    { no: "AR-MHT-002", title: "Typical Floor Plan (L5-L20)", discipline: "Architecture", rev: "C01", status: "IFC" },
    { no: "ST-MHT-001", title: "Foundation Layout", discipline: "Structural", rev: "C02", status: "IFC" },
    { no: "ST-MHT-002", title: "Pile Cap Details", discipline: "Structural", rev: "C01", status: "IFC" },
    { no: "ME-MHT-001", title: "HVAC Layout - Basement", discipline: "MEP", rev: "C01", status: "IFC" },
    { no: "ME-MHT-002", title: "Electrical SLD", discipline: "MEP", rev: "C01", status: "IFC" },
  ] : [
    { no: "AR-AWT-001", title: "Site Plan & Context", discipline: "Architecture", rev: "P03", status: "For Approval" },
    { no: "AR-AWT-002", title: "Ground Floor Plan", discipline: "Architecture", rev: "P02", status: "For Approval" },
    { no: "AR-AWT-003", title: "Typical Floor Plan", discipline: "Architecture", rev: "P02", status: "Draft" },
    { no: "AR-AWT-004", title: "Elevations (4 sides)", discipline: "Architecture", rev: "P01", status: "Draft" },
    { no: "AR-AWT-005", title: "Sections (2 cross)", discipline: "Architecture", rev: "P01", status: "Draft" },
    { no: "AR-AWT-006", title: "3D Massing Views", discipline: "Architecture", rev: "P03", status: "Approved" },
    { no: "ST-AWT-001", title: "Structural Concept Diagram", discipline: "Structural", rev: "P01", status: "For Review" },
    { no: "ME-AWT-001", title: "MEP Concept Schematic", discipline: "MEP", rev: "P01", status: "For Review" },
  ];

  // Show real stored drawings for this project; fall back to the sample list
  // only when none exist yet, so the page is never blank.
  const drawings = stored.length ? stored : demo;

  const statusColors: Record<string, string> = {
    "IFC": "bg-emerald-100 text-emerald-700",
    "For Approval": "bg-amber-100 text-amber-700",
    "Draft": "bg-gray-100 text-gray-600",
    "Approved": "bg-emerald-100 text-emerald-700",
    "For Review": "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{isPostContract ? "IFC Drawings" : "Design Drawings"}</h2>
        <Button size="sm" className="gap-1" onClick={() => { setDraft({ discipline: "AR", currentRev: "P01", currentStatus: "WIP" }); setOpen(true); }}><Upload className="w-3 h-3" /> {isPostContract ? "Issue Drawing" : "Upload Drawing"}</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isPostContract ? "Issue drawing" : "Upload drawing"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><FieldLabel className="text-xs">Drawing no. *</FieldLabel><Input value={draft.drawingNumber || ""} onChange={(e) => setDraft({ ...draft, drawingNumber: e.target.value })} placeholder="AR-AWT-100" className="mt-1" /></div>
              <div><FieldLabel className="text-xs">Discipline</FieldLabel>
                <Select value={draft.discipline} onValueChange={(v) => setDraft({ ...draft, discipline: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(DISCIPLINE_LABELS_DCC).map(([k, l]) => <SelectItem key={k} value={k}>{l as string}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><FieldLabel className="text-xs">Title *</FieldLabel><Input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ground Floor Plan" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><FieldLabel className="text-xs">Rev</FieldLabel><Input value={draft.currentRev || ""} onChange={(e) => setDraft({ ...draft, currentRev: e.target.value })} className="mt-1" /></div>
              <div><FieldLabel className="text-xs">Status</FieldLabel>
                <Select value={draft.currentStatus} onValueChange={(v) => setDraft({ ...draft, currentStatus: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{["WIP","S0","P01","P02","P03","C01","C02","AB"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{isPostContract ? "Issue" : "Upload"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="border border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">NO.</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">TITLE</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">DISCIPLINE</th>
                <th className="text-center p-3 text-xs font-semibold text-muted-foreground">REV</th>
                <th className="text-center p-3 text-xs font-semibold text-muted-foreground">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {drawings.map((d) => (
                <tr key={d.no} className="border-b border-border last:border-0 hover:bg-accent/30">
                  <td className="p-3 font-data font-medium text-primary">{d.no}</td>
                  <td className="p-3">{d.title}</td>
                  <td className="p-3 text-muted-foreground">{d.discipline}</td>
                  <td className="p-3 text-center font-data">{d.rev}</td>
                  <td className="p-3 text-center"><Badge className={`text-[10px] ${statusColors[d.status] || "bg-gray-100 text-gray-600"}`}>{d.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== TAB: AUTHORITY =====
function AuthorityTab({ isPreContract }: { isPreContract: boolean }) {
  const submissions = isPreContract ? [
    { authority: "Dubai Municipality", type: "Concept Approval", no: "DM-2026-CON-4521", date: "2026-05-10", status: "Under Review" },
    { authority: "Civil Defence", type: "Concept NOC", no: "DCD-2026-CON-1123", date: "2026-05-12", status: "Pending" },
    { authority: "DEWA", type: "Load Letter Application", no: "DEWA-2026-LL-8890", date: "2026-04-28", status: "Approved" },
    { authority: "RTA", type: "Traffic Impact Assessment", no: "RTA-2026-TIA-3345", date: "2026-04-15", status: "Approved" },
  ] : [
    { authority: "Dubai Municipality", type: "Building Permit", no: "DM-2026-4521", date: "2026-04-20", status: "Approved" },
    { authority: "Civil Defence", type: "Fire & Life Safety NOC", no: "DCD-2026-1123", date: "2026-04-15", status: "Approved" },
    { authority: "DEWA", type: "Electrical Load Letter", no: "DEWA-2026-8890", date: "2026-03-28", status: "Approved" },
    { authority: "RTA", type: "Traffic Impact Study", no: "RTA-2026-3345", date: "2026-04-10", status: "Approved" },
    { authority: "Trakheesi", type: "Advertising Permit", no: "TRK-2026-0091", date: "2026-05-01", status: "Under Review" },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Authority Submissions</h2>
      <Card className="border border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">AUTHORITY</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">TYPE</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">NO.</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">DATE</th>
                <th className="text-center p-3 text-xs font-semibold text-muted-foreground">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-accent/30">
                  <td className="p-3 font-medium">{s.authority}</td>
                  <td className="p-3 text-muted-foreground">{s.type}</td>
                  <td className="p-3 font-data">{s.no}</td>
                  <td className="p-3 font-data">{s.date}</td>
                  <td className="p-3 text-center"><Badge className={`text-[10px] ${s.status === "Approved" ? "bg-emerald-100 text-emerald-700" : s.status === "Under Review" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== TAB: FINANCIALS =====
function FinancialsTab({ project, isPreContract }: { project: ProjectData; isPreContract: boolean }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Financials</h2>
      <BudgetControlCard projectId={project.id} />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border border-border p-4"><p className="text-xs text-muted-foreground">{isPreContract ? "Design Fee" : "Contract Value"}</p><p className="text-xl font-bold font-data">AED {project.contractValue.toLocaleString()}</p></Card>
        <Card className="border border-border p-4"><p className="text-xs text-muted-foreground">Invoiced to Date</p><p className="text-xl font-bold font-data">AED {Math.round(project.contractValue * project.budgetConsumed / 100).toLocaleString()}</p><p className="text-xs text-muted-foreground">{project.budgetConsumed}% of fee</p></Card>
        {isPreContract ? (
          <Card className="border border-border p-4"><p className="text-xs text-muted-foreground">Hours Budget</p><p className="text-xl font-bold font-data">{project.hoursLogged.toLocaleString()} / {project.hoursPlanned.toLocaleString()}</p><p className="text-xs text-emerald-600">{Math.round(project.hoursLogged / project.hoursPlanned * 100)}% consumed</p></Card>
        ) : (
          <Card className="border border-border p-4"><p className="text-xs text-muted-foreground">Variation Orders</p><p className="text-xl font-bold font-data">AED 120,000</p><p className="text-xs text-orange-600">1 approved VO</p></Card>
        )}
      </div>
      <Card className="border border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">{isPreContract ? "Fee Instalments" : "Payment Certificates"}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div><p className="text-sm font-medium">{isPreContract ? "Instalment #1 — Concept Approval" : "IPC #1"}</p><p className="text-xs text-muted-foreground">{isPreContract ? "Upon concept sign-off" : "March 2026"}</p></div>
              <div className="text-right"><p className="font-data font-bold">AED {Math.round(project.contractValue * 0.2).toLocaleString()}</p><Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{isPreContract ? "Invoiced" : "Certified"}</Badge></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== TAB: TIME (live attendance) =====
function TimeTab({ projectId }: { projectId: string }) {
  return <ProjectTimeTabLive projectId={projectId} />;
}

// ===== TAB: MEETINGS =====
function MeetingsTab({ projectId }: { projectId: string }) {
  const actor = useCurrentActor();
  const meetings = _useStoreCollection(projectMeetingsStore)
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({});
  function save() {
    if (!draft.title?.trim()) { toast.error("Meeting title is required"); return; }
    const now = new Date().toISOString();
    projectMeetingsStore.put({
      id: newId("mtg"), projectId, date: draft.date || now.slice(0, 10),
      title: draft.title.trim(), attendees: draft.attendees || actor, notes: draft.notes,
      status: "MOM issued", createdAt: now,
    });
    toast.success("Meeting added"); setOpen(false); setDraft({});
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Meetings & Notes</h2>
        <Button size="sm" className="gap-1" onClick={() => { setDraft({}); setOpen(true); }}><Plus className="w-3 h-3" /> New Meeting</Button>
      </div>
      <div className="space-y-3">
        {meetings.map((m) => (
          <Card key={m.id} className="border border-border hover:shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div><h3 className="text-sm font-semibold">{m.title}</h3><p className="text-xs text-muted-foreground mt-1">{m.date} · {m.attendees}</p>{m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}</div>
              <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
            </CardContent>
          </Card>
        ))}
        {meetings.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No meetings yet. Click "New Meeting" to add one.</p>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New meeting</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><FieldLabel className="text-xs">Title *</FieldLabel><Input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Weekly Design Coordination #1" className="mt-1" /></div>
            <div><FieldLabel className="text-xs">Date</FieldLabel><Input type="date" value={draft.date || ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1" /></div>
            <div><FieldLabel className="text-xs">Attendees</FieldLabel><Input value={draft.attendees || ""} onChange={(e) => setDraft({ ...draft, attendees: e.target.value })} placeholder="Names, comma separated" className="mt-1" /></div>
            <div><FieldLabel className="text-xs">Notes / MOM</FieldLabel><Input value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Add meeting</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== TAB: RISKS (now in components/projects/RisksTab.tsx) =====

// ===== TAB: CLIENT PORTAL =====
// UI preserved exactly; functionality (real data, invite, actions, status) lives
// in ClientPortalTab so the giant ProjectDetail file stays manageable.
function PortalTab({ project }: { project: ProjectData }) {
  return <ClientPortalTab project={{ id: project.id, client: project.client }} />;
}


// ===== Live attendance / labor cost components for ProjectDetail =====
import { employeesStore as _empStore, punchesStore as _puStore, leavesStore as _lvStore } from "@/lib/stores";
import { useCollection as _useCollection } from "@/lib/store";
import { aggregateDays as _aggregateDays } from "@/lib/attendance/utils";
import { projectLaborCosts as _projectLaborCosts } from "@/lib/payroll/utils";
import { grossSalary as _grossSalary } from "@/lib/hr/types";

function ProjectTimeTabLive({ projectId }: { projectId: string }) {
  const employees = _useCollection(_empStore);
  const punches = _useCollection(_puStore);
  const leaves = _useCollection(_lvStore);
  const today = new Date();
  const year = today.getUTCFullYear();
  const m0 = today.getUTCMonth();
  const fromDate = `${year}-${String(m0 + 1).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, m0 + 1, 0));
  const toDate = last.toISOString().slice(0, 10);
  const days = _aggregateDays({ punches, employeeIds: employees.map((e) => e.id), fromDate, toDate, leaves });
  const myDays = days.filter((d) => d.projectId === projectId);
  const monthHours = myDays.reduce((a, d) => a + d.normalMinutes + d.overtimeMinutes, 0) / 60;
  const monthOT = myDays.reduce((a, d) => a + d.overtimeMinutes, 0) / 60;
  const distinctEmps = new Set(myDays.map((d) => d.employeeId));
  // This week
  const weekStart = new Date(); weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const weekHours = myDays.filter((d) => new Date(d.date) >= weekStart).reduce((a, d) => a + d.normalMinutes + d.overtimeMinutes, 0) / 60;
  // Top contributors
  const contrib = new Map<string, number>();
  for (const d of myDays) contrib.set(d.employeeId, (contrib.get(d.employeeId) || 0) + (d.normalMinutes + d.overtimeMinutes) / 60);
  const top = Array.from(contrib.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxH = Math.max(1, ...Array.from(contrib.values()));
  const costs = _projectLaborCosts({ employees, days, year, monthIndex0: m0 });
  const myCost = costs.find((c) => c.projectId === projectId);
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Time & Effort · live from geofence punches</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border p-4"><p className="text-xs text-muted-foreground">This Week</p><p className="text-2xl font-bold font-data">{weekHours.toFixed(0)}h</p></Card>
        <Card className="border border-border p-4"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold font-data">{monthHours.toFixed(0)}h</p><p className="text-[10px] text-muted-foreground">{monthOT.toFixed(0)}h overtime</p></Card>
        <Card className="border border-border p-4"><p className="text-xs text-muted-foreground">Distinct staff on site</p><p className="text-2xl font-bold font-data">{distinctEmps.size}</p></Card>
        <Card className="border border-border p-4"><p className="text-xs text-muted-foreground">Labor cost (mo.)</p><p className="text-2xl font-bold font-data">AED {(myCost?.totalLaborCostAED || 0).toLocaleString()}</p></Card>
      </div>
      <Card className="border border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Top Contributors (this month)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {top.map(([empId, hrs], i) => {
              const e = employees.find((x) => x.id === empId);
              if (!e) return null;
              return (
                <div key={empId} className="flex items-center gap-3">
                  <span className="text-xs font-data text-muted-foreground w-4">{i + 1}</span>
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">{e.firstName[0]}{e.lastName[0]}</AvatarFallback></Avatar>
                  <span className="text-sm flex-1">{e.firstName} {e.lastName}<span className="text-xs text-slate-500 ml-2">{e.jobTitle}</span></span>
                  <div className="w-32 h-2 bg-secondary rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(hrs / maxH) * 100}%` }} /></div>
                  <span className="text-xs font-data w-12 text-right tabular-nums">{hrs.toFixed(0)}h</span>
                </div>
              );
            })}
            {top.length === 0 && <p className="text-xs text-slate-500">No site time recorded for this project this month.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
