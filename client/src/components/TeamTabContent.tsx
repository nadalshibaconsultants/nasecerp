/**
 * TeamTab — Project Role Structure with 3 groups:
 * 1. Core Roles (auto-assigned based on workload/grade/availability)
 * 2. Support Roles (manually assigned by PM)
 * 3. Junior Staff (delegated by Lead of each discipline)
 * 
 * DELEGATE MODE: When activated, shows a Lead-specific view where the Lead
 * can assign junior staff from their discipline with a filtered candidate
 * picker, workload visualization, and confirmation flow.
 */
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/backend/api";
import { useCollection } from "@/lib/store";
import { usersStore } from "@/lib/stores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus,
  Users,
  UserCheck,
  UserPlus,
  Zap,
  Shield,
  ChevronDown,
  ChevronRight,
  Phone,
  Star,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

// ===== EMPLOYEE POOL (shared with HR module) =====
type Employee = {
  id: string;
  name: string;
  nameAr: string;
  avatar: string;
  department: string;
  grade: "Senior" | "Mid" | "Junior" | "Lead" | "Director";
  title: string;
  workload: number;
  activeProjects: number;
  maxProjects: number;
  skills: string[];
  certifications: string[];
  available: boolean;
  rate: number;
};

const employeePool: Employee[] = [
  { id: "emp-01", name: "Ahmed Al Maktoum", nameAr: "أحمد المكتوم", avatar: "AM", department: "Architecture", grade: "Director", title: "Design Director", workload: 75, activeProjects: 3, maxProjects: 5, skills: ["Concept Design", "Client Liaison", "Team Leadership", "Dubai Municipality"], certifications: ["RIBA Part III", "UAE SCAD"], available: true, rate: 450 },
  { id: "emp-02", name: "Sarah Johnson", nameAr: "سارة جونسون", avatar: "SJ", department: "Architecture", grade: "Lead", title: "Lead Architect", workload: 82, activeProjects: 2, maxProjects: 3, skills: ["Detailed Design", "BIM Coordination", "Authority Submissions", "Residential"], certifications: ["RIBA Part III", "LEED AP"], available: true, rate: 380 },
  { id: "emp-03", name: "James Wilson", nameAr: "جيمس ويلسون", avatar: "JW", department: "Architecture", grade: "Senior", title: "Senior Architect", workload: 65, activeProjects: 2, maxProjects: 3, skills: ["Schematic Design", "Facade Design", "Visualization", "Mixed-Use"], certifications: ["ARB UK"], available: true, rate: 320 },
  { id: "emp-04", name: "Fatima Al Rashid", nameAr: "فاطمة الراشد", avatar: "FR", department: "Architecture", grade: "Mid", title: "Architect", workload: 55, activeProjects: 2, maxProjects: 4, skills: ["Interior Design", "Material Selection", "Drawing Production"], certifications: ["B.Arch"], available: true, rate: 220 },
  { id: "emp-05", name: "Omar Khalil", nameAr: "عمر خليل", avatar: "OK", department: "Architecture", grade: "Junior", title: "Architectural Technician", workload: 40, activeProjects: 1, maxProjects: 3, skills: ["AutoCAD", "Revit", "Drawing Production", "3D Modeling"], certifications: ["B.Arch"], available: true, rate: 150 },
  { id: "emp-06", name: "David Chen", nameAr: "ديفيد تشن", avatar: "DC", department: "Structural", grade: "Lead", title: "Lead Structural Engineer", workload: 70, activeProjects: 3, maxProjects: 4, skills: ["Structural Analysis", "Foundation Design", "High-Rise", "Seismic"], certifications: ["PE", "IStructE"], available: true, rate: 360 },
  { id: "emp-07", name: "Ravi Menon", nameAr: "رافي مينون", avatar: "RM", department: "Structural", grade: "Mid", title: "Structural Engineer", workload: 60, activeProjects: 2, maxProjects: 3, skills: ["Concrete Design", "Steel Design", "ETABS", "SAFE"], certifications: ["M.Eng Structural"], available: true, rate: 250 },
  { id: "emp-08", name: "Mohammed Hassan", nameAr: "محمد حسن", avatar: "MH", department: "MEP", grade: "Lead", title: "Lead MEP Engineer", workload: 78, activeProjects: 3, maxProjects: 4, skills: ["HVAC Design", "Electrical Systems", "Plumbing", "Fire Protection"], certifications: ["PE Mechanical", "ASHRAE"], available: true, rate: 350 },
  { id: "emp-09", name: "Lisa Park", nameAr: "ليزا بارك", avatar: "LP", department: "MEP", grade: "Mid", title: "MEP Engineer", workload: 50, activeProjects: 2, maxProjects: 4, skills: ["Electrical Design", "Lighting", "Low Current", "DEWA Standards"], certifications: ["B.Eng Electrical"], available: true, rate: 240 },
  { id: "emp-10", name: "Priya Sharma", nameAr: "بريا شارما", avatar: "PS", department: "Admin", grade: "Senior", title: "Senior Document Controller", workload: 85, activeProjects: 5, maxProjects: 6, skills: ["Document Control", "ISO 19650", "Aconex", "Transmittals"], certifications: ["PRINCE2 Foundation"], available: true, rate: 180 },
  { id: "emp-11", name: "Khalid Al Suwaidi", nameAr: "خالد السويدي", avatar: "KS", department: "Architecture", grade: "Junior", title: "Graduate Architect", workload: 30, activeProjects: 1, maxProjects: 3, skills: ["Revit", "Rhino", "Grasshopper", "Rendering"], certifications: ["B.Arch"], available: true, rate: 130 },
  { id: "emp-12", name: "Noor Abbas", nameAr: "نور عباس", avatar: "NA", department: "Landscape", grade: "Lead", title: "Lead Landscape Architect", workload: 45, activeProjects: 2, maxProjects: 4, skills: ["Landscape Design", "Hardscape", "Irrigation", "DM Green Standards"], certifications: ["ASLA", "LEED AP"], available: true, rate: 300 },
  { id: "emp-13", name: "Tom Richards", nameAr: "توم ريتشاردز", avatar: "TR", department: "QS", grade: "Lead", title: "Lead Quantity Surveyor", workload: 68, activeProjects: 4, maxProjects: 5, skills: ["Cost Estimation", "BOQ", "Value Engineering", "Tender Analysis"], certifications: ["MRICS"], available: true, rate: 340 },
  { id: "emp-14", name: "Aisha Mohammed", nameAr: "عائشة محمد", avatar: "AiM", department: "Sustainability", grade: "Senior", title: "Sustainability Consultant", workload: 55, activeProjects: 3, maxProjects: 5, skills: ["LEED", "Estidama", "Energy Modeling", "Al Sa'fat"], certifications: ["LEED AP BD+C", "Estidama PQP"], available: true, rate: 280 },
  { id: "emp-15", name: "Hassan Youssef", nameAr: "حسن يوسف", avatar: "HY", department: "Supervision", grade: "Lead", title: "Resident Engineer", workload: 90, activeProjects: 1, maxProjects: 2, skills: ["Site Supervision", "Quality Control", "Progress Monitoring", "Contract Admin"], certifications: ["PE Civil", "PMP"], available: false, rate: 380 },
  // Additional juniors for delegation pool
  { id: "emp-16", name: "Yara Al Hashimi", nameAr: "يارا الهاشمي", avatar: "YH", department: "Architecture", grade: "Junior", title: "Architectural Intern", workload: 20, activeProjects: 1, maxProjects: 3, skills: ["Revit", "AutoCAD", "SketchUp", "Rendering"], certifications: ["B.Arch (in progress)"], available: true, rate: 100 },
  { id: "emp-17", name: "Ali Reza", nameAr: "علي رضا", avatar: "AR", department: "Structural", grade: "Junior", title: "Graduate Structural Engineer", workload: 35, activeProjects: 1, maxProjects: 3, skills: ["ETABS", "SAFE", "AutoCAD", "Concrete Design"], certifications: ["B.Eng Civil"], available: true, rate: 120 },
  { id: "emp-18", name: "Nadia Khoury", nameAr: "نادية خوري", avatar: "NK", department: "MEP", grade: "Junior", title: "Graduate MEP Engineer", workload: 25, activeProjects: 1, maxProjects: 3, skills: ["Revit MEP", "Electrical Design", "AutoCAD", "Lighting"], certifications: ["B.Eng Electrical"], available: true, rate: 120 },
  { id: "emp-19", name: "Tariq Noor", nameAr: "طارق نور", avatar: "TN", department: "Architecture", grade: "Mid", title: "BIM Coordinator", workload: 60, activeProjects: 2, maxProjects: 4, skills: ["BIM Coordination", "Revit", "Navisworks", "Clash Detection"], certifications: ["Autodesk Certified"], available: true, rate: 200 },
  { id: "emp-20", name: "Hana Saeed", nameAr: "هنا سعيد", avatar: "HS", department: "Structural", grade: "Mid", title: "Structural Designer", workload: 45, activeProjects: 2, maxProjects: 4, skills: ["Steel Design", "Foundation Design", "ETABS", "Tekla"], certifications: ["M.Eng Structural"], available: true, rate: 230 },
];

