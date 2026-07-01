/**
 * OfficesPanel — read-only display + light editing for the two-office config.
 * Director can adjust per-office labour rules. Persistence is local for now;
 * once Supabase is connected these flow to a config table.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OFFICES } from "@/lib/office/configs";
import { Building2, CalendarDays, Plane, Wallet, Briefcase } from "lucide-react";

export default function OfficesPanel() {
  const offices = Object.values(OFFICES);
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" /> Offices &amp; labour rules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {offices.map((o) => (
          <Card key={o.id} className={`${o.themeBg} border-0`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{o.flag} {o.name}</span>
                <Badge variant="outline">{o.currency}</Badge>
              </CardTitle>
              <p className="text-xs text-slate-600">{o.countryName}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Section icon={<CalendarDays className="w-4 h-4" />} title="Working calendar">
                <Row label="Working week">{o.workingWeek === "mon-fri" ? "Monday–Friday" : "Sunday–Thursday"}</Row>
                <Row label="Hours/day">{o.hoursPerDay}</Row>
                <Row label="Public holidays">{o.publicHolidays.length} configured</Row>
              </Section>
              <Section icon={<Plane className="w-4 h-4" />} title="Leave entitlements">
                <Row label="Annual leave">{o.leaveAnnualDays} days/yr</Row>
                <Row label="Sick leave">{o.leaveSickDays} days/yr</Row>
                <Row label="Maternity">{o.leaveMaternityDays} days</Row>
                <Row label="Paternity">{o.leavePaternityDays} day{o.leavePaternityDays === 1 ? "" : "s"}</Row>
                <Row label="Compassionate">{o.leaveCompassionateDays} days</Row>
              </Section>
              <Section icon={<Briefcase className="w-4 h-4" />} title="End-of-service">
                <Row label="First 5 years">{o.gratuityFirstYearsDays} days basic / yr</Row>
                <Row label="After 5 years">{o.gratuityLaterYearsDays} days basic / yr</Row>
                <Row label="Cap">{o.gratuityCapMonths > 0 ? `${o.gratuityCapMonths} months basic` : "No statutory cap"}</Row>
              </Section>
              <Section icon={<Wallet className="w-4 h-4" />} title="Payroll deductions">
                <Row label="Income tax">{o.hasIncomeTax ? "Progressive (per local brackets)" : "None"}</Row>
                <Row label="Social insurance — employee">{o.socialInsuranceEmployeePct}%</Row>
                <Row label="Social insurance — employer">{o.socialInsuranceEmployerPct}%</Row>
              </Section>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-3 text-xs text-slate-600 flex items-start gap-2">
          <span className="mt-0.5">ℹ️</span>
          <div>
            These figures match UAE Federal Decree-Law 33/2021 (Dubai) and Egyptian Labor Law (Cairo) defaults at the time of build.
            They drive payroll, leave balances, gratuity calculations, and the UAE/EG working-day calendars used across HR, Finance and Attendance.
            For policy changes (e.g. new public holiday, updated PIT bracket) edit the configs in <code>lib/office/configs.ts</code> — once the
            Supabase backend is connected, the same edits will move into a configuration table you can edit live.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/70 rounded-lg p-3">
      <div className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">{icon} {title}</div>
      <div className="space-y-0.5 text-sm">{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex justify-between text-xs"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-800">{children}</span></div>;
}
