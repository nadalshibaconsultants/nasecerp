import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calculator, FileDown } from "lucide-react";
import { employeesStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { generatePrintablePDF, letterhead, escapeHTML } from "@/lib/hr/pdf-utils";
import { grossSalary, type Employee } from "@/lib/hr/types";

/**
 * UAE EOSB / Gratuity calculator (Federal Decree-Law 33 of 2021).
 *  - First 5y service: 21 days basic salary per year
 *  - After 5y: 30 days basic salary per year (full years only after 5y)
 *  - Pro-rated for partial years (>1 year required)
 *  - Cap: total gratuity ≤ 2 years' basic salary
 *  - Resignation < 5y under unlimited contract: reduced (1/3 if 1-3y, 2/3 if 3-5y)
 */

type Reason = "termination" | "resignation" | "retirement" | "death";

export default function Gratuity() {
  const employees = useCollection(employeesStore);
  const [empId, setEmpId] = useState<string>(employees[0]?.id || "");
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState<Reason>("resignation");

  const emp = employees.find((e) => e.id === empId);
  const calc = emp ? calculate(emp, endDate, reason) : null;

  function exportPDF() {
    if (!emp || !calc) return;
    const html = letterhead({ ref: `NSC/HR/EOSB/${new Date().getFullYear()}/${emp.code.split("-").slice(-1)[0]}`, date: new Date().toLocaleDateString("en-GB") })
      + `<h2>End-of-Service Benefits Statement</h2>
<p>Per UAE Federal Decree-Law 33 of 2021.</p>
<table>
<tr><th>Employee</th><td>${escapeHTML(emp.firstName + " " + emp.lastName)} (${escapeHTML(emp.code)})</td></tr>
<tr><th>Join date</th><td>${escapeHTML(emp.joinDate)}</td></tr>
<tr><th>End date</th><td>${escapeHTML(endDate)}</td></tr>
<tr><th>Years of service</th><td>${calc.yearsOfService.toFixed(2)}</td></tr>
<tr><th>Basic salary at termination</th><td>AED ${emp.salary.basic.toLocaleString()}</td></tr>
<tr><th>Daily basic rate</th><td>AED ${calc.dailyBasic.toFixed(2)}</td></tr>
<tr><th>First 5 years (21 days × ${Math.min(5, calc.yearsOfService).toFixed(2)})</th><td class="right">AED ${calc.firstSegment.toLocaleString()}</td></tr>
<tr><th>After 5 years (30 days × ${Math.max(0, calc.yearsOfService - 5).toFixed(2)})</th><td class="right">AED ${calc.secondSegment.toLocaleString()}</td></tr>
<tr><th>Reason / reduction (${escapeHTML(reason)})</th><td class="right">×${calc.reductionFactor.toFixed(2)}</td></tr>
<tr><th>Cap (2 years' basic)</th><td class="right">AED ${(emp.salary.basic * 24).toLocaleString()}</td></tr>
<tr><th><strong>Gratuity payable</strong></th><td class="right"><strong>AED ${calc.totalGratuity.toLocaleString()}</strong></td></tr>
</table>
<p class="muted small">Computed automatically by NASEC ERP.</p>`;
    generatePrintablePDF({ title: `EOSB Statement ${emp.firstName} ${emp.lastName}`, html });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold flex items-center gap-2"><Calculator className="w-4 h-4" /> End-of-Service Benefits (Gratuity / EOSB) Calculator</h3>
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
          <div><Label className="text-xs">Employee</Label>
            <Select value={empId} onValueChange={setEmpId}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label className="text-xs">End date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as Reason)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="termination">Termination by employer</SelectItem>
                <SelectItem value="resignation">Resignation by employee</SelectItem>
                <SelectItem value="retirement">Retirement</SelectItem>
                <SelectItem value="death">Death in service</SelectItem>
              </SelectContent></Select>
          </div>
        </CardContent>
      </Card>
      {emp && calc && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Calculation breakdown</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                <Row label="Years of service" value={`${calc.yearsOfService.toFixed(2)} years`} />
                <Row label="Basic salary" value={`AED ${emp.salary.basic.toLocaleString()}`} />
                <Row label="Daily basic" value={`AED ${calc.dailyBasic.toFixed(2)}`} />
                <Row label={`First 5y (21 days × ${Math.min(5, calc.yearsOfService).toFixed(2)})`} value={`AED ${calc.firstSegment.toLocaleString()}`} />
                <Row label={`After 5y (30 days × ${Math.max(0, calc.yearsOfService - 5).toFixed(2)})`} value={`AED ${calc.secondSegment.toLocaleString()}`} />
                <Row label="Reduction factor" value={`×${calc.reductionFactor.toFixed(2)}`} />
                <Row label="Cap (24× basic)" value={`AED ${(emp.salary.basic * 24).toLocaleString()}`} />
                <tr className="border-t-2 border-slate-300"><td className="px-3 py-2 font-semibold">Gratuity payable</td><td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700">AED {calc.totalGratuity.toLocaleString()}</td></tr>
              </tbody>
            </table>
            <div className="flex justify-end mt-3"><Button size="sm" variant="outline" className="gap-1.5" onClick={exportPDF}><FileDown className="w-3.5 h-3.5" /> Export EOSB statement</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) { return <tr className="border-t border-slate-100"><td className="px-3 py-2 text-slate-600">{label}</td><td className="px-3 py-2 text-right tabular-nums">{value}</td></tr>; }

function calculate(emp: Employee, endDate: string, reason: Reason) {
  const start = new Date(emp.joinDate + "T00:00:00Z").getTime();
  const end = new Date(endDate + "T00:00:00Z").getTime();
  const yearsOfService = Math.max(0, (end - start) / (365.25 * 86_400_000));
  const dailyBasic = emp.salary.basic / 30;
  const firstYears = Math.min(5, yearsOfService);
  const laterYears = Math.max(0, yearsOfService - 5);
  const firstSegment = firstYears * 21 * dailyBasic;
  const secondSegment = laterYears * 30 * dailyBasic;
  // Reduction factor for resignation under unlimited contract (UAE pre-2022 rule, retained partly)
  let reductionFactor = 1;
  if (reason === "resignation" && emp.contractType === "unlimited") {
    if (yearsOfService < 1) reductionFactor = 0;
    else if (yearsOfService < 3) reductionFactor = 1 / 3;
    else if (yearsOfService < 5) reductionFactor = 2 / 3;
  }
  const subtotal = (firstSegment + secondSegment) * reductionFactor;
  const cap = emp.salary.basic * 24;
  const totalGratuity = Math.round(Math.min(subtotal, cap));
  return { yearsOfService, dailyBasic, firstSegment: Math.round(firstSegment), secondSegment: Math.round(secondSegment), reductionFactor, totalGratuity };
}
