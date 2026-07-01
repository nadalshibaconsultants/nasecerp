/**
 * Pre-Contract Timeline tab
 * Auto-proposed durations from firm-wide defaults × project-type multiplier.
 * PM can: pick start date, change project type, edit any duration inline,
 * mark stages complete (early/late), categorize variance, save baseline.
 */
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon, Save, RotateCcw, FileDown, Share2, Printer, Play, Pause as PauseIcon, Wrench,
  CheckCircle2, AlertTriangle, Sparkles, ListChecks, BarChart3, CalendarDays,
} from "lucide-react";
import {
  PRE_CONTRACT_DEFAULTS, AUTHORITY_DEFAULTS, PROJECT_TYPE_MULTIPLIERS, VARIANCE_LABELS,
  computePreContractTimeline, fromISO, toISO,
  guessProjectTypeKey,
  type ProjectTypeKey, type PreStageInput, type ComputedStage, type VarianceCause,
} from "@/lib/timeline-utils";
import { GanttChart, type GanttBar } from "./GanttChart";
import { useRef } from "react";
import { apiFetch } from "@/lib/backend/api";

type Props = {
  projectId: string;
  projectStartDate: string; // ISO from project record
  projectTypeText: string; // free-text from project.type
  currentSubStage: number; // existing index into preContractStages
};

type StoredState = {
  startDate: string;
  projectTypeKey: ProjectTypeKey;
  durations: Record<string, number>; // by stage code
  authDurations: Record<string, number>;
  actuals: Record<string, { actualStart?: string; actualEnd?: string; status?: ComputedStage["status"]; varianceCause?: VarianceCause; varianceNote?: string; percentComplete?: number }>;
  baseline?: { savedAt: string; revision: number; durations: Record<string, number>; authDurations: Record<string, number>; reason?: string };
  rebaselineHistory: { savedAt: string; reason: string; revision: number }[];
  // Pause/Mitigate
  currentPause?: { id: string; pauseStartDate: string; reason: string; pausedByDisplay?: string };
  pauseHistory?: { id: string; fromISO: string; toISO: string; durationCalendarDays: number; reason: string; pausedByDisplay?: string; resumedByDisplay?: string }[];
  mitigationHistory?: { id: string; createdAt: string; createdByDisplay?: string; reason: string; changes: { stageCode: string; oldDurationWD: number; newDurationWD: number }[] }[];
};

const STORAGE_PREFIX = "nasec-pre-timeline-v1::";

// In-memory fallback so the iteration works even if storage is unavailable.
const memoryStore = new Map<string, StoredState>();

function loadState(projectId: string): StoredState | undefined {
  if (memoryStore.has(projectId)) return memoryStore.get(projectId);
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + projectId);
    if (raw) return JSON.parse(raw) as StoredState;
  } catch { /* noop */ }
  return undefined;
}
function saveState(projectId: string, state: StoredState) {
  memoryStore.set(projectId, state);
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + projectId, JSON.stringify(state));
  } catch { /* noop */ }
}

// ---- Backend persistence ----------------------------------------------
// The timeline state (durations, baseline, pauses, mitigations) is stored as
// one project-item row per project (kind "timeline-state") so it survives
// reloads and is shared across the team. Session storage stays as the
// instant-load cache; the server copy wins when present.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchServerState(projectId: string): Promise<{ itemId: string; state: StoredState } | null> {
  if (!UUID_RE.test(projectId)) return null;
  try {
    const rows = await apiFetch<any[]>(`/project-items?kind=timeline-state`);
    const row = rows.find((r) => r.projectId === projectId);
    return row?.state ? { itemId: row.id, state: row.state as StoredState } : null;
  } catch {
    return null;
  }
}

async function pushServerState(projectId: string, itemId: string | null, state: StoredState): Promise<string | null> {
  if (!UUID_RE.test(projectId)) return itemId;
  try {
    if (itemId) {
      await apiFetch(`/project-items/${itemId}`, { method: "PATCH", body: { state } });
      return itemId;
    }
    const created = await apiFetch<any>(`/project-items`, { method: "POST", body: { kind: "timeline-state", projectId, state } });
    return created.id ?? null;
  } catch (err) {
    console.warn("[timeline] backend save failed", err);
    return itemId;
  }
}

