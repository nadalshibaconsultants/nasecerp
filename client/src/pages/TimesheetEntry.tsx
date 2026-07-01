/**
 * Daily Timesheet Entry — Visual Timeline
 * Target: < 90 seconds per day
 * Features: Pre-populated from tasks, drag-resize bars, one-click templates, voice entry
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Copy,
  Mic,
  Lock,
  Send,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// Time categories with colors
const categories = [
  { id: "billable", label: "Billable Project Work", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50" },
  { id: "meeting", label: "Internal Meetings", color: "bg-purple-500", textColor: "text-purple-700", bgLight: "bg-purple-50" },
  { id: "training", label: "Training / CPD", color: "bg-emerald-500", textColor: "text-emerald-700", bgLight: "bg-emerald-50" },
  { id: "admin", label: "Admin / Non-Billable", color: "bg-gray-400", textColor: "text-gray-700", bgLight: "bg-gray-50" },
  { id: "leave", label: "Leave", color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-50" },
];

// Pre-populated timesheet entries (from active tasks + calendar)
const todayEntries = [
  { id: 1, project: "Al Wasl Tower", task: "DD Package - Level 15-20", category: "billable", startHour: 9, duration: 3, phase: "Design Development" },
  { id: 2, project: "—", task: "Team coordination meeting", category: "meeting", startHour: 12, duration: 1, phase: "—" },
  { id: 3, project: "Marina Heights", task: "Authority submission review", category: "billable", startHour: 13, duration: 2, phase: "Authority Submission" },
  { id: 4, project: "Al Wasl Tower", task: "BIM coordination", category: "billable", startHour: 15, duration: 2, phase: "Design Development" },
  { id: 5, project: "—", task: "Admin / emails", category: "admin", startHour: 17, duration: 1, phase: "—" },
];

// Weekly summary
const weekDays = [
  { day: "Mon", date: "May 5", hours: 8, status: "approved" },
  { day: "Tue", date: "May 6", hours: 8, status: "current" },
  { day: "Wed", date: "May 7", hours: 0, status: "empty" },
  { day: "Thu", date: "May 8", hours: 0, status: "empty" },
  { day: "Fri", date: "May 9", hours: 0, status: "empty" },
];

export default function TimesheetEntry() {
  const [, navigate] = useLocation();
  const [entries, setEntries] = useState(todayEntries);
  const [selectedDate] = useState("2026-05-06");

  const totalHours = entries.reduce((sum, e) => sum + e.duration, 0);
  const billableHours = entries.filter(e => e.category === "billable").reduce((sum, e) => sum + e.duration, 0);
  const targetHours = 8;

  const handleConfirm = () => {
    toast.success("Timesheet confirmed for today!", {
      description: `${totalHours} hours logged (${billableHours}h billable)`,
    });
  };

  const handleSameAsYesterday = () => {
    toast.success("Copied yesterday's timesheet", {
      description: "Adjust as needed before confirming",
    });
  };

  const handleVoiceEntry = () => {
    toast.info("Voice entry activated", {
      description: "Say: 'Log 3 hours on Al Wasl Tower, design development, facade study'",
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/attendance")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Attendance
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Timesheet</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tuesday, May 6, 2026 · Target: 90 seconds to complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleSameAsYesterday}>
            <Copy className="w-4 h-4" />
            Same as Yesterday
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleVoiceEntry}>
            <Mic className="w-4 h-4" />
            Voice
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm"><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-medium">Week of May 5 – May 9, 2026</span>
            <Button variant="ghost" size="sm"><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {weekDays.map(d => (
              <div
                key={d.day}
                className={`p-3 rounded-lg text-center cursor-pointer transition-all ${
                  d.status === "current" ? "bg-primary text-primary-foreground ring-2 ring-primary" :
                  d.status === "approved" ? "bg-emerald-50 border border-emerald-200" :
                  "bg-secondary/50 border border-border"
                }`}
              >
                <p className={`text-xs font-medium ${d.status === "current" ? "text-primary-foreground" : ""}`}>{d.day}</p>
                <p className={`text-lg font-mono font-bold ${d.status === "current" ? "text-primary-foreground" : ""}`}>
                  {d.hours > 0 ? `${d.hours}h` : "—"}
                </p>
                <p className={`text-[10px] ${d.status === "current" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{d.date}</p>
                {d.status === "approved" && <CheckCircle2 className="w-3 h-3 text-emerald-600 mx-auto mt-1" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-mono font-bold">{totalHours}h</p>
            <p className="text-xs text-muted-foreground">Total Today</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-mono font-bold text-blue-600">{billableHours}h</p>
            <p className="text-xs text-muted-foreground">Billable</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-mono font-bold">{Math.round((billableHours / totalHours) * 100)}%</p>
            <p className="text-xs text-muted-foreground">Utilization</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-mono font-bold ${totalHours >= targetHours ? "text-emerald-600" : "text-amber-600"}`}>
              {totalHours >= targetHours ? "✓" : `${targetHours - totalHours}h`}
            </p>
            <p className="text-xs text-muted-foreground">{totalHours >= targetHours ? "Target Met" : "Remaining"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Timeline */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Today's Timeline</CardTitle>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px]">Pre-populated from tasks</Badge>
              <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Auto-suggested
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Hour markers */}
          <div className="relative">
            <div className="flex items-center mb-2">
              {Array.from({ length: 10 }, (_, i) => i + 9).map(hour => (
                <div key={hour} className="flex-1 text-center">
                  <span className="text-[10px] font-mono text-muted-foreground">{hour}:00</span>
                </div>
              ))}
            </div>

            {/* Timeline bars */}
            <div className="relative h-16 bg-secondary/30 rounded-lg border border-border overflow-hidden">
              {/* Grid lines */}
              <div className="absolute inset-0 flex">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="flex-1 border-r border-border/50 last:border-0" />
                ))}
              </div>

              {/* Entry bars */}
              {entries.map(entry => {
                const cat = categories.find(c => c.id === entry.category);
                const left = ((entry.startHour - 9) / 10) * 100;
                const width = (entry.duration / 10) * 100;
                return (
                  <div
                    key={entry.id}
                    className={`absolute top-2 bottom-2 ${cat?.color} rounded-md flex items-center px-2 cursor-pointer hover:opacity-90 transition-opacity`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${entry.task} (${entry.duration}h)`}
                  >
                    <span className="text-[10px] text-white font-medium truncate">
                      {entry.duration >= 2 ? entry.task : `${entry.duration}h`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3">
              {categories.filter(c => entries.some(e => e.category === c.id)).map(cat => (
                <div key={cat.id} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${cat.color}`} />
                  <span className="text-[10px] text-muted-foreground">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entry list (editable) */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {entries.map(entry => {
              const cat = categories.find(c => c.id === entry.category);
              return (
                <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-lg border border-border ${cat?.bgLight}`}>
                  <div className={`w-1.5 h-10 rounded-full ${cat?.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{entry.task}</p>
                      <Badge variant="secondary" className="text-[10px]">{entry.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.project !== "—" ? `${entry.project} · ${entry.phase}` : "Non-project"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold">{entry.duration}h</p>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.startHour}:00 – {entry.startHour + entry.duration}:00
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add entry */}
          <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground border border-dashed border-border">
            + Add time entry
          </Button>
        </CardContent>
      </Card>

      {/* Progress toward target */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Daily target: {targetHours} hours</span>
          <span className="text-sm font-data font-bold">{totalHours}/{targetHours}h</span>
        </div>
        <Progress value={(totalHours / targetHours) * 100} className="h-3" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Auto-saved · Last edit: just now
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => toast.info("Timesheet saved as draft")}>
            Save Draft
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <Send className="w-4 h-4" />
            Confirm & Submit
          </Button>
        </div>
      </div>

      {/* Weekly approval info */}
      <Card className="border border-border bg-secondary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Weekly Approval Flow</p>
              <p className="text-xs text-muted-foreground mt-1">
                Friday afternoon: your timesheet auto-locks → PM reviews all team timesheets → 
                Bulk approve or flag entries → Monday morning HR sees clean approved data for payroll.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
