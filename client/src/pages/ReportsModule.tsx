/**
 * Business Intelligence & Reporting Module
 * Features: Executive dashboard, custom reports, KPI widgets, forecasting
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  FileText,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import { employeesStore, geofencesStore, punchesStore, leavesStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { aggregateDays } from "@/lib/attendance/utils";
import OfficeSwitcher, { useActiveOffice } from "@/components/office/OfficeSwitcher";
import { OFFICES, formatMoney } from "@/lib/office/configs";
import { projectLaborCosts, monthlyPayroll } from "@/lib/payroll/utils";
import { grossSalary } from "@/lib/hr/types";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const cashFlowForecast = [
  { month: "May", actual: 520, forecast: 520 },
  { month: "Jun", actual: 580, forecast: 580 },
  { month: "Jul", actual: null, forecast: 610 },
  { month: "Aug", actual: null, forecast: 590 },
  { month: "Sep", actual: null, forecast: 650 },
  { month: "Oct", actual: null, forecast: 720 },
  { month: "Nov", actual: null, forecast: 680 },
  { month: "Dec", actual: null, forecast: 750 },
];

const revenueByDiscipline = [
  { name: "Architecture", value: 42, color: "#000000" },
  { name: "Structural", value: 22, color: "#D4A853" },
  { name: "MEP", value: 18, color: "#0D9488" },
  { name: "Interior", value: 12, color: "#6366F1" },
  { name: "Landscape", value: 6, color: "#94A3B8" },
];

const monthlyKPIs = [
  { month: "Jan", utilization: 72, billable: 68, profitability: 28 },
  { month: "Feb", utilization: 74, billable: 70, profitability: 30 },
  { month: "Mar", utilization: 78, billable: 74, profitability: 33 },
  { month: "Apr", utilization: 75, billable: 71, profitability: 31 },
  { month: "May", utilization: 76, billable: 73, profitability: 34 },
  { month: "Jun", utilization: 80, billable: 76, profitability: 36 },
];

const scheduledReports = [
  { name: "Weekly Performance Summary", frequency: "Every Monday 8:00 AM", recipients: 3, lastSent: "May 5, 2026" },
  { name: "Monthly Financial Report", frequency: "1st of each month", recipients: 5, lastSent: "May 1, 2026" },
  { name: "Project Profitability Analysis", frequency: "Bi-weekly", recipients: 2, lastSent: "Apr 28, 2026" },
  { name: "Utilization Dashboard", frequency: "Daily 6:00 PM", recipients: 4, lastSent: "May 6, 2026" },
];

export default function ReportsModule() {
  const allEmployees = useCollection(employeesStore);
  const [office, setOffice] = useActiveOffice("all");
  const employees = office === "all" ? allEmployees : allEmployees.filter((e) => e.office === office);
  const officeCounts = { all: allEmployees.length, dubai: allEmployees.filter((e) => e.office === "dubai").length, cairo: allEmployees.filter((e) => e.office === "cairo").length };
  const punches = useCollection(punchesStore);
  const leaves = useCollection(leavesStore);
  const geofences = useCollection(geofencesStore);
  const today = new Date();
  const year = today.getUTCFullYear();
  const m0 = today.getUTCMonth();
  const fromDate = `${year}-${String(m0 + 1).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, m0 + 1, 0));
  const toDate = last.toISOString().slice(0, 10);
  const days = useMemo(() => aggregateDays({ punches, employeeIds: employees.map((e) => e.id), fromDate, toDate, leaves }), [punches, employees, fromDate, toDate, leaves]);
  const projectCosts = useMemo(() => projectLaborCosts({ employees, days, year, monthIndex0: m0 }), [employees, days, year, m0]);
  const totalLaborMonth = projectCosts.reduce((a, p) => a + p.totalLaborCostAED, 0);
  const totalHoursMonth = days.reduce((a, d) => a + d.normalMinutes + d.overtimeMinutes, 0) / 60;
  const totalOvertime = days.reduce((a, d) => a + d.overtimeMinutes, 0) / 60;
  const totalAbsent = days.filter((d) => d.status === "absent").length;
  const totalPresent = days.filter((d) => d.status === "present" || d.status === "partial").length;
  const monthlyPayrollTotal = employees.reduce((a, e) => a + grossSalary(e.salary), 0);
  const productivityByProject = projectCosts.map((p) => {
    const hrs = p.totalHours;
    const fence = geofences.find((g) => g.projectId === p.projectId);
    return { name: fence?.name || p.projectId, hrs, cost: p.totalLaborCostAED, costPerHour: hrs > 0 ? Math.round(p.totalLaborCostAED / hrs) : 0 };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Business Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Analytics, forecasting, and automated reporting
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("Custom report builder coming soon")}>
            <BarChart3 className="w-4 h-4" />
            Custom Report
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("Export coming soon")}>
            <Download className="w-4 h-4" />
            Export All
          </Button>
        </div>
      </div>
      <OfficeSwitcher active={office} onChange={setOffice} counts={officeCounts} allLabel="Combined reports" />


      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Executive Overview</TabsTrigger>
          <TabsTrigger value="forecast">Forecasting</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="workforce">Workforce (Live)</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* KPI trend chart */}
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">Key Metrics Trend — 2026</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyKPIs}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E8ECF0" }} />
                    <Line type="monotone" dataKey="utilization" stroke="#000000" strokeWidth={2} dot={{ r: 4 }} name="Utilization %" />
                    <Line type="monotone" dataKey="billable" stroke="#D4A853" strokeWidth={2} dot={{ r: 4 }} name="Billable %" />
                    <Line type="monotone" dataKey="profitability" stroke="#0D9488" strokeWidth={2} dot={{ r: 4 }} name="Profitability %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by discipline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base">Revenue by Discipline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueByDiscipline}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`}
                        labelLine={false}
                      >
                        {revenueByDiscipline.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base">Key Business Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Revenue per Employee", value: "AED 54,800/mo", trend: "+8%", up: true },
                  { label: "Average Project Margin", value: "34.2%", trend: "+2.1%", up: true },
                  { label: "Client Retention Rate", value: "92%", trend: "+3%", up: true },
                  { label: "Proposal Win Rate", value: "38%", trend: "-2%", up: false },
                  { label: "Average Days to Invoice", value: "12 days", trend: "-3 days", up: true },
                  { label: "Outstanding AR (>90 days)", value: "AED 210K", trend: "+15K", up: false },
                ].map((metric, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-data font-bold">{metric.value}</span>
                      <div className={`flex items-center gap-0.5 text-xs ${metric.up ? "text-emerald-600" : "text-red-600"}`}>
                        {metric.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {metric.trend}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecast">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">Cash Flow Forecast — H2 2026 (AED '000)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E8ECF0" }} />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="#000000"
                      fill="#000000"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Actual"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      stroke="#D4A853"
                      fill="#D4A853"
                      fillOpacity={0.1}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Forecast"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Projected H2 Revenue</p>
                  <p className="text-lg font-bold font-data">AED 4.0M</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Resource Needs (FTE)</p>
                  <p className="text-lg font-bold font-data">+4 Engineers</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Confidence Level</p>
                  <p className="text-lg font-bold font-data">78%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Scheduled Reports</CardTitle>
              <Button size="sm" variant="outline" onClick={() => toast.info("Schedule new report coming soon")}>
                + New Schedule
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduledReports.map((report, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{report.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {report.frequency}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {report.recipients} recipients
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Last sent</p>
                      <p className="text-xs font-data">{report.lastSent}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workforce" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Headcount</p><p className="text-xl font-bold">{employees.length}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Hours this month</p><p className="text-xl font-bold">{totalHoursMonth.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">{totalOvertime.toFixed(0)}h OT</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Project labor cost</p><p className="text-xl font-bold">AED {totalLaborMonth.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Payroll commitment</p><p className="text-xl font-bold">AED {monthlyPayrollTotal.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Attendance</p><p className="text-xl font-bold">{totalPresent}P / {totalAbsent}A</p><p className="text-[10px] text-muted-foreground">across all staff</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Productivity by Project · {new Date(Date.UTC(year, m0, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr><th className="text-left px-3 py-2">Project</th><th className="text-right px-3 py-2">Hours</th><th className="text-right px-3 py-2">Labor cost (AED)</th><th className="text-right px-3 py-2">Cost / hour</th></tr>
                </thead>
                <tbody>
                  {productivityByProject.map((p) => (
                    <tr key={p.name} className="border-t border-slate-100">
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.hrs.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.cost.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.costPerHour.toLocaleString()}</td>
                    </tr>
                  ))}
                  {productivityByProject.length === 0 && <tr><td colSpan={4} className="text-center text-slate-500 py-4">No data yet — punch in via Attendance to populate.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Top earners (this month)</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr><th className="text-left px-3 py-2">Employee</th><th className="text-left px-3 py-2">Department</th><th className="text-right px-3 py-2">Days P/A</th><th className="text-right px-3 py-2">OT (h)</th><th className="text-right px-3 py-2">Net pay (AED)</th></tr>
                </thead>
                <tbody>
                  {employees.map((e) => {
                    const line = monthlyPayroll(e, days, year, m0);
                    return (
                      <tr key={e.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{e.firstName} {e.lastName}</td>
                        <td className="px-3 py-2 text-xs">{e.department}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs">{line.daysPresent} / {line.daysAbsent}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{line.totalOvertimeHours.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{line.netPay.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
