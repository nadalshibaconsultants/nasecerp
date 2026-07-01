/**
 * Contractor Statistics — Performance metrics, SLA compliance, submission history
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { SUBMITTAL_TYPES } from "@/lib/contractor-portal-data";
import { submittalsStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";

export default function ContractorStats() {
  const DEMO_SUBMITTALS = useCollection(submittalsStore);
  const total = DEMO_SUBMITTALS.length;
  const approved = DEMO_SUBMITTALS.filter((s) => s.status === "Approved" || s.status === "Approved with Comments").length;
  const open = DEMO_SUBMITTALS.filter((s) => !["Approved", "Rejected"].includes(s.status)).length;
  const breached = DEMO_SUBMITTALS.filter((s) => s.daysRemaining < 0).length;
  const avgDays = 4.2;
  const approvalRate = Math.round((approved / total) * 100);

  // By type breakdown
  const byType = SUBMITTAL_TYPES.map((t) => {
    const typeItems = DEMO_SUBMITTALS.filter((s) => s.type === t.code);
    return { ...t, count: typeItems.length, approved: typeItems.filter((s) => s.status === "Approved" || s.status === "Approved with Comments").length };
  }).filter((t) => t.count > 0);

  // Monthly trend (mock)
  const monthlyTrend = [
    { month: "Jan", submitted: 12, approved: 10 },
    { month: "Feb", submitted: 15, approved: 13 },
    { month: "Mar", submitted: 18, approved: 14 },
    { month: "Apr", submitted: 22, approved: 18 },
    { month: "May", submitted: 8, approved: 3 },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Statistics & Performance</h1>
        <p className="text-sm text-slate-500">Marina Heights Tower — Submission performance metrics</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border border-slate-200">
          <CardContent className="p-4 text-center">
            <FileText className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold font-data">{total}</p>
            <p className="text-[11px] text-slate-500">Total Submitted</p>
          </CardContent>
        </Card>
        <Card className="border border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold font-data text-emerald-800">{approved}</p>
            <p className="text-[11px] text-emerald-600">Approved</p>
          </CardContent>
        </Card>
        <Card className="border border-amber-200 bg-amber-50/30">
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold font-data text-amber-800">{open}</p>
            <p className="text-[11px] text-amber-600">Open</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-teal-600 mx-auto mb-1" />
            <p className="text-2xl font-bold font-data">{avgDays}d</p>
            <p className="text-[11px] text-slate-500">Avg Response</p>
          </CardContent>
        </Card>
        <Card className="border border-red-200 bg-red-50/30">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold font-data text-red-800">{breached}</p>
            <p className="text-[11px] text-red-600">SLA Breached</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Type */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              Submissions by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byType.map((t) => (
              <div key={t.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{t.code} — {t.name}</span>
                  <span className="text-slate-500">{t.count} ({t.approved} approved)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(t.count / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Monthly Trend (2026)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyTrend.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 w-8">{m.month}</span>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="flex-1 h-4 bg-slate-100 rounded relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-blue-200 rounded" style={{ width: `${(m.submitted / 25) * 100}%` }} />
                      <div className="absolute inset-y-0 left-0 bg-emerald-400 rounded" style={{ width: `${(m.approved / 25) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 w-16 text-right">{m.submitted} / {m.approved}</span>
                </div>
              ))}
              <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-200 rounded" /> Submitted</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-400 rounded" /> Approved</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Rate */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">First-Time Approval Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#14b8a6" strokeWidth="10" strokeDasharray={`${approvalRate * 2.51} 251`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold font-data text-slate-900">{approvalRate}%</span>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-slate-600"><span className="font-medium text-emerald-600">{approved}</span> approved on first submission</p>
                <p className="text-slate-600"><span className="font-medium text-orange-600">1</span> required resubmission</p>
                <p className="text-slate-600"><span className="font-medium text-slate-600">0</span> rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SLA Compliance */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Consultant SLA Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Overall Compliance</span>
                <span className="text-sm font-bold text-emerald-600">87%</span>
              </div>
              <Progress value={87} className="h-2" />
              <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3">
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                  <p className="font-bold text-emerald-700">6</p>
                  <p className="text-emerald-600">On Time</p>
                </div>
                <div className="p-2 rounded bg-amber-50 border border-amber-200">
                  <p className="font-bold text-amber-700">1</p>
                  <p className="text-amber-600">Late</p>
                </div>
                <div className="p-2 rounded bg-red-50 border border-red-200">
                  <p className="font-bold text-red-700">1</p>
                  <p className="text-red-600">Breached</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
