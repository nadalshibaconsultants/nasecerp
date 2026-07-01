// Seed: real Nad Al Shiba staff from the C-7.6.20 Staff Log (Rev 02, 12/05/2026).
// Each employee gets a linked user account whose USERNAME and PASSWORD are both
// the Staff ID (e.g. "C1-001"). Login resolves the Staff ID via employees.code
// (see auth.service.ts). Idempotent — safe to re-run.
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import { users, employees } from "../db/schema/index.js";
import { hashPassword } from "../lib/password.js";

type Role =
  | "director" | "hr-manager" | "finance-manager" | "accountant" | "pm"
  | "design-lead" | "site-engineer" | "bd-manager" | "employee" | "contractor";

// [ code, fullName, title, division, email, phone ]
const RAW: [string, string, string, string, string, string][] = [
  ["C1-001", "Mohamed Ahmed Elmezyen", "President & CEO", "Executive Mgmt", "m.elmezayen@nadalshibaconsultants.com", "+971501442719"],
  ["C2-002", "Mohamed Hemdan Baraka", "VP, Regional Manager CAI", "Executive Mgmt", "m.hemdan@nadalshibaconsultant.com", "+201095299448"],
  ["C2-003", "Moemen Al Sharkawi", "VP, Corporate & BD Director", "Executive Mgmt", "moemen.alsharkawi@nadalshibaconsultants.com", "+201278286566"],
  ["TM1-001", "Ahmed Ahmed Elmezyen", "Construction Projects Director", "Const. Services", "a.elmezayen@nadalshibaconsultants.com", "+971569761805"],
  ["TM1-003", "Ahmed Eid Gadalla", "Design Division Head", "A&E Design", "a.ibrahim@nadalshibaconsultants.com", "+971561651671"],
  ["TM1-004", "Mohamed Elsaid Elsherbiny", "Construction Services Division Head", "Const. Services", "m.elsherbiny@nadalshibaconsultants.com", "+971543428643"],
  ["TM2-001", "Kathiravan Nedunchezhian", "Planning & Architectural Dept. Manager", "A&E Design", "kathir@nadalshibaconsultants.com", "+971506292174"],
  ["TM2-002", "Mohamed Eliwa", "Structural Dept. Manager", "A&E Design", "", "+971543280331"],
  ["TM2-003", "Azam Bin Ahmed Bin Abdullah", "Mechanical Dept. Manager", "A&E Design", "azam@nadalshibaconsultants.com", "+971564812942"],
  ["TM2-004", "Waqar Ahmad Yaseem", "Electrical Dept. Manager", "A&E Design", "waqara@nadalshibaconsultants.com", "+971525524841"],
  ["T3-001", "Tamer Sayed Mohamed", "BIM Manager", "A&E Design", "", "+971543280331"],
  ["T3-002", "Mohamed Salem", "Innovation & AI Manager", "A&E Design", "", "+971543280331"],
  ["T3-003", "Mahmoud Saad Ali", "Chief Architect", "A&E Design", "mahmoud.a@nadalshibaconsultants.com", "+201100426565"],
  ["T3-004", "Hadeer Mohamed Hafez", "Chief Master Planner", "A&E Design", "hadeer@nadalshibaconsultants.com", "+201069993605"],
  ["TM4-001", "Youssef Fathi Roubi", "Project Manager", "Proj. & Comm.", "youssef@nadalshibaconsultants.com", "+971526188745"],
  ["TM4-002", "Mohamed Ali Awad", "Project Manager", "Proj. & Comm.", "ali.e@nadalshibaconsultants.com", "+201060491987"],
  ["TM4-003", "Mohamed Ibrahim Hanafy", "Resident Engineer", "Const. Services", "maged@nadalshibaconsultants.com", "+971544227981"],
  ["TM4-004", "Faizal Syed Mohammed", "Resident Engineer", "Const. Services", "faizal.m@nadalshibaconsultants.com", "+971555322745"],
  ["TM4-005", "Hany Khaled Tofaha", "Project Engineer", "Proj. & Comm.", "h.khaled@nadalshibaconsultants.com", "+971543280331"],
  ["T4-001", "Yahia Zakaria Gohar", "Senior Architect", "A&E Design", "yahia@nadalshibaconsultants.com", "+201063181232"],
  ["T4-002", "Sara Mohamed Shehata", "Senior Architect", "A&E Design", "sara@nadalshibaconsultants.com", "+201124584996"],
  ["T5-017", "Mohamed Taher El-Salamony", "Senior Site Architect", "Const. Services", "t.mohamed@nadalshibaconsultants.com", "+201016198889"],
  ["T4-003", "Abdelrahman Mahmoud Elsherbiny", "Site Structural Engineer", "Const. Services", "a.mahmud@nadalshibaconsultants.com", "+971544546406"],
  ["T4-004", "Mohamed Hassan Elsalanty", "Senior Structural Engineer", "A&E Design", "m.hassan@nadalshibaconsultants.com", "+201225442721"],
  ["T4-005", "Ahmed Morad Taha", "Senior Structural Engineer", "Const. Services", "a.murad@nadalshibaconsultants.com", "+971505084059"],
  ["T4-006", "Mohamed Sayed Moawad", "Senior Site Structural Engineer", "Const. Services", "", "+201010484093"],
  ["T4-007", "Hesham Omar Helaly", "Senior Mechanical Engineer", "A&E Design", "hesham@nadalshibaconsultants.com", "+201555598632"],
  ["T4-008", "Muhammad Muqthar Karatt", "Senior Mechanical Engineer", "Const. Services", "muqthar@nadalshibaconsultants.com", "+971569402418"],
  ["T4-009", "Jijo John", "Senior Mechanical Engineer", "Const. Services", "jijo@nadalshibaconsultants.com", "+971562674042"],
  ["T4-010", "Abdul Nasser", "Senior Mechanical Engineer", "Const. Services", "magendran@nadalshibaconsultants.com", "+971581038019"],
  ["T4-011", "Muthana Althahan", "Senior Site Electrical Engineer", "Const. Services", "m.altahan@nadalshibaconsultants.com", "+971543927898"],
  ["T4-012", "Naseemuddin Naiemuddin", "Senior Site Electrical Engineer", "Const. Services", "naseem@nadalshibaconsultants.com", "+971589972723"],
  ["T5-001", "Ahmed Ismail Ahmed", "Architect", "A&E Design", "i.ahmed@nadalshibaconsultants.com", "+201022408438"],
  ["T5-002", "Doha Mohamed Qandeel", "Interior Design Architect", "A&E Design", "doha@nadalshibaconsultants.com", "+201110785928"],
  ["T5-003", "Dalia Yousri", "Architect", "A&E Design", "y.dalia@nadalshibaconsultants.com", "+201009954022"],
  ["T5-004", "Hassan Radwan", "Architect", "A&E Design", "hassan@nadalshibaconsultants.com", "+971526577217"],
  ["T5-005", "Abdelrahman Hamada Abouelomran", "Architect", "A&E Design", "a.omran@nadalshibaconsultants.com", "+971505655613"],
  ["T5-007", "Mohamed Ahmed Hassan", "Architect", "A&E Design", "m.salem@nadalshibaconsultants.com", "+971556241696"],
  ["T5-009", "Momin Mahibub Shamshuddin", "CAD Operator, Architectural", "A&E Design", "s.mahibub@nadalshibaconsultants.com", "+971589399227"],
  ["T5-010", "Talal Walid Khuzha", "Site Architect", "A&E Design", "t.khuzha@nadalshibaconsultantas.com", "+971565633244"],
  ["T5-011", "Muhammad Nasab", "Site Structural Engineer", "Const. Services", "m.nasab@nadalshibaconsultants.com", "+971559244586"],
  ["T5-012", "Mohamed Ashraf", "Structural Engineer", "Const. Services", "m.ashraf@nadalshibaconsultants.com", "+201113635939"],
  ["T5-013", "Liyakath Kadayikkal Abdul Kareem", "Site Structural Engineer", "Const. Services", "liyakath@nadalshibaconsultants.com", "+971522817700"],
  ["T5-014", "Fadi Faisal Alfarra", "Structural Engineer", "A&E Design", "fadi@nadalshibaconsultants.com", "+201099421211"],
  ["T5-015", "Mohamed Hawas", "Site Structural Engineer", "Const. Services", "m.hawas@nadalshibaconsultants.com", "+201001106775"],
  ["T5-016", "Ahmed Farrag", "Site Civil Engineer", "Const. Services", "f.ahmed@nadalshibaconsultants.com", "+971508641213"],
  ["T5-018", "Moustafa Musslemany", "Mechanical Engineer", "Const. Services", "m.mostafa@nadalshibaconsultants.com", "+971554513571"],
  ["T5-019", "Yasir Imran", "Site Mechanical Engineer", "Const. Services", "y.imran@nadalshibaconsultants.com", "+971503236801"],
  ["T5-020", "Eslam Enany", "Mechanical Engineer", "Const. Services", "e.eslam@nadalshibaconsultants.com", "+201021625993"],
  ["T5-021", "Ahmed Hamdy Awad", "Site Electrical Engineer", "Const. Services", "a.hamdy@nadalshibaconsultants.com", "+201017326171"],
  ["T5-022", "Mohammed Shabib Alam", "Electrical Engineer/Draftsman", "Const. Services", "a.shabib@nadalshibaconsultants.com", "+971556235505"],
  ["T5-023", "Pandara Vidyadharan Dilly", "Electrical Engineer/Draftsman", "Const. Services", "dilly@nadalshibaconsultants.com", "+971567891430"],
  ["T5-025", "Ammar Ahmed Elnaggar", "Site Civil Engineer", "Const. Services", "ammarelnaggar11@gmail.com", "+201002132899"],
  ["T6-001", "Sreejith Kuruveettil", "Statutory Authority Coordinator", "Const. Services", "s.jith@nadalshibaconsultants.com", "+971559687622"],
  ["A1-002", "Mansi Asthana", "Human Resources Manager", "Admi. Services", "mansi@nadalshibaconsultants.com", "+971505491749"],
  ["A2-001", "Alyanna Tolarba", "Executive Secretary", "Admi. Services", "alyanna@nadalshibaconsultants.com", "+971567952051"],
  ["A2-002", "Aziz Ullah", "AI Automation Engineer", "Admi. Services", "r.aziz@nadalshibaconsultants.com", "+971509363002"],
  ["AD3-001", "Nizar Aboobacker", "Document Controller", "Admi. Services", "nizar@nadalshibaconsultants.com", "+971561494394"],
  ["AD3-002", "Rocelyne Apar", "Document Controller", "Admi. Services", "dc@nadalshibaconsultants.com", "+971528838516"],
  ["AD3-003", "Adila Shoukath", "Document Controller", "Admi. Services", "maj@nadalshibaconsultants.com", ""],
  ["AD3-004", "Abd Elrahman Elshafey", "Document Controller", "Admi. Services", "a.elshafey@nadalshibaconsultants.com", "+201022822835"],
  ["A2-020", "Arianne Orejola", "Accountant", "Finance", "accounts@nadalshibaconsultants.com", "+971528288341"],
  ["A2-021", "Safaa Abd Elfattah Nazeer", "Accountant", "Finance", "s.nazeer@nadalshibaconsultants.com", "+201068444600"],
  ["A2-022", "Abdelrahman Sayed Ahmed", "Project Accountant", "Finance", "", ""],
  ["1001", "Mubaraka Hamad Almenhali", "Sales Executive", "Business Development", "", ""],
  ["1002", "Noor Bin Hendi", "Sales Executive", "Business Development", "", ""],
];

