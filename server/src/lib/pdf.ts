// Minimal PDF generation for HR letters and payslips using pdf-lib.
// Returns a Buffer of bytes ready to hand off to the storage layer.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const MARGIN = 50;
const LINE = 16;

type Color = ReturnType<typeof rgb>;
const BLACK: Color = rgb(0, 0, 0);
const GREY: Color = rgb(0.4, 0.4, 0.4);

type Section = { kind: "heading" | "body" | "kv" | "spacer"; text?: string; rows?: Array<[string, string]> };

async function buildPdf(title: string, sections: Section[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);            // A4
  let y = 800;

  const newLine = (n = 1) => { y -= LINE * n; if (y < MARGIN) { page = doc.addPage([595, 842]); y = 800; } };
  const draw = (text: string, opts: { size?: number; color?: Color; bold?: boolean } = {}) => {
    page.drawText(text, { x: MARGIN, y, size: opts.size ?? 11, font: opts.bold ? bold : font, color: opts.color ?? BLACK });
  };

  // Header
  draw("NASEC ENGINEERING CONSULTANCY", { bold: true, size: 14 });
  newLine();
  draw("Dubai • Cairo", { color: GREY, size: 10 });
  newLine(2);
  draw(title, { bold: true, size: 16 });
  newLine(2);

  for (const s of sections) {
    if (s.kind === "spacer") { newLine(); continue; }
    if (s.kind === "heading") { draw(s.text!, { bold: true, size: 12 }); newLine(); continue; }
    if (s.kind === "body") {
      const words = (s.text ?? "").split(/\s+/);
      let line = "";
      const maxWidth = 495;
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (font.widthOfTextAtSize(test, 11) > maxWidth) {
          draw(line);
          newLine();
          line = w;
        } else { line = test; }
      }
      if (line) { draw(line); newLine(); }
      continue;
    }
    if (s.kind === "kv") {
      for (const [k, v] of s.rows ?? []) {
        page.drawText(k, { x: MARGIN, y, size: 11, font: bold, color: BLACK });
        page.drawText(v, { x: MARGIN + 160, y, size: 11, font, color: BLACK });
        newLine();
      }
    }
  }

  newLine(3);
  draw("Authorized Signatory", { bold: true });
  newLine();
  draw("NASEC Engineering Consultancy", { color: GREY, size: 10 });

  return doc.save();
}

export type LetterType = "noc" | "salary-certificate" | "experience-letter" | "employment-contract" | "termination" | "warning";

export type LetterContext = {
  employee: {
    name: string;
    code: string;
    jobTitle: string;
    department: string;
    nationality?: string;
    passportNo?: string;
    joinDate: string;
    office: string;
  };
  salary?: { gross: number; currency: string; basic: number; allowances: number };
  reference: string;
  issueDate: string;
  recipient?: string;
  extra?: Record<string, string>;
};

const TITLES: Record<LetterType, string> = {
  "noc": "No-Objection Certificate",
  "salary-certificate": "Salary Certificate",
  "experience-letter": "Experience Letter",
  "employment-contract": "Employment Contract",
  "termination": "Termination Letter",
  "warning": "Warning Letter",
};