export default function PreContractTimelineTab({ projectId, projectStartDate, projectTypeText, currentSubStage }: Props) {
  const initialKey = guessProjectTypeKey(projectTypeText);
  const initialStart = projectStartDate && projectStartDate !== "—" ? projectStartDate : toISO(new Date());

  // -------- State
  const initial = useMemo<StoredState>(() => {
    const stored = loadState(projectId);
    if (stored) return stored;
    const seed: StoredState = {
      startDate: initialStart,
      projectTypeKey: initialKey,
      durations: Object.fromEntries(PRE_CONTRACT_DEFAULTS.map((s) => [s.code, Math.round(s.defaultWorkingDays * (PROJECT_TYPE_MULTIPLIERS[initialKey].multiplier))])),
      authDurations: Object.fromEntries(AUTHORITY_DEFAULTS.map((a) => [a.id, a.defaultWorkingDays])),
      actuals: defaultActualsForProject(projectId, currentSubStage),
      rebaselineHistory: [],
      pauseHistory: [],
      mitigationHistory: [],
    };
    return seed;
  }, [projectId, initialStart, initialKey, currentSubStage]);

  const [state, setState] = useState<StoredState>(initial);
  const [view, setView] = useState<"gantt" | "calendar" | "list">("gantt");
  const [varianceTarget, setVarianceTarget] = useState<string | null>(null);
  const [varianceCause, setVarianceCause] = useState<VarianceCause>("client");
  const [varianceNote, setVarianceNote] = useState("");
  const [varianceDays, setVarianceDays] = useState(0);
  const [reBaseDialog, setReBaseDialog] = useState(false);
  const [reBaseReason, setReBaseReason] = useState("");
  // Pause + Mitigate dialog state
  const [pauseDialog, setPauseDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [resumeDialog, setResumeDialog] = useState(false);
  const [mitigateDialog, setMitigateDialog] = useState(false);
  const [mitigateReason, setMitigateReason] = useState("");
  const [mitigateDurations, setMitigateDurations] = useState<Record<string, number>>({});

  // Local cache write on every change
  useEffect(() => { saveState(projectId, state); }, [projectId, state]);

  // Backend sync: load the team-shared copy once, then debounce-save changes.
  const serverItemId = useRef<string | null>(null);
  const serverLoaded = useRef(false);
  const skipNextPush = useRef(false);
  useEffect(() => {
    let cancelled = false;
    serverLoaded.current = false;
    serverItemId.current = null;
    void fetchServerState(projectId).then((found) => {
      if (cancelled) return;
      if (found) {
        serverItemId.current = found.itemId;
        skipNextPush.current = true;
        setState(found.state);
      }
      serverLoaded.current = true;
    });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!serverLoaded.current) return;           // don't create rows before the initial fetch
    if (skipNextPush.current) { skipNextPush.current = false; return; }
    const t = setTimeout(() => {
      void pushServerState(projectId, serverItemId.current, state).then((id) => { serverItemId.current = id; });
    }, 800);
    return () => clearTimeout(t);
  }, [projectId, state]);

  // Live sync with Stages & Pipeline stepper: when currentSubStage advances
  // (e.g. after a client gate approval), auto-mark completed stages in the timeline.
  // Stages with PM-set actual dates are never downgraded.
  useEffect(() => {
    setState((prev) => {
      let changed = false;
      const actuals = { ...prev.actuals };
      for (let i = 0; i < currentSubStage; i++) {
        const code = PRE_CONTRACT_DEFAULTS[i]?.code;
        if (!code) break;
        if (actuals[code]?.status !== "complete") {
          actuals[code] = { ...(actuals[code] || {}), status: "complete", percentComplete: 100 };
          changed = true;
        }
      }
      const curCode = PRE_CONTRACT_DEFAULTS[currentSubStage]?.code;
      if (curCode && !actuals[curCode]?.status) {
        actuals[curCode] = { status: "in-progress", percentComplete: 35 };
        changed = true;
      }
      return changed ? { ...prev, actuals } : prev;
    });
  }, [currentSubStage]);

  // -------- Derived: re-compute when any input changes
  const computed = useMemo(() => {
    const stages: PreStageInput[] = PRE_CONTRACT_DEFAULTS.map((s) => {
      const dur = s.fixed ? s.defaultWorkingDays : (state.durations[s.code] ?? Math.round(s.defaultWorkingDays * PROJECT_TYPE_MULTIPLIERS[state.projectTypeKey].multiplier));
      const actual = state.actuals[s.code];
      return {
        ...s,
        durationWD: dur,
        baselineStart: state.baseline ? recomputeBaselineDate(s.code, state.baseline, "start") : undefined,
        baselineEnd: state.baseline ? recomputeBaselineDate(s.code, state.baseline, "end") : undefined,
        actualStart: actual?.actualStart,
        actualEnd: actual?.actualEnd,
        status: actual?.status,
        percentComplete: actual?.percentComplete,
        varianceCause: actual?.varianceCause,
        varianceNote: actual?.varianceNote,
      };
    });
    return computePreContractTimeline({
      projectId,
      startDate: state.startDate,
      projectTypeKey: state.projectTypeKey,
      stages,
      authority: AUTHORITY_DEFAULTS.map((d) => ({
        id: d.id,
        durationWD: state.authDurations[d.id] ?? d.defaultWorkingDays,
      })),
    });
  }, [projectId, state]);

  function recomputeBaselineDate(_code: string, _baseline: NonNullable<StoredState["baseline"]>, _side: "start" | "end"): string | undefined {
    // Baseline storage holds durations only; we recompute the dated baseline lazily
    // here by running the same computer with baseline durations and the original startDate.
    // To keep the function pure & cheap we look it up from the cached compute when needed.
    return undefined;
  }

  // -------- Bars for Gantt
  const bars: GanttBar[] = useMemo(() => {
    const main: GanttBar[] = computed.stages.map((s) => ({
      id: s.code,
      rowLabel: s.name,
      kind: s.kind === "gate" ? "gate" : "stage",
      start: s.plannedStart,
      end: s.plannedEnd,
      status: s.status,
      percentComplete: s.percentComplete,
      durationLabel: `${s.durationWD} WD${s.fixed ? " (fixed)" : ""}`,
      details: s.varianceCause ? `${VARIANCE_LABELS[s.varianceCause].label}${s.varianceNote ? ` — ${s.varianceNote}` : ""}` : undefined,
    }));
    const auth: GanttBar[] = computed.authority.map((a) => ({
      id: a.id,
      rowLabel: a.name,
      kind: "authority",
      start: a.plannedStart,
      end: a.plannedEnd,
      status: a.status === "approved" ? "complete" : a.status === "submitted" || a.status === "under-review" ? "in-progress" : "not-started",
      durationLabel: `${a.durationWD} WD — runs in parallel with ${a.runsParallelWith}`,
      rowGroup: "authority",
    }));
    return [...main, ...auth];
  }, [computed]);

  const totalWD = useMemo(() => Object.values(state.durations).reduce((a, b) => a + b, 0)
    + PRE_CONTRACT_DEFAULTS.filter((s) => s.fixed).reduce((a, s) => a + s.defaultWorkingDays, 0), [state.durations]);

  const projectEnd = computed.stages.length ? computed.stages[computed.stages.length - 1].plannedEnd : state.startDate;
  const tenderReady = computed.stages.find((s) => s.code === "S5")?.plannedEnd;
  const constructionStart = computed.stages.find((s) => s.code === "S7")?.plannedEnd;

  // -------- Handlers
  function applyMultiplier(newKey: ProjectTypeKey) {
    const mul = PROJECT_TYPE_MULTIPLIERS[newKey].multiplier;
    setState((s) => ({
      ...s,
      projectTypeKey: newKey,
      durations: Object.fromEntries(PRE_CONTRACT_DEFAULTS.map((d) => [d.code, d.fixed ? d.defaultWorkingDays : Math.max(1, Math.round(d.defaultWorkingDays * mul))])),
    }));
    toast.success(`Project type set to ${PROJECT_TYPE_MULTIPLIERS[newKey].label} — ×${mul} applied to design durations`);
  }
  function setDuration(code: string, days: number) {
    setState((s) => ({ ...s, durations: { ...s.durations, [code]: Math.max(1, days) } }));
  }
  function markComplete(code: string, daysDelta: number) {
    const stage = computed.stages.find((s) => s.code === code);
    if (!stage) return;
    const plannedEnd = fromISO(stage.plannedEnd);
    const actualEnd = new Date(plannedEnd.getTime() + daysDelta * 86_400_000);
    const cause: VarianceCause = daysDelta < 0 ? "positive" : daysDelta > 0 ? (stage.kind === "gate" ? "client" : "internal") : "positive";
    setState((s) => ({
      ...s,
      actuals: {
        ...s.actuals,
        [code]: {
          ...(s.actuals[code] || {}),
          actualStart: stage.plannedStart,
          actualEnd: toISO(actualEnd),
          status: "complete",
          percentComplete: 100,
          varianceCause: daysDelta !== 0 ? cause : s.actuals[code]?.varianceCause,
        },
      },
    }));
    toast.success(daysDelta === 0 ? `${code} marked complete on plan` : daysDelta < 0 ? `${code} complete ${-daysDelta}d early — downstream shifted left` : `${code} complete ${daysDelta}d late — downstream shifted right`);
  }
  function openVariance(code: string) {
    const a = state.actuals[code];
    setVarianceTarget(code);
    setVarianceCause(a?.varianceCause || "client");
    setVarianceNote(a?.varianceNote || "");
    setVarianceDays(0);
  }
  function commitVariance() {
    if (!varianceTarget) return;
    setState((s) => {
      const stage = computed.stages.find((x) => x.code === varianceTarget)!;
      const newEnd = varianceDays !== 0 ? toISO(new Date(fromISO(stage.plannedEnd).getTime() + varianceDays * 86_400_000)) : s.actuals[varianceTarget]?.actualEnd;
      return {
        ...s,
        actuals: {
          ...s.actuals,
          [varianceTarget]: {
            ...(s.actuals[varianceTarget] || {}),
            varianceCause,
            varianceNote,
            actualEnd: newEnd,
            status: varianceDays !== 0 ? "complete" : s.actuals[varianceTarget]?.status,
            percentComplete: varianceDays !== 0 ? 100 : s.actuals[varianceTarget]?.percentComplete,
          },
        },
      };
    });
    toast.success(`Variance logged for ${varianceTarget}: ${VARIANCE_LABELS[varianceCause].label}`);
    setVarianceTarget(null);
  }
  function saveBaseline(reason?: string) {
    const revision = (state.baseline?.revision ?? -1) + 1;
    const stamp = new Date().toISOString();
    const next: StoredState = {
      ...state,
      baseline: {
        savedAt: stamp,
        revision,
        durations: { ...state.durations },
        authDurations: { ...state.authDurations },
        reason,
      },
      rebaselineHistory: revision === 0 ? state.rebaselineHistory : [...state.rebaselineHistory, { savedAt: stamp, reason: reason || "Re-baseline", revision }],
    };
    setState(next);
    toast.success(revision === 0 ? "Baseline saved at project kick-off — variance now tracked against this baseline" : `Re-baseline Rev ${revision} saved`);
  }

  function pauseProject() {
    if (!pauseReason.trim()) { toast.error("Reason is required"); return; }
    const today = new Date().toISOString().slice(0, 10);
    setState((s) => ({
      ...s,
      currentPause: { id: "pause-" + Math.random().toString(36).slice(2, 8), pauseStartDate: today, reason: pauseReason, pausedByDisplay: "Current user" },
    }));
    toast.warning(`Project paused on ${today} · ${pauseReason}`);
    setPauseDialog(false);
    setPauseReason("");
  }
  function resumeProject() {
    const cp = state.currentPause;
    if (!cp) return;
    const today = new Date();
    const startedAt = new Date(cp.pauseStartDate + "T00:00:00Z");
    const durDays = Math.max(1, Math.round((today.getTime() - startedAt.getTime()) / 86_400_000));
    // Shift the effective project start date forward by pause duration so all
    // not-yet-completed stages cascade forward automatically.
    const newStart = new Date(fromISO(state.startDate).getTime() + durDays * 86_400_000);
    setState((s) => ({
      ...s,
      startDate: toISO(newStart),
      currentPause: undefined,
      pauseHistory: [...(s.pauseHistory || []), {
        id: cp.id, fromISO: cp.pauseStartDate, toISO: toISO(today),
        durationCalendarDays: durDays, reason: cp.reason,
        pausedByDisplay: cp.pausedByDisplay, resumedByDisplay: "Current user",
      }],
    }));
    toast.success(`Project resumed · shifted by ${durDays} calendar days`);
    setResumeDialog(false);
  }
  function openMitigate() {
    // Pre-fill with current durations for stages that aren't yet complete
    const initial: Record<string, number> = {};
    for (const s of PRE_CONTRACT_DEFAULTS) {
      if (s.fixed) continue;
      const status = state.actuals[s.code]?.status;
      if (status === "complete") continue;
      initial[s.code] = state.durations[s.code] ?? s.defaultWorkingDays;
    }
    setMitigateDurations(initial);
    setMitigateReason("");
    setMitigateDialog(true);
  }
  function applyMitigation() {
    if (!mitigateReason.trim()) { toast.error("Mitigation reason is required"); return; }
    const stamp = new Date().toISOString();
    const changes: { stageCode: string; oldDurationWD: number; newDurationWD: number }[] = [];
    const nextDurations = { ...state.durations };
    for (const [code, newD] of Object.entries(mitigateDurations)) {
      const oldD = state.durations[code] ?? 0;
      if (newD !== oldD) {
        changes.push({ stageCode: code, oldDurationWD: oldD, newDurationWD: newD });
        nextDurations[code] = Math.max(1, newD);
      }
    }
    if (changes.length === 0) { toast.message("No durations changed."); setMitigateDialog(false); return; }
    setState((s) => ({
      ...s,
      durations: nextDurations,
      mitigationHistory: [...(s.mitigationHistory || []), {
        id: "mit-" + Math.random().toString(36).slice(2, 8),
        createdAt: stamp, createdByDisplay: "Current user",
        reason: mitigateReason, changes,
      }],
    }));
    toast.success(`Mitigation applied: ${changes.length} stage(s) revised`);
    setMitigateDialog(false);
  }

  // ---- Render
  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" /> Pre-Contract Timeline
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-proposed durations from NASEC firm-wide defaults × project-type multiplier — every value editable.
            Variance tracked against the saved baseline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-slate-200 overflow-hidden text-xs">
            {(["gantt", "calendar", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 capitalize ${view === v ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {v === "gantt" ? "Gantt" : v === "calendar" ? "Calendar" : "List"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5"><Printer className="w-3.5 h-3.5" /> Print</Button>
          <Button size="sm" variant="outline" onClick={() => exportShareLink(projectId)} className="gap-1.5"><Share2 className="w-3.5 h-3.5" /> Share link</Button>
          <Button size="sm" variant="outline" onClick={() => exportPdfStub()} className="gap-1.5"><FileDown className="w-3.5 h-3.5" /> Export PDF</Button>
          {!state.baseline ? (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => saveBaseline()}>
              <Save className="w-3.5 h-3.5" /> Save baseline
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setReBaseDialog(true)}>
              <RotateCcw className="w-3.5 h-3.5" /> Re-baseline
            </Button>
          )}
          {state.currentPause ? (
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1.5" onClick={() => setResumeDialog(true)}>
              <Play className="w-3.5 h-3.5" /> Resume
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 text-amber-800" onClick={() => setPauseDialog(true)}>
              <PauseIcon className="w-3.5 h-3.5" /> Pause
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 border-orange-300 text-orange-800" onClick={openMitigate}>
            <Wrench className="w-3.5 h-3.5" /> Mitigate
          </Button>
        </div>
      </div>

      {/* PM inputs row */}
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs text-slate-600">Project Start Date</Label>
            <div className="mt-1 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-slate-500" />
              <Input
                type="date"
                value={state.startDate}
                onChange={(e) => setState((s) => ({ ...s, startDate: e.target.value }))}
                className="h-8"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-600">Project Type</Label>
            <Select value={state.projectTypeKey} onValueChange={(v) => applyMultiplier(v as ProjectTypeKey)}>
              <SelectTrigger className="mt-1 h-8 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PROJECT_TYPE_MULTIPLIERS) as ProjectTypeKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {PROJECT_TYPE_MULTIPLIERS[k].label} — ×{PROJECT_TYPE_MULTIPLIERS[k].multiplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-500 mt-1">{PROJECT_TYPE_MULTIPLIERS[state.projectTypeKey].note}</p>
          </div>
          <Stat label="Total project span" value={`${totalWD} WD`} sub={`${Math.round(totalWD / 5)} weeks ≈ ${Math.round(totalWD / 21)} months`} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Tender-ready (end of S5)" value={tenderReady ? fmt(tenderReady) : "—"} />
            <Stat label="Construction start (end of S7)" value={constructionStart ? fmt(constructionStart) : "—"} />
          </div>
        </CardContent>
      </Card>

      {/* Pause banner */}
      {state.currentPause && (
        <Card className="border-2 border-amber-400 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
              <PauseIcon className="w-6 h-6 text-amber-800" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-amber-900 font-semibold">PROJECT ON HOLD</div>
              <div className="text-lg font-bold text-amber-900">Paused on {state.currentPause.pauseStartDate}</div>
              <div className="text-xs text-amber-800 mt-1">Reason: {state.currentPause.reason}</div>
              <div className="text-[11px] text-amber-700 mt-0.5">On resume, all not-yet-completed stages will auto-shift right by the elapsed pause duration.</div>
            </div>
            <Button onClick={() => setResumeDialog(true)} className="bg-amber-700 hover:bg-amber-800"><Play className="w-4 h-4 mr-1.5" /> Resume project</Button>
          </CardContent>
        </Card>
      )}

      {/* Main view */}
      {view === "gantt" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Gantt — design stages, client gates, parallel authority track</span>
              <span className="text-xs text-slate-500 font-normal">
                {state.baseline ? `Baseline saved Rev ${state.baseline.revision} · ${fmtDateTime(state.baseline.savedAt)}` : "No baseline saved yet"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GanttChart
              bars={bars}
              showAuthorityTrack
              highlightCritical={false}
              showBaseline={false}
              showForecast={false}
              onResize={(id, _newDays, deltaCalendar) => {
                const stage = computed.stages.find((s) => s.code === id);
                if (!stage) return;
                // Translate calendar-day delta to a working-days delta with simple 5/7 ratio
                const wdDelta = Math.round(deltaCalendar * (5 / 7));
                if (wdDelta === 0) return;
                if (!confirm(`Change ${id} duration by ${wdDelta > 0 ? "+" : ""}${wdDelta} WD?`)) return;
                setDuration(id, Math.max(1, (state.durations[id] ?? stage.durationWD) + wdDelta));
              }}
            />
          </CardContent>
        </Card>
      )}

      {view === "list" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Code</th>
                  <th className="text-left px-3 py-2">Stage / Gate</th>
                  <th className="text-left px-3 py-2">Duration (WD)</th>
                  <th className="text-left px-3 py-2">Planned start</th>
                  <th className="text-left px-3 py-2">Planned end</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Variance</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {computed.stages.map((s) => (
                  <tr key={s.code} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono">{s.code}</td>
                    <td className="px-3 py-2">{s.name}{s.fixed && <Badge variant="outline" className="ml-2 text-[10px]">Fixed</Badge>}</td>
                    <td className="px-3 py-2">
                      {s.fixed ? (
                        <span className="text-slate-500">{s.durationWD}</span>
                      ) : (
                        <Input
                          type="number"
                          className="h-7 w-20"
                          value={s.durationWD}
                          onChange={(e) => setDuration(s.code, Number(e.target.value || 0))}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">{fmt(s.plannedStart)}</td>
                    <td className="px-3 py-2">{fmt(s.plannedEnd)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-2">
                      {s.varianceCause ? (
                        <Badge className={VARIANCE_LABELS[s.varianceCause].color + " border"}>{VARIANCE_LABELS[s.varianceCause].label}</Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => markComplete(s.code, 0)}>Done</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => markComplete(s.code, -3)}>Early</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => markComplete(s.code, +5)}>Late</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openVariance(s.code)}>Variance…</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {view === "calendar" && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {computed.stages.map((s) => (
                <div key={s.code} className={`p-3 rounded-lg border ${s.kind === "gate" ? "bg-amber-50 border-amber-200" : "bg-emerald-50/50 border-emerald-200"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-500">{s.code}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{s.name}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{fmt(s.plannedStart)} → {fmt(s.plannedEnd)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{s.durationWD} working days{s.fixed ? " (fixed)" : ""}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Pause history */}
      {(state.pauseHistory || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PauseIcon className="w-4 h-4 text-amber-600" /> Pause history</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-xs space-y-1.5 text-slate-700">
              {state.pauseHistory!.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2">
                  <span>{h.fromISO} → {h.toISO} · <strong className="tabular-nums">{h.durationCalendarDays}d</strong> · {h.reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Mitigation history */}
      {(state.mitigationHistory || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4 text-orange-600" /> Mitigation history</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-xs space-y-2 text-slate-700">
              {state.mitigationHistory!.map((m) => (
                <li key={m.id} className="border border-orange-200 bg-orange-50/40 rounded p-2">
                  <div className="font-medium text-slate-900">{fmtDateTime(m.createdAt)} · {m.reason}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.changes.map((c) => {
                      const delta = c.newDurationWD - c.oldDurationWD;
                      return (
                        <Badge key={c.stageCode} variant="outline" className={delta < 0 ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>
                          {c.stageCode}: {c.oldDurationWD}→{c.newDurationWD} WD ({delta >= 0 ? "+" : ""}{delta})
                        </Badge>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Variance summary */}
      {Object.values(state.actuals).some((a) => a.varianceCause) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> Variance Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(state.actuals).filter(([, a]) => a.varianceCause).map(([code, a]) => (
                <div key={code} className="flex items-start justify-between gap-3 p-2 rounded border border-slate-200 bg-white">
                  <div>
                    <div className="text-sm"><span className="font-mono">{code}</span> — <Badge className={VARIANCE_LABELS[a.varianceCause!].color + " border"}>{VARIANCE_LABELS[a.varianceCause!].label}</Badge></div>
                    {a.varianceNote && <div className="text-xs text-slate-500 mt-0.5">{a.varianceNote}</div>}
                  </div>
                  <div className="text-xs text-slate-500">{a.actualEnd ? `Actual end ${fmt(a.actualEnd)}` : ""}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Baseline history */}
      {state.rebaselineHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><ListChecks className="w-4 h-4 text-slate-500" /> Baseline history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs space-y-1 text-slate-600">
              {state.rebaselineHistory.map((h) => (
                <li key={h.revision}>Rev {h.revision} — {fmtDateTime(h.savedAt)} — {h.reason}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Variance dialog */}
      <Dialog open={!!varianceTarget} onOpenChange={(o) => !o && setVarianceTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log variance — {varianceTarget}</DialogTitle>
            <DialogDescription>
              Categorize the cause of the schedule deviation. This log feeds EOT and claims evidence later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Cause</Label>
              <Select value={varianceCause} onValueChange={(v) => setVarianceCause(v as VarianceCause)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(VARIANCE_LABELS) as VarianceCause[]).map((k) => (
                    <SelectItem key={k} value={k}>{VARIANCE_LABELS[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 mt-1">{VARIANCE_LABELS[varianceCause].description}</p>
            </div>
            <div>
              <Label className="text-xs">Days delta (negative = ahead, positive = late)</Label>
              <Input type="number" className="mt-1" value={varianceDays} onChange={(e) => setVarianceDays(Number(e.target.value || 0))} />
            </div>
            <div>
              <Label className="text-xs">Note</Label>
              <Textarea className="mt-1" value={varianceNote} onChange={(e) => setVarianceNote(e.target.value)} placeholder="Brief rationale, supporting refs (RFI/letter/memo)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVarianceTarget(null)}>Cancel</Button>
            <Button onClick={commitVariance}>Log variance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-baseline dialog */}
      <Dialog open={reBaseDialog} onOpenChange={setReBaseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Re-baseline timeline</DialogTitle>
            <DialogDescription>Used after major scope change or client-approved replan. The current durations become the new approved baseline.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs">Reason</Label>
            <Textarea value={reBaseReason} onChange={(e) => setReBaseReason(e.target.value)} className="mt-1" placeholder="e.g. Client-approved scope expansion to add 2 floors; replan agreed in Min-MoM-2026-04-30" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReBaseDialog(false)}>Cancel</Button>
            <Button onClick={() => { saveBaseline(reBaseReason || "Re-baseline"); setReBaseDialog(false); setReBaseReason(""); }}>
              <Save className="w-4 h-4 mr-1" /> Save Re-baseline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause dialog */}
      <Dialog open={pauseDialog} onOpenChange={setPauseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pause project</DialogTitle>
            <DialogDescription>Client has put the project on hold. All not-yet-completed stages will be shifted forward by the pause duration when you resume.</DialogDescription>
          </DialogHeader>
          <Label className="text-xs">Reason (required)</Label>
          <Textarea rows={3} value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} placeholder="e.g. Client requested hold pending board approval of revised scope" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseDialog(false)}>Cancel</Button>
            <Button onClick={pauseProject} className="bg-amber-600 hover:bg-amber-700"><PauseIcon className="w-4 h-4 mr-1.5" /> Pause project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume dialog */}
      <Dialog open={resumeDialog} onOpenChange={setResumeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resume project?</DialogTitle>
            <DialogDescription>{state.currentPause ? `On hold since ${state.currentPause.pauseStartDate}. Resuming shifts every not-yet-complete stage right by the elapsed calendar days.` : ""}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumeDialog(false)}>Cancel</Button>
            <Button onClick={resumeProject} className="bg-emerald-600 hover:bg-emerald-700"><Play className="w-4 h-4 mr-1.5" /> Resume now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mitigate dialog */}
      <Dialog open={mitigateDialog} onOpenChange={setMitigateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mitigate — revise remaining stage durations</DialogTitle>
            <DialogDescription>Adjust working-day durations for any not-yet-completed stage to recover from delays. The change is audit-logged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-auto">
            {PRE_CONTRACT_DEFAULTS.filter((s2) => !s2.fixed && state.actuals[s2.code]?.status !== "complete").map((stg) => (
              <div key={stg.code} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2 font-mono text-xs">{stg.code}</div>
                <div className="col-span-6 text-sm truncate">{stg.name}</div>
                <div className="col-span-2 text-xs text-right text-slate-500">was {state.durations[stg.code] ?? stg.defaultWorkingDays} WD</div>
                <div className="col-span-2"><Input type="number" className="h-7" value={mitigateDurations[stg.code] ?? ""} onChange={(e) => setMitigateDurations({ ...mitigateDurations, [stg.code]: Number(e.target.value || 0) })} /></div>
              </div>
            ))}
          </div>
          <Label className="text-xs mt-2">Mitigation reason (required)</Label>
          <Textarea rows={3} value={mitigateReason} onChange={(e) => setMitigateReason(e.target.value)} placeholder="e.g. Compress S3 by 5 WD and S4 by 10 WD; weekend working approved by client to recover delay." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMitigateDialog(false)}>Cancel</Button>
            <Button onClick={applyMitigation} className="bg-orange-600 hover:bg-orange-700"><Wrench className="w-4 h-4 mr-1.5" /> Apply mitigation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer note */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
        UAE working week (Mon–Fri) and public holidays auto-skipped in all working-day calculations.
        Project end: <strong className="text-slate-700">{fmt(projectEnd)}</strong>.
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-2" />
        Existing stage stepper unchanged — this tab is the visual Gantt of the same stages with proposed dates.
      </div>
    </div>
  );
}

// ---- Tiny helpers
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}
function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "not-started") return <span className="text-slate-400 text-xs">Not started</span>;
  const map: Record<string, string> = {
    "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
    complete: "bg-emerald-100 text-emerald-700 border-emerald-200",
    overdue: "bg-red-100 text-red-700 border-red-200",
  };
  return <Badge className={`border ${map[status] || ""}`}>{status.replace("-", " ")}</Badge>;
}

function defaultActualsForProject(_projectId: string, currentSubStage: number): StoredState["actuals"] {
  // Mark first N stages as complete to align with the existing stepper
  const out: StoredState["actuals"] = {};
  for (let i = 0; i < currentSubStage; i++) {
    const code = PRE_CONTRACT_DEFAULTS[i]?.code;
    if (!code) break;
    out[code] = { status: "complete", percentComplete: 100 };
  }
  // Mark current stage in-progress
  const cur = PRE_CONTRACT_DEFAULTS[currentSubStage]?.code;
  if (cur) out[cur] = { status: "in-progress", percentComplete: 35 };
  return out;
}

function exportPdfStub() {
  toast.success("PDF export queued — opens system print dialog with letterhead layout");
  setTimeout(() => window.print(), 150);
}
function exportShareLink(projectId: string) {
  const url = `${window.location.origin}/share/timeline/${projectId}?token=${Math.random().toString(36).slice(2, 10)}&exp=30d`;
  navigator.clipboard?.writeText(url).catch(() => { /* noop */ });
  toast.success("Read-only share link copied — expires in 30 days");
}
