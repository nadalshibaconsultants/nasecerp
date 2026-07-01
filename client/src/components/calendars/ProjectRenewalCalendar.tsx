/**
 * Project Renewal Calendar — items tied to a specific project:
 *   - Project CAR insurance instalments / expiry
 *   - Authority approvals expiry (DM permit etc.) when tracked
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { insurancePoliciesStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { INSURANCE_LABELS } from "@/lib/finance/types";

type Item = { id: string; kind: string; subject: string; detail?: string; expiry: string; days: number };
function daysTo(iso: string): number { return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000); }

export default function ProjectRenewalCalendar({ projectId }: { projectId: string }) {
  const insurance = useCollection(insurancePoliciesStore);
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const p of insurance) {
      if (p.projectId === projectId && p.expiryDate) {
        out.push({ id: `ins-${p.id}`, kind: "Insurance", subject: INSURANCE_LABELS[p.type], detail: `${p.insurerName} · ${p.policyNumber}`, expiry: p.expiryDate, days: daysTo(p.expiryDate) });
        for (const inst of p.installmentSchedule || []) {
          if (!inst.paid) out.push({ id: `inst-${p.id}-${inst.dueDate}`, kind: "Premium installment", subject: `${INSURANCE_LABELS[p.type]} - AED ${inst.amount.toLocaleString()}`, detail: p.policyNumber, expiry: inst.dueDate, days: daysTo(inst.dueDate) });
        }
      }
    }
    return out.filter((r) => r.days >= -7 && r.days < 365).sort((a, b) => a.days - b.days);
  }, [insurance, projectId]);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-amber-600" /> Project Renewals</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
        <thead className="bg-slate-50"><tr>
          <th className="text-center px-2 py-1.5 w-[80px]">Days</th><th className="text-left px-2 py-1.5 w-[110px]">Due</th>
          <th className="text-left px-2 py-1.5 w-[140px]">Kind</th><th className="text-left px-2 py-1.5">Item</th>
          <th className="text-left px-2 py-1.5">Reference</th>
        </tr></thead>
        <tbody>{items.map((r) => (
          <tr key={r.id} className={`border-t border-slate-100 ${r.days < 30 ? "bg-red-50/40" : ""}`}>
            <td className={`px-2 py-1.5 text-center font-mono font-bold ${r.days < 0 ? "text-red-700" : r.days < 30 ? "text-red-600" : "text-slate-700"}`}>{r.days < 0 ? `${-r.days}d ago` : `${r.days}d`}</td>
            <td className="px-2 py-1.5">{r.expiry}</td>
            <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></td>
            <td className="px-2 py-1.5">{r.subject}</td>
            <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{r.detail || "—"}</td>
          </tr>))}
        </tbody>
      </table></CardContent>
    </Card>
  );
}