function roleFor(title: string, division: string): Role {
  const t = title.toLowerCase();
  const d = division.toLowerCase();
  if (t.includes("human resources") || t.includes("hr ")) return "hr-manager";
  if (t.includes("accountant")) return "accountant";
  if (t.includes("financial manager") || t.includes("finance manager")) return "finance-manager";
  if (t.includes("sales") || t.includes("business development") || t.includes("bd director") || t.includes("corporate & bd")) return "bd-manager";
  if (t.includes("ceo") || t.includes("president") || t.startsWith("vp") || t.includes("vp,")) return "director";
  if (t.includes("division head")) return d.includes("design") ? "design-lead" : "pm";
  if (t.includes("projects director") || t.includes("project manager") || t.includes("resident engineer") || t.includes("project engineer")) return "pm";
  if (d.includes("a&e design")) return "design-lead";
  if (d.includes("const")) return "site-engineer";
  return "employee";
}

async function main() {
  console.log("[seed:staff] starting…");
  const seen = new Set<string>();
  let empCreated = 0, userCreated = 0, skipped = 0;

  for (const [code, fullName, title, division, rawEmail, phone] of RAW) {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || "-";
    const office: "dubai" | "cairo" = phone.startsWith("+20") ? "cairo" : "dubai";
    const role = roleFor(title, division);

    // Unique, non-null email — use the real one when present and unseen,
    // otherwise synthesize a stable one from the (unique) Staff ID.
    let email = rawEmail.trim().toLowerCase();
    if (!email || seen.has(email)) {
      email = `${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@staff.nadalshibaconsultants.com`;
    }
    seen.add(email);

    // Employee (idempotent by code)
    let employeeId: string;
    const existingEmp = await db.select({ id: employees.id }).from(employees).where(eq(employees.code, code)).limit(1);
    if (existingEmp[0]) {
      employeeId = existingEmp[0].id;
    } else {
      const inserted = await db.insert(employees).values({
        code, firstName, lastName, email, phone: phone || null,
        office, jobTitle: title, department: division,
        status: "active", joinDate: "2024-01-01", contractType: "unlimited",
      } as any).returning({ id: employees.id });
      employeeId = inserted[0].id;
      empCreated++;
    }

    // User account: username = Staff ID, password = Staff ID (idempotent by employeeId)
    const existingUser = await db.select({ id: users.id }).from(users)
      .where(sql`${users.employeeId} = ${employeeId}`).limit(1);
    if (existingUser[0]) { skipped++; continue; }
    const passwordHash = await hashPassword(code);
    await db.insert(users).values({
      email, passwordHash, displayName: fullName,
      role, office, status: "active", employeeId,
    }).onConflictDoNothing();
    userCreated++;
  }

  console.log(`[seed:staff] employees created: ${empCreated}, users created: ${userCreated}, existing users skipped: ${skipped}`);
  await pool.end();
  console.log("[seed:staff] done");
}

main().catch((err) => { console.error("[seed:staff] failed:", err); process.exit(1); });
