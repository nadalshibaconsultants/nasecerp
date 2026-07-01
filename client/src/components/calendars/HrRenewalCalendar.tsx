/**
 * HR Renewal Calendar — visas, EID, passports, labour cards.
 * Opened from the HR module header ("Renewals" button) in a dialog;
 * `variant="card"` keeps the original standalone card rendering.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { employeesStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";

export type Renewal = { id: string; kind: string; subject: string; detail?: string; expiry: string; days: number };

function daysTo(iso: string): number { return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000); }

/** Upcoming document renewals (next 6 months) across all employees — shared by
 *  the calendar table and the HR header button's critical-count badge. */
export function useHrRenewals(): Renewal[] {
  const employees = useCollection(employeesStore);
  return useMemo<Renewal[]>(() => {
    const out: Renewal[] = [];
    for (const e of employees) {
      const name = `${e.firstName} ${e.lastName}`;
      if (e.visaExpiry) out.push({ id: `v-${e.id}`, kind: "Visa", subject: name, detail: e.visaNo, expiry: e.visaExpiry, days: daysTo(e.visaExpiry) });
      if (e.emiratesIdExpiry) out.push({ id: `e-${e.id}`, kind: "Emirates ID", subject: name, detail: e.emiratesIdNo, expiry: e.emiratesIdExpiry, days: daysTo(e.emiratesIdExpiry) });
      if (e.passportExpiry) out.push({ id: `p-${e.id}`, kind: "Passport", subject: name, detail: e.passportNo, expiry: e.passportExpiry, days: daysTo(e.passportExpiry) });
      if (e.labourCardExpiry) out.push({ id: `l-${e.id}`, kind: "Labour Card", subject: name, detail: e.labourCardNo, expiry: e.labourCardExpiry, days: daysTo(e.labourCardExpiry) });
    }
    return out.filter((r) => r.days >= -7 && r.days < 180).sort((a, b) => a.days - b.days);
  }, [employees]);
}

export default function HrRenewalCalendar({ variant = "card" }: { variant?: "card" | "plain" }) {
  const items = useHrRenewals();
  const critical = items.filter((r) => r.days < 30).length;

  if (items.length === 0) {
    if (variant === "plain") return <p className="text-sm text-slate-500 px-1 py-4">No document renewals due in the next 6 months.</p>;
    return null;
  }

  const table = (
    <table className="w-full text-xs">
      <thead className="bg-slate-50 text-slate-700">
        <tr>
          <th className="text-center px-2 py-1.5 w-[80px]">Days</th>
          <th className="text-left px-2 py-1.5 w-[110px]">Expiry</th>
          <th className="text-left px-2 py-1.5 w-[120px]">Kind</th>
          <th className="text-left px-2 py-1.5">Subject</th>
          <th className="text-left px-2 py-1.5">Reference</th>
        </tr>
      </thead>
      <tbody>{items.map((r) => (
        <tr key={r.id} className={`border-t border-slate-100 ${r.days < 30 ? "bg-red-50/40" : ""}`}>
          <td className={`px-2 py-1.5 text-center font-mono font-bold ${r.days < 0 ? "text-red-700" : r.days < 30 ? "text-red-600" : r.days < 60 ? "text-amber-700" : "text-slate-700"}`}>
            {r.days < 0 ? `${-r.days}d ago` : `${r.days}d`}
          </td>
          <td className="px-2 py-1.5">{r.expiry}</td>
          <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></td>
          <td className="px-2 py-1.5">{r.subject}</td>
          <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{r.detail || "—"}</td>
        </tr>))}
      </tbody>
    </table>
  );

  if (variant === "plain") {
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        {table}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-amber-600" /> HR Renewals (next 6 months)</CardTitle>
        {critical > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]"><AlertTriangle className="w-3 h-3 inline mr-1" />{critical} critical</Badge>}
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {table}
      </CardContent>
    </Card>
  );
}
