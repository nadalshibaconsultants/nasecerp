/**
 * Compliance Calendar — single date-based view of every expiry that matters:
 *   - Employee visas, Emirates IDs, passports, labour cards
 *   - Insurance policies (Medical / PI / CAR / Vehicle / D&O / etc.)
 *   - Government licences (DED, DM, Trakhees)
 *   - Software subscriptions
 *   - Recurring expense due dates (Ejari, DEWA next due)
 *   - VAT and Corporate Tax return deadlines
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarDays, AlertTriangle, Plane, IdCard, ShieldCheck, Building2,
  Cloud, Landmark, Calculator, FileDown,
} from "lucide-react";
import {
  employeesStore, insurancePoliciesStore, governmentFeesStore,
  subscriptionsStore, recurringExpensesStore, vatReturnsStore,
} from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { INSURANCE_LABELS } from "@/lib/finance/types";

type Bucket = "<30" | "30-60" | "60-90" | "90+";
const BUCKET_ORDER: Bucket[] = ["<30", "30-60", "60-90", "90+"];

type Renewal = {
  id: string;
  kind: "visa" | "eid" | "passport" | "labour-card" | "insurance" | "licence" | "subscription" | "recurring" | "vat";
  category: string;
  subject: string;
  detail?: string;
  expiry: string;
  amount?: number;
  currency?: string;
  daysToExpiry: number;
  link?: string;
};

const KIND_META: Record<Renewal["kind"], { label: string; icon: React.ReactNode; color: string }> = {
  visa: { label: "Employee Visa", icon: <Plane className="w-3 h-3" />, color: "bg-amber-100 text-amber-700" },
  eid: { label: "Emirates ID", icon: <IdCard className="w-3 h-3" />, color: "bg-blue-100 text-blue-700" },
  passport: { label: "Passport", icon: <Plane className="w-3 h-3" />, color: "bg-blue-100 text-blue-700" },
  "labour-card": { label: "Labour Card", icon: <IdCard className="w-3 h-3" />, color: "bg-purple-100 text-purple-700" },
  insurance: { label: "Insurance", icon: <ShieldCheck className="w-3 h-3" />, color: "bg-emerald-100 text-emerald-700" },
  licence: { label: "Licence / Govt", icon: <Landmark className="w-3 h-3" />, color: "bg-red-100 text-red-700" },
  subscription: { label: "Subscription", icon: <Cloud className="w-3 h-3" />, color: "bg-indigo-100 text-indigo-700" },
  recurring: { label: "Recurring Bill", icon: <Building2 className="w-3 h-3" />, color: "bg-slate-100 text-slate-700" },
  vat: { label: "VAT / Tax", icon: <Calculator className="w-3 h-3" />, color: "bg-orange-100 text-orange-700" },
};

function daysBetween(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
function bucketOf(days: number): Bucket {
  if (days < 30) return "<30";
  if (days < 60) return "30-60";
  if (days < 90) return "60-90";
  return "90+";
}

export default function ComplianceCalendar() {
  const employees = useCollection(employeesStore);
  const insurance = useCollection(insurancePoliciesStore);
  const govt = useCollection(governmentFeesStore);
  const subs = useCollection(subscriptionsStore);
  const recurring = useCollection(recurringExpensesStore);
  const vat = useCollection(vatReturnsStore);

  const [kindFilter, setKindFilter] = useState<string>("all");
  const [windowDays, setWindowDays] = useState<string>("180");

  const renewals = useMemo<Renewal[]>(() => {
    const out: Renewal[] = [];
    // Employee identity docs
    for (const e of employees) {
      const name = `${e.firstName} ${e.lastName}`;
      if (e.visaExpiry) out.push({ id: `vis-${e.id}`, kind: "visa", category: "HR", subject: name, detail: e.visaNo ? `Visa ${e.visaNo}` : "Visa", expiry: e.visaExpiry, daysToExpiry: daysBetween(e.visaExpiry), link: "/hr" });
      if (e.emiratesIdExpiry) out.push({ id: `eid-${e.id}`, kind: "eid", category: "HR", subject: name, detail: e.emiratesIdNo ? `EID ${e.emiratesIdNo}` : "Emirates ID", expiry: e.emiratesIdExpiry, daysToExpiry: daysBetween(e.emiratesIdExpiry), link: "/hr" });
      if (e.passportExpiry) out.push({ id: `pas-${e.id}`, kind: "passport", category: "HR", subject: name, detail: e.passportNo ? `Passport ${e.passportNo}` : "Passport", expiry: e.passportExpiry, daysToExpiry: daysBetween(e.passportExpiry), link: "/hr" });
      if (e.labourCardExpiry) out.push({ id: `lab-${e.id}`, kind: "labour-card", category: "HR", subject: name, detail: e.labourCardNo ? `Card ${e.labourCardNo}` : "Labour Card", expiry: e.labourCardExpiry, daysToExpiry: daysBetween(e.labourCardExpiry), link: "/hr" });
    }
    // Insurance
    for (const p of insurance) {
      if (p.expiryDate && p.status === "active") {
        out.push({ id: `ins-${p.id}`, kind: "insurance", category: "Finance", subject: INSURANCE_LABELS[p.type], detail: `${p.insurerName} · ${p.policyNumber}`, expiry: p.expiryDate, daysToExpiry: daysBetween(p.expiryDate), amount: p.premiumAED, currency: "AED", link: "/finance" });
      }
    }
    // Government licences (only the ones with future expiry)
    for (const g of govt) {
      if (g.expiryDate) out.push({ id: `gov-${g.id}`, kind: "licence", category: "Govt", subject: `${g.authority} · ${g.type}`, detail: g.reference, expiry: g.expiryDate, daysToExpiry: daysBetween(g.expiryDate), amount: g.amountAED, currency: "AED", link: "/finance" });
    }
    // Subscriptions
    for (const s of subs) {
      if (s.renewalDate && s.isActive) out.push({ id: `sub-${s.id}`, kind: "subscription", category: "IT", subject: s.name, detail: `${s.vendor}${s.seats ? ` · ${s.seats} seats` : ""}`, expiry: s.renewalDate, daysToExpiry: daysBetween(s.renewalDate), amount: s.costAED, currency: "AED", link: "/finance" });
    }
    // Recurring bills with next due in window
    for (const r of recurring) {
      if (r.nextDueDate && r.isActive) out.push({ id: `rec-${r.id}`, kind: "recurring", category: "Finance", subject: r.description, detail: r.kind, expiry: r.nextDueDate, daysToExpiry: daysBetween(r.nextDueDate), amount: r.averageAmount, currency: r.currency, link: "/finance" });
    }
    // VAT returns due (UAE FTA quarterly — 28 days after period end)
    for (const v of vat) {
      if (v.status === "draft") {
        const due = new Date(v.periodEnd);
        due.setDate(due.getDate() + 28);
        const iso = due.toISOString().slice(0, 10);
        out.push({ id: `vat-${v.id}`, kind: "vat", category: "Finance", subject: `VAT 201 - ${v.periodLabel}`, detail: "FTA quarterly return deadline (28 days post period-end)", expiry: iso, daysToExpiry: daysBetween(iso), link: "/finance" });
      }
    }
    return out
      .filter((r) => r.daysToExpiry >= -7) // include 1-week past for grace
      .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  }, [employees, insurance, govt, subs, recurring, vat]);

  const window = parseInt(windowDays, 10);
  const filtered = renewals.filter((r) => r.daysToExpiry <= window && (kindFilter === "all" || r.kind === kindFilter));

  const byBucket: Record<Bucket, Renewal[]> = { "<30": [], "30-60": [], "60-90": [], "90+": [] };
  for (const r of filtered) byBucket[bucketOf(r.daysToExpiry)].push(r);

  const kpis = {
    overdueOr30: filtered.filter((r) => r.daysToExpiry < 30).length,
    sixty: filtered.filter((r) => r.daysToExpiry >= 30 && r.daysToExpiry < 60).length,
    ninety: filtered.filter((r) => r.daysToExpiry >= 60 && r.daysToExpiry < 90).length,
    beyond: filtered.filter((r) => r.daysToExpiry >= 90).length,
    overdue: filtered.filter((r) => r.daysToExpiry < 0).length,
  };

  function exportCSV() {
    const headers = ["Days", "Expiry", "Kind", "Category", "Subject", "Detail", "Amount", "Currency"];
    const rows = filtered.map((r) => [r.daysToExpiry, r.expiry, KIND_META[r.kind].label, r.category, r.subject, r.detail || "", r.amount ?? "", r.currency ?? ""]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `compliance-calendar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Compliance & Renewals</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><CalendarDays className="w-6 h-6 text-amber-600" /> Compliance Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visas · Emirates IDs · Passports · Insurance · Licences · Subscriptions · Recurring bills · VAT/FTA — all in one view
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={windowDays} onValueChange={setWindowDays}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Next 30 days</SelectItem>
              <SelectItem value="60">Next 60 days</SelectItem>
              <SelectItem value="90">Next 90 days</SelectItem>
              <SelectItem value="180">Next 6 months</SelectItem>
              <SelectItem value="365">Next 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {(Object.keys(KIND_META) as Renewal["kind"][]).map((k) => <SelectItem key={k} value={k}>{KIND_META[k].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1"><FileDown className="w-4 h-4" /> Export CSV</Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Kpi label="Overdue / Past" value={kpis.overdue} tone="red" icon={<AlertTriangle className="w-4 h-4" />} />
        <Kpi label="Within 30 days" value={kpis.overdueOr30 - kpis.overdue} tone="red" />
        <Kpi label="30 - 60 days" value={kpis.sixty} tone="amber" />
        <Kpi label="60 - 90 days" value={kpis.ninety} tone="blue" />
        <Kpi label="Beyond 90 days" value={kpis.beyond} />
      </div>

      {/* Buckets */}
      {BUCKET_ORDER.map((b) => (
        <Card key={b}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {b === "<30" && <AlertTriangle className="w-4 h-4 text-red-600" />}
              {b === "30-60" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              <span className="capitalize">{b === "<30" ? "Critical — within 30 days" : b === "30-60" ? "Approaching — 30 to 60 days" : b === "60-90" ? "Plan — 60 to 90 days" : "Beyond 90 days"}</span>
              <Badge variant="outline" className="text-[10px]">{byBucket[b].length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-center px-2 py-2 w-[70px]">Days</th>
                  <th className="text-left px-2 py-2 w-[110px]">Expiry</th>
                  <th className="text-left px-2 py-2 w-[140px]">Kind</th>
                  <th className="text-left px-2 py-2">Subject</th>
                  <th className="text-left px-2 py-2">Detail</th>
                  <th className="text-right px-2 py-2 w-[130px]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {byBucket[b].length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">Nothing in this window.</td></tr>
                ) : byBucket[b].map((r) => {
                  const meta = KIND_META[r.kind];
                  const past = r.daysToExpiry < 0;
                  return (
                    <tr key={r.id} className={`border-t border-slate-100 ${past ? "bg-red-50/40" : ""}`}>
                      <td className={`px-2 py-1.5 text-center font-mono font-bold ${past ? "text-red-700" : r.daysToExpiry < 30 ? "text-red-600" : r.daysToExpiry < 60 ? "text-amber-700" : "text-slate-700"}`}>
                        {past ? `${-r.daysToExpiry}d ago` : `${r.daysToExpiry}d`}
                      </td>
                      <td className="px-2 py-1.5">{r.expiry}</td>
                      <td className="px-2 py-1.5"><Badge className={`text-[10px] capitalize ${meta.color}`}>{meta.label}</Badge></td>
                      <td className="px-2 py-1.5 font-medium">{r.subject}</td>
                      <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{r.detail || "—"}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{r.amount ? `${r.currency || "AED"} ${r.amount.toLocaleString()}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Kpi({ label, value, tone, icon }: { label: string; value: number; tone?: "red" | "amber" | "blue"; icon?: React.ReactNode }) {
  const cls = tone === "red" ? "border-red-300 bg-red-50/40" : tone === "amber" ? "border-amber-300 bg-amber-50/40" : tone === "blue" ? "border-blue-300 bg-blue-50/40" : "border-border";
  return (
    <Card className={`border ${cls}`}>
      <CardContent className="p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-lg font-bold font-mono">{value}</p>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}
