/**
 * Financial Statements — Trial Balance, P&L, Balance Sheet, Cash Flow,
 * Project P&L. All derived in real time from posted + auto-posted journals.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Printer, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import {
  glAccountsStore, journalEntriesStore, arInvoicesStore, apBillsStore,
  arReceiptsStore, supplierPaymentsStore, bankAccountsStore, projectsStore,
} from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { synthesiseJournals } from "@/lib/finance/auto-post";
import {
  computeTrialBalance, computeProfitLoss, computeBalanceSheet,
  computeCashFlow, computeProjectPL,
  type AccountBalance, type PLSection,
} from "@/lib/finance/reports";

function fmt(n: number): string {
  const abs = Math.abs(Math.round(n)).toLocaleString();
  return n < 0 ? `(${abs})` : abs;
}

export default function FinancialStatements() {
  const accounts = useCollection(glAccountsStore);
  const manualJournals = useCollection(journalEntriesStore);
  const arInvoices = useCollection(arInvoicesStore);
  const apBills = useCollection(apBillsStore);
  const receipts = useCollection(arReceiptsStore);
  const payments = useCollection(supplierPaymentsStore);
  const banks = useCollection(bankAccountsStore);
  const projects = useCollection(projectsStore);

  const journals = useMemo(
    () => synthesiseJournals({ manual: manualJournals, arInvoices, apBills, receipts, payments, banks }),
    [manualJournals, arInvoices, apBills, receipts, payments, banks]
  );

  const today = new Date().toISOString().slice(0, 10);
  const yearStart = today.slice(0, 4) + "-01-01";

  const [fromDate, setFromDate] = useState(yearStart);
  const [toDate, setToDate] = useState(today);
  const [presetPeriod, setPresetPeriod] = useState("ytd");

  function applyPreset(p: string) {
    setPresetPeriod(p);
    const now = new Date();
    const y = now.getFullYear();
    if (p === "ytd") { setFromDate(`${y}-01-01`); setToDate(today); }
    else if (p === "mtd") { setFromDate(`${y}-${String(now.getMonth() + 1).padStart(2, "0")}-01`); setToDate(today); }
    else if (p === "qtd") {
      const qStart = Math.floor(now.getMonth() / 3) * 3 + 1;
      setFromDate(`${y}-${String(qStart).padStart(2, "0")}-01`); setToDate(today);
    }
    else if (p === "ly") { setFromDate(`${y - 1}-01-01`); setToDate(`${y - 1}-12-31`); }
  }

  const trial = useMemo(() => computeTrialBalance(journals, accounts, toDate), [journals, accounts, toDate]);
  const pl = useMemo(() => computeProfitLoss(journals, accounts, fromDate, toDate), [journals, accounts, fromDate, toDate]);
  const bs = useMemo(() => computeBalanceSheet(journals, accounts, toDate), [journals, accounts, toDate]);
  const cf = useMemo(() => computeCashFlow(journals, accounts, fromDate, toDate), [journals, accounts, fromDate, toDate]);

  function printPage() { window.print(); }

  function exportCSV(filename: string, rows: (string | number)[][]) {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Period</label>
          <Select value={presetPeriod} onValueChange={applyPreset}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mtd">Month-to-date</SelectItem>
              <SelectItem value="qtd">Quarter-to-date</SelectItem>
              <SelectItem value="ytd">Year-to-date</SelectItem>
              <SelectItem value="ly">Last year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">From</label>
          <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPresetPeriod("custom"); }} className="h-8 w-36" />
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">To / As of</label>
          <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPresetPeriod("custom"); }} className="h-8 w-36" />
        </div>
        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={printPage} className="gap-1"><Printer className="w-3.5 h-3.5" /> Print</Button>
        </div>
      </CardContent></Card>

      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cf">Cash Flow</TabsTrigger>
          <TabsTrigger value="tb">Trial Balance</TabsTrigger>
          <TabsTrigger value="proj">Project P&amp;L</TabsTrigger>
        </TabsList>

        <TabsContent value="pl">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Profit &amp; Loss Statement</CardTitle>
              <p className="text-xs text-muted-foreground">For the period {fromDate} → {toDate}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              const rows: (string | number)[][] = [["NASEC ERP - Profit & Loss"], ["Period", fromDate, "→", toDate], [], ["Account", "Amount AED"]];
              for (const sec of [pl.revenue, pl.otherIncome, pl.directCosts, pl.operatingExpenses, pl.financeExpenses]) {
                rows.push([sec.title.toUpperCase()]);
                for (const a of sec.accounts) rows.push([`  ${a.account.code} ${a.account.name}`, Math.round(a.balance)]);
                rows.push([`TOTAL ${sec.title}`, Math.round(sec.subtotal)]);
                rows.push([]);
              }
              rows.push(["GROSS PROFIT", Math.round(pl.grossProfit)]);
              rows.push(["OPERATING PROFIT", Math.round(pl.operatingProfit)]);
              rows.push(["NET PROFIT", Math.round(pl.netProfit)]);
              exportCSV(`PnL-${fromDate}-${toDate}.csv`, rows);
            }} className="gap-1"><FileDown className="w-3.5 h-3.5" /> Export CSV</Button>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                <PLSectionRows section={pl.revenue} />
                <tr className="border-t-2 border-slate-300 font-semibold"><td className="py-2">Total Revenue</td><td className="text-right font-mono">AED {fmt(pl.totalRevenue)}</td></tr>
                <PLSectionRows section={pl.directCosts} negate />
                <tr className="border-t-2 border-slate-300 font-semibold"><td className="py-2">Total Direct Costs</td><td className="text-right font-mono">({fmt(pl.totalDirectCosts)})</td></tr>
                <tr className="border-t border-slate-400 bg-blue-50/40 font-bold"><td className="py-2">Gross Profit</td><td className={`text-right font-mono ${pl.grossProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>AED {fmt(pl.grossProfit)}</td></tr>
                <tr><td className="text-[10px] text-muted-foreground italic">Gross Margin</td><td className="text-right text-[10px] italic text-muted-foreground">{pl.grossMarginPct.toFixed(1)}%</td></tr>
                <PLSectionRows section={pl.otherIncome} />
                {pl.otherIncome.subtotal !== 0 && <tr className="border-t border-slate-300 font-semibold"><td className="py-2">Total Other Income</td><td className="text-right font-mono">AED {fmt(pl.otherIncome.subtotal)}</td></tr>}
                <PLSectionRows section={pl.operatingExpenses} negate />
                <tr className="border-t-2 border-slate-300 font-semibold"><td className="py-2">Total Operating Expenses</td><td className="text-right font-mono">({fmt(pl.totalOperatingExpenses)})</td></tr>
                <tr className="border-t border-slate-400 bg-amber-50/40 font-bold"><td className="py-2">Operating Profit</td><td className={`text-right font-mono ${pl.operatingProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>AED {fmt(pl.operatingProfit)}</td></tr>
                <PLSectionRows section={pl.financeExpenses} negate />
                {pl.financeExpenses.subtotal > 0 && <tr className="border-t border-slate-300 font-semibold"><td className="py-2">Total Finance Costs</td><td className="text-right font-mono">({fmt(pl.totalFinanceExpenses)})</td></tr>}
                <tr className="border-t-4 border-slate-700 bg-emerald-50/60 font-bold text-base"><td className="py-3">NET PROFIT / (LOSS)</td><td className={`text-right font-mono ${pl.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>AED {fmt(pl.netProfit)}</td></tr>
                <tr><td className="text-[10px] text-muted-foreground italic">Net Margin</td><td className="text-right text-[10px] italic text-muted-foreground">{pl.netMarginPct.toFixed(1)}%</td></tr>
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="bs">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Balance Sheet</CardTitle>
              <p className="text-xs text-muted-foreground">As of {bs.asOfDate}</p>
            </div>
            <Badge className={Math.abs(bs.difference) < 1 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
              {Math.abs(bs.difference) < 1 ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Balanced</> : <><AlertTriangle className="w-3 h-3 inline mr-1" />Diff AED {fmt(bs.difference)}</>}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <table className="w-full text-sm">
                <thead><tr><th colSpan={2} className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b pb-1">ASSETS</th></tr></thead>
                <tbody>
                  <PLSectionRows section={bs.currentAssets} />
                  <tr className="border-t border-slate-300 font-semibold"><td className="py-1.5">Total Current Assets</td><td className="text-right font-mono">AED {fmt(bs.currentAssets.subtotal)}</td></tr>
                  <PLSectionRows section={bs.nonCurrentAssets} />
                  {bs.nonCurrentAssets.subtotal !== 0 && <tr className="border-t border-slate-300 font-semibold"><td className="py-1.5">Total Non-Current Assets</td><td className="text-right font-mono">AED {fmt(bs.nonCurrentAssets.subtotal)}</td></tr>}
                  <tr className="border-t-2 border-slate-500 bg-blue-50 font-bold text-base"><td className="py-2">TOTAL ASSETS</td><td className="text-right font-mono">AED {fmt(bs.totalAssets)}</td></tr>
                </tbody>
              </table>
              <table className="w-full text-sm">
                <thead><tr><th colSpan={2} className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b pb-1">LIABILITIES &amp; EQUITY</th></tr></thead>
                <tbody>
                  <PLSectionRows section={bs.currentLiabilities} />
                  <tr className="border-t border-slate-300 font-semibold"><td className="py-1.5">Total Current Liabilities</td><td className="text-right font-mono">AED {fmt(bs.currentLiabilities.subtotal)}</td></tr>
                  <PLSectionRows section={bs.nonCurrentLiabilities} />
                  {bs.nonCurrentLiabilities.subtotal !== 0 && <tr className="border-t border-slate-300 font-semibold"><td className="py-1.5">Total Non-Current Liabilities</td><td className="text-right font-mono">AED {fmt(bs.nonCurrentLiabilities.subtotal)}</td></tr>}
                  <tr className="border-t-2 border-slate-300 font-semibold"><td className="py-1.5">Total Liabilities</td><td className="text-right font-mono">AED {fmt(bs.totalLiabilities)}</td></tr>
                  <PLSectionRows section={bs.equity} />
                  <tr><td className="py-1 text-xs text-muted-foreground">Retained Earnings (YTD)</td><td className="text-right font-mono text-xs">{fmt(bs.retainedEarningsThisPeriod)}</td></tr>
                  <tr className="border-t border-slate-300 font-semibold"><td className="py-1.5">Total Equity</td><td className="text-right font-mono">AED {fmt(bs.totalEquity)}</td></tr>
                  <tr className="border-t-2 border-slate-500 bg-amber-50 font-bold text-base"><td className="py-2">TOTAL LIABILITIES &amp; EQUITY</td><td className="text-right font-mono">AED {fmt(bs.totalLiabilitiesAndEquity)}</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="cf">
          <Card><CardHeader className="pb-2">
            <CardTitle className="text-base">Statement of Cash Flows</CardTitle>
            <p className="text-xs text-muted-foreground">Indirect method · {cf.fromDate} → {cf.toDate}</p>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                <tr className="bg-slate-50"><td colSpan={2} className="px-2 py-1.5 text-xs uppercase font-semibold text-muted-foreground">OPERATING ACTIVITIES</td></tr>
                <tr><td className="py-1">Net Profit / (Loss) for the period</td><td className="text-right font-mono">AED {fmt(cf.netProfit)}</td></tr>
                <tr><td className="py-1 italic text-xs">Adjustments for non-cash items:</td><td></td></tr>
                {cf.addBack.map((a, i) => (<tr key={i}><td className="pl-4 py-1">{a.label}</td><td className="text-right font-mono">{fmt(a.amount)}</td></tr>))}
                <tr><td className="py-1 italic text-xs">Movements in working capital:</td><td></td></tr>
                {cf.workingCapital.map((a, i) => (<tr key={i}><td className="pl-4 py-1">{a.label}</td><td className="text-right font-mono">{fmt(a.amount)}</td></tr>))}
                <tr className="border-t-2 border-slate-300 font-bold bg-blue-50/40"><td className="py-2">Net Cash from Operating Activities</td><td className={`text-right font-mono ${cf.cashFromOperating >= 0 ? "text-emerald-700" : "text-red-700"}`}>AED {fmt(cf.cashFromOperating)}</td></tr>

                <tr className="bg-slate-50"><td colSpan={2} className="px-2 py-1.5 text-xs uppercase font-semibold text-muted-foreground">INVESTING ACTIVITIES</td></tr>
                {cf.investing.map((a, i) => (<tr key={i}><td className="py-1">{a.label}</td><td className="text-right font-mono">{fmt(a.amount)}</td></tr>))}
                <tr className="border-t border-slate-300 font-semibold"><td className="py-1.5">Net Cash from Investing</td><td className="text-right font-mono">AED {fmt(cf.cashFromInvesting)}</td></tr>

                <tr className="bg-slate-50"><td colSpan={2} className="px-2 py-1.5 text-xs uppercase font-semibold text-muted-foreground">FINANCING ACTIVITIES</td></tr>
                {cf.financing.map((a, i) => (<tr key={i}><td className="py-1">{a.label}</td><td className="text-right font-mono">{fmt(a.amount)}</td></tr>))}
                <tr className="border-t border-slate-300 font-semibold"><td className="py-1.5">Net Cash from Financing</td><td className="text-right font-mono">AED {fmt(cf.cashFromFinancing)}</td></tr>

                <tr className="border-t-4 border-slate-700 bg-emerald-50/60 font-bold text-base"><td className="py-3">Net change in cash &amp; equivalents</td><td className={`text-right font-mono ${cf.netChangeInCash >= 0 ? "text-emerald-700" : "text-red-700"}`}>AED {fmt(cf.netChangeInCash)}</td></tr>
                <tr><td className="py-1 text-xs text-muted-foreground">Opening cash &amp; bank</td><td className="text-right font-mono text-xs">{fmt(cf.openingCash)}</td></tr>
                <tr className="border-t border-slate-300"><td className="py-1 text-xs text-muted-foreground">Closing cash &amp; bank</td><td className="text-right font-mono text-xs">{fmt(cf.closingCash)}</td></tr>
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tb">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Trial Balance</CardTitle>
              <p className="text-xs text-muted-foreground">As of {toDate} - auto-derived from {journals.length} journal entries ({manualJournals.length} manual + {journals.length - manualJournals.length} auto-posted)</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              const rows: (string | number)[][] = [["Code", "Account", "Debit", "Credit"]];
              for (const b of trial) rows.push([b.account.code, b.account.name, Math.round(Math.max(b.debit - b.credit, 0)), Math.round(Math.max(b.credit - b.debit, 0))]);
              const td = trial.reduce((s, b) => s + Math.max(b.debit - b.credit, 0), 0);
              const tc = trial.reduce((s, b) => s + Math.max(b.credit - b.debit, 0), 0);
              rows.push(["", "TOTAL", Math.round(td), Math.round(tc)]);
              exportCSV(`TB-${toDate}.csv`, rows);
            }} className="gap-1"><FileDown className="w-3.5 h-3.5" /> Export CSV</Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
            <thead className="bg-slate-50"><tr>
              <th className="text-left px-2 py-1.5 w-[80px]">Code</th>
              <th className="text-left px-2 py-1.5">Account</th>
              <th className="text-left px-2 py-1.5 w-[110px]">Type</th>
              <th className="text-right px-2 py-1.5 w-[140px]">Debit</th>
              <th className="text-right px-2 py-1.5 w-[140px]">Credit</th>
            </tr></thead>
            <tbody>{trial.map((b) => {
              const d = Math.max(b.debit - b.credit, 0);
              const c = Math.max(b.credit - b.debit, 0);
              return (<tr key={b.account.id} className="border-t border-slate-100">
                <td className="px-2 py-1 font-mono">{b.account.code}</td>
                <td className="px-2 py-1">{b.account.name}</td>
                <td className="px-2 py-1"><Badge variant="outline" className="text-[10px] capitalize">{b.account.type}</Badge></td>
                <td className="px-2 py-1 text-right font-mono">{d > 0 ? d.toLocaleString() : ""}</td>
                <td className="px-2 py-1 text-right font-mono">{c > 0 ? c.toLocaleString() : ""}</td>
              </tr>);
            })}
              {(() => {
                const td = trial.reduce((s, b) => s + Math.max(b.debit - b.credit, 0), 0);
                const tc = trial.reduce((s, b) => s + Math.max(b.credit - b.debit, 0), 0);
                const diff = Math.abs(td - tc);
                return <tr className="bg-slate-100 font-bold border-t-2"><td colSpan={3} className="px-2 py-2">TOTAL {diff < 1 && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] ml-2"><CheckCircle2 className="w-3 h-3 inline mr-0.5" />Balanced</Badge>}</td><td className="text-right font-mono">{Math.round(td).toLocaleString()}</td><td className="text-right font-mono">{Math.round(tc).toLocaleString()}</td></tr>;
              })()}
            </tbody>
          </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="proj">
          <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Project P&amp;L (Cost Centre Allocation)</CardTitle>
            <p className="text-xs text-muted-foreground">Revenue and direct costs attributed to each project via tagged journal lines.</p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
            <thead className="bg-slate-50"><tr>
              <th className="text-left px-2 py-2">Project</th>
              <th className="text-left px-2 py-2">Client</th>
              <th className="text-left px-2 py-2">Stage</th>
              <th className="text-right px-2 py-2 w-[140px]">Revenue</th>
              <th className="text-right px-2 py-2 w-[140px]">Direct Costs</th>
              <th className="text-right px-2 py-2 w-[140px]">Margin</th>
              <th className="text-right px-2 py-2 w-[80px]">%</th>
            </tr></thead>
            <tbody>{projects.map((p) => {
              const pp = computeProjectPL(journals, accounts, p.id, fromDate, toDate);
              if (pp.revenue === 0 && pp.directCosts === 0) return null;
              return (<tr key={p.id} className="border-t border-slate-100">
                <td className="px-2 py-1.5 font-medium">{p.name}</td>
                <td className="px-2 py-1.5">{p.client}</td>
                <td className="px-2 py-1.5 capitalize">{p.stage}</td>
                <td className="px-2 py-1.5 text-right font-mono">{fmt(pp.revenue)}</td>
                <td className="px-2 py-1.5 text-right font-mono">{fmt(pp.directCosts)}</td>
                <td className={`px-2 py-1.5 text-right font-mono font-bold ${pp.margin >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(pp.margin)}</td>
                <td className={`px-2 py-1.5 text-right font-mono ${pp.marginPct >= 20 ? "text-emerald-700" : pp.marginPct >= 0 ? "text-amber-700" : "text-red-700"}`}>{pp.marginPct.toFixed(1)}%</td>
              </tr>);
            })}</tbody>
          </table></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PLSectionRows({ section, negate }: { section: PLSection; negate?: boolean }) {
  if (section.accounts.length === 0) return null;
  return (
    <>
      <tr className="bg-slate-50"><td colSpan={2} className="px-2 py-1.5 text-[11px] uppercase font-semibold text-muted-foreground">{section.title}</td></tr>
      {section.accounts.map((b: AccountBalance) => (
        <tr key={b.account.id}>
          <td className="pl-4 py-0.5 text-[12px]"><span className="font-mono text-[10px] text-muted-foreground mr-1">{b.account.code}</span>{b.account.name}</td>
          <td className="text-right font-mono text-[12px]">{negate ? `(${fmt(b.balance)})` : fmt(b.balance)}</td>
        </tr>
      ))}
    </>
  );
}
