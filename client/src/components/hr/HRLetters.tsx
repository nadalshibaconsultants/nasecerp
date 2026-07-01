import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, FileSignature, FilePlus, Download, History, X } from "lucide-react";
import { employeesStore, lettersStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import { generatePrintablePDF, letterhead, escapeHTML } from "@/lib/hr/pdf-utils";
import { grossSalary, type Employee } from "@/lib/hr/types";
import type { IssuedLetter } from "@/lib/hr/extra-types";
import { apiFetch } from "@/lib/backend/api";

type LetterType = IssuedLetter["type"];

export default function HRLetters() {
  const actor = useCurrentActor();
  const employees = useCollection(employeesStore);
  const letters = useCollection(lettersStore);
  useCollection(auditStore);
  const [open, setOpen] = useState(false);
  const [empId, setEmpId] = useState<string>(employees[0]?.id || "");
  const [type, setType] = useState<LetterType>("salary-certificate");
  const [recipient, setRecipient] = useState("");
  const [refNo, setRefNo] = useState("");

  const counter = letters.length + 1;
  const pendingRequests = letters.filter((l) => l.requestStatus === "submitted");
  const issuedLetters = letters.filter((l) => l.requestStatus !== "submitted" && l.requestStatus !== "rejected");
  const computedRef = useMemo(() => {
    const map: Record<LetterType, string> = { "salary-certificate": "SC", "noc": "NOC", "experience-letter": "EXP", "employment-contract": "EC", "termination": "TER", "warning": "WRN" };
    return `NSC/HR/${map[type]}/${new Date().getFullYear()}/${String(counter).padStart(3, "0")}`;
  }, [type, counter]);

  function generate() {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) { toast.error("Pick an employee"); return; }
    const ref = refNo || computedRef;
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
    const html = renderLetterHTML(type, emp, recipient, ref, today);
    generatePrintablePDF({ title: `${type} - ${emp.firstName} ${emp.lastName}`, html });
    const issued: IssuedLetter = { id: newId("lt"), employeeId: emp.id, type, issueDate: new Date().toISOString().slice(0, 10), issuedBy: actor, reference: ref, recipient: recipient || undefined, fileName: `NSC-${type}-${emp.lastName}-${new Date().toISOString().slice(0, 10)}.pdf` };
    lettersStore.put(issued);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: actor, module: "letters", action: "issue", subject: `${type} · ${emp.firstName} ${emp.lastName}`, detail: `Ref ${ref}${recipient ? ` · Recipient: ${recipient}` : ""}` });
    toast.success("Letter generated — opening print preview");
    setOpen(false); setRecipient(""); setRefNo("");
  }
  function reissue(l: IssuedLetter) {
    const emp = employees.find((e) => e.id === l.employeeId);
    if (!emp) return;
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
    generatePrintablePDF({ title: `${l.type} - ${emp.firstName} ${emp.lastName}`, html: renderLetterHTML(l.type, emp, l.recipient || "", l.reference, today) });
  }
  async function decideRequest(l: IssuedLetter, approved: boolean) {
    try {
      await apiFetch(`/hr/letters/requests/${l.id}/${approved ? "approve" : "reject"}`, { method: "POST" });
      lettersStore.refresh?.();
      toast.success(approved ? "Certificate request approved" : "Certificate request rejected");
    } catch (err: any) {
      toast.error(err?.message || "Could not update request");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2"><FileSignature className="w-4 h-4" /> HR Letters</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><FilePlus className="w-3.5 h-3.5" /> Issue letter</Button>
      </div>
      {pendingRequests.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pending certificate requests · {pendingRequests.length}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map((l) => {
              const emp = employees.find((e) => e.id === l.employeeId);
              return (
                <div key={l.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : l.employeeId}</p>
                      <p className="text-xs text-slate-600 capitalize">{l.type.replace("-", " ")}{l.recipient ? ` · ${l.recipient}` : ""}</p>
                      {l.requestNote && <p className="text-xs text-slate-500 mt-1">{l.requestNote}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 border-red-300 text-red-700 hover:bg-red-50" onClick={() => decideRequest(l, false)}><X className="w-3.5 h-3.5 mr-1" /> Reject</Button>
                      <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => decideRequest(l, true)}><Check className="w-3.5 h-3.5 mr-1" /> Approve & issue</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4" /> Issued letters · {issuedLetters.length}</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Reference</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Employee</th><th className="text-left px-3 py-2">Recipient</th><th className="text-right px-3 py-2">Actions</th></tr></thead>
            <tbody>
              {issuedLetters.map((l) => {
                const emp = employees.find((e) => e.id === l.employeeId);
                return (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 tabular-nums">{l.issueDate}</td>
                    <td className="px-3 py-2 font-mono text-xs">{l.reference}</td>
                    <td className="px-3 py-2 capitalize">{l.type.replace("-", " ")}</td>
                    <td className="px-3 py-2">{emp ? `${emp.firstName} ${emp.lastName}` : l.employeeId}</td>
                    <td className="px-3 py-2 text-xs">{l.recipient || "—"}</td>
                    <td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" className="h-7" onClick={() => reissue(l)}><Download className="w-3.5 h-3.5 mr-1" /> Re-issue</Button></td>
                  </tr>
                );
              })}
              {issuedLetters.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500 py-4">No letters issued yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Issue HR letter</DialogTitle><DialogDescription>Generates a printable PDF with NASEC letterhead.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Letter type</Label><Select value={type} onValueChange={(v) => setType(v as LetterType)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="salary-certificate">Salary Certificate</SelectItem>
                <SelectItem value="noc">No-Objection Certificate (NOC)</SelectItem>
                <SelectItem value="experience-letter">Experience Letter</SelectItem>
                <SelectItem value="employment-contract">Employment Contract</SelectItem>
              </SelectContent></Select>
            </div>
            <div><Label className="text-xs">Employee</Label><Select value={empId} onValueChange={setEmpId}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.code}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">Recipient (bank, embassy, employer)</Label><Input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="mt-1" placeholder="e.g. Emirates NBD" /></div>
            <div><Label className="text-xs">Reference (auto: {computedRef})</Label><Input value={refNo} onChange={(e) => setRefNo(e.target.value)} className="mt-1" placeholder={computedRef} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={generate}>Generate PDF</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function renderLetterHTML(type: LetterType, emp: Employee, recipient: string, ref: string, todayLabel: string): string {
  const fullName = `${emp.firstName} ${emp.lastName}`;
  const gross = grossSalary(emp.salary);
  const yearsOfService = emp.joinDate ? Math.max(0, Math.floor((Date.now() - new Date(emp.joinDate).getTime()) / (365.25 * 86_400_000))).toString() : "—";
  const lh = letterhead({ ref, date: todayLabel });
  const greeting = recipient ? `<p>To: ${escapeHTML(recipient)}</p>` : `<p>To Whom It May Concern,</p>`;
  let body = "";
  if (type === "salary-certificate") {
    body = `<h2>Salary Certificate</h2>${greeting}
<p>This is to certify that <strong>${escapeHTML(fullName)}</strong> (Employee Code: ${escapeHTML(emp.code)}) has been working with Nadal Al Shiba Engineering Consultants since <strong>${escapeHTML(emp.joinDate)}</strong> as <strong>${escapeHTML(emp.jobTitle)}</strong> in the ${escapeHTML(emp.department)} department.</p>
<p>The current gross monthly salary breakdown is as follows:</p>
<table>
<tr><th>Component</th><th class="right">AED</th></tr>
<tr><td>Basic salary</td><td class="right">${emp.salary.basic.toLocaleString()}</td></tr>
<tr><td>Housing allowance</td><td class="right">${emp.salary.housing.toLocaleString()}</td></tr>
<tr><td>Transport allowance</td><td class="right">${emp.salary.transport.toLocaleString()}</td></tr>
<tr><td>Food allowance</td><td class="right">${emp.salary.food.toLocaleString()}</td></tr>
<tr><td>Other allowances</td><td class="right">${emp.salary.other.toLocaleString()}</td></tr>
<tr><td><strong>Gross monthly</strong></td><td class="right"><strong>${gross.toLocaleString()}</strong></td></tr>
</table>`;
  } else if (type === "noc") {
    body = `<h2>No-Objection Certificate</h2>${greeting}
<p>This is to certify that <strong>${escapeHTML(fullName)}</strong> (Passport No.: ${escapeHTML(emp.passportNo || "—")}, Emirates ID: ${escapeHTML(emp.emiratesIdNo || "—")}) is a full-time employee of Nadal Al Shiba Engineering Consultants since ${escapeHTML(emp.joinDate)}, holding the position of ${escapeHTML(emp.jobTitle)}.</p>
<p>The Company has <strong>no objection</strong> to ${emp.gender === "F" ? "her" : "his"} application for the purpose stated to ${escapeHTML(recipient || "the concerned authority")}.</p>
<p>This letter does not entail any financial obligation on the Company's part.</p>`;
  } else if (type === "experience-letter") {
    body = `<h2>Experience Letter</h2>${greeting}
<p>This is to certify that <strong>${escapeHTML(fullName)}</strong> has been employed at Nadal Al Shiba Engineering Consultants in the position of <strong>${escapeHTML(emp.jobTitle)}</strong> within our ${escapeHTML(emp.department)} department from <strong>${escapeHTML(emp.joinDate)}</strong> ${emp.endDate ? `until <strong>${escapeHTML(emp.endDate)}</strong>` : "to date"} (${yearsOfService} year(s) of service).</p>
<p>During this period, ${emp.gender === "F" ? "she" : "he"} demonstrated professional competence, integrity, and commitment to quality.</p>
<p>We wish ${emp.gender === "F" ? "her" : "him"} continued success in ${emp.gender === "F" ? "her" : "his"} future endeavours.</p>`;
  } else if (type === "employment-contract") {
    body = `<h2>Employment Contract Summary</h2>
<table>
<tr><th>Employee</th><td>${escapeHTML(fullName)} (${escapeHTML(emp.code)})</td></tr>
<tr><th>Position</th><td>${escapeHTML(emp.jobTitle)} — ${escapeHTML(emp.department)}</td></tr>
<tr><th>Contract type</th><td>${escapeHTML(emp.contractType)}</td></tr>
<tr><th>Join date</th><td>${escapeHTML(emp.joinDate)}</td></tr>
<tr><th>Probation</th><td>${escapeHTML(emp.probationEndDate || "—")}</td></tr>
<tr><th>Gross monthly</th><td>AED ${gross.toLocaleString()}</td></tr>
<tr><th>Working week</th><td>Monday to Friday, 8 hours/day</td></tr>
<tr><th>Annual leave</th><td>30 calendar days/year per UAE Labour Law</td></tr>
<tr><th>End-of-service</th><td>Per UAE Labour Law (Federal Decree-Law 33 of 2021)</td></tr>
<tr><th>Notice period</th><td>30 days written notice from either party</td></tr>
</table>`;
  }
  const stamp = `<div class="stamp"><p>Yours sincerely,</p><p><span class="signature-line"></span></p><p><strong>Fatima Al-Zaabi</strong><br />Human Resources Manager<br />Nadal Al Shiba Engineering Consultants</p></div>
<div class="footer">Electronically issued · valid without physical signature when bearing reference ${escapeHTML(ref)}.</div>`;
  return lh + body + stamp;
}