// ===== ROLE DEFINITIONS (NASEC-aligned) =====
type RoleSlot = {
  code: string;
  title: string;
  group: "core" | "support" | "junior";
  department: string;
  minGrade: "Director" | "Lead" | "Senior" | "Mid" | "Junior";
  requiredSkills: string[];
  allocation: string;
  assignedTo?: string;
  assignedBy: "auto" | "pm" | "lead";
  stageRequired: string;
  status: "filled" | "vacant" | "pending-approval";
  delegatedBy?: string; // Lead employee id who delegated this assignment
};

// Pre-Contract role slots for Al Wasl Tower
const preContractRoleSlots: Record<string, RoleSlot[]> = {
  "al-wasl-tower": [
    // Core Roles — Auto-assigned
    { code: "PM", title: "Project Manager / Design Director", group: "core", department: "Architecture", minGrade: "Director", requiredSkills: ["Client Liaison", "Team Leadership"], allocation: "20%", assignedTo: "emp-01", assignedBy: "auto", stageRequired: "S1–S8", status: "filled" },
    { code: "LA", title: "Lead Architect", group: "core", department: "Architecture", minGrade: "Lead", requiredSkills: ["Detailed Design", "BIM Coordination"], allocation: "60%", assignedTo: "emp-02", assignedBy: "auto", stageRequired: "S1–S8", status: "filled" },
    { code: "LSE", title: "Lead Structural Engineer", group: "core", department: "Structural", minGrade: "Lead", requiredSkills: ["Structural Analysis", "High-Rise"], allocation: "40%", assignedTo: "emp-06", assignedBy: "auto", stageRequired: "S2–S8", status: "filled" },
    { code: "LME", title: "Lead MEP Engineer", group: "core", department: "MEP", minGrade: "Lead", requiredSkills: ["HVAC Design", "Electrical Systems"], allocation: "40%", assignedTo: "emp-08", assignedBy: "auto", stageRequired: "S3–S8", status: "filled" },
    { code: "LQS", title: "Lead Quantity Surveyor", group: "core", department: "QS", minGrade: "Lead", requiredSkills: ["Cost Estimation", "BOQ"], allocation: "30%", assignedTo: "emp-13", assignedBy: "auto", stageRequired: "S3–S8", status: "filled" },
    // Support Roles — Manually assigned by PM
    { code: "LLA", title: "Lead Landscape Architect", group: "support", department: "Landscape", minGrade: "Lead", requiredSkills: ["Landscape Design"], allocation: "20%", assignedTo: "emp-12", assignedBy: "pm", stageRequired: "S2–S5", status: "filled" },
    { code: "SC", title: "Sustainability Consultant", group: "support", department: "Sustainability", minGrade: "Senior", requiredSkills: ["LEED", "Estidama"], allocation: "15%", assignedTo: "emp-14", assignedBy: "pm", stageRequired: "S2–S5", status: "filled" },
    { code: "DC", title: "Document Controller", group: "support", department: "Admin", minGrade: "Senior", requiredSkills: ["Document Control", "ISO 19650"], allocation: "30%", assignedTo: "emp-10", assignedBy: "pm", stageRequired: "S1–S8", status: "filled" },
    { code: "INT", title: "Interior Designer", group: "support", department: "Architecture", minGrade: "Mid", requiredSkills: ["Interior Design", "Material Selection"], allocation: "40%", assignedTo: "emp-04", assignedBy: "pm", stageRequired: "S3–S5", status: "filled" },
    // Junior Staff — Delegated by Lead
    { code: "JA1", title: "Architectural Technician", group: "junior", department: "Architecture", minGrade: "Junior", requiredSkills: ["Revit", "Drawing Production"], allocation: "100%", assignedTo: "emp-05", assignedBy: "lead", stageRequired: "S2–S8", status: "filled", delegatedBy: "emp-02" },
    { code: "JA2", title: "Graduate Architect", group: "junior", department: "Architecture", minGrade: "Junior", requiredSkills: ["Revit", "Rendering"], allocation: "80%", assignedTo: "emp-11", assignedBy: "lead", stageRequired: "S2–S5", status: "filled", delegatedBy: "emp-02" },
    { code: "JSE", title: "Structural Engineer (Support)", group: "junior", department: "Structural", minGrade: "Mid", requiredSkills: ["Concrete Design", "ETABS"], allocation: "50%", assignedTo: "emp-07", assignedBy: "lead", stageRequired: "S3–S8", status: "filled", delegatedBy: "emp-06" },
    { code: "JME", title: "MEP Engineer (Support)", group: "junior", department: "MEP", minGrade: "Mid", requiredSkills: ["Electrical Design", "Lighting"], allocation: "40%", assignedTo: "emp-09", assignedBy: "lead", stageRequired: "S3–S8", status: "filled", delegatedBy: "emp-08" },
  ],
  "dubai-creek": [
    { code: "PM", title: "Project Manager / Design Director", group: "core", department: "Architecture", minGrade: "Director", requiredSkills: ["Client Liaison", "Team Leadership"], allocation: "15%", assignedTo: "emp-01", assignedBy: "auto", stageRequired: "S1–S8", status: "filled" },
    { code: "LA", title: "Lead Architect", group: "core", department: "Architecture", minGrade: "Lead", requiredSkills: ["Detailed Design", "Residential"], allocation: "50%", assignedTo: "emp-02", assignedBy: "auto", stageRequired: "S1–S8", status: "filled" },
    { code: "LSE", title: "Lead Structural Engineer", group: "core", department: "Structural", minGrade: "Lead", requiredSkills: ["Structural Analysis"], allocation: "30%", assignedTo: "emp-06", assignedBy: "auto", stageRequired: "S2–S8", status: "filled" },
    { code: "LME", title: "Lead MEP Engineer", group: "core", department: "MEP", minGrade: "Lead", requiredSkills: ["HVAC Design"], allocation: "30%", assignedTo: undefined, assignedBy: "auto", stageRequired: "S3–S8", status: "vacant" },
    { code: "LQS", title: "Lead Quantity Surveyor", group: "core", department: "QS", minGrade: "Lead", requiredSkills: ["Cost Estimation"], allocation: "20%", assignedTo: undefined, assignedBy: "auto", stageRequired: "S3–S8", status: "vacant" },
    { code: "DC", title: "Document Controller", group: "support", department: "Admin", minGrade: "Senior", requiredSkills: ["Document Control"], allocation: "20%", assignedTo: "emp-10", assignedBy: "pm", stageRequired: "S1–S8", status: "filled" },
    // Junior slots — some vacant for delegation demo
    { code: "JA1", title: "Architectural Technician", group: "junior", department: "Architecture", minGrade: "Junior", requiredSkills: ["Revit", "AutoCAD"], allocation: "100%", assignedTo: "emp-11", assignedBy: "lead", stageRequired: "S2–S8", status: "filled", delegatedBy: "emp-02" },
    { code: "JA2", title: "Graduate Architect (Rendering)", group: "junior", department: "Architecture", minGrade: "Junior", requiredSkills: ["Rendering", "SketchUp"], allocation: "60%", assignedTo: undefined, assignedBy: "lead", stageRequired: "S2–S5", status: "vacant" },
    { code: "JSE", title: "Structural Engineer (Support)", group: "junior", department: "Structural", minGrade: "Mid", requiredSkills: ["ETABS", "Concrete Design"], allocation: "40%", assignedTo: undefined, assignedBy: "lead", stageRequired: "S3–S8", status: "vacant" },
    { code: "JME", title: "MEP Engineer (Support)", group: "junior", department: "MEP", minGrade: "Junior", requiredSkills: ["Revit MEP", "Electrical Design"], allocation: "40%", assignedTo: undefined, assignedBy: "lead", stageRequired: "S3–S8", status: "vacant" },
  ],
};

