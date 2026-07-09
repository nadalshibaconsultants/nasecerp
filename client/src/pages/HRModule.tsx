/**
 * HR Module — multi-office redesigned.
 *  - Big friendly office switcher (All / Dubai / Cairo) with flags + KPIs per office
 *  - Cleaner KPI strip (the old version had 6+ stuffed metrics)
 *  - Same 15 sub-modules underneath, all auto-filtered by selected office
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  Filter,
  FileText,
  FileSignature,
  FileWarning,
  GraduationCap,
  History,
  IdCard,
  Laptop,
  Mail,
  MapPin,
  Network,
  Pencil,
  Plane,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  UserCircle,
  UserPlus,
  UserRoundPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  assetsStore,
  disciplinaryStore,
  employeesStore,
  leavesStore,
  lettersStore,
  onboardingStore,
  punchesStore,
  reviewsStore,
  trainingStore,
} from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { DEPARTMENTS, expiryStatus, expiryColorClass, grossSalary, type Employee } from "@/lib/hr/types";
import { OFFICES, formatMoney, workingDaysInMonthForOffice } from "@/lib/office/configs";
import OfficeSwitcher, { useActiveOffice } from "@/components/office/OfficeSwitcher";
import HrRenewalCalendar, { useHrRenewals } from "@/components/calendars/HrRenewalCalendar";
import EmployeeFormDialog from "@/components/hr/EmployeeFormDialog";
import LeaveManagement from "@/components/hr/LeaveManagement";
import HRLetters from "@/components/hr/HRLetters";
import Payslip from "@/components/hr/Payslip";
import Gratuity from "@/components/hr/Gratuity";
import Onboarding from "@/components/hr/Onboarding";
import Training from "@/components/hr/Training";
import Assets from "@/components/hr/Assets";
import Disciplinary from "@/components/hr/Disciplinary";
import Reviews from "@/components/hr/Reviews";
import OrgChart from "@/components/hr/OrgChart";
import AuditLog from "@/components/hr/AuditLog";
import SelfService from "@/components/hr/SelfService";
import { aggregateDays } from "@/lib/attendance/utils";
import { monthlyPayroll } from "@/lib/payroll/utils";
import { apiFetch } from "@/lib/backend/api";

const PAYROLL_FOR_MONTH = (() => { const d = new Date(); return { year: d.getUTCFullYear(), monthIndex0: d.getUTCMonth() }; })();

const HR_TABS = [
  { value: "employees", label: "Employees", icon: Users, tone: "blue" },
  { value: "leave", label: "Leave", icon: Plane, tone: "amber" },
  { value: "payroll", label: "Payroll", icon: Wallet, tone: "emerald" },
  { value: "payslips", label: "Payslips", icon: IdCard, tone: "cyan" },
  { value: "letters", label: "Letters", icon: FileSignature, tone: "violet" },
  { value: "gratuity", label: "Gratuity", icon: Award, tone: "rose" },
  { value: "training", label: "Training", icon: GraduationCap, tone: "indigo" },
  { value: "assets", label: "Assets", icon: Laptop, tone: "slate" },
  { value: "onboarding", label: "Onboarding", icon: UserRoundPlus, tone: "teal" },
  { value: "disciplinary", label: "Disciplinary", icon: ShieldAlert, tone: "red" },
  { value: "reviews", label: "Reviews", icon: Star, tone: "yellow" },
  { value: "orgchart", label: "Org Chart", icon: Network, tone: "sky" },
  { value: "documents", label: "Doc expiry", icon: FileWarning, tone: "orange" },
  { value: "self-service", label: "My HR", icon: UserCircle, tone: "lime" },
  { value: "audit", label: "Audit log", icon: History, tone: "zinc" },
] as const;

type HrTab = typeof HR_TABS[number]["value"];

const MENU_TONES: Record<typeof HR_TABS[number]["tone"], { active: string; idle: string; icon: string }> = {
  amber: { active: "border-amber-400 bg-amber-50 text-amber-800 shadow-sm", idle: "border-amber-200/70 hover:border-amber-300 hover:bg-amber-50/70", icon: "text-amber-600" },
  blue: { active: "border-blue-400 bg-blue-50 text-blue-800 shadow-sm", idle: "border-blue-200/70 hover:border-blue-300 hover:bg-blue-50/70", icon: "text-blue-600" },
  cyan: { active: "border-cyan-400 bg-cyan-50 text-cyan-800 shadow-sm", idle: "border-cyan-200/70 hover:border-cyan-300 hover:bg-cyan-50/70", icon: "text-cyan-600" },
  emerald: { active: "border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm", idle: "border-emerald-200/70 hover:border-emerald-300 hover:bg-emerald-50/70", icon: "text-emerald-600" },
  indigo: { active: "border-indigo-400 bg-indigo-50 text-indigo-800 shadow-sm", idle: "border-indigo-200/70 hover:border-indigo-300 hover:bg-indigo-50/70", icon: "text-indigo-600" },
  lime: { active: "border-lime-400 bg-lime-50 text-lime-800 shadow-sm", idle: "border-lime-200/70 hover:border-lime-300 hover:bg-lime-50/70", icon: "text-lime-700" },
  orange: { active: "border-orange-400 bg-orange-50 text-orange-800 shadow-sm", idle: "border-orange-200/70 hover:border-orange-300 hover:bg-orange-50/70", icon: "text-orange-600" },
  red: { active: "border-red-400 bg-red-50 text-red-800 shadow-sm", idle: "border-red-200/70 hover:border-red-300 hover:bg-red-50/70", icon: "text-red-600" },
  rose: { active: "border-rose-400 bg-rose-50 text-rose-800 shadow-sm", idle: "border-rose-200/70 hover:border-rose-300 hover:bg-rose-50/70", icon: "text-rose-600" },
  sky: { active: "border-sky-400 bg-sky-50 text-sky-800 shadow-sm", idle: "border-sky-200/70 hover:border-sky-300 hover:bg-sky-50/70", icon: "text-sky-600" },
  slate: { active: "border-slate-400 bg-slate-100 text-slate-900 shadow-sm", idle: "border-slate-200 hover:border-slate-300 hover:bg-slate-50", icon: "text-slate-600" },
  teal: { active: "border-teal-400 bg-teal-50 text-teal-800 shadow-sm", idle: "border-teal-200/70 hover:border-teal-300 hover:bg-teal-50/70", icon: "text-teal-600" },
  violet: { active: "border-violet-400 bg-violet-50 text-violet-800 shadow-sm", idle: "border-violet-200/70 hover:border-violet-300 hover:bg-violet-50/70", icon: "text-violet-600" },
  yellow: { active: "border-yellow-400 bg-yellow-50 text-yellow-800 shadow-sm", idle: "border-yellow-200/70 hover:border-yellow-300 hover:bg-yellow-50/70", icon: "text-yellow-600" },
  zinc: { active: "border-zinc-400 bg-zinc-100 text-zinc-900 shadow-sm", idle: "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50", icon: "text-zinc-600" },
};

export default function HRModule() {
  const allEmployees = useCollection(employeesStore);
  const punches = useCollection(punchesStore);
  const leaves = useCollection(leavesStore);
  const training = useCollection(trainingStore);
  const assets = useCollection(assetsStore);
  const disciplinary = useCollection(disciplinaryStore);
  const reviews = useCollection(reviewsStore);
  const onboarding = useCollection(onboardingStore);
  const letters = useCollection(lettersStore);
  const [office, setOffice] = useActiveOffice("all");

  const employees = useMemo(() => office === "all" ? allEmployees : allEmployees.filter((e) => e.office === office), [allEmployees, office]);

  const counts = useMemo(() => ({
    all: allEmployees.length,
    dubai: allEmployees.filter((e) => e.office === "dubai").length,
    cairo: allEmployees.filter((e) => e.office === "cairo").length,
  }), [allEmployees]);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterExpiry, setFilterExpiry] = useState<string>("all");
  const [tab, setTab] = useState<HrTab>("employees");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<Employee | undefined>(undefined);
  const [renewalsOpen, setRenewalsOpen] = useState(false);
  const [payrollBusy, setPayrollBusy] = useState(false);
  const [payrollDialogOpen, setPayrollDialogOpen] = useState(false);
  const [payrollMode, setPayrollMode] = useState<"all" | "selected">("all");
  const [payrollSearch, setPayrollSearch] = useState("");
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
  const [detailEmployee, setDetailEmployee] = useState<Employee | undefined>(undefined);
  const [detailLoading, setDetailLoading] = useState(false);
  function fetchPayrollRuns() {
    setRunsLoading(true);
    apiFetch("/hr/payroll/runs")
      .then((rows: any) => setPayrollRuns(Array.isArray(rows) ? rows : []))
      .catch(() => {})
      .finally(() => setRunsLoading(false));
  }
  useEffect(() => { if (tab === "payroll") fetchPayrollRuns(); }, [tab]);
  useEffect(() => {
    if (!selectedEmployeeId) {
      setDetailEmployee(undefined);
      return;
    }
    const fallback = allEmployees.find((e) => e.id === selectedEmployeeId);
    setDetailEmployee(fallback);
    setDetailLoading(true);
    apiFetch(`/hr/employees/${selectedEmployeeId}`)
      .then((employee: any) => setDetailEmployee(employee as Employee))
      .catch(() => {
        if (!fallback) toast.error("Could not load employee profile");
      })
      .finally(() => setDetailLoading(false));
  }, [selectedEmployeeId, allEmployees]);

  const renewals = useHrRenewals();
  const criticalRenewals = renewals.filter((r) => r.days < 30).length;

  const filtered = useMemo(() => employees.filter((e) => {
    const q = search.trim().toLowerCase();
    const matches = !q
      || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q)
      || e.code.toLowerCase().includes(q)
      || e.email.toLowerCase().includes(q)
      || e.jobTitle.toLowerCase().includes(q);
    const inDept = filterDept === "all" || e.department === filterDept;
    const inStatus = filterStatus === "all" || e.status === filterStatus;
    const expiringDocs = [e.visaExpiry, e.emiratesIdExpiry, e.passportExpiry, e.labourCardExpiry];
    const worstExpiry = expiringDocs.map(expiryStatus).filter((s) => s !== "unknown");
    const inExp = filterExpiry === "all"
      || (filterExpiry === "critical" && worstExpiry.includes("critical"))
      || (filterExpiry === "expired" && worstExpiry.includes("expired"))
      || (filterExpiry === "warning" && worstExpiry.includes("warning"));
    return matches && inDept && inStatus && inExp;
  }), [employees, search, filterDept, filterStatus, filterExpiry]);

  // Per-office KPIs
  const kpis = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    employees.forEach((e) => {
      const cfg = OFFICES[e.office || "dubai"];
      byCurrency[cfg.currency] = (byCurrency[cfg.currency] || 0) + grossSalary(e.salary);
    });
    const expiring = employees.filter((e) => {
      const docs = [e.visaExpiry, e.emiratesIdExpiry, e.passportExpiry, e.labourCardExpiry];
      return docs.some((d) => ["critical", "warning"].includes(expiryStatus(d)));
    }).length;
    const onProb = employees.filter((e) => e.status === "probation").length;
    return { headcount: employees.length, byCurrency, expiring, onProb };
  }, [employees]);

  const monthDays = useMemo(() => {
    const fromDate = `${PAYROLL_FOR_MONTH.year}-${String(PAYROLL_FOR_MONTH.monthIndex0 + 1).padStart(2, "0")}-01`;
    const last = new Date(Date.UTC(PAYROLL_FOR_MONTH.year, PAYROLL_FOR_MONTH.monthIndex0 + 1, 0));
    const toDate = last.toISOString().slice(0, 10);
    return aggregateDays({ punches, employeeIds: employees.map((e) => e.id), fromDate, toDate, leaves });
  }, [punches, employees, leaves]);

  function openAdd() { setEditingId(undefined); setFormOpen(true); }
  function openEdit(id: string) { setEditingId(id); setFormOpen(true); }
  function openEmployeeDetail(id: string) { setSelectedEmployeeId(id); }
  function doDelete() {
    if (!confirmDelete) return;
    employeesStore.remove(confirmDelete.id);
    toast.success(`Removed ${confirmDelete.firstName} ${confirmDelete.lastName}`);
    setConfirmDelete(undefined);
  }
  function openPayrollDialog() {
    setPayrollMode("all");
    setPayrollSearch("");
    setSelectedEmpIds([]);
    setPayrollDialogOpen(true);
  }

  async function createPayrollRun() {
    const ids = payrollMode === "selected" ? selectedEmpIds : undefined;
    if (payrollMode === "selected" && (!ids || ids.length === 0)) {
      toast.error("Select at least one employee");
      return;
    }
    // For selected mode, only post to offices that actually have selected employees
    let targetOffices: ("dubai" | "cairo")[];
    if (payrollMode === "selected" && ids && ids.length > 0) {
      const selEmps = employees.filter((e) => ids.includes(e.id));
      const officeSet = new Set(selEmps.map((e) => e.office || "dubai"));
      targetOffices = Array.from(officeSet) as ("dubai" | "cairo")[];
    } else {
      targetOffices = office === "all" ? ["dubai", "cairo"] : [office as "dubai" | "cairo"];
    }
    setPayrollBusy(true);
    try {
      await Promise.all(targetOffices.map((officeCode) => apiFetch("/hr/payroll/runs", {
        method: "POST",
        body: {
          office: officeCode,
          periodYear: PAYROLL_FOR_MONTH.year,
          periodMonth: PAYROLL_FOR_MONTH.monthIndex0 + 1,
          ...(ids ? { employeeIds: ids } : {}),
        },
      })));
      const scope = payrollMode === "selected"
        ? `${ids!.length} employee${ids!.length > 1 ? "s" : ""}`
        : (office === "all" ? "Dubai and Cairo" : OFFICES[office as "dubai" | "cairo"].name);
      toast.success(`Payroll run created for ${scope}`);
      setPayrollDialogOpen(false);
      fetchPayrollRuns();
    } catch (err: any) {
      toast.error(err?.message || "Could not create payroll run");
    } finally {
      setPayrollBusy(false);
    }
  }

  // Compose the office context string for the page header
  const officeLabel = office === "all" ? "All offices" : `${OFFICES[office].flag} ${OFFICES[office].name}`;
  const headerTone = office === "dubai" ? "from-amber-50" : office === "cairo" ? "from-emerald-50" : "from-slate-50";

  return (
    <div className="space-y-5">
      <div className={`bg-gradient-to-r ${headerTone} to-white -mx-4 lg:-mx-6 -mt-4 lg:-mt-6 px-4 lg:px-6 py-6 border-b border-slate-200`}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Human Resources · {officeLabel}</div>
            <h1 className="text-3xl font-bold tracking-tight">HR &amp; Workforce</h1>
            <p className="text-sm text-slate-600 mt-1">{kpis.headcount} {kpis.headcount === 1 ? "person" : "people"} in scope · live data, multi-office.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="lg"
              variant="outline"
              className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 shadow-sm hover:border-amber-400 hover:bg-amber-100 hover:text-amber-900"
              onClick={() => setRenewalsOpen(true)}
            >
              <CalendarDays className="w-4 h-4" />
              HR Renewals
              {criticalRenewals > 0 && (
                <Badge className="ml-1 bg-red-100 text-red-700 border-red-200">{criticalRenewals} critical</Badge>
              )}
            </Button>
            <Button size="lg" className="gap-1.5 shadow-sm" onClick={openAdd}><UserPlus className="w-4 h-4" /> Add employee</Button>
          </div>
        </div>
      </div>

      <OfficeSwitcher active={office} onChange={setOffice} counts={counts} allLabel="Both offices combined" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {HR_TABS.map((item) => {
              const Icon = item.icon;
              const tone = MENU_TONES[item.tone];
              const active = tab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTab(item.value)}
                  className={`h-10 rounded-lg border px-3 text-xs font-semibold transition-all duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${active ? tone.active : `${tone.idle} bg-white text-slate-700`}`}
                >
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Icon className={`h-3.5 w-3.5 ${active ? "" : tone.icon}`} />
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {/* Cleaner 4-card KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI icon={<Users className="w-4 h-4 text-blue-600" />} label="Headcount" value={String(kpis.headcount)} sub={office === "all" ? `Dubai ${counts.dubai} · Cairo ${counts.cairo}` : "Active staff"} />
            <KPI icon={<Wallet className="w-4 h-4 text-emerald-600" />} label="Monthly payroll" value={Object.entries(kpis.byCurrency).map(([c, v]) => formatMoney(v, c as "AED" | "EGP")).join(" + ") || "—"} sub="Gross commitment" />
            <KPI icon={<ShieldCheck className="w-4 h-4 text-amber-600" />} label="Probation" value={String(kpis.onProb)} sub="Pending confirmation" />
            <KPI icon={<AlertTriangle className="w-4 h-4 text-red-600" />} label="Expiring docs" value={String(kpis.expiring)} sub="≤ 60 days" tone={kpis.expiring > 0 ? "warn" : undefined} />
          </div>
        </div>

        <TabsContent value="employees" className="space-y-3 mt-3">
          {selectedEmployeeId && detailEmployee ? (
            <EmployeeDetailPage
              employee={detailEmployee}
              manager={allEmployees.find((e) => e.id === detailEmployee.managerEmployeeId)}
              loading={detailLoading}
              punches={punches.filter((p) => p.employeeId === detailEmployee.id)}
              leaves={leaves.filter((l) => l.employeeId === detailEmployee.id)}
              training={training.filter((r) => r.employeeId === detailEmployee.id)}
              assets={assets.filter((r) => r.employeeId === detailEmployee.id)}
              disciplinary={disciplinary.filter((r) => r.employeeId === detailEmployee.id)}
              reviews={reviews.filter((r) => r.employeeId === detailEmployee.id)}
              onboarding={onboarding.filter((r) => r.employeeId === detailEmployee.id)}
              letters={letters.filter((r) => r.employeeId === detailEmployee.id)}
              onBack={() => setSelectedEmployeeId(undefined)}
              onEdit={() => openEdit(detailEmployee.id)}
            />
          ) : (
          <>
          {office !== "all" && (
            <Card className={`${OFFICES[office].themeBg} border-0`}>
              <CardContent className="p-3 text-xs flex flex-wrap items-center gap-3">
                <span className="font-semibold">Labour rules in force:</span>
                <Badge variant="outline">{OFFICES[office].workingWeek === "mon-fri" ? "Mon–Fri week" : "Sun–Thu week"}</Badge>
                <Badge variant="outline">{OFFICES[office].leaveAnnualDays}d annual leave</Badge>
                <Badge variant="outline">{OFFICES[office].leaveSickDays}d sick leave</Badge>
                <Badge variant="outline">{OFFICES[office].hasIncomeTax ? "Income tax applicable" : "No income tax"}</Badge>
                <Badge variant="outline">SI {OFFICES[office].socialInsuranceEmployeePct}% / {OFFICES[office].socialInsuranceEmployerPct}%</Badge>
                <span className="ml-auto text-slate-600">Configurable in Settings → Offices</span>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-3 flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-2 text-slate-400" />
                <Input className="pl-8 h-9 w-64" placeholder="Search name, code, email, title…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-44 h-9"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="on-leave">On leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterExpiry} onValueChange={setFilterExpiry}>
                <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Doc expiry" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Doc expiry: all</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="critical">Critical (≤30d)</SelectItem>
                  <SelectItem value="warning">Warning (≤60d)</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto text-xs text-slate-500">{filtered.length} of {employees.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Employee</th>
                    <th className="text-left px-3 py-2">Office</th>
                    <th className="text-left px-3 py-2">Title</th>
                    <th className="text-left px-3 py-2">Department</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Visa</th>
                    <th className="text-right px-3 py-2">Gross / mo</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const cfg = OFFICES[e.office || "dubai"];
                    const visa = expiryStatus(e.visaExpiry);
                    return (
                      <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              {e.photoUrl && <AvatarImage src={e.photoUrl} alt={`${e.firstName} ${e.lastName}`} />}
                              <AvatarFallback className="text-[10px]">{(e.firstName[0] || "") + (e.lastName[0] || "")}</AvatarFallback>
                            </Avatar>
                            <div>
                              <button
                                type="button"
                                onClick={() => openEmployeeDetail(e.id)}
                                className="font-medium text-left hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm"
                              >
                                {e.firstName} {e.lastName}
                              </button>
                              <div className="text-[10px] text-slate-500 font-mono">{e.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2"><Badge variant="outline" className={cfg.themeBg + " border-transparent"}>{cfg.flag} {cfg.name}</Badge></td>
                        <td className="px-3 py-2">{e.jobTitle}</td>
                        <td className="px-3 py-2">{e.department}</td>
                        <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                        <td className="px-3 py-2"><Badge className={`border ${expiryColorClass(visa)}`}>{e.visaExpiry || "—"}</Badge></td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(grossSalary(e.salary), cfg.currency)}</td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(e.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setConfirmDelete(e)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-sm text-slate-500 py-10">No employees match — try widening filters or switching office.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        <TabsContent value="leave" className="mt-3"><LeaveManagement /></TabsContent>
        <TabsContent value="letters" className="mt-3"><HRLetters /></TabsContent>
        <TabsContent value="payslips" className="mt-3"><Payslip /></TabsContent>
        <TabsContent value="gratuity" className="mt-3"><Gratuity /></TabsContent>
        <TabsContent value="training" className="mt-3"><Training /></TabsContent>
        <TabsContent value="assets" className="mt-3"><Assets /></TabsContent>
        <TabsContent value="onboarding" className="mt-3"><Onboarding /></TabsContent>
        <TabsContent value="disciplinary" className="mt-3"><Disciplinary /></TabsContent>
        <TabsContent value="reviews" className="mt-3"><Reviews /></TabsContent>
        <TabsContent value="orgchart" className="mt-3"><OrgChart /></TabsContent>
        <TabsContent value="self-service" className="mt-3"><SelfService /></TabsContent>
        <TabsContent value="audit" className="mt-3"><AuditLog /></TabsContent>

        <TabsContent value="payroll" className="mt-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2"><Wallet className="w-4 h-4" /> Payroll run preview</h3>
              <p className="text-xs text-slate-500">Create the backend payroll run after reviewing the calculated net pay.</p>
            </div>
            <Button
              className="gap-1.5 border border-emerald-300 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md"
              onClick={openPayrollDialog}
            >
              <Wallet className="w-4 h-4" /> Create payroll run
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Employee</th>
                    <th className="text-left px-3 py-2">Office</th>
                    <th className="text-right px-3 py-2">Basic</th>
                    <th className="text-right px-3 py-2">Allowances</th>
                    <th className="text-right px-3 py-2">Gross</th>
                    <th className="text-right px-3 py-2">SI</th>
                    <th className="text-right px-3 py-2">PIT</th>
                    <th className="text-right px-3 py-2">OT</th>
                    <th className="text-right px-3 py-2">Absence</th>
                    <th className="text-right px-3 py-2 font-semibold">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.filter((e) => e.salary).map((e) => {
                    const line = monthlyPayroll(e, monthDays, PAYROLL_FOR_MONTH.year, PAYROLL_FOR_MONTH.monthIndex0);
                    const allow = line.housing + line.transport + line.food + line.other;
                    const cfg = OFFICES[e.office || "dubai"];
                    return (
                      <tr key={e.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{e.firstName} {e.lastName}</td>
                        <td className="px-3 py-2 text-xs">{cfg.flag} {cfg.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{line.basic.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{allow.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{line.grossBeforeAdjustments.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-700">{line.socialInsuranceDeduction > 0 ? `−${line.socialInsuranceDeduction.toLocaleString()}` : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-700">{line.incomeTaxDeduction > 0 ? `−${line.incomeTaxDeduction.toLocaleString()}` : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{line.overtimePay > 0 ? `+${line.overtimePay.toLocaleString()}` : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-700">{line.absenceDeduction > 0 ? `−${line.absenceDeduction.toLocaleString()}` : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatMoney(line.netPay, line.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-3 text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />Office-aware: Cairo applies Egyptian PIT brackets + SI; Dubai applies UAE labour law (no PIT, optional pension).</span>
                {employees.filter((e) => !e.salary).length > 0 && (
                  <span className="text-amber-600">{employees.filter((e) => !e.salary).length} employee{employees.filter((e) => !e.salary).length > 1 ? "s" : ""} excluded — no compensation record set up.</span>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Payroll runs history */}
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" /> Payroll runs history
            </h3>
            {runsLoading ? (
              <p className="text-xs text-slate-400 py-4 text-center">Loading…</p>
            ) : payrollRuns.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No payroll runs created yet.</p>
            ) : (
              <Card>
                <CardContent className="p-0 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-3 py-2">Period</th>
                        <th className="text-left px-3 py-2">Office</th>
                        <th className="text-right px-3 py-2">Employees</th>
                        <th className="text-right px-3 py-2">Gross</th>
                        <th className="text-right px-3 py-2">Deductions</th>
                        <th className="text-right px-3 py-2 font-semibold">Net</th>
                        <th className="text-left px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...payrollRuns]
                        .sort((a, b) => `${b.periodYear}-${b.periodMonth}`.localeCompare(`${a.periodYear}-${a.periodMonth}`))
                        .map((run) => {
                          const cfg = OFFICES[run.office as "dubai" | "cairo"] ?? OFFICES.dubai;
                          const period = new Date(run.periodYear, run.periodMonth - 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
                          const tot = run.totals as any;
                          const statusColor: Record<string, string> = {
                            draft: "bg-amber-100 text-amber-700",
                            approved: "bg-emerald-100 text-emerald-700",
                            paid: "bg-blue-100 text-blue-700",
                            void: "bg-slate-100 text-slate-500",
                          };
                          return (
                            <tr key={run.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                              <td className="px-3 py-2 font-medium">{period}</td>
                              <td className="px-3 py-2">{cfg.flag} {cfg.name}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{tot?.count ?? "—"}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{tot?.gross != null ? formatMoney(tot.gross, cfg.currency) : "—"}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-red-700">{tot?.deductions != null ? `−${formatMoney(tot.deductions, cfg.currency)}` : "—"}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-semibold">{tot?.net != null ? formatMoney(tot.net, cfg.currency) : "—"}</td>
                              <td className="px-3 py-2">
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${statusColor[run.status] ?? "bg-slate-100 text-slate-500"}`}>
                                  {run.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-3 space-y-3">
          <DocumentExpiryGrid employees={employees} />
        </TabsContent>
      </Tabs>

      {/* Payroll run dialog */}
      <Dialog open={payrollDialogOpen} onOpenChange={(o) => { if (!o) setPayrollDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" /> Create payroll run
            </DialogTitle>
            <DialogDescription>
              {PAYROLL_FOR_MONTH.year} · {new Date(PAYROLL_FOR_MONTH.year, PAYROLL_FOR_MONTH.monthIndex0).toLocaleString("en-GB", { month: "long" })}
              {office !== "all" && ` · ${OFFICES[office as "dubai" | "cairo"].name}`}
            </DialogDescription>
          </DialogHeader>

          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-3">
            {(["all", "selected"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setPayrollMode(m); setSelectedEmpIds([]); setPayrollSearch(""); }}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  payrollMode === m
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  {m === "all" ? <Users className="w-4 h-4 text-emerald-600" /> : <Search className="w-4 h-4 text-blue-600" />}
                  {m === "all" ? "All employees" : "Select employees"}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {m === "all"
                    ? "Run payroll for every active employee in scope."
                    : "Pick specific employees to include in this run."}
                </p>
              </button>
            ))}
          </div>

          {/* Employee picker — shown only in "selected" mode */}
          {payrollMode === "selected" && (() => {
            const q = payrollSearch.trim().toLowerCase();
            const officeEmployees = office === "all" ? employees : employees.filter((e) => e.office === office);
            const visible = officeEmployees.filter((e) =>
              !q
              || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q)
              || e.code.toLowerCase().includes(q)
              || e.jobTitle.toLowerCase().includes(q)
            );
            return (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Search employees…"
                    value={payrollSearch}
                    onChange={(e) => setPayrollSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <div className="border border-slate-200 rounded-lg overflow-auto max-h-52 divide-y divide-slate-100">
                  {visible.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">No employees found</p>
                  )}
                  {visible.map((e) => {
                    const checked = selectedEmpIds.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        onClick={() => setSelectedEmpIds((prev) =>
                          checked ? prev.filter((id) => id !== e.id) : [...prev, e.id]
                        )}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${checked ? "bg-emerald-50/60" : ""}`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                          {checked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          {e.photoUrl && <AvatarImage src={e.photoUrl} alt={`${e.firstName} ${e.lastName}`} />}
                          <AvatarFallback className="text-[10px]">{e.firstName[0]}{e.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{e.firstName} {e.lastName}</div>
                          <div className="text-[10px] text-slate-500 truncate">{e.jobTitle} · {OFFICES[e.office || "dubai"].name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedEmpIds.length > 0 && (
                  <p className="text-xs text-emerald-700 font-medium">{selectedEmpIds.length} employee{selectedEmpIds.length > 1 ? "s" : ""} selected</p>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayrollDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={createPayrollRun}
              disabled={payrollBusy || (payrollMode === "selected" && selectedEmpIds.length === 0)}
            >
              <Wallet className="w-3.5 h-3.5" />
              {payrollBusy ? "Creating…" : payrollMode === "selected" ? `Run for ${selectedEmpIds.length || "…"} employee${selectedEmpIds.length !== 1 ? "s" : ""}` : "Run for all"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmployeeFormDialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingId(undefined); }} employeeId={editingId} />

      <Dialog open={renewalsOpen} onOpenChange={setRenewalsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-600" />
              HR Renewals (next 6 months)
              {criticalRenewals > 0 && (
                <Badge className="bg-red-100 text-red-700 border-red-200">
                  <AlertTriangle className="w-3 h-3 mr-1" /> {criticalRenewals} critical
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Visa, Emirates ID, passport, and labour card expiries due soon.
            </DialogDescription>
          </DialogHeader>
          <HrRenewalCalendar variant="plain" />
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Remove employee?</DialogTitle><DialogDescription>{confirmDelete && <>Remove <strong>{confirmDelete.firstName} {confirmDelete.lastName}</strong>?</>}</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(undefined)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPI({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "warn" }) {
  return (
    <Card className={tone === "warn" ? "border-amber-200" : ""}>
      <CardContent className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center shrink-0">{icon}</div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 leading-none">{label}</p>
            <p className="text-base font-bold leading-tight truncate mt-0.5">{value}</p>
            {sub && <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeDetailPage({
  employee,
  manager,
  loading,
  punches,
  leaves,
  training,
  assets,
  disciplinary,
  reviews,
  onboarding,
  letters,
  onBack,
  onEdit,
}: {
  employee: Employee;
  manager?: Employee;
  loading: boolean;
  punches: any[];
  leaves: any[];
  training: any[];
  assets: any[];
  disciplinary: any[];
  reviews: any[];
  onboarding: any[];
  letters: any[];
  onBack: () => void;
  onEdit: () => void;
}) {
  const cfg = OFFICES[employee.office || "dubai"];
  const docs = employee.documents || [];
  const dependents = employee.dependents || [];
  const salary = employee.salary;
  const recentPunches = punches.slice().sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, 8);
  const recentLeaves = leaves.slice().sort((a, b) => String(b.createdAt || b.fromDate).localeCompare(String(a.createdAt || a.fromDate))).slice(0, 6);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className={`bg-gradient-to-r ${cfg.themeBg} to-white p-4 sm:p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-white shadow-sm">
                  {employee.photoUrl && <AvatarImage src={employee.photoUrl} alt={`${employee.firstName} ${employee.lastName}`} />}
                  <AvatarFallback className="text-lg">{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold leading-tight">{employee.firstName} {employee.lastName}</h2>
                    <StatusBadge status={employee.status} />
                    {loading && <Badge variant="outline">Loading full profile...</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{employee.jobTitle} · {employee.department}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                    <Badge variant="outline" className={cfg.themeBg + " border-transparent"}>{cfg.flag} {cfg.name}</Badge>
                    <Badge variant="outline" className="font-mono">{employee.code}</Badge>
                    {employee.workLocation && <Badge variant="outline">{employee.workLocation}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button size="sm" className="gap-1.5" onClick={onEdit}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat icon={<BriefcaseBusiness className="h-4 w-4" />} label="Joined" value={fmtDate(employee.joinDate)} />
            <MiniStat icon={<Wallet className="h-4 w-4" />} label="Gross / month" value={formatMoney(grossSalary(salary), cfg.currency)} />
            <MiniStat icon={<ShieldCheck className="h-4 w-4" />} label="Visa expiry" value={employee.visaExpiry || "Not recorded"} tone={expiryStatus(employee.visaExpiry)} />
            <MiniStat icon={<Users className="h-4 w-4" />} label="Manager" value={manager ? `${manager.firstName} ${manager.lastName}` : "Not assigned"} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <DetailSection title="Personal Information" icon={<UserCircle className="h-4 w-4" />}>
            <DetailGrid>
              <DetailItem label="Full name" value={`${employee.firstName} ${employee.lastName}`} />
              <DetailItem label="Arabic name" value={employee.arabicName} />
              <DetailItem label="Gender" value={employee.gender} />
              <DetailItem label="Date of birth" value={fmtDate(employee.dob)} />
              <DetailItem label="Nationality" value={employee.nationality} />
              <DetailItem label="Marital status" value={employee.maritalStatus} />
              <DetailItem label="Email" value={employee.email} icon={<Mail className="h-3.5 w-3.5" />} />
              <DetailItem label="Phone" value={employee.phone} icon={<Phone className="h-3.5 w-3.5" />} />
              <DetailItem label="Emergency contact" value={employee.emergencyContactName} />
              <DetailItem label="Emergency phone" value={employee.emergencyPhone} />
              <DetailItem label="Home address" value={employee.homeAddress} wide icon={<MapPin className="h-3.5 w-3.5" />} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Employment Details" icon={<BriefcaseBusiness className="h-4 w-4" />}>
            <DetailGrid>
              <DetailItem label="Employee code" value={employee.code} />
              <DetailItem label="Office" value={`${cfg.flag} ${cfg.name}`} />
              <DetailItem label="Department" value={employee.department} />
              <DetailItem label="Job title" value={employee.jobTitle} />
              <DetailItem label="Work location" value={employee.workLocation} />
              <DetailItem label="Contract type" value={employee.contractType} />
              <DetailItem label="Join date" value={fmtDate(employee.joinDate)} />
              <DetailItem label="Contract end" value={fmtDate(employee.contractEndDate)} />
              <DetailItem label="Probation end" value={fmtDate(employee.probationEndDate)} />
              <DetailItem label="End date" value={fmtDate(employee.endDate)} />
              <DetailItem label="Assigned project" value={employee.assignedProjectId} />
              <DetailItem label="Manager" value={manager ? `${manager.firstName} ${manager.lastName}` : undefined} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Identity & Government Documents" icon={<IdCard className="h-4 w-4" />}>
            <div className="grid gap-2 md:grid-cols-2">
              <DocTile label="Passport" number={employee.passportNo} expiry={employee.passportExpiry} />
              <DocTile label="Emirates ID" number={employee.emiratesIdNo} expiry={employee.emiratesIdExpiry} />
              <DocTile label="Visa" number={employee.visaNo} expiry={employee.visaExpiry} extra={employee.visaSponsor ? `Sponsor: ${employee.visaSponsor}` : undefined} />
              <DocTile label="Labour card" number={employee.labourCardNo} expiry={employee.labourCardExpiry} />
            </div>
          </DetailSection>

          <DetailSection title="Uploaded Documents" icon={<FileText className="h-4 w-4" />}>
            {docs.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-slate-500">
                    <tr><th className="py-2">Type</th><th>Number</th><th>Issue</th><th>Expiry</th><th>File</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id} className="border-t">
                        <td className="py-2 font-medium capitalize">{d.type.replace(/-/g, " ")}</td>
                        <td>{d.number || "—"}</td>
                        <td>{fmtDate(d.issueDate)}</td>
                        <td><Badge className={`border ${expiryColorClass(expiryStatus(d.expiryDate))}`}>{d.expiryDate || "—"}</Badge></td>
                        <td>{d.fileUrl ? <a className="text-blue-700 underline" href={d.fileUrl} target="_blank" rel="noreferrer">{d.fileName || "Open"}</a> : (d.fileName || "—")}</td>
                        <td>{d.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyLine text="No uploaded documents on this profile." />}
          </DetailSection>
        </div>

        <div className="space-y-4">
          <DetailSection title="Salary Breakdown" icon={<Wallet className="h-4 w-4" />}>
            <MoneyRow label="Basic" value={salary?.basic} currency={cfg.currency} />
            <MoneyRow label="Housing" value={salary?.housing} currency={cfg.currency} />
            <MoneyRow label="Transport" value={salary?.transport} currency={cfg.currency} />
            <MoneyRow label="Food" value={salary?.food} currency={cfg.currency} />
            <MoneyRow label="Other" value={salary?.other} currency={cfg.currency} />
            <div className="mt-2 border-t pt-2">
              <MoneyRow label="Gross monthly" value={grossSalary(salary)} currency={cfg.currency} strong />
            </div>
          </DetailSection>

          <DetailSection title="Bank Details" icon={<Wallet className="h-4 w-4" />}>
            <DetailGrid single>
              <DetailItem label="Bank" value={employee.bank?.bankName} />
              <DetailItem label="IBAN" value={employee.bank?.iban} />
              <DetailItem label="Account no." value={employee.bank?.accountNo} />
              <DetailItem label="SWIFT" value={employee.bank?.swift} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Dependents" icon={<Users className="h-4 w-4" />}>
            {dependents.length ? dependents.map((d, i) => (
              <div key={`${d.name}-${i}`} className="rounded-md border p-2 text-xs">
                <div className="font-semibold">{d.name}</div>
                <div className="text-slate-500 capitalize">{d.relation}{d.dob ? ` · ${fmtDate(d.dob)}` : ""}</div>
                <div className="mt-1 text-slate-600">Passport: {d.passportNo || "—"}</div>
                <div className="text-slate-600">Visa expiry: {d.visaExpiry || "—"}</div>
              </div>
            )) : <EmptyLine text="No dependents recorded." />}
          </DetailSection>

          <DetailSection title="HR Activity" icon={<History className="h-4 w-4" />}>
            <ActivityCount label="Leave requests" value={leaves.length} />
            <ActivityCount label="Training certificates" value={training.length} />
            <ActivityCount label="Assigned assets" value={assets.length} />
            <ActivityCount label="Disciplinary records" value={disciplinary.length} />
            <ActivityCount label="Performance reviews" value={reviews.length} />
            <ActivityCount label="Onboarding records" value={onboarding.length} />
            <ActivityCount label="Issued letters" value={letters.length} />
            <ActivityCount label="Attendance punches" value={punches.length} />
          </DetailSection>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailSection title="Recent Leave" icon={<Plane className="h-4 w-4" />}>
          {recentLeaves.length ? recentLeaves.map((l) => (
            <TimelineRow key={l.id} title={`${l.type} · ${l.status}`} meta={`${fmtDate(l.fromDate)} to ${fmtDate(l.toDate)}`} note={l.note} />
          )) : <EmptyLine text="No leave records." />}
        </DetailSection>

        <DetailSection title="Recent Attendance Punches" icon={<Activity className="h-4 w-4" />}>
          {recentPunches.length ? recentPunches.map((p) => (
            <TimelineRow key={p.id} title={`${String(p.type).toUpperCase()} · ${p.geofenceCheck || "recorded"}`} meta={fmtDateTime(p.timestamp)} note={p.note || p.device} />
          )) : <EmptyLine text="No attendance punches." />}
        </DetailSection>

        <DetailSection title="Training & Certifications" icon={<GraduationCap className="h-4 w-4" />}>
          {training.length ? training.map((t) => (
            <TimelineRow key={t.id} title={t.name} meta={`${t.provider || "Provider not set"} · ${t.category}`} note={t.expiryDate ? `Expires ${fmtDate(t.expiryDate)}` : t.notes} />
          )) : <EmptyLine text="No training records." />}
        </DetailSection>

        <DetailSection title="Assets & Letters" icon={<Laptop className="h-4 w-4" />}>
          {[...assets.map((a) => ({ id: `asset-${a.id}`, title: `${a.type} · ${a.identifier}`, meta: a.assignedDate, note: a.description })),
            ...letters.map((l) => ({ id: `letter-${l.id}`, title: `${l.type} · ${l.reference}`, meta: l.issueDate, note: l.recipient || l.requestStatus }))].length
            ? [...assets.map((a) => ({ id: `asset-${a.id}`, title: `${a.type} · ${a.identifier}`, meta: a.assignedDate, note: a.description })),
              ...letters.map((l) => ({ id: `letter-${l.id}`, title: `${l.type} · ${l.reference}`, meta: l.issueDate, note: l.recipient || l.requestStatus }))].map((r) => (
                <TimelineRow key={r.id} title={r.title} meta={fmtDate(r.meta)} note={r.note} />
              ))
            : <EmptyLine text="No assets or letters recorded." />}
        </DetailSection>
      </div>
    </div>
  );
}

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">{icon}{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function DetailGrid({ children, single = false }: { children: React.ReactNode; single?: boolean }) {
  return <div className={`grid gap-2 ${single ? "grid-cols-1" : "sm:grid-cols-2"}`}>{children}</div>;
}

function DetailItem({ label, value, icon, wide = false }: { label: string; value?: React.ReactNode; icon?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500">{icon}{label}</div>
      <div className="mt-0.5 break-words text-sm font-medium text-slate-900">{value || "—"}</div>
    </div>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  const toneClass = tone && ["critical", "expired", "warning"].includes(tone) ? expiryColorClass(tone as any) : "bg-white text-slate-700 border-slate-200";
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide opacity-75">{icon}{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function DocTile({ label, number, expiry, extra }: { label: string; number?: string; expiry?: string; extra?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="mt-1 font-mono text-xs text-slate-600">{number || "No number recorded"}</div>
          {extra && <div className="mt-1 text-xs text-slate-500">{extra}</div>}
        </div>
        <Badge className={`border ${expiryColorClass(expiryStatus(expiry))}`}>{expiry || "—"}</Badge>
      </div>
    </div>
  );
}

function MoneyRow({ label, value, currency, strong }: { label: string; value?: number; currency: "AED" | "EGP"; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 text-sm ${strong ? "font-bold" : ""}`}>
      <span className="text-slate-600">{label}</span>
      <span className="font-mono">{formatMoney(Number(value || 0), currency)}</span>
    </div>
  );
}

function ActivityCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <Badge variant="outline">{value}</Badge>
    </div>
  );
}

function TimelineRow({ title, meta, note }: { title: string; meta?: string; note?: string }) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-sm font-medium">{title}</div>
      {meta && <div className="text-xs text-slate-500">{meta}</div>}
      {note && <div className="mt-1 text-xs text-slate-600">{note}</div>}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">{text}</p>;
}

function fmtDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: Employee["status"] }) {
  const map: Record<Employee["status"], string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    probation: "bg-amber-100 text-amber-700 border-amber-200",
    "on-leave": "bg-blue-100 text-blue-700 border-blue-200",
    suspended: "bg-red-100 text-red-700 border-red-200",
    terminated: "bg-slate-200 text-slate-700 border-slate-300",
    resigned: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return <Badge className={`border ${map[status]}`}>{status.replace("-", " ")}</Badge>;
}

function DocumentExpiryGrid({ employees }: { employees: Employee[] }) {
  const rows = employees.flatMap((e) => {
    const docs: { type: string; date?: string }[] = [
      { type: "Visa", date: e.visaExpiry },
      { type: "Emirates ID", date: e.emiratesIdExpiry },
      { type: "Passport", date: e.passportExpiry },
      { type: "Labour Card", date: e.labourCardExpiry },
    ];
    return docs.map((d) => ({ employee: e, ...d, status: expiryStatus(d.date) }));
  }).filter((r) => r.status !== "unknown" && r.status !== "valid")
    .sort((a, b) => (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31"));
  if (rows.length === 0) return <Card><CardContent className="p-6 text-center text-sm text-slate-600">All employee documents valid (more than 60 days remaining).</CardContent></Card>;
  return (
    <Card>
      <CardContent className="p-0 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="text-left px-3 py-2">Employee</th><th className="text-left px-3 py-2">Office</th><th className="text-left px-3 py-2">Document</th><th className="text-left px-3 py-2">Expiry</th><th className="text-left px-3 py-2">Status</th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const cfg = OFFICES[r.employee.office || "dubai"];
              return (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2">{r.employee.firstName} {r.employee.lastName}</td>
                  <td className="px-3 py-2 text-xs">{cfg.flag} {cfg.name}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2 tabular-nums">{r.date}</td>
                  <td className="px-3 py-2"><Badge className={`border ${expiryColorClass(r.status)} capitalize`}>{r.status}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
