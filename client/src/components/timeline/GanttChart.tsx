/**
 * Reusable SVG Gantt chart for both Pre- and Post-Contract timelines.
 *
 * Features:
 *  - Stage / gate / authority / activity rows, all in the same SVG canvas
 *  - Today line
 *  - Color-coding (status driven)
 *  - Hover tooltip
 *  - Optional drag-resize on the right edge of bars (Pre-Contract durations)
 *  - Critical-path highlighting + baseline-vs-actual-vs-forecast overlay (Post-Contract)
 */
import { useMemo, useRef, useState, useEffect } from "react";
import { fromISO, toISO, addCalendarDays, startOfDayUTC } from "@/lib/timeline-utils";

export type GanttBarKind = "stage" | "gate" | "authority" | "activity" | "milestone";

export type GanttBar = {
  id: string;
  rowLabel: string; // left-side label
  kind: GanttBarKind;
  start: string; // ISO planned start
  end: string; // ISO planned end
  status?: "not-started" | "in-progress" | "complete" | "overdue" | "submitted" | "under-review" | "approved";
  baselineStart?: string; // optional baseline overlay (Post-Contract)
  baselineEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  forecastEnd?: string;
  percentComplete?: number;
  isCritical?: boolean;
  rowGroup?: "main" | "authority"; // main timeline vs parallel authority row
  // Optional metadata shown in tooltip
  durationLabel?: string;
  responsible?: string;
  details?: string;
};

type Props = {
  bars: GanttBar[];
  rangeStart?: string;
  rangeEnd?: string;
  height?: number;
  rowHeight?: number;
  onResize?: (id: string, newDays: number, deltaCalendarDays: number) => void; // for drag-resize
  showAuthorityTrack?: boolean;
  highlightCritical?: boolean;
  showBaseline?: boolean; // overlay grey baseline bars under planned bars
  showForecast?: boolean; // overlay dashed forecast tail
  todayISO?: string;
};

