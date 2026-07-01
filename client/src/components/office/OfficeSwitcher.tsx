import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { OFFICES } from "@/lib/office/configs";
import { ACTIVE_OFFICE_KEY } from "@/lib/office/configs";
import type { OfficeId } from "@/lib/office/types";
import { Globe, Building2 } from "lucide-react";

type Choice = "all" | OfficeId;

export function useActiveOffice(defaultChoice: Choice = "all"): [Choice, (c: Choice) => void] {
  const [choice, setChoice] = useState<Choice>(() => {
    try {
      const stored = window.localStorage.getItem(ACTIVE_OFFICE_KEY);
      if (stored === "dubai" || stored === "cairo" || stored === "all") return stored;
    } catch { /* noop */ }
    return defaultChoice;
  });
  useEffect(() => {
    try { window.localStorage.setItem(ACTIVE_OFFICE_KEY, choice); } catch { /* noop */ }
  }, [choice]);
  return [choice, setChoice];
}

type Props = {
  active: Choice;
  onChange: (c: Choice) => void;
  /** counts shown next to each card */
  counts: { all?: number; dubai?: number; cairo?: number };
  /** subtitle for the All option, e.g. "Combined view" or "All offices" */
  allLabel?: string;
};

export default function OfficeSwitcher({ active, onChange, counts, allLabel = "Combined view" }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <SwitcherCard
        active={active === "all"}
        onClick={() => onChange("all")}
        label="All offices"
        sub={allLabel}
        flagOrIcon={<Globe className="w-7 h-7 text-slate-700" />}
        bg="bg-slate-50"
        ring="ring-slate-300"
        accent="bg-slate-700"
        count={counts.all}
      />
      <SwitcherCard
        active={active === "dubai"}
        onClick={() => onChange("dubai")}
        label={`${OFFICES.dubai.flag} Dubai`}
        sub={`${OFFICES.dubai.countryName} · ${OFFICES.dubai.currency} · Mon–Fri`}
        flagOrIcon={<Building2 className="w-7 h-7 text-amber-700" />}
        bg={OFFICES.dubai.themeBg}
        ring={OFFICES.dubai.themeRing}
        accent={OFFICES.dubai.themeAccent}
        count={counts.dubai}
      />
      <SwitcherCard
        active={active === "cairo"}
        onClick={() => onChange("cairo")}
        label={`${OFFICES.cairo.flag} Cairo`}
        sub={`${OFFICES.cairo.countryName} · ${OFFICES.cairo.currency} · Sun–Thu`}
        flagOrIcon={<Building2 className="w-7 h-7 text-emerald-700" />}
        bg={OFFICES.cairo.themeBg}
        ring={OFFICES.cairo.themeRing}
        accent={OFFICES.cairo.themeAccent}
        count={counts.cairo}
      />
    </div>
  );
}

function SwitcherCard({ active, onClick, label, sub, flagOrIcon, bg, ring, accent, count }: { active: boolean; onClick: () => void; label: string; sub: string; flagOrIcon: React.ReactNode; bg: string; ring: string; accent: string; count?: number }) {
  return (
    <Card
      className={`p-4 cursor-pointer transition-all ${bg} ${active ? `ring-2 ring-offset-2 ${ring}` : "ring-0 hover:ring-1 hover:ring-offset-1"} hover:shadow-md`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-white/70 flex items-center justify-center shrink-0">{flagOrIcon}</div>
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">{label}</div>
            <div className="text-[11px] text-slate-600 truncate">{sub}</div>
          </div>
        </div>
        {typeof count === "number" && (
          <div className={`shrink-0 ${active ? `text-white ${accent}` : "bg-white/70 text-slate-700"} text-xs font-bold rounded-full px-2.5 py-1 min-w-[28px] text-center`}>{count}</div>
        )}
      </div>
    </Card>
  );
}
