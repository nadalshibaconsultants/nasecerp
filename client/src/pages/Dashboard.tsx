/**
 * Dashboard - Executive Overview
 * Shows KPIs, revenue, pipeline, utilization, and profitability at a glance
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Users,
  FolderKanban,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
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
} from "recharts";

const revenueData = [
  { month: "Jan", revenue: 420000, expenses: 310000 },
  { month: "Feb", revenue: 380000, expenses: 290000 },
  { month: "Mar", revenue: 510000, expenses: 340000 },
  { month: "Apr", revenue: 470000, expenses: 320000 },
  { month: "May", revenue: 560000, expenses: 380000 },
  { month: "Jun", revenue: 620000, expenses: 410000 },
];

const utilizationData = [
  { dept: "Architecture", rate: 82 },
  { dept: "Structural", rate: 76 },
  { dept: "MEP", rate: 71 },
  { dept: "Interior", rate: 88 },
  { dept: "Landscape", rate: 65 },
];

const projectStatusData = [
  { name: "On Track", value: 12, color: "#0D9488" },
  { name: "At Risk", value: 4, color: "#D4A853" },
  { name: "Delayed", value: 2, color: "#DC4A3A" },
  { name: "Completed", value: 8, color: "#000000" },
];

const kpis = [
  {
    label: "Monthly Revenue",
    value: "AED 620K",
    change: "+12.4%",
    trend: "up",
    icon: DollarSign,
  },
  {
    label: "Active Projects",
    value: "18",
    change: "+3",
    trend: "up",
    icon: FolderKanban,
  },
  {
    label: "Team Utilization",
    value: "76.4%",
    change: "+2.1%",
    trend: "up",
    icon: Clock,
  },
  {
    label: "Total Employees",
    value: "54",
    change: "+2",
    trend: "up",
    icon: Users,
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of business performance and key metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold font-data mt-1">{kpi.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3">
                  {kpi.trend === "up" ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                  )}
                  <span className={`text-xs font-medium ${kpi.trend === "up" ? "text-emerald-600" : "text-destructive"}`}>
                    {kpi.change}
                  </span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <Card className="lg:col-span-2 border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue vs Expenses (AED)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}K`} />
                  <Tooltip
                    formatter={(value: number) => [`AED ${value.toLocaleString()}`, ""]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #E8ECF0" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#000000"
                    fill="#000000"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#D4A853"
                    fill="#D4A853"
                    fillOpacity={0.05}
                    strokeWidth={2}
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Project status pie */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {projectStatusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-medium font-data ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization + Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Utilization by department */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Utilization by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis dataKey="dept" type="category" tick={{ fontSize: 11 }} stroke="#94a3b8" width={90} />
                  <Tooltip formatter={(value: number) => [`${value}%`, "Utilization"]} />
                  <Bar dataKey="rate" fill="#000000" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent alerts */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { type: "warning", msg: "3 visa renewals due within 30 days", time: "2h ago" },
                { type: "warning", msg: "Project 'Al Wasl Tower' budget at 92%", time: "4h ago" },
                { type: "success", msg: "WPS salary file generated for May 2026", time: "6h ago" },
                { type: "warning", msg: "DM submission deadline: Marina Heights (3 days)", time: "8h ago" },
                { type: "success", msg: "Q1 VAT return filed successfully", time: "1d ago" },
              ].map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  {alert.type === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{alert.msg}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pipeline Value</p>
          <p className="text-xl font-bold font-data mt-1">AED 4.2M</p>
          <Progress value={68} className="mt-2 h-1.5" />
        </Card>
        <Card className="border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Billable Hours</p>
          <p className="text-xl font-bold font-data mt-1">1,247</p>
          <Progress value={76} className="mt-2 h-1.5" />
        </Card>
        <Card className="border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Open RFIs</p>
          <p className="text-xl font-bold font-data mt-1">23</p>
          <Progress value={45} className="mt-2 h-1.5" />
        </Card>
        <Card className="border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Profitability</p>
          <p className="text-xl font-bold font-data mt-1">34.2%</p>
          <Progress value={34} className="mt-2 h-1.5" />
        </Card>
      </div>
    </div>
  );
}