// Auto-assignment scoring engine
function computeAssignmentScore(employee: Employee, slot: RoleSlot): number {
  let score = 0;
  const gradeOrder = ["Junior", "Mid", "Senior", "Lead", "Director"];
  const empGradeIdx = gradeOrder.indexOf(employee.grade);
  const minGradeIdx = gradeOrder.indexOf(slot.minGrade);
  if (empGradeIdx >= minGradeIdx) score += 30;
  if (empGradeIdx === minGradeIdx) score += 10;
  if (employee.department === slot.department) score += 25;
  const matchedSkills = slot.requiredSkills.filter(s => employee.skills.includes(s));
  score += (matchedSkills.length / Math.max(1, slot.requiredSkills.length)) * 25;
  score += Math.max(0, (100 - employee.workload) * 0.15);
  if (!employee.available) score -= 50;
  if (employee.activeProjects >= employee.maxProjects) score -= 30;
  return Math.round(Math.min(100, Math.max(0, score)));
}

// ===== DELEGATE MODE COMPONENT =====
function DelegateMode({ 
  roleSlots, 
  onExit, 
  project,
  onAssign,
}: { 
  roleSlots: RoleSlot[]; 
  onExit: () => void; 
  project: { id: string; nameEn: string; code: string };
  onAssign?: (slotCode: string, employeeId: string, leadId: string) => void;
}) {
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [confirmSlot, setConfirmSlot] = useState<RoleSlot | null>(null);
  const [confirmCandidate, setConfirmCandidate] = useState<Employee | null>(null);
  const [assignedSlots, setAssignedSlots] = useState<Record<string, string>>({});

  // Find all Leads on this project (from core roles)
  const coreSlots = roleSlots.filter(s => s.group === "core" && s.status === "filled");
  const projectLeads = coreSlots
    .filter(s => {
      const emp = employeePool.find(e => e.id === s.assignedTo);
      return emp && (emp.grade === "Lead" || emp.grade === "Director");
    })
    .map(s => {
      const emp = employeePool.find(e => e.id === s.assignedTo)!;
      return { slot: s, employee: emp };
    });

  // Get junior slots for the selected Lead's discipline
  const selectedLeadData = projectLeads.find(l => l.employee.id === selectedLead);
  const leadDepartment = selectedLeadData?.employee.department;
  const juniorSlotsForLead = roleSlots.filter(
    s => s.group === "junior" && s.department === leadDepartment
  );

  // Get candidates from the Lead's discipline (Junior + Mid grades, not already assigned to this project)
  const assignedIds = roleSlots.filter(s => s.assignedTo).map(s => s.assignedTo!);
  const candidates = employeePool.filter(e => {
    if (e.department !== leadDepartment) return false;
    if (e.grade !== "Junior" && e.grade !== "Mid") return false;
    if (assignedIds.includes(e.id) && !assignedSlots[e.id]) return false;
    if (!e.available) return false;
    return true;
  });

  // Handle delegation confirmation
  const handleConfirmDelegation = () => {
    if (!confirmSlot || !confirmCandidate || !selectedLead) return;
    setAssignedSlots(prev => ({ ...prev, [confirmSlot.code]: confirmCandidate.id }));
    onAssign?.(confirmSlot.code, confirmCandidate.id, selectedLead);
    toast.success(
      `${confirmCandidate.name} delegated to "${confirmSlot.title}" by ${selectedLeadData?.employee.name}`,
      { description: `Allocation: ${confirmSlot.allocation} · Stages: ${confirmSlot.stageRequired}` }
    );
    setConfirmSlot(null);
    setConfirmCandidate(null);
  };

  return (
    <div className="space-y-6">
      {/* Delegate Mode Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onExit} className="gap-1 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Exit Delegate Mode
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <h2 className="text-lg font-bold text-purple-700">Delegate Mode</h2>
            <p className="text-xs text-muted-foreground">Leads assign junior staff from their discipline</p>
          </div>
        </div>
        <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1">
          <Users className="w-3 h-3" /> Active
        </Badge>
      </div>

      {/* Step 1: Select Lead */}
      <Card className="border-2 border-purple-200 bg-purple-50/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">1</div>
            <h3 className="text-sm font-bold">Select Discipline Lead</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Choose which Lead is delegating assignments to their team members.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectLeads.map(({ slot, employee }) => (
              <div
                key={employee.id}
                onClick={() => setSelectedLead(employee.id)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedLead === employee.id
                    ? "border-purple-500 bg-purple-50 shadow-sm"
                    : "border-border hover:border-purple-300 hover:bg-purple-50/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={`text-xs ${selectedLead === employee.id ? "bg-purple-200 text-purple-800" : "bg-emerald-100 text-emerald-700"}`}>
                      {employee.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{employee.name}</p>
                    <p className="text-[10px] text-muted-foreground">{slot.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[9px]">{employee.department}</Badge>
                  <Badge variant="outline" className="text-[9px]">{employee.grade}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Junior Slots for this Lead's Discipline */}
      {selectedLead && leadDepartment && (
        <Card className="border-2 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">2</div>
              <h3 className="text-sm font-bold">{leadDepartment} — Junior Slots</h3>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {juniorSlotsForLead.filter(s => s.status === "filled" || assignedSlots[s.code]).length}/{juniorSlotsForLead.length} filled
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              These slots report to <span className="font-medium">{selectedLeadData?.employee.name}</span>. 
              Assign team members from the {leadDepartment} discipline below.
            </p>

            <div className="space-y-3">
              {juniorSlotsForLead.map(slot => {
                const isAssigned = slot.status === "filled" || assignedSlots[slot.code];
                const assignedEmp = assignedSlots[slot.code] 
                  ? employeePool.find(e => e.id === assignedSlots[slot.code])
                  : slot.assignedTo ? employeePool.find(e => e.id === slot.assignedTo) : null;

                return (
                  <div key={slot.code} className={`p-3 rounded-lg border ${isAssigned ? "border-emerald-200 bg-emerald-50/30" : "border-dashed border-amber-300 bg-amber-50/20"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px] font-mono">{slot.code}</Badge>
                        <div>
                          <p className="text-sm font-medium">{slot.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{slot.stageRequired}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground">{slot.allocation}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground">Skills: {slot.requiredSkills.join(", ")}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        {isAssigned && assignedEmp ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700">{assignedEmp.avatar}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{assignedEmp.name}</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </div>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-0.5" /> Needs Assignment
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Candidate Pool */}
      {selectedLead && leadDepartment && (
        <Card className="border-2 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">3</div>
              <h3 className="text-sm font-bold">Available Team Members — {leadDepartment}</h3>
              <Badge variant="outline" className="text-[10px] ml-auto">{candidates.length} available</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Junior and Mid-level staff from {leadDepartment} who can be delegated to this project.
            </p>

            {candidates.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No available candidates in {leadDepartment}</p>
                <p className="text-xs">All team members are either fully allocated or already on this project.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {candidates.map(emp => {
                  // Find the best matching vacant slot for this candidate
                  const vacantSlots = juniorSlotsForLead.filter(s => s.status === "vacant" && !assignedSlots[s.code]);
                  const bestSlot = vacantSlots.length > 0
                    ? vacantSlots.reduce((best, slot) => {
                        const score = computeAssignmentScore(emp, slot);
                        const bestScore = computeAssignmentScore(emp, best);
                        return score > bestScore ? slot : best;
                      }, vacantSlots[0])
                    : null;
                  const matchScore = bestSlot ? computeAssignmentScore(emp, bestSlot) : 0;

                  return (
                    <div key={emp.id} className="p-3 rounded-lg border border-border hover:border-purple-300 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs bg-purple-100 text-purple-700">{emp.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.title}</p>
                          </div>
                        </div>
                        {bestSlot && matchScore > 0 && (
                          <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${matchScore >= 70 ? "bg-emerald-100 text-emerald-700" : matchScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                            {matchScore}% match
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Briefcase className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-data">{emp.activeProjects}/{emp.maxProjects}</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground">Projects</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-data">{emp.workload}%</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground">Workload</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <GraduationCap className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-data">{emp.grade}</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground">Grade</p>
                        </div>
                      </div>

                      {/* Workload bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-0.5">
                          <span>Current Load</span>
                          <span>{emp.workload}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full">
                          <div
                            className={`h-full rounded-full transition-all ${emp.workload > 80 ? "bg-red-500" : emp.workload > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${emp.workload}%` }}
                          />
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {emp.skills.slice(0, 4).map(skill => (
                          <Badge key={skill} variant="outline" className="text-[9px] py-0">{skill}</Badge>
                        ))}
                      </div>

                      {/* Delegate buttons for each vacant slot */}
                      <div className="mt-3 space-y-1.5">
                        {vacantSlots.map(slot => {
                          const score = computeAssignmentScore(emp, slot);
                          return (
                            <Button
                              key={slot.code}
                              variant="outline"
                              size="sm"
                              className="w-full justify-between text-[10px] h-7 border-purple-200 hover:bg-purple-50 hover:border-purple-400"
                              onClick={() => { setConfirmSlot(slot); setConfirmCandidate(emp); }}
                            >
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3 text-purple-500" />
                                Delegate to: {slot.code} — {slot.title}
                              </span>
                              <span className={`font-bold ${score >= 70 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                                {score}%
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmSlot && !!confirmCandidate} onOpenChange={(open) => { if (!open) { setConfirmSlot(null); setConfirmCandidate(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Confirm Delegation
            </DialogTitle>
          </DialogHeader>
          {confirmSlot && confirmCandidate && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-purple-200 text-purple-800">{confirmCandidate.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{confirmCandidate.name}</p>
                    <p className="text-xs text-muted-foreground">{confirmCandidate.title} · {confirmCandidate.grade}</p>
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Assigned to</p>
                    <p className="font-medium">{confirmSlot.title}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Role Code</p>
                    <p className="font-mono font-medium">{confirmSlot.code}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Allocation</p>
                    <p className="font-medium">{confirmSlot.allocation}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stage Range</p>
                    <p className="font-medium">{confirmSlot.stageRequired}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Delegated by</p>
                    <p className="font-medium">{selectedLeadData?.employee.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Project</p>
                    <p className="font-medium">{project.nameEn}</p>
                  </div>
                </div>
              </div>

              {/* Workload Impact */}
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-xs font-semibold mb-2">Workload Impact</p>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Current: {confirmCandidate.workload}%</span>
                  <span>After: {Math.min(100, confirmCandidate.workload + parseInt(confirmSlot.allocation))}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${confirmCandidate.workload}%` }} />
                    <div className="bg-purple-400 h-full" style={{ width: `${parseInt(confirmSlot.allocation)}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Existing</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-400" /> This assignment</span>
                </div>
                {confirmCandidate.workload + parseInt(confirmSlot.allocation) > 90 && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-600">
                    <AlertTriangle className="w-3 h-3" />
                    <span>High workload warning — consider reducing allocation or choosing another candidate</span>
                  </div>
                )}
              </div>

              {/* Skills match */}
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-xs font-semibold mb-2">Skills Match</p>
                <div className="flex flex-wrap gap-1">
                  {confirmSlot.requiredSkills.map(skill => {
                    const hasSkill = confirmCandidate.skills.includes(skill);
                    return (
                      <Badge key={skill} className={`text-[9px] ${hasSkill ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {hasSkill ? <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> : <X className="w-2.5 h-2.5 mr-0.5" />}
                        {skill}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setConfirmSlot(null); setConfirmCandidate(null); }}>
              Cancel
            </Button>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 gap-1" onClick={handleConfirmDelegation}>
              <UserCheck className="w-3.5 h-3.5" /> Confirm Delegation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== TEAM TAB COMPONENT =====
type TeamTabProps = {
  isPostContract: boolean;
  isPreContract: boolean;
  project: { id: string; nameEn: string; code: string };
};

type LiveTeamRow = {
  projectId: string;
  userId: string;
  roleOnProject?: string | null;
  addedAt?: string;
  removedAt?: string | null;
};

const ROLE_SLOTS_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function TeamTab({ isPostContract, isPreContract, project }: TeamTabProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>("core");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<RoleSlot | null>(null);
  const [delegateMode, setDelegateMode] = useState(false);

  // Real system users
  const allUsers = useCollection(usersStore);

  // Post-contract live team state
  const [liveTeam, setLiveTeam] = useState<LiveTeamRow[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [addMemberRole, setAddMemberRole] = useState("");
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (!isPostContract || !ROLE_SLOTS_UUID_RE.test(project.id)) return;
    setTeamLoading(true);
    apiFetch<LiveTeamRow[]>(`/projects/${project.id}/team`)
      .then((rows) => setLiveTeam(rows.filter((r) => !r.removedAt)))
      .catch(() => {})
      .finally(() => setTeamLoading(false));
  }, [project.id, isPostContract]);

  async function handleAddMember() {
    if (!addMemberUserId) return;
    setAddingMember(true);
    try {
      const row = await apiFetch<LiveTeamRow>(`/projects/${project.id}/team`, {
        method: "POST",
        body: { userId: addMemberUserId, roleOnProject: addMemberRole || null },
      });
      setLiveTeam((prev) => [...prev.filter((m) => m.userId !== addMemberUserId), row]);
      const u = allUsers.find((u) => u.id === addMemberUserId);
      toast.success(`${u?.displayName ?? "User"} added to the project team`);
      setShowAddMemberDialog(false);
      setAddMemberUserId("");
      setAddMemberRole("");
      setAddMemberSearch("");
    } catch {
      toast.error("Failed to add member — please try again");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      await apiFetch(`/projects/${project.id}/team/${userId}`, { method: "DELETE" });
      setLiveTeam((prev) => prev.filter((m) => m.userId !== userId));
      toast.success("Member removed from project team");
    } catch {
      toast.error("Failed to remove member");
    }
  }

  // Role slots are stateful (assignments actually fill slots) and persisted
  // per-project on the backend (project-items kind "role-slots") so the
  // structure survives reloads and is shared with the team.
  const seedSlots = preContractRoleSlots[project.id] || preContractRoleSlots["al-wasl-tower"];
  const [roleSlots, setRoleSlots] = useState<RoleSlot[]>(seedSlots);
  const slotsItemId = useRef<string | null>(null);
  const slotsLoaded = useRef(false);
  const skipNextSave = useRef(false);

  useEffect(() => {
    let cancelled = false;
    slotsLoaded.current = false;
    slotsItemId.current = null;
    setRoleSlots(preContractRoleSlots[project.id] || preContractRoleSlots["al-wasl-tower"]);
    if (!ROLE_SLOTS_UUID_RE.test(project.id)) { slotsLoaded.current = true; return; }
    void apiFetch<any[]>("/project-items?kind=role-slots")
      .then((rows) => {
        if (cancelled) return;
        const row = rows.find((r) => r.projectId === project.id);
        if (row?.slots) {
          slotsItemId.current = row.id;
          skipNextSave.current = true;
          setRoleSlots(row.slots as RoleSlot[]);
        }
        slotsLoaded.current = true;
      })
      .catch(() => { slotsLoaded.current = true; });
    return () => { cancelled = true; };
  }, [project.id]);

  useEffect(() => {
    if (!slotsLoaded.current || !ROLE_SLOTS_UUID_RE.test(project.id)) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    const t = setTimeout(() => {
      const body = { slots: roleSlots };
      const req = slotsItemId.current
        ? apiFetch<any>(`/project-items/${slotsItemId.current}`, { method: "PATCH", body })
        : apiFetch<any>("/project-items", { method: "POST", body: { kind: "role-slots", projectId: project.id, ...body } });
      void req.then((row) => { if (row?.id) slotsItemId.current = row.id; })
        .catch((err) => console.warn("[TeamTab] role-slots save failed", err));
    }, 800);
    return () => clearTimeout(t);
  }, [project.id, roleSlots]);

  // Fill (or re-fill) a slot — used by the assign dialog, auto-fill and delegate mode
  function assignToSlot(code: string, employeeId: string, by: RoleSlot["assignedBy"], delegatedBy?: string) {
    setRoleSlots((prev) => prev.map((sl) => sl.code === code
      ? { ...sl, assignedTo: employeeId, status: "filled", assignedBy: by, delegatedBy: delegatedBy ?? sl.delegatedBy }
      : sl));
  }

  function autoFillVacant() {
    const vacant = roleSlots.filter((sl) => sl.status === "vacant");
    if (vacant.length === 0) { toast.message("No vacant slots — the structure is fully staffed."); return; }
    let filled = 0;
    const taken = new Set(roleSlots.filter((sl) => sl.assignedTo).map((sl) => sl.assignedTo!));
    setRoleSlots((prev) => prev.map((sl) => {
      if (sl.status !== "vacant") return sl;
      const best = employeePool
        .filter((e) => e.available && !taken.has(e.id))
        .map((e) => ({ e, score: computeAssignmentScore(e, sl) }))
        .sort((a, b) => b.score - a.score)[0];
      if (!best || best.score < 50) return sl;
      taken.add(best.e.id);
      filled++;
      return { ...sl, assignedTo: best.e.id, status: "filled" as const, assignedBy: "auto" as const };
    }));
    setTimeout(() => {
      if (filled > 0) toast.success(`Auto-assignment engine filled ${filled} vacant slot(s) by score`);
      else toast.message("No suitable candidates scored high enough for the vacant slots.");
    }, 0);
  }

  // Group the slots
  const coreSlots = roleSlots.filter(s => s.group === "core");
  const supportSlots = roleSlots.filter(s => s.group === "support");
  const juniorSlots = roleSlots.filter(s => s.group === "junior");

  // Stats
  const totalSlots = roleSlots.length;
  const filledSlots = roleSlots.filter(s => s.status === "filled").length;
  const vacantSlots = roleSlots.filter(s => s.status === "vacant").length;

  // Get employee by id — checks real users first, then demo pool
  const getEmployee = (id?: string) => {
    if (!id) return undefined;
    const realUser = allUsers.find((u) => u.id === id);
    if (realUser) {
      const initials = realUser.displayName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
      return { id: realUser.id, name: realUser.displayName, nameAr: "", avatar: initials, department: realUser.role, grade: "Mid" as const, title: realUser.role, workload: 0, activeProjects: 0, maxProjects: 5, skills: [], certifications: [], available: realUser.active, rate: 0 };
    }
    return employeePool.find(e => e.id === id);
  };

  // Compute recommendations for a vacant slot
  const getRecommendations = (slot: RoleSlot) => {
    return employeePool
      .filter(e => e.department === slot.department || slot.requiredSkills.some(s => e.skills.includes(s)))
      .map(e => ({ employee: e, score: computeAssignmentScore(e, slot) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  };

  // Real users not already assigned to a slot — for direct assignment
  const assignedRealIds = new Set(roleSlots.filter((s) => s.assignedTo && ROLE_SLOTS_UUID_RE.test(s.assignedTo)).map((s) => s.assignedTo!));
  const unassignedRealUsers = allUsers.filter((u) => u.active && !assignedRealIds.has(u.id));

  // If Post-Contract, show live team members from the backend
  if (isPostContract) {
    // For UUID backend projects, use live data; for seed projects fall back to empty list with note
    const isBackendProject = ROLE_SLOTS_UUID_RE.test(project.id);

    // Map live team rows to display objects using real users
    const displayTeam = liveTeam.map((row) => {
      const user = allUsers.find((u) => u.id === row.userId);
      const initials = (user?.displayName ?? "?")
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
      return {
        userId: row.userId,
        name: user?.displayName ?? row.userId,
        role: row.roleOnProject ?? user?.role ?? "—",
        avatar: initials,
        active: user?.active ?? true,
      };
    });

    // Users not yet on this project (for add dialog)
    const teamUserIds = new Set(liveTeam.map((m) => m.userId));
    const availableToAdd = allUsers
      .filter((u) => u.active && !teamUserIds.has(u.id))
      .filter((u) =>
        addMemberSearch.trim() === "" ||
        u.displayName.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
        (u.username ?? "").toLowerCase().includes(addMemberSearch.toLowerCase())
      );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Supervision Team</h2>
          <Button size="sm" className="gap-1" onClick={() => setShowAddMemberDialog(true)}>
            <Plus className="w-3 h-3" /> Add Member
          </Button>
        </div>

        <Card className="border border-border">
          <CardContent className="p-0">
            {teamLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading team...</div>
            ) : displayTeam.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No team members yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Add Member" to assign real users to this project.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">MEMBER</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">ROLE ON PROJECT</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">SYSTEM ROLE</th>
                    <th className="text-center p-3 text-xs font-semibold text-muted-foreground">STATUS</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {displayTeam.map((m) => {
                    const user = allUsers.find((u) => u.id === m.userId);
                    return (
                      <tr key={m.userId} className="border-b border-border last:border-0 hover:bg-accent/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] bg-orange-100 text-orange-700">{m.avatar}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{m.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{m.role}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">{user?.role ?? "—"}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          {m.active
                            ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Active</Badge>
                            : <Badge className="bg-slate-100 text-slate-500 text-[10px]">Inactive</Badge>}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                            onClick={() => handleRemoveMember(m.userId)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Add Member Dialog */}
        <Dialog open={showAddMemberDialog} onOpenChange={(o) => { setShowAddMemberDialog(o); if (!o) { setAddMemberSearch(""); setAddMemberUserId(""); setAddMemberRole(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" /> Add Team Member
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search by name or email..."
                value={addMemberSearch}
                onChange={(e) => { setAddMemberSearch(e.target.value); setAddMemberUserId(""); }}
                className="text-sm"
              />
              <div className="max-h-56 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
                {availableToAdd.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No users found</div>
                ) : availableToAdd.map((u) => (
                  <button
                    key={u.id}
                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${addMemberUserId === u.id ? "bg-emerald-50 border border-emerald-300" : "hover:bg-accent/40"}`}
                    onClick={() => setAddMemberUserId(u.id)}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">
                        {u.displayName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.displayName}</p>
                      <p className="text-[10px] text-muted-foreground">{u.username} · {u.role}</p>
                    </div>
                    {addMemberUserId === u.id && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Role on project (optional)</p>
                <Input
                  placeholder="e.g. Resident Engineer, Document Controller..."
                  value={addMemberRole}
                  onChange={(e) => setAddMemberRole(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddMemberDialog(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                disabled={!addMemberUserId || addingMember}
                onClick={handleAddMember}
              >
                <UserPlus className="w-3.5 h-3.5" />
                {addingMember ? "Adding..." : "Add to Team"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== DELEGATE MODE VIEW =====
  if (delegateMode) {
    return <DelegateMode roleSlots={roleSlots} onExit={() => setDelegateMode(false)} project={project} onAssign={(code, empId, leadId) => assignToSlot(code, empId, "lead", leadId)} />;
  }

  // ===== PRE-CONTRACT: 3-Group Role Structure =====
  const renderRoleRow = (slot: RoleSlot) => {
    const emp = getEmployee(slot.assignedTo);
    const assignMethodIcon = slot.assignedBy === "auto" ? <Zap className="w-3 h-3 text-amber-500" /> : slot.assignedBy === "pm" ? <Shield className="w-3 h-3 text-blue-500" /> : <Users className="w-3 h-3 text-purple-500" />;
    const assignMethodLabel = slot.assignedBy === "auto" ? "Auto-assigned" : slot.assignedBy === "pm" ? "PM assigned" : "Lead delegated";
    const delegator = slot.delegatedBy ? employeePool.find(e => e.id === slot.delegatedBy) : null;

    return (
      <tr key={slot.code} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
        <td className="p-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono w-10 justify-center">{slot.code}</Badge>
            <div>
              <p className="text-sm font-medium">{slot.title}</p>
              <p className="text-[10px] text-muted-foreground">{slot.stageRequired} · {slot.allocation}</p>
            </div>
          </div>
        </td>
        <td className="p-3">
          {emp ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{emp.avatar}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{emp.name}</p>
                <p className="text-[10px] text-muted-foreground">{emp.grade} · {emp.department}</p>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs border-dashed border-amber-300 text-amber-600 hover:bg-amber-50"
              onClick={() => { setSelectedSlot(slot); setShowAssignDialog(true); }}
            >
              <UserPlus className="w-3 h-3" /> Assign
            </Button>
          )}
        </td>
        <td className="p-3">
          {emp && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-secondary rounded-full">
                <div className={`h-full rounded-full ${emp.workload > 90 ? "bg-red-500" : emp.workload > 75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${emp.workload}%` }} />
              </div>
              <span className="text-xs font-data">{emp.workload}%</span>
            </div>
          )}
        </td>
        <td className="p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {assignMethodIcon}
            <span>{assignMethodLabel}</span>
          </div>
          {delegator && (
            <p className="text-[9px] text-purple-500 mt-0.5">by {delegator.name}</p>
          )}
        </td>
        <td className="p-3 text-center">
          {slot.status === "filled" ? (
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-0.5" /> Filled</Badge>
          ) : slot.status === "vacant" ? (
            <Badge className="bg-amber-100 text-amber-700 text-[10px]"><AlertTriangle className="w-3 h-3 mr-0.5" /> Vacant</Badge>
          ) : (
            <Badge className="bg-blue-100 text-blue-700 text-[10px]"><Clock className="w-3 h-3 mr-0.5" /> Pending</Badge>
          )}
        </td>
      </tr>
    );
  };

  const renderGroup = (title: string, icon: React.ReactNode, slots: RoleSlot[], groupKey: string, description: string, color: string) => {
    const isExpanded = expandedGroup === groupKey;
    const filled = slots.filter(s => s.status === "filled").length;
    return (
      <Card className="border border-border">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/20 transition-colors"
          onClick={() => setExpandedGroup(isExpanded ? null : groupKey)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-bold">{title}</h3>
              <p className="text-[11px] text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px]">{filled}/{slots.length} filled</Badge>
            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
        {isExpanded && (
          <CardContent className="p-0 border-t border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-[30%]">ROLE</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-[30%]">ASSIGNED TO</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-[15%]">WORKLOAD</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-[12%]">METHOD</th>
                  <th className="text-center p-3 text-xs font-semibold text-muted-foreground w-[13%]">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {slots.map(renderRoleRow)}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Design Team — Role Structure</h2>
          <p className="text-xs text-muted-foreground mt-0.5">NASEC-aligned role slots · Auto-assignment engine active</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-400" 
            onClick={() => setDelegateMode(true)}
          >
            <Users className="w-3 h-3" /> Delegate Mode
          </Button>
          <Button size="sm" className="gap-1 text-xs" onClick={autoFillVacant}>
            <Sparkles className="w-3 h-3" /> Auto-Fill Vacancies
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border border-border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Slots</p>
          <p className="text-2xl font-bold font-data mt-1">{totalSlots}</p>
        </Card>
        <Card className="border border-border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Filled</p>
          <p className="text-2xl font-bold font-data text-emerald-600 mt-1">{filledSlots}</p>
        </Card>
        <Card className="border border-border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vacant</p>
          <p className="text-2xl font-bold font-data text-amber-600 mt-1">{vacantSlots}</p>
        </Card>
        <Card className="border border-border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fill Rate</p>
          <p className="text-2xl font-bold font-data mt-1">{totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0}%</p>
        </Card>
      </div>

      {/* 3 Groups */}
      {renderGroup(
        "Core Roles",
        <Zap className="w-4 h-4 text-amber-600" />,
        coreSlots,
        "core",
        "Auto-assigned by system based on workload, grade, skills & availability",
        "bg-amber-100"
      )}
      {renderGroup(
        "Support Roles",
        <Shield className="w-4 h-4 text-blue-600" />,
        supportSlots,
        "support",
        "Manually assigned by Project Manager based on project needs",
        "bg-blue-100"
      )}
      {renderGroup(
        "Junior Staff",
        <Users className="w-4 h-4 text-purple-600" />,
        juniorSlots,
        "junior",
        "Delegated by Lead of each discipline — Lead selects from their team",
        "bg-purple-100"
      )}

      {/* External Consultants */}
      <Card className="border border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">External Consultants</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "Buro Happold", role: "Structural Engineer (Peer Review)", contact: "Eng. Mark Taylor", phone: "+971 55 222 3333" },
              { name: "Atelier Ten", role: "Sustainability Consultant", contact: "Dr. Lisa Chen", phone: "+971 56 444 5555" },
              { name: "Dubai Holding", role: "Client", contact: "Khalid Al Mansouri", phone: "+971 50 666 7777" },
            ].map((c) => (
              <div key={c.name} className="p-3 border border-border rounded-lg">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.role}</p>
                <div className="flex items-center gap-2 mt-2 text-xs"><Phone className="w-3 h-3" /> {c.contact} · {c.phone}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Assign: {selectedSlot?.title}</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/30 rounded-lg text-xs space-y-1">
                <p><span className="font-semibold">Department:</span> {selectedSlot.department}</p>
                <p><span className="font-semibold">Min Grade:</span> {selectedSlot.minGrade}</p>
                <p><span className="font-semibold">Required Skills:</span> {selectedSlot.requiredSkills.join(", ")}</p>
                <p><span className="font-semibold">Allocation:</span> {selectedSlot.allocation}</p>
              </div>
              <Separator />

              {/* Real system users */}
              {unassignedRealUsers.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Users</p>
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {unassignedRealUsers.map((u) => {
                      const initials = u.displayName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
                      return (
                        <div key={u.id} className="flex items-center justify-between p-2 border border-emerald-200 bg-emerald-50/30 rounded-lg hover:bg-emerald-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] bg-emerald-200 text-emerald-800">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{u.displayName}</p>
                              <p className="text-[10px] text-muted-foreground">{u.role} · {u.username}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="text-xs h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-100" onClick={() => { assignToSlot(selectedSlot.code, u.id, "pm"); toast.success(`${u.displayName} assigned to ${selectedSlot.title}`); setShowAssignDialog(false); }}>
                            Assign
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <Separator />
                </>
              )}

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended Candidates (by score)</p>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {getRecommendations(selectedSlot).map(({ employee: emp, score }) => (
                  <div key={emp.id} className="flex items-center justify-between p-2 border border-border rounded-lg hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{emp.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-[10px] text-muted-foreground">{emp.grade} · {emp.department} · {emp.workload}% load · {emp.activeProjects}/{emp.maxProjects} projects</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded ${score >= 70 ? "bg-emerald-100 text-emerald-700" : score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {score}%
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { assignToSlot(selectedSlot.code, emp.id, "pm"); toast.success(`${emp.name} assigned to ${selectedSlot.title}`); setShowAssignDialog(false); }}>
                        Assign
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