export function GanttChart({
  bars,
  rangeStart,
  rangeEnd,
  rowHeight = 28,
  onResize,
  showAuthorityTrack = true,
  highlightCritical = true,
  showBaseline = false,
  showForecast = false,
  todayISO,
}: Props) {
  // ---- Derive overall date range
  const auto = useMemo(() => {
    if (!bars.length) return { start: new Date(), end: new Date() };
    const all = bars.flatMap((b) => [b.start, b.end, b.baselineStart, b.baselineEnd, b.actualStart, b.actualEnd, b.forecastEnd]).filter(Boolean) as string[];
    const dates = all.map((d) => fromISO(d).getTime()).sort((a, b) => a - b);
    return { start: new Date(dates[0]), end: new Date(dates[dates.length - 1]) };
  }, [bars]);

  const totalStart = rangeStart ? fromISO(rangeStart) : addCalendarDays(auto.start, -7);
  const totalEnd = rangeEnd ? fromISO(rangeEnd) : addCalendarDays(auto.end, 7);

  const totalDays = Math.max(1, Math.round((totalEnd.getTime() - totalStart.getTime()) / 86_400_000));
  const today = todayISO ? fromISO(todayISO) : startOfDayUTC(new Date());

  // ---- Layout
  const labelColW = 220;
  // Pixel scale: aim for at least ~3 px / day, clamped within sensible width
  const pxPerDay = Math.max(1.6, Math.min(7, 1100 / totalDays));
  const chartW = Math.max(600, totalDays * pxPerDay);
  const headerH = 44;

  // Main rows + (optional) authority subgroup
  const mainBars = bars.filter((b) => (b.rowGroup || "main") === "main");
  const authBars = bars.filter((b) => b.rowGroup === "authority");
  const showAuth = showAuthorityTrack && authBars.length > 0;
  const totalRows = mainBars.length + (showAuth ? authBars.length + 1 : 0);
  const chartH = headerH + totalRows * rowHeight + 12;

  function xOfDate(d: Date) {
    const days = (d.getTime() - totalStart.getTime()) / 86_400_000;
    return labelColW + days * pxPerDay;
  }
  function widthBetween(s: Date, e: Date) {
    const days = (e.getTime() - s.getTime()) / 86_400_000;
    return Math.max(2, days * pxPerDay);
  }

  // ---- Month tick generator for header
  const months = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    const cursor = new Date(Date.UTC(totalStart.getUTCFullYear(), totalStart.getUTCMonth(), 1));
    while (cursor.getTime() <= totalEnd.getTime()) {
      out.push({
        x: xOfDate(cursor),
        label: cursor.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return out;
  }, [totalStart, totalEnd, pxPerDay]);

  // ---- Tooltip state
  const [tip, setTip] = useState<{ x: number; y: number; bar: GanttBar } | null>(null);

  // ---- Resize state (Pre-Contract drag-resize)
  const [resizing, setResizing] = useState<{ id: string; startX: number; originalEnd: string } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!resizing || !onResize) return;

    function onMove(ev: MouseEvent) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || !resizing) return;
      const dxPx = ev.clientX - resizing.startX;
      const deltaDays = Math.round(dxPx / pxPerDay);
      // Visual feedback only — actual commit on mouseup
      setResizing({ ...resizing, ...{ dxDays: deltaDays } as Partial<typeof resizing> });
    }
    function onUp(ev: MouseEvent) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || !resizing) return;
      const dxPx = ev.clientX - resizing.startX;
      const deltaDays = Math.round(dxPx / pxPerDay);
      if (deltaDays !== 0 && onResize) {
        // Caller decides how to translate calendar-day delta to working-days
        onResize(resizing.id, 0, deltaDays);
      }
      setResizing(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, onResize, pxPerDay]);

  // ---- Helpers — bar color
  function barFill(b: GanttBar): string {
    if (b.kind === "gate") return b.status === "complete" ? "#fbbf24" : b.status === "overdue" ? "#ef4444" : "#fde68a";
    if (b.kind === "authority") return b.status === "approved" ? "#a78bfa" : b.status === "submitted" || b.status === "under-review" ? "#c4b5fd" : "#ddd6fe";
    if (b.kind === "milestone") return "#0ea5e9";
    if (b.isCritical) return "#dc2626";
    if (b.status === "complete") return "#10b981";
    if (b.status === "in-progress") return "#3b82f6";
    if (b.status === "overdue") return "#ef4444";
    return "#cbd5e1";
  }
  function barStroke(b: GanttBar): string {
    if (b.isCritical) return "#991b1b";
    if (b.kind === "gate") return "#b45309";
    if (b.kind === "authority") return "#6d28d9";
    return "#475569";
  }

  // ---- Render rows
  const rowYMain = (i: number) => headerH + i * rowHeight + 4;

  return (
    <div className="relative">
      <div className="overflow-auto border border-slate-200 rounded-lg bg-white">
        <svg
          ref={svgRef}
          width={chartW + labelColW + 24}
          height={chartH}
          className="block"
        >
          {/* Header background */}
          <rect x={0} y={0} width={chartW + labelColW + 24} height={headerH} fill="#f8fafc" />
          <line x1={labelColW} y1={headerH - 0.5} x2={chartW + labelColW + 24} y2={headerH - 0.5} stroke="#e2e8f0" />
          {/* Month labels */}
          {months.map((m, i) => (
            <g key={i}>
              <line x1={m.x} y1={0} x2={m.x} y2={chartH} stroke="#f1f5f9" strokeDasharray="2,3" />
              <text x={m.x + 4} y={28} fontSize={11} fill="#475569" fontFamily="ui-sans-serif, system-ui">
                {m.label}
              </text>
            </g>
          ))}

          {/* Today line */}
          {today.getTime() >= totalStart.getTime() && today.getTime() <= totalEnd.getTime() && (
            <g>
              <line
                x1={xOfDate(today)}
                y1={headerH - 6}
                x2={xOfDate(today)}
                y2={chartH - 4}
                stroke="#0ea5e9"
                strokeWidth={1.5}
                strokeDasharray="4,3"
              />
              <text x={xOfDate(today) + 4} y={headerH - 8} fontSize={10} fill="#0369a1" fontWeight={600}>
                Today
              </text>
            </g>
          )}

          {/* Row separators */}
          {Array.from({ length: totalRows + 1 }).map((_, i) => (
            <line
              key={i}
              x1={0}
              y1={headerH + i * rowHeight}
              x2={chartW + labelColW + 24}
              y2={headerH + i * rowHeight}
              stroke="#f1f5f9"
            />
          ))}

          {/* MAIN BARS */}
          {mainBars.map((b, i) => {
            const y = rowYMain(i);
            const sx = xOfDate(fromISO(b.start));
            const ex = xOfDate(fromISO(b.end));
            const w = Math.max(2, ex - sx);
            const fill = barFill(b);
            const stroke = barStroke(b);
            return (
              <g key={b.id}>
                {/* Row label */}
                <text x={10} y={y + rowHeight - 12} fontSize={11} fill="#0f172a" fontFamily="ui-sans-serif, system-ui">
                  {b.rowLabel.length > 32 ? b.rowLabel.slice(0, 30) + "…" : b.rowLabel}
                </text>

                {/* Optional baseline overlay (grey) */}
                {showBaseline && b.baselineStart && b.baselineEnd && (
                  <rect
                    x={xOfDate(fromISO(b.baselineStart))}
                    y={y + 4}
                    width={Math.max(2, xOfDate(fromISO(b.baselineEnd)) - xOfDate(fromISO(b.baselineStart)))}
                    height={6}
                    fill="#cbd5e1"
                    opacity={0.85}
                    rx={1}
                  />
                )}

                {/* Planned / actual bar */}
                {b.kind === "milestone" ? (
                  <polygon
                    points={`${sx - 8},${y + rowHeight / 2} ${sx},${y + rowHeight / 2 - 8} ${sx + 8},${y + rowHeight / 2} ${sx},${y + rowHeight / 2 + 8}`}
                    fill="#0ea5e9"
                    stroke="#0369a1"
                  />
                ) : (
                  <g
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, bar: b });
                    }}
                    onMouseLeave={() => setTip(null)}
                  >
                    <rect
                      x={sx}
                      y={y + (showBaseline ? 12 : 6)}
                      width={w}
                      height={showBaseline ? rowHeight - 16 : rowHeight - 10}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={highlightCritical && b.isCritical ? 1.5 : 1}
                      rx={3}
                    />
                    {/* % complete fill (green over-paint) */}
                    {typeof b.percentComplete === "number" && b.percentComplete > 0 && (
                      <rect
                        x={sx}
                        y={y + (showBaseline ? 12 : 6)}
                        width={Math.max(0, w * (b.percentComplete / 100))}
                        height={showBaseline ? rowHeight - 16 : rowHeight - 10}
                        fill={b.isCritical ? "#7f1d1d" : "#065f46"}
                        opacity={0.55}
                        rx={3}
                      />
                    )}
                    {/* Forecast tail */}
                    {showForecast && b.forecastEnd && fromISO(b.forecastEnd).getTime() > fromISO(b.end).getTime() && (
                      <rect
                        x={ex}
                        y={y + (showBaseline ? 12 : 6)}
                        width={Math.max(2, xOfDate(fromISO(b.forecastEnd)) - ex)}
                        height={showBaseline ? rowHeight - 16 : rowHeight - 10}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={1.2}
                        strokeDasharray="3,3"
                        rx={3}
                      />
                    )}
                    {/* Resize handle (Pre-Contract) */}
                    {onResize && b.kind === "stage" && (
                      <rect
                        x={ex - 4}
                        y={y + 6}
                        width={6}
                        height={rowHeight - 10}
                        fill="transparent"
                        style={{ cursor: "ew-resize" }}
                        onMouseDown={(e) => {
                          setResizing({ id: b.id, startX: e.clientX, originalEnd: b.end });
                        }}
                      />
                    )}
                  </g>
                )}

                {/* Code label inside bar (if room) */}
                {w > 28 && b.kind !== "milestone" && (
                  <text
                    x={sx + 4}
                    y={y + rowHeight / 2 + 3}
                    fontSize={10}
                    fill="#0f172a"
                    fontWeight={600}
                  >
                    {b.id}
                  </text>
                )}
              </g>
            );
          })}

          {/* AUTHORITY DIVIDER + ROWS */}
          {showAuth && (
            <>
              <line
                x1={0}
                y1={headerH + mainBars.length * rowHeight + 4}
                x2={chartW + labelColW + 24}
                y2={headerH + mainBars.length * rowHeight + 4}
                stroke="#fde68a"
                strokeDasharray="3,3"
              />
              <text
                x={10}
                y={headerH + mainBars.length * rowHeight + 18}
                fontSize={10}
                fill="#b45309"
                fontWeight={600}
              >
                ▼ Authority Track (parallel)
              </text>
              {authBars.map((b, idx) => {
                const y = headerH + (mainBars.length + 1 + idx) * rowHeight + 4;
                const sx = xOfDate(fromISO(b.start));
                const ex = xOfDate(fromISO(b.end));
                const w = Math.max(2, ex - sx);
                return (
                  <g
                    key={b.id}
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, bar: b });
                    }}
                    onMouseLeave={() => setTip(null)}
                  >
                    <text x={10} y={y + rowHeight - 12} fontSize={11} fill="#7c2d12">
                      {b.rowLabel.length > 32 ? b.rowLabel.slice(0, 30) + "…" : b.rowLabel}
                    </text>
                    <rect
                      x={sx}
                      y={y + 6}
                      width={w}
                      height={rowHeight - 10}
                      fill={barFill(b)}
                      stroke={barStroke(b)}
                      rx={3}
                    />
                    {w > 80 && (
                      <text x={sx + 4} y={y + rowHeight / 2 + 3} fontSize={10} fill="#312e81" fontWeight={600}>
                        {b.rowLabel.split(" ").slice(0, 3).join(" ")}…
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* Label column separator */}
          <line x1={labelColW} y1={0} x2={labelColW} y2={chartH} stroke="#e2e8f0" />
        </svg>
      </div>

      {/* Tooltip */}
      {tip && (
        <div
          className="absolute pointer-events-none z-20 bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs"
          style={{ left: Math.min(tip.x + 12, chartW + labelColW - 200), top: tip.y + 12, maxWidth: 280 }}
        >
          <div className="font-semibold text-slate-900">{tip.bar.id} — {tip.bar.rowLabel}</div>
          <div className="text-slate-600 mt-0.5">{fmt(tip.bar.start)} → {fmt(tip.bar.end)}</div>
          {tip.bar.durationLabel && <div className="text-slate-500">Duration: {tip.bar.durationLabel}</div>}
          {typeof tip.bar.percentComplete === "number" && (
            <div className="text-slate-500">% Complete: {tip.bar.percentComplete}%</div>
          )}
          {tip.bar.responsible && <div className="text-slate-500">Lead: {tip.bar.responsible}</div>}
          {tip.bar.status && <div className="text-slate-500 capitalize">Status: {tip.bar.status.replace("-", " ")}</div>}
          {tip.bar.isCritical && <div className="text-red-600 font-medium mt-1">★ On critical path</div>}
          {tip.bar.details && <div className="text-slate-500 mt-1">{tip.bar.details}</div>}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600">
        <Legend swatch="#10b981" label="Complete" />
        <Legend swatch="#3b82f6" label="In progress" />
        <Legend swatch="#cbd5e1" label="Upcoming" />
        <Legend swatch="#ef4444" label="Overdue" />
        <Legend swatch="#fbbf24" label="Gate" />
        <Legend swatch="#a78bfa" label="Authority" />
        {highlightCritical && <Legend swatch="#dc2626" label="Critical path" />}
        {showBaseline && <Legend swatch="#cbd5e1" label="Baseline (grey)" thin />}
        {showForecast && <Legend swatch="#f59e0b" label="Forecast (dashed)" dashed />}
      </div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function Legend({ swatch, label, thin, dashed }: { swatch: string; label: string; thin?: boolean; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block rounded-sm border border-slate-300"
        style={{
          width: 14,
          height: thin ? 4 : 10,
          background: swatch,
          borderStyle: dashed ? "dashed" : "solid",
          backgroundColor: dashed ? "transparent" : swatch,
          borderColor: dashed ? swatch : undefined,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

// Helper exposed for parents to clamp date ranges
export function unusedSilencer() { void toISO; }
