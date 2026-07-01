import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Plus, Star } from "lucide-react";
import { employeesStore, reviewsStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import type { PerformanceReview } from "@/lib/hr/extra-types";

const SCORE_DIMENSIONS = ["Delivery", "Quality", "Teamwork", "Client communication", "Compliance"];

export default function Reviews() {
  const actor = useCurrentActor();
  const employees = useCollection(employeesStore);
  const reviews = useCollection(reviewsStore);
  useCollection(auditStore);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<PerformanceReview>>({
    period: `FY${new Date().getFullYear()}`,
    date: new Date().toISOString().slice(0, 10),
    status: "draft",
    overallRating: 4,
    scores: SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 4, max: 5 })),
  });

  function addReview(status: PerformanceReview["status"] = "submitted") {
    if (!draft.employeeId || !draft.period || !draft.managerComments) {
      toast.error("Pick employee, period, and manager comments");
      return;
    }
    const scores = draft.scores?.length ? draft.scores : SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 4, max: 5 }));
    const overall = scores.reduce((sum, s) => sum + (Number(s.score) / Number(s.max || 5)) * 5, 0) / scores.length;
    const review: PerformanceReview = {
      id: newId("rv"),
      employeeId: draft.employeeId,
      reviewerId: draft.reviewerId || "",
      period: draft.period,
      date: draft.date || new Date().toISOString().slice(0, 10),
      scores,
      overallRating: Number(overall.toFixed(2)),
      managerComments: draft.managerComments,
      employeeComments: draft.employeeComments,
      status,
    };
    reviewsStore.put(review);
    auditStore.put({
      id: newId("au"),
      timestamp: new Date().toISOString(),
      actor,
      module: "performance",
      action: "create",
      subject: `Review ${review.period} · ${empName(review.employeeId)}`,
      detail: `Rating ${review.overallRating}/5 · ${status}`,
    });
    toast.success(status === "draft" ? "Review draft saved" : "Review submitted");
    setOpen(false);
    setDraft({
      period: `FY${new Date().getFullYear()}`,
      date: new Date().toISOString().slice(0, 10),
      status: "draft",
      overallRating: 4,
      scores: SCORE_DIMENSIONS.map((dimension) => ({ dimension, score: 4, max: 5 })),
    });
  }

  function updateScore(dimension: string, score: number) {
    setDraft((current) => ({
      ...current,
      scores: (current.scores || SCORE_DIMENSIONS.map((d) => ({ dimension: d, score: 4, max: 5 }))).map((s) => (
        s.dimension === dimension ? { ...s, score: Math.max(1, Math.min(5, score)) } : s
      )),
    }));
  }

  function acknowledge(review: PerformanceReview) {
    reviewsStore.put({ ...review, status: "acknowledged" });
    auditStore.put({
      id: newId("au"),
      timestamp: new Date().toISOString(),
      actor,
      module: "performance",
      action: "approve",
      subject: `Review acknowledged · ${empName(review.employeeId)}`,
      detail: review.period,
    });
    toast.success("Review acknowledged");
  }

  function empName(id?: string) {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id || "Employee";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold flex items-center gap-2"><Star className="w-4 h-4" /> Performance Reviews</h3>
        <Button size="sm" className="gap-1.5 border border-yellow-300 bg-yellow-500 text-white hover:bg-yellow-600" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> New review</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {reviews.map((r) => {
          const emp = employees.find((e) => e.id === r.employeeId);
          const reviewer = employees.find((e) => e.id === r.reviewerId);
          return (
            <Card key={r.id} className="border-slate-200 hover:border-yellow-300 hover:shadow-sm transition-all">
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{emp?.firstName[0]}{emp?.lastName[0]}</AvatarFallback></Avatar>
                  <div>{emp?.firstName} {emp?.lastName} · <span className="text-xs text-slate-500">{r.period}</span></div>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{r.overallRating.toFixed(2)} / 5</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-500 mb-2">Reviewer: {reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : r.reviewerId} · Date: {r.date}</div>
                <div className="space-y-1.5">
                  {r.scores.map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs"><span>{s.dimension}</span><span className="text-slate-500">{s.score}/{s.max}</span></div>
                      <div className="h-1.5 bg-slate-100 rounded overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${(s.score / s.max) * 100}%` }} /></div>
                      {s.comment && <div className="text-[10px] text-slate-500 mt-0.5">{s.comment}</div>}
                    </div>
                  ))}
                </div>
                {r.managerComments && <div className="mt-3 p-2 bg-slate-50 rounded text-xs"><strong>Manager comments:</strong> {r.managerComments}</div>}
                {r.employeeComments && <div className="mt-2 p-2 bg-blue-50 rounded text-xs"><strong>Employee comments:</strong> {r.employeeComments}</div>}
                {r.status !== "acknowledged" && (
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => acknowledge(r)}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {reviews.length === 0 && <Card><CardContent className="p-6 text-sm text-slate-500 text-center">No performance reviews yet.</CardContent></Card>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create performance review</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Employee</Label>
              <Select value={draft.employeeId} onValueChange={(v) => setDraft({ ...draft, employeeId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick employee" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Reviewer</Label>
              <Select value={draft.reviewerId || ""} onValueChange={(v) => setDraft({ ...draft, reviewerId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Current manager" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Period</Label><Input value={draft.period || ""} onChange={(e) => setDraft({ ...draft, period: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Date</Label><Input type="date" value={draft.date || ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1" /></div>
            <div className="col-span-2 grid grid-cols-1 sm:grid-cols-5 gap-2">
              {(draft.scores || []).map((s) => (
                <div key={s.dimension} className="rounded-lg border border-slate-200 p-2 hover:border-yellow-300">
                  <Label className="text-[11px]">{s.dimension}</Label>
                  <Input type="number" min={1} max={5} value={s.score} onChange={(e) => updateScore(s.dimension, Number(e.target.value || 1))} className="mt-1 h-8" />
                </div>
              ))}
            </div>
            <div className="col-span-2"><Label className="text-xs">Manager comments</Label><Textarea rows={3} value={draft.managerComments || ""} onChange={(e) => setDraft({ ...draft, managerComments: e.target.value })} className="mt-1" /></div>
            <div className="col-span-2"><Label className="text-xs">Employee comments</Label><Textarea rows={2} value={draft.employeeComments || ""} onChange={(e) => setDraft({ ...draft, employeeComments: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => addReview("draft")}>Save draft</Button>
            <Button onClick={() => addReview("submitted")}>Submit review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
