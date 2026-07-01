/**
 * Contractor Submittal Detail — Full view with status tracker, routing, response, SLA
 */
import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  FileText,
  Download,
  MapPin,
  User,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  Paperclip,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  SITE_ROLES,
  MARINA_HEIGHTS_TEAM,
  RESPONSE_STATUS_COLORS,
  SLA_COLORS,
  SLA_BG_COLORS,
  getSLAStatus,
  type SiteRoleCode,
  type PortalSubmittal,
} from "@/lib/contractor-portal-data";
import { submittalsStore, notificationsStore, auditStore, usersStore, submittalCommentsStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useAuth, useCurrentActor } from "@/lib/auth/AuthContext";
import { Textarea } from "@/components/ui/textarea";

export default function ContractorSubmittalDetail() {
  const DEMO_SUBMITTALS = useCollection(submittalsStore);
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const submittal = useMemo(() => DEMO_SUBMITTALS.find((s) => s.id === params.id) || DEMO_SUBMITTALS[0], [params.id]);
  const slaStatus = getSLAStatus(submittal.daysRemaining);

  const reviewers = Array.isArray(submittal.primaryReviewer) ? submittal.primaryReviewer : [submittal.primaryReviewer];

  // Timeline events
  const timeline = useMemo(() => {
    const events: Array<{ date: string; label: string; detail: string; type: "submit" | "route" | "review" | "response" | "escalate" }> = [
      { date: submittal.dateSubmitted, label: "Submitted", detail: `By ${submittal.contractorUser} via Portal`, type: "submit" },
      { date: submittal.dateSubmitted, label: "Auto-Routed", detail: `To ${reviewers.join(" + ")} (Primary) → ${submittal.approver} (Approver)`, type: "route" },
    ];
    if (submittal.status === "Under Review" || submittal.status === "Approved" || submittal.status === "Approved with Comments" || submittal.status === "Resubmit") {
      events.push({ date: submittal.dateSubmitted, label: "Under Review", detail: `${reviewers.map(r => MARINA_HEIGHTS_TEAM[r]?.name || r).join(" + ")} reviewing`, type: "review" });
    }
    if (submittal.responseDate) {
      events.push({ date: submittal.responseDate, label: submittal.status, detail: submittal.responseBy || "—", type: "response" });
    }
    if (submittal.daysRemaining < 0) {
      events.push({ date: submittal.slaDeadline, label: "SLA Breached", detail: "Escalated to PM", type: "escalate" });
    }
    return events;
  }, [submittal]);

  // Auth + actor
  const { hasRole } = useAuth();
  const actor = useCurrentActor();
  const users = useCollection(usersStore);
  const allComments = useCollection(submittalCommentsStore);
  const myComments = allComments.filter((c) => c.submittalId === submittal.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const [commentDraft, setCommentDraft] = useState("");
  const canRespond = hasRole("director", "pm", "site-engineer", "design-lead");
  const [respStatus, setRespStatus] = useState<typeof submittal.status>(submittal.status);
  const [respComments, setRespComments] = useState("");

  function postResponse() {
    if (!respComments.trim() && respStatus !== "Approved") { return; }
    const today = new Date();
    const newRev = respStatus === "Resubmit" ? submittal.revision + 1 : submittal.revision;
    submittalsStore.put({ ...submittal, status: respStatus as any, revision: newRev, comments: respComments, responseBy: actor, responseDate: today.toISOString().slice(0, 10) } as any);
    auditStore.put({ id: newId("au"), timestamp: today.toISOString(), actor, module: "documents" as any, action: respStatus === "Approved" || respStatus === "Approved with Comments" ? "approve" : respStatus === "Rejected" ? "reject" : "update", subject: `${submittal.ref} → ${respStatus}`, detail: respComments });
    // Notify back to the contractor (mocked: any user with role employee or any role can serve as contractor for now — in real backend this would be the contractor user)
    notificationsStore.put({ id: newId("notif"), recipientUserId: "*", kind: "leave-decided" as any, severity: respStatus === "Rejected" ? "critical" : "info", title: `${submittal.ref}: ${respStatus}`, body: respComments || "(no comment)", link: `/contractor-portal/submittals/${submittal.id}`, read: false, createdAt: today.toISOString(), sourceEntityType: "submittal", sourceEntityId: submittal.id } as any);
    setRespComments("");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/contractor-portal/submittals")} className="gap-1 text-slate-500">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-mono">{submittal.ref}</h1>
              <Badge className={`${RESPONSE_STATUS_COLORS[submittal.status]}`}>{submittal.status}</Badge>
              {submittal.priority === "Urgent" && <Badge className="bg-red-100 text-red-700 text-[10px]">Urgent</Badge>}
              {submittal.revision > 1 && <Badge variant="outline" className="text-[10px]">Rev.{submittal.revision}</Badge>}
            </div>
            <p className="text-sm text-slate-600 mt-0.5">{submittal.title}</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border ${SLA_BG_COLORS[slaStatus]}`}>
          <span className={`flex items-center gap-1 text-sm font-mono font-medium ${SLA_COLORS[slaStatus]}`}>
            <Clock className="w-4 h-4" />
            {submittal.daysRemaining <= 0 ? `${Math.abs(submittal.daysRemaining)}d OVERDUE` : `${submittal.daysRemaining}d remaining`}
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">Deadline: {submittal.slaDeadline}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 leading-relaxed">{submittal.description}</p>
            </CardContent>
          </Card>

          {canRespond && submittal.status !== "Approved" && submittal.status !== "Rejected" && (
            <Card className="border border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Respond as consultant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(["Approved", "Approved with Comments", "Resubmit", "Rejected", "Need More Info"] as const).map((opt) => (
                    <Button key={opt} size="sm" variant={respStatus === opt ? "default" : "outline"} className={respStatus === opt ? (opt === "Rejected" ? "bg-red-600" : opt === "Approved" || opt === "Approved with Comments" ? "bg-emerald-600" : opt === "Resubmit" ? "bg-orange-600" : "") : ""} onClick={() => setRespStatus(opt as any)}>{opt}</Button>
                  ))}
                </div>
                <Textarea rows={3} placeholder="Comment / instructions to contractor…" value={respComments} onChange={(e) => setRespComments(e.target.value)} />
                <div className="flex justify-end">
                  <Button onClick={postResponse} className="gap-1.5 bg-blue-600 hover:bg-blue-700">Post response</Button>
                </div>
                <p className="text-[11px] text-slate-500">{respStatus === "Resubmit" ? `On Resubmit, revision auto-increments to Rev.${submittal.revision + 1}.` : respStatus === "Need More Info" ? "SLA pauses on Need More Info." : ""}</p>
              </CardContent>
            </Card>
          )}

          {/* Response (if exists) */}
          {submittal.comments && (
            <Card className={`border ${submittal.status === "Resubmit" ? "border-orange-200 bg-orange-50/30" : "border-emerald-200 bg-emerald-50/30"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Consultant Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="text-[10px] bg-slate-100">{submittal.responseBy?.split(" ").map(w => w[0]).join("").slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{submittal.responseBy}</span>
                      <span className="text-[11px] text-slate-400">{submittal.responseDate}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{submittal.comments}</p>
                  </div>
                </div>
                {submittal.status === "Resubmit" && (
                  <Button className="mt-3 bg-orange-600 hover:bg-orange-700 text-white gap-2" size="sm" onClick={() => {
                    const newRev = submittal.revision + 1;
                    submittalsStore.put({ ...submittal, revision: newRev, status: "Under Review", responseDate: undefined, responseBy: undefined, comments: undefined, dateSubmitted: new Date().toISOString().slice(0,10) } as any);
                    submittalCommentsStore.put({ id: newId("c"), submittalId: submittal.id, authorUserId: "contractor", authorDisplay: submittal.contractorUser, authorRole: "contractor", body: `Submitted Rev.${newRev}`, createdAt: new Date().toISOString() });
                    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: submittal.contractorUser, module: "documents" as any, action: "update", subject: `${submittal.ref} Rev.${newRev} submitted` });
                    toast.success(`Rev.${newRev} submitted — back under review.`);
                  }}>
                    <RefreshCw className="w-3 h-3" /> Submit Rev.{submittal.revision + 1}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}


          {/* Conversation thread */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myComments.length === 0 && <p className="text-xs text-slate-500">No comments yet. Start a thread with the consultant.</p>}
              {myComments.map((c) => (
                <div key={c.id} className={`flex gap-3 ${c.authorRole === "contractor" ? "" : "flex-row-reverse text-right"}`}>
                  <Avatar className="h-8 w-8 border shrink-0"><AvatarFallback className="text-[10px] bg-slate-100">{c.authorDisplay.split(" ").map((s) => s[0]).join("").slice(0,2)}</AvatarFallback></Avatar>
                  <div className={`max-w-[80%] ${c.authorRole === "contractor" ? "" : "ml-auto"}`}>
                    <div className="text-xs text-slate-500">{c.authorDisplay} <span className="ml-1">· {new Date(c.createdAt).toLocaleString("en-GB", { timeZone: "UTC", hour12: true })}</span></div>
                    <div className={`mt-1 rounded-lg px-3 py-2 text-sm ${c.authorRole === "contractor" ? "bg-slate-100" : "bg-emerald-50 border border-emerald-200"}`}>{c.body}</div>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Textarea rows={2} placeholder="Add a note for the consultant…" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
                <Button onClick={() => {
                  if (!commentDraft.trim()) return;
                  submittalCommentsStore.put({ id: newId("c"), submittalId: submittal.id, authorUserId: "contractor", authorDisplay: submittal.contractorUser, authorRole: "contractor", body: commentDraft, createdAt: new Date().toISOString() });
                  setCommentDraft("");
                }} className="self-end">Send</Button>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments ({submittal.attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {submittal.attachments.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{file}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => toast.info("Download started (demo)")}>
                      <Download className="w-3 h-3" /> Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2.5 top-2 bottom-2 w-px bg-slate-200" />
                {timeline.map((event, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[14px] w-5 h-5 rounded-full flex items-center justify-center ${
                      event.type === "submit" ? "bg-blue-100 text-blue-600" :
                      event.type === "route" ? "bg-teal-100 text-teal-600" :
                      event.type === "review" ? "bg-amber-100 text-amber-600" :
                      event.type === "response" ? "bg-emerald-100 text-emerald-600" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {event.type === "submit" && <Send className="w-2.5 h-2.5" />}
                      {event.type === "route" && <ExternalLink className="w-2.5 h-2.5" />}
                      {event.type === "review" && <Clock className="w-2.5 h-2.5" />}
                      {event.type === "response" && <CheckCircle2 className="w-2.5 h-2.5" />}
                      {event.type === "escalate" && <AlertTriangle className="w-2.5 h-2.5" />}
                    </div>
                    <div className="ml-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-800">{event.label}</span>
                        <span className="text-[10px] text-slate-400">{event.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{event.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Routing Info */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Routing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-[11px] text-slate-500 mb-1">Primary Reviewer(s)</p>
                {reviewers.map((r) => (
                  <div key={r} className="flex items-center gap-2 p-1.5 rounded bg-slate-50 mb-1">
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-teal-100 text-teal-700">{MARINA_HEIGHTS_TEAM[r]?.avatar}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-xs font-medium">{MARINA_HEIGHTS_TEAM[r]?.name}</p>
                      <Badge variant="outline" className={`text-[9px] ${SITE_ROLES[r].color}`}>{r}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div>
                <p className="text-[11px] text-slate-500 mb-1">Approver</p>
                <div className="flex items-center gap-2 p-1.5 rounded bg-slate-50">
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-slate-200">{MARINA_HEIGHTS_TEAM[submittal.approver]?.avatar}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-xs font-medium">{MARINA_HEIGHTS_TEAM[submittal.approver]?.name}</p>
                    <Badge variant="outline" className={`text-[9px] ${SITE_ROLES[submittal.approver].color}`}>{submittal.approver}</Badge>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-[11px] text-slate-500 mb-1">Watchers</p>
                <div className="flex flex-wrap gap-1">
                  {submittal.watchers.map((r) => (
                    <Badge key={r} variant="outline" className={`text-[9px] ${SITE_ROLES[r].color}`}>{r} — {SITE_ROLES[r].label}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium">{submittal.type}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Discipline</span><span className="font-medium">{submittal.discipline}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Contractor</span><span className="font-medium">{submittal.contractor}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Submitted By</span><span className="font-medium">{submittal.contractorUser}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Date Submitted</span><span className="font-medium">{submittal.dateSubmitted}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">SLA Deadline</span><span className="font-medium">{submittal.slaDeadline}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Revision</span><span className="font-medium">{submittal.revision}</span></div>
              {submittal.location && (
                <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="font-medium flex items-center gap-1"><MapPin className="w-3 h-3" />{submittal.location}</span></div>
              )}
              <div className="flex justify-between"><span className="text-slate-500">Source</span><Badge className="bg-teal-100 text-teal-700 text-[9px]">Portal</Badge></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