export async function generateLetterPdf(type: LetterType, ctx: LetterContext): Promise<Buffer> {
  const sections: Section[] = [
    { kind: "kv", rows: [
      ["Reference:", ctx.reference],
      ["Date:", ctx.issueDate],
      ...(ctx.recipient ? [["To:", ctx.recipient] as [string,string]] : []),
    ]},
    { kind: "spacer" },
    { kind: "heading", text: "To whom it may concern," },
  ];

  if (type === "noc") {
    sections.push({ kind: "body", text:
      `This is to certify that ${ctx.employee.name} (${ctx.employee.code}) is employed with NASEC Engineering Consultancy as ${ctx.employee.jobTitle} in the ${ctx.employee.department} department since ${ctx.employee.joinDate}. NASEC has no objection to ${ctx.employee.name} applying for ${ctx.extra?.purpose ?? "the stated purpose"}.` });
  } else if (type === "salary-certificate") {
    sections.push({ kind: "body", text:
      `This is to confirm that ${ctx.employee.name} (${ctx.employee.code}) is employed with NASEC Engineering Consultancy as ${ctx.employee.jobTitle} since ${ctx.employee.joinDate}, with the following monthly compensation:` });
    sections.push({ kind: "spacer" });
    sections.push({ kind: "kv", rows: [
      ["Basic Salary:", `${ctx.salary?.basic ?? 0} ${ctx.salary?.currency ?? "AED"}`],
      ["Allowances:", `${ctx.salary?.allowances ?? 0} ${ctx.salary?.currency ?? "AED"}`],
      ["Total Gross:", `${ctx.salary?.gross ?? 0} ${ctx.salary?.currency ?? "AED"}`],
    ]});
  } else if (type === "experience-letter") {
    sections.push({ kind: "body", text:
      `This letter certifies that ${ctx.employee.name} was employed with NASEC Engineering Consultancy in the position of ${ctx.employee.jobTitle}, ${ctx.employee.department}, from ${ctx.employee.joinDate} to ${ctx.extra?.endDate ?? "present"}. During this period ${ctx.employee.name} demonstrated professional conduct and competence in assigned duties.` });
  } else if (type === "employment-contract") {
    sections.push({ kind: "body", text:
      `This Employment Contract is between NASEC Engineering Consultancy (the Employer) and ${ctx.employee.name} (the Employee), effective ${ctx.employee.joinDate}.` });
    sections.push({ kind: "spacer" });
    sections.push({ kind: "kv", rows: [
      ["Position:", ctx.employee.jobTitle],
      ["Department:", ctx.employee.department],
      ["Office:", ctx.employee.office],
      ["Gross Salary:", `${ctx.salary?.gross ?? 0} ${ctx.salary?.currency ?? "AED"} / month`],
      ["Contract Type:", ctx.extra?.contractType ?? "Unlimited"],
    ]});
  } else if (type === "termination") {
    sections.push({ kind: "body", text:
      `This letter formally notifies ${ctx.employee.name} of the termination of employment with NASEC Engineering Consultancy, effective ${ctx.extra?.effectiveDate ?? ctx.issueDate}. Reason: ${ctx.extra?.reason ?? "as agreed"}.` });
  } else if (type === "warning") {
    sections.push({ kind: "body", text:
      `This is a formal ${ctx.extra?.severity ?? "written"} warning issued to ${ctx.employee.name} regarding: ${ctx.extra?.reason ?? "the matter discussed"}. Continued occurrence may result in further disciplinary action.` });
  }

  sections.push({ kind: "spacer" });
  sections.push({ kind: "body", text: "Yours sincerely," });

  const bytes = await buildPdf(TITLES[type], sections);
  return Buffer.from(bytes);
}

// -------------------- Payslip --------------------
export type PayslipContext = {
  employee: { name: string; code: string; jobTitle: string; department: string; office: string };
  period: { year: number; month: number };                       // 1-12
  gross: number;
  earnings: Array<[string, number]>;
  deductions: Array<[string, number]>;
  net: number;
  currency: string;
};

export async function generatePayslipPdf(ctx: PayslipContext): Promise<Buffer> {
  const monthName = new Date(Date.UTC(ctx.period.year, ctx.period.month - 1, 1))
    .toLocaleString("en", { month: "long", timeZone: "UTC" });

  const sections: Section[] = [
    { kind: "kv", rows: [
      ["Employee:", `${ctx.employee.name} (${ctx.employee.code})`],
      ["Position:", `${ctx.employee.jobTitle}, ${ctx.employee.department}`],
      ["Office:", ctx.employee.office],
      ["Period:", `${monthName} ${ctx.period.year}`],
    ]},
    { kind: "spacer" },
    { kind: "heading", text: "Earnings" },
    { kind: "kv", rows: ctx.earnings.map(([k, v]) => [k, `${v.toFixed(2)} ${ctx.currency}`] as [string,string]) },
    { kind: "spacer" },
    { kind: "heading", text: "Deductions" },
    { kind: "kv", rows: ctx.deductions.length
        ? ctx.deductions.map(([k, v]) => [k, `${v.toFixed(2)} ${ctx.currency}`] as [string,string])
        : [["—", "0.00"] as [string,string]] },
    { kind: "spacer" },
    { kind: "kv", rows: [
      ["Gross:", `${ctx.gross.toFixed(2)} ${ctx.currency}`],
      ["Net Pay:", `${ctx.net.toFixed(2)} ${ctx.currency}`],
    ]},
  ];

  const bytes = await buildPdf(`Payslip — ${monthName} ${ctx.period.year}`, sections);
  return Buffer.from(bytes);
}
