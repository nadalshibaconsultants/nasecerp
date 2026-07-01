/**
 * Finance Renewal Calendar — insurance, government licences, subscriptions,
 * recurring bills, VAT returns. Mounted inside the Finance module.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { insurancePoliciesStore, governmentFeesStore, subscriptionsStore, recurringExpensesStore, vatReturnsStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { INSURANCE_LABELS } from "@/lib/finance/types";

type Item = { id: string; kind: string; subject: string; detail?: string; expiry: string; days: number; amount?: number; currency?: string };
function daysTo(iso: string): number { return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000); }

export default function FinanceRenewalCalendar() {
  const insurance = useCollection(insurancePoliciesStore);
  const govt = useCollection(governmentFeesStore);
  const subs = useCollection(subscriptionsStore);
  const recurring = useCollection(recurringExpensesStore);
  const vat = useCollection(vatReturnsStore);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const p of insurance) {
      if (p.expiryDate && p.status === "active") out.push({ id: `ins-${p.id}`, kind: "Insurance", subject: INSURANCE_LABELS[p.type], detail: `${p.insurerName} - ${p.policyNumber}`, expiry: p.expiryDate, days: daysTo(p.expiryDate), amount: p.premiumAED, currency: "AED" });
    }
    for (const g of govt) {
      if (g.expiryDate) out.push({ id: `gov-${g.id}`, kind: "Licence", subject: `${g.authority} - ${g.type}`, detail: g.reference, expiry: g.expiryDate, days: daysTo(g.expiryDate), amount: g.amountAED, currency: "AED" });
    }
    for (const s of subs) {
      if (s.renewalDate && s.isActive) out.push({ id: `sub-${s.id}`, kind: "Subscription", subject: s.name, detail: s.vendor, expiry: s.renewalDate, days: daysTo(s.renewalDate), amount: s.costAED, currency: "AED" });
    }
    for (const r of recurring) {
      if (r.nextDueDate && r.isActive) out.push({ id: `rec-${r.id}`, kind: "Recurring", subject: r.description, detail: r.kind, expiry: r.nextDueDate, days: daysTo(r.nextDueDate), amount: r.averageAmount, currency: r.currency });
    }
    for (const v of vat) {
      if (v.status === "draft") {
        const due = new Date(v.periodEnd); due.setDate(due.getDate() + 28);
        const iso = due.toISOString().slice(0, 10);
        out.push({ id: `vat-${v.id}`, kind: "VAT/FTA", subject: `VAT 201 - ${v.periodLabel}`, detail: "FTA deadline (28d post period-end)", expiry: iso, days: daysTo(iso) });
      }
    }
    return out.filter((r) => r.days >= -7 && r.days < 180).sort((a, b) => a.days - b.days);
  }, [insurance, govt, subs, recurring, vat]);

  if (items.length === 0) return null;
  const critical = items.filter((r) => r.days < 30).length;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-amber-600" /> Finance Renewals (next 6 months)</CardTitle>
        {critical > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]"><AlertTriangle className="w-3 h-3 inline mr-1" />{critical} critical</Badge>}
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-700"><tr>
            <th className="text-center px-2 py-1.5 w-[80px]">Days</th>
            <th className="text-left px-2 py-1.5 w-[110px]">Expiry</th>
            <th className="text-left px-2 py-1.5 w-[120px]">Kind</th>
            <th className="text-left px-2 py-1.5">Subject</th>
            <th className="text-left px-2 py-1.5">Reference</th>
            <th className="text-right px-2 py-1.5 w-[120px]">Amount</th>
          </tr></thead>
          <tbody>{items.map((r) => (
            <tr key={r.id} className={`border-t border-slate-100 ${r.days < 30 ? "bg-red-50/40" : ""}`}>
              <td className={`px-2 py-1.5 text-center font-mono font-bold ${r.days < 0 ? "text-red-700" : r.days < 30 ? "text-red-600" : r.days < 60 ? "text-amber-700" : "text-slate-700"}`}>{r.days < 0 ? `${-r.days}d ago` : `${r.days}d`}</td>
              <td className="px-2 py-1.5">{r.expiry}</td>
              <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></td>
              <td className="px-2 py-1.5">{r.subject}</td>
              <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{r.detail || "—"}</td>
              <td className="px-2 py-1.5 text-right font-mono">{r.amount ? `${r.currency || "AED"} ${r.amount.toLocaleString()}` : "—"}</td>
            </tr>))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
