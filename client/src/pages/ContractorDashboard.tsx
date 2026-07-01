/**
 * Contractor Dashboard — Main landing after login
 * Shows: project summary, open submittals with SLA, actions required, stats
 */
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  TrendingUp,
  Timer,
  Inbox,
} from "lucide-react";
import {

  SITE_ROLES,
  SLA_COLORS,
  SLA_BG_COLORS,
  RESPONSE_STATUS_COLORS,
  getSLAStatus,
  type SiteRoleCode,
  type PortalSubmittal,
} from "@/lib/contractor-portal-data";
import { submittalsStore, consultantIssuedStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";

function SLAClock({ daysRemaining }: { daysRemaining: number }) {
  const status = getSLAStatus(daysRemaining);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${SLA_COLORS[status]}`}>
      <Clock className="w-3 h-3" />
      {daysRemaining <= 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d remaining`}
    </span>
  );
}

function ReviewerBadge({ role }: { role: SiteRoleCode | SiteRoleCode[] }) {
  const roles = Array.isArray(role) ? role : [role];
  return (
    <div className="flex gap-1 flex-wrap">
      {roles.map((r) => (
        <Badge key={r} variant="outline" className={`text-[10px] px-1.5 py-0 ${SITE_ROLES[r].color}`}>
          {r} — {SITE_ROLES[r].label}
        </Badge>
      ))}
    </div>
  );
}

export default function ContractorDashboard() {
  const DEMO_SUBMITTALS = useCollection(submittalsStore);
  const DEMO_CONSULTANT_ISSUED = useCollection(consultantIssuedStore);
  const [, navigate] = useLocation();

  // Filter submittals for current contractor (ABC Construction)
  const mySubmittals = DEMO_SUBMITTALS.filter((s) => s.contractor === "ABC Construction LLC" || s.contractor === "Gulf MEP Systems LLC");
  const openSubmittals = mySubmittals.filter((s) => !["Approved", "Rejected"].includes(s.status));
  const actionRequired = mySubmittals.filter((s) => s.status === "Resubmit" || s.status === "Need More Info");
  const recentApproved = mySubmittals.filter((s) => s.status === "Approved" || s.status === "Approved with Comments");
  const consultantItems = DEMO_CONSULTANT_ISSUED.filter((i) => i.contractor === "ABC Construction LLC" || i.contractor === "Gulf MEP Systems LLC");

  const totalSubmitted = mySubmittals.length;
  const approvalRate = totalSubmitted > 0 ? Math.round((recentApproved.length / totalSubmitted) * 100) : 0;
  const breachedCount = mySubmittals.filter((s) => s.daysRemaining < 0).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Marina Heights Tower — Post-Contract Supervision</p>
        </div>
        <Button onClick={() => navigate("/contractor-portal/new")} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          New Submittal
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-[11px] text-slate-500 uppercase">Open Submittals</span>
            </div>
            <p className="text-2xl font-bold font-data text-slate-900">{openSubmittals.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting response</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-[11px] text-slate-500 uppercase">Action Required</span>
            </div>
            <p className="text-2xl font-bold font-data text-slate-900">{actionRequired.length}</p>
            <p className="text-[11px] text-orange-600 mt-1">Resubmission needed</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] text-slate-500 uppercase">Approval Rate</span>
            </div>
            <p className="text-2xl font-bold font-data text-slate-900">{approvalRate}%</p>
            <Progress value={approvalRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4 text-red-600" />
              <span className="text-[11px] text-slate-500 uppercase">SLA Breached</span>
            </div>
            <p className="text-2xl font-bold font-data text-slate-900">{breachedCount}</p>
            <p className="text-[11px] text-red-600 mt-1">Escalated to PM</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Open Submittals */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Open Submittals</h2>
            <Button variant="ghost" size="sm" className="text-teal-600 gap-1" onClick={() => navigate("/contractor-portal/submittals")}>
              View All <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {openSubmittals.slice(0, 5).map((s) => (
              <SubmittalCard key={s.id} submittal={s} onClick={() => navigate(`/contractor-portal/submittals/${s.id}`)} />
            ))}
            {openSubmittals.length === 0 && (
              <Card className="border border-dashed border-slate-300">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">All submittals responded to!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Action Required */}
          {actionRequired.length > 0 && (
            <Card className="border border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Action Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {actionRequired.map((s) => (
                  <div key={s.id} className="p-2 rounded bg-white border border-orange-200 cursor-pointer hover:border-orange-300" onClick={() => navigate(`/contractor-portal/submittals/${s.id}`)}>
                    <p className="text-xs font-mono font-medium text-orange-700">{s.ref}</p>
                    <p className="text-xs text-slate-600 truncate">{s.title}</p>
                    <Badge className="mt-1 text-[9px] bg-orange-100 text-orange-700">Resubmit Required</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Consultant Issued */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Inbox className="w-4 h-4 text-slate-500" />
                From Consultant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {consultantItems.map((item) => (
                <div key={item.id} className="p-2 rounded border border-slate-200 hover:border-slate-300 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono font-medium text-slate-700">{item.ref}</p>
                    <Badge variant="outline" className={`text-[9px] ${item.status === "Action Required" ? "border-red-200 text-red-600" : "border-slate-200 text-slate-500"}`}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 truncate mt-0.5">{item.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Submitted</span><span className="font-medium">{totalSubmitted}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Approved</span><span className="font-medium text-emerald-600">{recentApproved.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Avg. Response</span><span className="font-medium">4.2 working days</span></div>
                <div className="flex justify-between"><span className="text-slate-500">SLA Compliance</span><span className="font-medium text-emerald-600">87%</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SubmittalCard({ submittal, onClick }: { submittal: PortalSubmittal; onClick: () => void }) {
  const slaStatus = getSLAStatus(submittal.daysRemaining);
  return (
    <Card className={`border cursor-pointer hover:shadow-sm transition-shadow ${SLA_BG_COLORS[slaStatus]}`} onClick={onClick}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-slate-800">{submittal.ref}</span>
              <Badge className={`text-[9px] px-1.5 ${RESPONSE_STATUS_COLORS[submittal.status]}`}>{submittal.status}</Badge>
              {submittal.priority === "Urgent" && <Badge className="text-[9px] px-1.5 bg-red-100 text-red-700">Urgent</Badge>}
            </div>
            <p className="text-sm text-slate-700 truncate">{submittal.title}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] text-slate-500">{submittal.discipline}</span>
              <span className="text-[11px] text-slate-400">•</span>
              <ReviewerBadge role={submittal.primaryReviewer} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <SLAClock daysRemaining={submittal.daysRemaining} />
            <p className="text-[10px] text-slate-400 mt-0.5">Due: {submittal.slaDeadline}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
