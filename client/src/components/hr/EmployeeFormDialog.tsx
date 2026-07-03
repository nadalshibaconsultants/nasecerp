/**
 * EmployeeFormDialog — Add / Edit employee.
 * 6-tab form so the schema doesn't overwhelm: Personal · Employment · Contract & Salary
 *  · IDs & Visa · Dependents & Bank · Documents.
 *
 * Saves to the employees collection. Validation is permissive (no blocking) so HR
 * can save partial records and complete them later — matching real onboarding.
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, Briefcase, FileText, IdCard, Banknote, FolderOpen, Plus, Trash2, UploadCloud, Camera } from "lucide-react";
import { employeesStore } from "@/lib/stores";
import FileUpload from "@/components/files/FileUpload";
import {
  DEPARTMENTS, grossSalary, type Employee, type Department,
  type EmploymentStatus, type ContractType, type SalaryBreakdown, type Dependent,
} from "@/lib/hr/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId?: string; // when present → edit; otherwise → add
};

const blankEmployee: Employee = {
  id: "",
  code: "",
  firstName: "", lastName: "",
  gender: "M",
  nationality: "UAE",
  email: "", phone: "",
  office: "dubai" as const,
  jobTitle: "",
  department: "Architecture",
  status: "probation",
  joinDate: new Date().toISOString().slice(0, 10),
  contractType: "unlimited",
  salary: { basic: 0, housing: 0, transport: 0, food: 0, other: 0 },
  dependents: [],
  bank: {},
  documents: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Backend employee rows don't carry the nested salary/bank/dependents objects
// (those live in separate tables), so guarantee they exist before the Contract
// and Bank tabs read them — otherwise `emp.salary.basic` throws.
function normalize(e: Employee): Employee {
  return {
    ...e,
    salary: e.salary ?? { basic: 0, housing: 0, transport: 0, food: 0, other: 0 },
    bank: e.bank ?? {},
    dependents: e.dependents ?? [],
  };
}

export default function EmployeeFormDialog({ open, onOpenChange, employeeId }: Props) {
  const existing = useMemo(() => (employeeId ? employeesStore.get(employeeId) : undefined), [employeeId, open]);
  const [emp, setEmp] = useState<Employee>(existing ? normalize(existing) : blankEmployee);
  const [tab, setTab] = useState("personal");

  useEffect(() => {
    if (open) {
      if (employeeId) {
        const fresh = employeesStore.get(employeeId);
        if (fresh) setEmp(normalize(fresh));
      } else {
        // generate a new code
        const list = employeesStore.list();
        const nextN = list.length + 1;
        setEmp({ ...blankEmployee, id: makeUuid(), code: `NSC-EMP-${String(nextN).padStart(4, "0")}` });
      }
      setTab("personal");
    }
  }, [open, employeeId]);

  function updateField<K extends keyof Employee>(k: K, v: Employee[K]) {
    setEmp((e) => ({ ...e, [k]: v, updatedAt: new Date().toISOString() }));
  }
  function updateSalary<K extends keyof SalaryBreakdown>(k: K, v: number) {
    setEmp((e) => ({ ...e, salary: { ...e.salary, [k]: v }, updatedAt: new Date().toISOString() }));
  }
  function addDependent() {
    setEmp((e) => ({ ...e, dependents: [...(e.dependents || []), { name: "", relation: "spouse" }] }));
  }
  function rmDependent(idx: number) {
    setEmp((e) => ({ ...e, dependents: (e.dependents || []).filter((_, i) => i !== idx) }));
  }
  function updDependent(idx: number, patch: Partial<Dependent>) {
    setEmp((e) => ({ ...e, dependents: (e.dependents || []).map((d, i) => i === idx ? { ...d, ...patch } : d) }));
  }

  function save() {
    if (!emp.firstName.trim() || !emp.lastName.trim() || !emp.email.trim()) {
      toast.error("Please provide at least first name, last name and email");
      setTab("personal");
      return;
    }
    const next: Employee = {
      ...emp,
      id: emp.id || makeUuid(),
      updatedAt: new Date().toISOString(),
      createdAt: emp.createdAt || new Date().toISOString(),
    };
    employeesStore.put(next);
    toast.success(employeeId ? `Updated ${next.firstName} ${next.lastName}` : `Added ${next.firstName} ${next.lastName} as ${next.code}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{employeeId ? "Edit employee" : "Add employee"} · <span className="font-mono text-sm text-slate-500">{emp.code}</span></DialogTitle>
          <DialogDescription>HR can save a partial record and complete it later — fields are not blocking unless flagged.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex w-full justify-start gap-1 overflow-x-auto">
            <TabsTrigger value="personal" className="gap-1.5 text-xs whitespace-nowrap px-2.5 shrink-0"><User className="w-3.5 h-3.5 shrink-0" /> Personal</TabsTrigger>
            <TabsTrigger value="employment" className="gap-1.5 text-xs whitespace-nowrap px-2.5 shrink-0"><Briefcase className="w-3.5 h-3.5 shrink-0" /> Employment</TabsTrigger>
            <TabsTrigger value="contract" className="gap-1.5 text-xs whitespace-nowrap px-2.5 shrink-0"><FileText className="w-3.5 h-3.5 shrink-0" /> Contract</TabsTrigger>
            <TabsTrigger value="ids" className="gap-1.5 text-xs whitespace-nowrap px-2.5 shrink-0"><IdCard className="w-3.5 h-3.5 shrink-0" /> IDs & Visa</TabsTrigger>
            <TabsTrigger value="bank" className="gap-1.5 text-xs whitespace-nowrap px-2.5 shrink-0"><Banknote className="w-3.5 h-3.5 shrink-0" /> Bank & Family</TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5 text-xs whitespace-nowrap px-2.5 shrink-0"><FolderOpen className="w-3.5 h-3.5 shrink-0" /> Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="grid grid-cols-2 gap-3 mt-3">
            {/* Profile picture */}
            <div className="col-span-2 flex items-center gap-4 pb-3 border-b border-slate-100">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
                  {emp.photoUrl
                    ? <img src={emp.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    : <span className="text-2xl font-bold text-slate-400">
                        {emp.firstName ? emp.firstName[0].toUpperCase() : <User className="w-8 h-8 text-slate-300" />}
                      </span>
                  }
                </div>
                <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2 MB"); return; }
                      const reader = new FileReader();
                      reader.onload = () => updateField("photoUrl", reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Profile Photo</p>
                <p className="text-xs text-slate-500 mt-0.5">JPG, PNG or WEBP · max 2 MB</p>
                <div className="flex gap-2 mt-2">
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors font-medium text-slate-700">
                      <Camera className="w-3 h-3" /> Upload photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2 MB"); return; }
                        const reader = new FileReader();
                        reader.onload = () => updateField("photoUrl", reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {emp.photoUrl && (
                    <button
                      type="button"
                      className="text-xs px-2.5 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium"
                      onClick={() => updateField("photoUrl", undefined)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <Field label="First name *"><Input value={emp.firstName} onChange={(e) => updateField("firstName", e.target.value)} /></Field>
            <Field label="Last name *"><Input value={emp.lastName} onChange={(e) => updateField("lastName", e.target.value)} /></Field>
            <Field label="Arabic name"><Input value={emp.arabicName || ""} onChange={(e) => updateField("arabicName", e.target.value)} /></Field>
            <Field label="Gender">
              <Select value={emp.gender} onValueChange={(v) => updateField("gender", v as "M" | "F")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Date of birth"><Input type="date" value={emp.dob || ""} onChange={(e) => updateField("dob", e.target.value)} /></Field>
            <Field label="Nationality"><Input value={emp.nationality} onChange={(e) => updateField("nationality", e.target.value)} /></Field>
            <Field label="Marital status">
              <Select value={emp.maritalStatus || "single"} onValueChange={(v) => updateField("maritalStatus", v as Employee["maritalStatus"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Email *"><Input type="email" value={emp.email} onChange={(e) => updateField("email", e.target.value)} /></Field>
            <Field label="Phone *"><Input value={emp.phone} onChange={(e) => updateField("phone", e.target.value)} /></Field>
            <Field label="Emergency contact name"><Input value={emp.emergencyContactName || ""} onChange={(e) => updateField("emergencyContactName", e.target.value)} /></Field>
            <Field label="Emergency phone"><Input value={emp.emergencyPhone || ""} onChange={(e) => updateField("emergencyPhone", e.target.value)} /></Field>
            <Field label="Home address" className="col-span-2"><Textarea rows={2} value={emp.homeAddress || ""} onChange={(e) => updateField("homeAddress", e.target.value)} /></Field>
          </TabsContent>

          <TabsContent value="employment" className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Office *">
              <Select value={emp.office} onValueChange={(v) => updateField("office", v as "dubai" | "cairo")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dubai">🇦🇪 Dubai</SelectItem>
                  <SelectItem value="cairo">🇪🇬 Cairo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Job title *"><Input value={emp.jobTitle} onChange={(e) => updateField("jobTitle", e.target.value)} /></Field>
            <Field label="Department">
              <Select value={emp.department} onValueChange={(v) => updateField("department", v as Department)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={emp.status} onValueChange={(v) => updateField("status", v as EmploymentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="on-leave">On leave</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Join date"><Input type="date" value={emp.joinDate} onChange={(e) => updateField("joinDate", e.target.value)} /></Field>
            <Field label="End date (if applicable)"><Input type="date" value={emp.endDate || ""} onChange={(e) => updateField("endDate", e.target.value)} /></Field>
            <Field label="Work location">
              <Select value={emp.workLocation || "Office"} onValueChange={(v) => updateField("workLocation", v as Employee["workLocation"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Site">Site</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Assigned project (geofence)" className="col-span-2">
              <Input placeholder="e.g. marina-heights, al-wasl-tower, dubai-creek …" value={emp.assignedProjectId || ""} onChange={(e) => updateField("assignedProjectId", e.target.value)} />
            </Field>
            <Field label="Manager (employee ID)" className="col-span-2">
              <Input placeholder="emp-..." value={emp.managerEmployeeId || ""} onChange={(e) => updateField("managerEmployeeId", e.target.value)} />
            </Field>
          </TabsContent>

          <TabsContent value="contract" className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Contract type">
              <Select value={emp.contractType} onValueChange={(v) => updateField("contractType", v as ContractType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Probation end"><Input type="date" value={emp.probationEndDate || ""} onChange={(e) => updateField("probationEndDate", e.target.value)} /></Field>
            <Field label="Contract end (if limited)"><Input type="date" value={emp.contractEndDate || ""} onChange={(e) => updateField("contractEndDate", e.target.value)} /></Field>
            <div></div>
            <Field label="Basic salary (AED/month)"><Input type="number" value={emp.salary.basic} onChange={(e) => updateSalary("basic", Number(e.target.value || 0))} /></Field>
            <Field label="Housing (AED/month)"><Input type="number" value={emp.salary.housing} onChange={(e) => updateSalary("housing", Number(e.target.value || 0))} /></Field>
            <Field label="Transport (AED/month)"><Input type="number" value={emp.salary.transport} onChange={(e) => updateSalary("transport", Number(e.target.value || 0))} /></Field>
            <Field label="Food (AED/month)"><Input type="number" value={emp.salary.food} onChange={(e) => updateSalary("food", Number(e.target.value || 0))} /></Field>
            <Field label="Other (AED/month)"><Input type="number" value={emp.salary.other} onChange={(e) => updateSalary("other", Number(e.target.value || 0))} /></Field>
            <div className="col-span-2 mt-1 p-2 bg-emerald-50 border border-emerald-200 rounded text-sm">
              Gross monthly: <strong>AED {grossSalary(emp.salary).toLocaleString()}</strong>
            </div>
            <EmployeeDocumentUpload
              employeeId={emp.id}
              category="contract"
              label="Contract documents"
              description="Offer letter, signed contract, amendments, salary annexures."
              tone="emerald"
            />
          </TabsContent>

          <TabsContent value="ids" className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Passport no."><Input value={emp.passportNo || ""} onChange={(e) => updateField("passportNo", e.target.value)} /></Field>
            <Field label="Passport expiry"><Input type="date" value={emp.passportExpiry || ""} onChange={(e) => updateField("passportExpiry", e.target.value)} /></Field>
            <Field label="Emirates ID no."><Input value={emp.emiratesIdNo || ""} onChange={(e) => updateField("emiratesIdNo", e.target.value)} /></Field>
            <Field label="Emirates ID expiry"><Input type="date" value={emp.emiratesIdExpiry || ""} onChange={(e) => updateField("emiratesIdExpiry", e.target.value)} /></Field>
            <Field label="Visa no."><Input value={emp.visaNo || ""} onChange={(e) => updateField("visaNo", e.target.value)} /></Field>
            <Field label="Visa expiry"><Input type="date" value={emp.visaExpiry || ""} onChange={(e) => updateField("visaExpiry", e.target.value)} /></Field>
            <Field label="Visa sponsor">
              <Select value={emp.visaSponsor || "company"} onValueChange={(v) => updateField("visaSponsor", v as Employee["visaSponsor"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="self">Self</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Labour card no."><Input value={emp.labourCardNo || ""} onChange={(e) => updateField("labourCardNo", e.target.value)} /></Field>
            <Field label="Labour card expiry"><Input type="date" value={emp.labourCardExpiry || ""} onChange={(e) => updateField("labourCardExpiry", e.target.value)} /></Field>
            <EmployeeDocumentUpload
              employeeId={emp.id}
              category="id-visa"
              label="ID & visa documents"
              description="Passport, Emirates ID, visa page, labour card, medical copies."
              tone="blue"
            />
          </TabsContent>

          <TabsContent value="bank" className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Bank name"><Input value={emp.bank?.bankName || ""} onChange={(e) => updateField("bank", { ...emp.bank, bankName: e.target.value })} /></Field>
            <Field label="IBAN"><Input value={emp.bank?.iban || ""} onChange={(e) => updateField("bank", { ...emp.bank, iban: e.target.value })} /></Field>
            <Field label="Account number"><Input value={emp.bank?.accountNo || ""} onChange={(e) => updateField("bank", { ...emp.bank, accountNo: e.target.value })} /></Field>
            <Field label="SWIFT"><Input value={emp.bank?.swift || ""} onChange={(e) => updateField("bank", { ...emp.bank, swift: e.target.value })} /></Field>

            <EmployeeDocumentUpload
              employeeId={emp.id}
              category="bank-family"
              label="Bank & family documents"
              description="IBAN letters, bank confirmations, marriage and birth certificates."
              tone="amber"
            />

            <div className="col-span-2 flex items-center justify-between mt-3">
              <Label className="text-sm font-medium">Dependents</Label>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={addDependent}><Plus className="w-3.5 h-3.5" /> Add</Button>
            </div>
            <div className="col-span-2 space-y-2">
              {(emp.dependents || []).map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 p-2 border border-slate-200 rounded">
                  <Input placeholder="Name" className="col-span-3" value={d.name} onChange={(e) => updDependent(i, { name: e.target.value })} />
                  <Select value={d.relation} onValueChange={(v) => updDependent(i, { relation: v as Dependent["relation"] })}>
                    <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="son">Son</SelectItem>
                      <SelectItem value="daughter">Daughter</SelectItem>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" placeholder="DOB" className="col-span-2" value={d.dob || ""} onChange={(e) => updDependent(i, { dob: e.target.value })} />
                  <Input placeholder="Passport no." className="col-span-2" value={d.passportNo || ""} onChange={(e) => updDependent(i, { passportNo: e.target.value })} />
                  <Input type="date" placeholder="Visa expiry" className="col-span-2" value={d.visaExpiry || ""} onChange={(e) => updDependent(i, { visaExpiry: e.target.value })} />
                  <Button size="sm" variant="ghost" className="col-span-1 h-8 px-2" onClick={() => rmDependent(i)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
              ))}
              {(emp.dependents || []).length === 0 && <p className="text-xs text-slate-500">No dependents.</p>}
            </div>
          </TabsContent>

          <TabsContent value="docs" className="mt-3">
            <EmployeeDocumentUpload
              employeeId={emp.id}
              category="documents"
              label={`Other documents for ${emp.firstName || "new"} ${emp.lastName || "employee"}`}
              description="Qualifications, certificates, policy acknowledgements, HR memos, and any other employee file."
              tone="violet"
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-slate-600">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function EmployeeDocumentUpload({
  employeeId,
  category,
  label,
  description,
  tone,
}: {
  employeeId: string;
  category: string;
  label: string;
  description: string;
  tone: "amber" | "blue" | "emerald" | "violet";
}) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50/50",
    blue: "border-blue-200 bg-blue-50/50",
    emerald: "border-emerald-200 bg-emerald-50/50",
    violet: "border-violet-200 bg-violet-50/50",
  }[tone];
  return (
    <div className={`col-span-2 mt-2 rounded-lg border ${toneClass} p-3`}>
      <div className="mb-2 flex items-start gap-2">
        <div className="mt-0.5 rounded-md bg-white p-1.5 shadow-sm">
          <UploadCloud className="h-4 w-4 text-slate-700" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800">{label}</div>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {employeeId
        ? <FileUpload entityType="employee" entityId={employeeId} category={category} compact />
        : <p className="text-xs text-slate-500">Employee ID is being prepared. Reopen this tab in a moment to attach files.</p>}
    </div>
  );
}
