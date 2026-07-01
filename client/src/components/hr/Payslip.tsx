import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wallet, FileDown, Search } from "lucide-react";
import { employeesStore, punchesStore, leavesStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import { aggregateDays } from "@/lib/attendance/utils";
import { monthlyPayroll, type PayrollLine } from "@/lib/payroll/utils";
import { generatePrintablePDF, letterhead, escapeHTML } from "@/lib/hr/pdf-utils";
import type { Employee } from "@/lib/hr/types";

export default function Payslip() {
  const actor = useCurrentActor();
  const employees = useCollection(employeesStore);
  const punches = useCollection(punchesStore);
  const leaves = useCollection(leavesStore);
  const today = new Date();
  const year = today.getUTCFullYear();
  const m0 = today.getUTCMonth();
  const fromDate = `${year}-${String(m0 + 1).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, m0 + 1, 0));
  const toDate = last.toISOString().slice(0, 10);
  const days = useMemo(() => aggregateDays({ punches, employeeIds: employees.map((e) => e.id), fromDate, toDate, leaves }), [punches, employees, fromDate, toDate, leaves]);
  const monthLabel = new Date(Date.UTC(year, m0, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const [search, setSearch] = useState("");
  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      (e.code || "").toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q) ||
      (e.jobTitle || "").toLowerCase().includes(q),
    );
  }, [employees, search]);

  function generatePayslip(emp: Employee) {
    const line = monthlyPayroll(emp, days, year, m0);
    const html = letterhead({ ref: `NSC/HR/PS/${year}/${String(m0 + 1).padStart(2, "0")}/${emp.code.split("-").slice(-1)[0]}`, date: monthLabel })
      + renderPayslipHTML(emp, line, monthLabel);
    generatePrintablePDF({ title: `Payslip ${emp.firstName} ${emp.lastName} ${monthLabel}`, html });
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: actor, module: "payroll", action: "issue", subject: `Payslip · ${emp.firstName} ${emp.lastName}`, detail: `${monthLabel} · Net AED ${line.netPay.toLocaleString()}` });
  }
  function generateAllPayslips() {
    employees.forEach(generatePayslip);
  }
  function generateWPS() {
    // SIF (Salary Information File) export — flat, fixed-width per CB UAE WPS spec
    // For demo: emit a CSV approximation that maps to the WPS fields
    const rows = employees.map((e) => {
      const l = monthlyPayroll(e, days, year, m0);
      return [
        e.code,
        e.emiratesIdNo || "",
        e.bank?.iban || "",
        l.basic.toFixed(2),
        (l.housing + l.transport + l.food + l.other).toFixed(2),
        l.netPay.toFixed(2),
        `${year}${String(m0 + 1).padStart(2, "0")}`,
      ].join(",");
    });
    const csv = "EmployeeCode,EmiratesID,IBAN,Basic,Allowances,Net,SalaryMonth\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `WPS-SIF-${year}${String(m0 + 1).padStart(2, "0")}.csv`; a.click();
    URL.revokeObjectURL(url);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: actor, module: "payroll", action: "issue", subject: `WPS SIF file · ${monthLabel}`, detail: `${employees.length} employees` });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-base font-semibold flex items-center gap-2 shrink-0"><Wallet className="w-4 h-4" /> Payslips · {monthLabel}</h3>
        <div className="relative flex-1 sm:max-w-xs sm:mx-3">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            className="h-9 pl-8"
            placeholder="Search employee, code, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={generateWPS}><FileDown className="w-3.5 h-3.5" /> WPS SIF (CSV)</Button>
          <Button size="sm" className="gap-1.5" onClick={generateAllPayslips}><FileDown className="w-3.5 h-3.5" /> Generate all payslips</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="text-left px-3 py-2">Employee</th><th className="text-right px-3 py-2">Basic</th><th className="text-right px-3 py-2">Allow.</th><th className="text-right px-3 py-2">Days P/A/L</th><th className="text-right px-3 py-2">OT</th><th className="text-right px-3 py-2">Net pay</th><th className="text-right px-3 py-2">Action</th></tr></thead>
            <tbody>
              {filteredEmployees.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-500">No employees match “{search}”.</td></tr>
              )}
              {filteredEmployees.map((e) => {
                const l = monthlyPayroll(e, days, year, m0);
                return (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{e.firstName} {e.lastName}<span className="text-xs text-slate-500 ml-1">{e.code}</span></td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.basic.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{(l.housing + l.transport + l.food + l.other).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{l.daysPresent}/{l.daysAbsent}/{l.daysLeave}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{l.totalOvertimeHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{l.netPay.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => generatePayslip(e)} className="h-7"><FileDown className="w-3.5 h-3.5 mr-1" /> PDF</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function renderPayslipHTML(emp: Employee, l: PayrollLine, monthLabel: string): string {
  const allow = l.housing + l.transport + l.food + l.other;
  return `<h2>Payslip — ${escapeHTML(monthLabel)}</h2>
<div class="grid-2">
  <div><strong>Employee:</strong> ${escapeHTML(emp.firstName)} ${escapeHTML(emp.lastName)} (${escapeHTML(emp.code)})<br /><strong>Position:</strong> ${escapeHTML(emp.jobTitle)}<br /><strong>Department:</strong> ${escapeHTML(emp.department)}</div>
  <div class="right"><strong>Bank:</strong> ${escapeHTML(emp.bank?.bankName || "—")}<br /><strong>IBAN:</strong> ${escapeHTML(emp.bank?.iban || "—")}<br /><strong>Emirates ID:</strong> ${escapeHTML(emp.emiratesIdNo || "—")}</div>
</div>
<h3 style="margin-top: 6mm;">Earnings</h3>
<table>
<tr><th>Component</th><th class="right">AED</th></tr>
<tr><td>Basic salary</td><td class="right">${l.basic.toLocaleString()}</td></tr>
<tr><td>Housing allowance</td><td class="right">${l.housing.toLocaleString()}</td></tr>
<tr><td>Transport allowance</td><td class="right">${l.transport.toLocaleString()}</td></tr>
<tr><td>Food allowance</td><td class="right">${l.food.toLocaleString()}</td></tr>
<tr><td>Other allowances</td><td class="right">${l.other.toLocaleString()}</td></tr>
<tr><td>Overtime (${l.totalOvertimeHours.toFixed(1)}h × AED ${l.overtimeRate.toFixed(2)})</td><td class="right">${l.overtimePay.toLocaleString()}</td></tr>
<tr><td><strong>Total earnings</strong></td><td class="right"><strong>${(l.grossBeforeAdjustments + l.overtimePay).toLocaleString()}</strong></td></tr>
</table>
<h3 style="margin-top: 4mm;">Deductions</h3>
<table>
<tr><td>Absence (${l.daysAbsent} day${l.daysAbsent === 1 ? "" : "s"} × AED ${l.workingDaysInMonth > 0 ? (l.basic / l.workingDaysInMonth).toFixed(2) : "0"})</td><td class="right">${l.absenceDeduction.toLocaleString()}</td></tr>
<tr><td><strong>Total deductions</strong></td><td class="right"><strong>${l.absenceDeduction.toLocaleString()}</strong></td></tr>
</table>
<h3 style="margin-top: 4mm;">Net Pay</h3>
<table><tr><td><strong>NET PAY</strong></td><td class="right"><strong>AED ${l.netPay.toLocaleString()}</strong></td></tr></table>
<p class="muted small" style="margin-top: 6mm;">Working days in ${escapeHTML(monthLabel)}: ${l.workingDaysInMonth}. Days present: ${l.daysPresent}. Approved leave: ${l.daysLeave}. Hours on site: ${l.totalNormalHours.toFixed(1)} (normal) + ${l.totalOvertimeHours.toFixed(1)} (overtime). Hourly rate: AED ${l.hourlyRate.toFixed(2)}.</p>
<p class="muted small">Generated by NASEC ERP from geofence-validated attendance data.</p>`;
}
