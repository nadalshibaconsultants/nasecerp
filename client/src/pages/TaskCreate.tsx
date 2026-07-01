/**
 * Task Creation — Smart Assignment Engine
 * Target: < 45 seconds for task creation
 * Modes: Quick (default), Detailed (expandable), Bulk (paste from Excel)
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Zap,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
  Target,
  Brain,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { tasksStore, projectsStore, auditStore, userDirectoryStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Task, TaskPriority, TaskCategory } from "@/lib/tasks/types";

// Team members with workload data
const teamMembers = [
  { id: "am", name: "Ahmed Al Maktoum", initials: "AM", role: "Senior Architect", weeklyHours: 34, capacity: 40, activeTasks: 5, overdue: 0, skills: ["Architecture", "BIM", "Design Development"], available: true },
  { id: "sj", name: "Sarah Johnson", initials: "SJ", role: "Structural Engineer", weeklyHours: 38, capacity: 40, activeTasks: 4, overdue: 1, skills: ["Structural", "Calculations", "Site Supervision"], available: true },
  { id: "mh", name: "Mohammed Hassan", initials: "MH", role: "MEP Engineer", weeklyHours: 42, capacity: 40, activeTasks: 6, overdue: 2, skills: ["MEP", "HVAC", "Fire Safety"], available: true },
  { id: "fa", name: "Fatima Al Zahra", initials: "FA", role: "Interior Designer", weeklyHours: 28, capacity: 40, activeTasks: 3, overdue: 0, skills: ["Interior Design", "Material Selection", "FF&E"], available: true },
  { id: "dc", name: "David Chen", initials: "DC", role: "Project Architect", weeklyHours: 36, capacity: 40, activeTasks: 4, overdue: 0, skills: ["Architecture", "Concept Design", "Presentations"], available: true },
  { id: "ar", name: "Aisha Rahman", initials: "AR", role: "Landscape Architect", weeklyHours: 22, capacity: 40, activeTasks: 2, overdue: 0, skills: ["Landscape", "Sustainability", "Master Planning"], available: false },
  { id: "jw", name: "James Wilson", initials: "JW", role: "BIM Manager", weeklyHours: 40, capacity: 40, activeTasks: 5, overdue: 1, skills: ["BIM", "Revit", "Coordination"], available: true },
  { id: "nh", name: "Noura Al Hashimi", initials: "NH", role: "Junior Architect", weeklyHours: 30, capacity: 40, activeTasks: 3, overdue: 0, skills: ["Architecture", "Drafting", "Rendering"], available: true },
];

const projects = [
  { id: "p1", name: "Al Wasl Tower", phase: "Design Development" },
  { id: "p2", name: "Marina Heights Residences", phase: "Authority Submission" },
  { id: "p3", name: "Dubai Creek Residences", phase: "Concept Design" },
  { id: "p4", name: "Palm Villas Phase 2", phase: "Schematic Design" },
];

const deliverableTypes = ["Drawing", "Report", "Calculation", "Coordination", "Presentation", "Model", "Specification"];
const disciplinesList = ["Architecture", "Structural", "MEP", "Interior", "Landscape", "BIM", "Management"];

export default function TaskCreate() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const realProjects = useCollection(projectsStore);
  const users = useCollection(userDirectoryStore);
  const [mode, setMode] = useState<"quick" | "detailed" | "bulk">("quick");
  const [showDetailed, setShowDetailed] = useState(false);

  // Quick mode fields
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [project, setProject] = useState("");
  const [phase, setPhase] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [priority, setPriority] = useState("medium");

  // Detailed mode fields
  const [discipline, setDiscipline] = useState("");
  const [deliverableType, setDeliverableType] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [billable, setBillable] = useState(true);
  const [subtasks, setSubtasks] = useState<string[]>([""]);

  // Bulk mode
  const [bulkText, setBulkText] = useState("");

  // Assignment mode
  const [assignmentMode, setAssignmentMode] = useState<"direct" | "ai" | "pool" | "client">("direct");

  const selectedMember = users.find(m => m.id === assignee);
  const staffUsers = users.filter((u) => u.role !== "client" && u.role !== "contractor");
  const clientUsers = users.filter((u) => u.role === "client");

  // AI suggestions based on skills and workload
  const aiSuggestions = staffUsers
    .slice(0, 3);

  // Map a priority string from the form to the Task union (handles "urgent" too).
  const toPriority = (p: string): TaskPriority =>
    (["low", "medium", "high", "urgent"].includes(p) ? p : "medium") as TaskPriority;

  // Build a persistable Task. projectId is only sent when a real project (UUID)
  // is selected; assignee/reporter default to the creator so the new task shows
  // in their list immediately. (The mock team-member picker is cosmetic — the
  // backend keys assignment off real user UUIDs, which we don't have here.)
  const buildTask = (overrides: Partial<Task> = {}): Task => {
    const now = new Date().toISOString();
    return {
      id: newId("tk"),
      title: title.trim(),
      status: "todo",
      priority: toPriority(priority),
      category: (discipline ? "design" : "design") as TaskCategory,
      projectId: project || undefined,
      assigneeUserId: assignee || currentUser?.id,
      assigneeUserIds: [assignee || currentUser?.id].filter(Boolean) as string[],
      reporterUserId: currentUser?.id,
      dueDate: dueDate || undefined,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  };

  const handleSubmit = () => {
    if (!title.trim()) { toast.error("Task title is required"); return; }
    if (assignmentMode === "client" && !assignee) { toast.error("Select a client for this task"); return; }
    if (assignmentMode === "client" && !project) { toast.error("Select the project title for the client task"); return; }
    const task = buildTask();
    tasksStore.put(task);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: currentUser?.displayName || "—", module: "hr", action: "create", subject: `Task · ${task.title}`, detail: `Priority: ${task.priority}` } as any);
    toast.success("Task created successfully!", {
      description: `"${task.title}" assigned to ${selectedMember?.name || currentUser?.displayName || "you"}`,
    });
    navigate("/tasks");
  };

  const handleBulkParse = () => {
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error("Paste at least one task line"); return; }
    const now = new Date().toISOString();
    lines.forEach((line) => {
      // Format: Title | Assignee | Due Date | Hours — only Title is required.
      const [lineTitle, , due] = line.split("|").map(s => s.trim());
      if (!lineTitle) return;
      tasksStore.put({
        id: newId("tk"),
        title: lineTitle,
        status: "todo",
        priority: "medium",
        category: "design",
        assigneeUserId: currentUser?.id,
        reporterUserId: currentUser?.id,
        dueDate: due && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : undefined,
        createdAt: now,
        updatedAt: now,
      });
    });
    toast.success(`${lines.length} task${lines.length === 1 ? "" : "s"} created`);
    navigate("/tasks");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tasks
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Task</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Target: under 45 seconds · Smart assignment enabled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Auto-saving</span>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Mode selector */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as "quick" | "detailed" | "bulk")} className="space-y-4">
        <TabsList>
          <TabsTrigger value="quick" className="gap-2">
            <Zap className="w-4 h-4" />
            Quick Mode
          </TabsTrigger>
          <TabsTrigger value="detailed" className="gap-2">
            <Target className="w-4 h-4" />
            Detailed
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <Upload className="w-4 h-4" />
            Bulk Import
          </TabsTrigger>
        </TabsList>

        {/* Quick Mode */}
        <TabsContent value="quick">
          <Card className="border border-border">
            <CardContent className="p-6 space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Task Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Prepare DD package for Level 15-20"
                  className="h-12 text-base"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Project *</Label>
                  <Select value={project} onValueChange={setProject}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={realProjects.length ? "Select project" : "No projects yet"} />
                    </SelectTrigger>
                    <SelectContent>
                      {realProjects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code ? `${p.code} — ${p.nameEn}` : p.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">🔴 High</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="low">🔵 Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Due Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Due Date *</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-11"
                  />
                </div>

                {/* Estimated Hours */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Estimated Hours</Label>
                  <Input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="e.g., 8"
                    className="h-11 font-data"
                  />
                </div>
              </div>

              {/* Assignment Section */}
              <div className="border-t border-border pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Assignment</Label>
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
                    <button
                      onClick={() => setAssignmentMode("direct")}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        assignmentMode === "direct" ? "bg-card shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      Direct
                    </button>
                    <button
                      onClick={() => setAssignmentMode("ai")}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                        assignmentMode === "ai" ? "bg-card shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      <Brain className="w-3 h-3" />
                      AI Suggest
                    </button>
                    <button
                      onClick={() => setAssignmentMode("pool")}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        assignmentMode === "pool" ? "bg-card shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      Open Pool
                    </button>
                    <button
                      onClick={() => setAssignmentMode("client")}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        assignmentMode === "client" ? "bg-card shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      Client
                    </button>
                  </div>
                </div>

                {assignmentMode === "direct" && (
                  <div className="space-y-2">
                    <Select value={assignee} onValueChange={setAssignee}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffUsers.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            <div className="flex items-center gap-2">
                              <span>{m.displayName}</span>
                              <span className="text-xs text-muted-foreground">· {m.role}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {assignmentMode === "ai" && (
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 mb-3">
                      <p className="text-xs text-amber-700 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI recommends based on workload, skills, and project familiarity
                      </p>
                    </div>
                    {aiSuggestions.map((m, i) => (
                      <label
                        key={m.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          assignee === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                        onClick={() => setAssignee(m.id)}
                      >
                        <input type="radio" name="assignee" checked={assignee === m.id} onChange={() => setAssignee(m.id)} />
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{m.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("")}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{m.displayName}</span>
                            {i === 0 && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Best Match</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{m.role}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {assignmentMode === "pool" && (
                  <div className="p-4 rounded-lg border border-border bg-secondary/30 text-center">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Open Pool Assignment</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Task will be posted to eligible team members. First to claim gets it.
                    </p>
                  </div>
                )}

                {assignmentMode === "client" && (
                  <div className="space-y-2">
                    <Select value={assignee} onValueChange={setAssignee}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={clientUsers.length ? "Select client" : "No client users found"} />
                      </SelectTrigger>
                      <SelectContent>
                        {clientUsers.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Client tasks require a project title above so the client sees the task under the right project.
                    </p>
                  </div>
                )}

                {/* Assignee workload card */}
                {selectedMember && assignmentMode !== "pool" && (
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">{selectedMember.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{selectedMember.displayName}</p>
                        <p className="text-xs text-muted-foreground">{selectedMember.role}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This task will be saved with {selectedMember.displayName} as the assignee.
                    </p>
                  </div>
                )}
              </div>

              {/* Expandable detailed fields */}
              <button
                onClick={() => setShowDetailed(!showDetailed)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2 border-t border-border"
              >
                {showDetailed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showDetailed ? "Hide" : "Show"} detailed fields
              </button>

              {showDetailed && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Discipline</Label>
                      <Select value={discipline} onValueChange={setDiscipline}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select discipline" />
                        </SelectTrigger>
                        <SelectContent>
                          {disciplinesList.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Deliverable Type</Label>
                      <Select value={deliverableType} onValueChange={setDeliverableType}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {deliverableTypes.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Reviewer</Label>
                      <Select value={reviewer} onValueChange={setReviewer}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select reviewer" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.filter(m => m.role.includes("Senior") || m.role.includes("Manager")).map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border self-end">
                      <Checkbox checked={billable} onCheckedChange={(v) => setBillable(v as boolean)} />
                      <div>
                        <p className="text-sm font-medium">Billable</p>
                        <p className="text-xs text-muted-foreground">Counts toward project hours</p>
                      </div>
                    </div>
                  </div>

                  {/* Subtasks */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Subtasks / Checklist</Label>
                    {subtasks.map((st, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Checkbox disabled />
                        <Input
                          value={st}
                          onChange={(e) => {
                            const newSt = [...subtasks];
                            newSt[i] = e.target.value;
                            setSubtasks(newSt);
                          }}
                          placeholder={`Subtask ${i + 1}`}
                          className="h-9"
                        />
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSubtasks([...subtasks, ""])}
                      className="text-xs"
                    >
                      + Add subtask
                    </Button>
                  </div>

                  {/* File attachment */}
                  <div className="p-4 rounded-lg border-2 border-dashed border-border text-center">
                    <Paperclip className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Drag & drop files or click to attach</p>
                    <p className="text-xs text-muted-foreground mt-1">DWG, RVT, PDF, DOCX up to 100MB</p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => navigate("/tasks")}>Cancel</Button>
                <Button onClick={handleSubmit} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Create Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Mode */}
        <TabsContent value="bulk">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Bulk Task Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste a list from Excel/Word. AI will parse each line into a task. Format: Title | Assignee | Due Date | Hours
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Prepare GA plans Level 1-5 | Ahmed | 2026-05-15 | 16\nStructural calc report | Sarah | 2026-05-12 | 24\nMEP coordination meeting | Mohammed | 2026-05-08 | 2\nInterior material selection | Fatima | 2026-05-20 | 8`}
                className="w-full h-48 p-4 rounded-lg border border-border bg-secondary/30 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {bulkText.split("\n").filter(l => l.trim()).length} tasks detected
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast.info("Upload CSV/Excel coming soon")}>
                    Upload File
                  </Button>
                  <Button size="sm" onClick={handleBulkParse} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Parse & Create
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed mode shows same as quick but with all fields expanded */}
        <TabsContent value="detailed">
          <Card className="border border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                All fields are visible in detailed mode. Same form as Quick mode with expanded options.
              </p>
              <Button variant="outline" onClick={() => { setMode("quick"); setShowDetailed(true); }}>
                Switch to Quick Mode with expanded fields
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
