// Seed: initial director user + base office_config rows.
// Idempotent — safe to re-run.
import { eq } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import {
  users,
  officeConfig,
  employees,
  employeeCompensation,
  employeeBankDetails,
} from "../db/schema/index.js";
import { hashPassword } from "../lib/password.js";
import { env } from "../env.js";

const isoOffset = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
};

const DEMO_EMPLOYEES = [
  {
    code: "NSC-EMP-0001",
    firstName: "Ahmed",
    lastName: "Al-Mansoori",
    arabicName: "أحمد المنصوري",
    gender: "M",
    dob: "1985-03-12",
    nationality: "UAE",
    maritalStatus: "married",
    email: "ahmed.mansoori@nasec.ae",
    phone: "+971 50 123 4567",
    office: "dubai" as const,
    jobTitle: "Project Manager",
    department: "Project Management",
    status: "active" as const,
    joinDate: "2018-04-01",
    contractType: "unlimited" as const,
    passportNo: "P12345678",
    passportExpiry: isoOffset(420),
    emiratesIdNo: "784-1985-1234567-8",
    emiratesIdExpiry: isoOffset(180),
    visaNo: "V-2024-001",
    visaExpiry: isoOffset(180),
    labourCardNo: "LC-AE-1001",
    labourCardExpiry: isoOffset(45),
    salary: {
      basic: 22000,
      housing: 8000,
      transport: 2500,
      food: 1000,
      other: 500,
      currency: "AED",
    },
    bank: { bankName: "Emirates NBD", iban: "AE070331234567890123456" },
  },
  {
    code: "NSC-EMP-0002",
    firstName: "Sara",
    lastName: "Khan",
    gender: "F",
    dob: "1990-08-22",
    nationality: "India",
    email: "sara.khan@nasec.ae",
    phone: "+971 55 222 1111",
    office: "dubai" as const,
    jobTitle: "Senior Architect",
    department: "Architecture",
    status: "active" as const,
    joinDate: "2020-09-15",
    contractType: "unlimited" as const,
    passportNo: "K9988776",
    passportExpiry: isoOffset(700),
    emiratesIdNo: "784-1990-9988776-5",
    emiratesIdExpiry: isoOffset(300),
    visaNo: "V-2024-002",
    visaExpiry: isoOffset(300),
    labourCardNo: "LC-AE-1002",
    labourCardExpiry: isoOffset(120),
    salary: {
      basic: 14000,
      housing: 6000,
      transport: 2000,
      food: 800,
      other: 0,
      currency: "AED",
    },
  },
  {
    code: "NSC-EMP-0101",
    firstName: "Mohamed",
    lastName: "Hassan",
    arabicName: "محمد حسن",
    gender: "M",
    dob: "1988-01-10",
    nationality: "Egypt",
    email: "mohamed.hassan@nasec.eg",
    phone: "+20 100 555 7788",
    office: "cairo" as const,
    jobTitle: "Civil Engineer",
    department: "Structural",
    status: "active" as const,
    joinDate: "2019-06-01",
    contractType: "unlimited" as const,
    passportNo: "EG5544332",
    passportExpiry: isoOffset(900),
    salary: {
      basic: 35000,
      housing: 8000,
      transport: 3000,
      food: 1500,
      other: 0,
      currency: "EGP",
    },
  },
  {
    code: "NSC-EMP-0102",
    firstName: "Nora",
    lastName: "El-Sayed",
    gender: "F",
    dob: "1992-11-05",
    nationality: "Egypt",
    email: "nora.elsayed@nasec.eg",
    phone: "+20 122 333 4444",
    office: "cairo" as const,
    jobTitle: "HR Officer",
    department: "HR",
    status: "active" as const,
    joinDate: "2021-02-15",
    contractType: "unlimited" as const,
    salary: {
      basic: 22000,
      housing: 5000,
      transport: 2000,
      food: 1000,
      other: 0,
      currency: "EGP",
    },
  },
];

const DEMO_CLIENT_USERS = [
  {
    email: "reem@emaar.ae",
    displayName: "Reem Al Falasi - Emaar Properties",
    avatarColor: "#2563eb",
  },
  {
    email: "khalid@dubaiholding.ae",
    displayName: "Khalid Al Rashid - Dubai Holding",
    avatarColor: "#16a34a",
  },
  {
    email: "nadia@nakheel.ae",
    displayName: "Nadia Ahmed - Nakheel",
    avatarColor: "#f97316",
  },
  {
    email: "omar@meraas.ae",
    displayName: "Omar Saeed - Meraas",
    avatarColor: "#7c3aed",
  },
];

async function main() {
  console.log("[seed] starting initial seed...");

  // Director user
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, env.SEED_DIRECTOR_EMAIL))
    .limit(1);
  if (existing[0]) {
    console.log(
      `[seed] director ${env.SEED_DIRECTOR_EMAIL} already exists — skipping`
    );
  } else {
    const passwordHash = await hashPassword(env.SEED_DIRECTOR_PASSWORD);
    await db.insert(users).values({
      email: env.SEED_DIRECTOR_EMAIL,
      passwordHash,
      displayName: env.SEED_DIRECTOR_NAME,
      role: "director",
      office: "dubai",
      status: "active",
    });
    console.log(
      `[seed] created director: ${env.SEED_DIRECTOR_EMAIL} / ${env.SEED_DIRECTOR_PASSWORD}`
    );
  }

  // Demo client portal users — password: password
  let clientsCreated = 0;
  const clientPasswordHash = await hashPassword("password");
  for (const c of DEMO_CLIENT_USERS) {
    const existingClient = await db
      .select()
      .from(users)
      .where(eq(users.email, c.email))
      .limit(1);
    if (existingClient[0]) continue;
    await db.insert(users).values({
      email: c.email,
      passwordHash: clientPasswordHash,
      displayName: c.displayName,
      role: "client",
      office: "dubai",
      status: "active",
      avatarColor: c.avatarColor,
    });
    clientsCreated++;
  }
  console.log(`[seed] demo clients created: ${clientsCreated}`);

  // Office config — base labour rules
  await db
    .insert(officeConfig)
    .values([
      {
        office: "dubai",
        currency: "AED",
        taxRate: "0.05",
        labourRules: {
          annualLeaveDays: 30,
          sickLeaveDays: 90,
          gratuityRule: "21+30",
          socialInsurancePct: 0,
          pit: false,
        },
        workingWeek: {
          days: ["mon", "tue", "wed", "thu", "fri"],
          hoursPerDay: 8,
        },
        publicHolidays: [],
      },
      {
        office: "cairo",
        currency: "EGP",
        taxRate: "0.14",
        labourRules: {
          annualLeaveDays: 21,
          sickLeaveDays: 180,
          gratuityRule: "30+30",
          socialInsurancePct: 0.11,
          pit: true,
        },
        workingWeek: {
          days: ["sun", "mon", "tue", "wed", "thu"],
          hoursPerDay: 8,
        },
        publicHolidays: [],
      },
    ])
    .onConflictDoNothing();
  console.log("[seed] office_config OK");

  // Demo employees — idempotent by code
  let empCreated = 0;
  for (const d of DEMO_EMPLOYEES) {
    const { salary, bank, ...emp } = d;
    const existing = await db
      .select()
      .from(employees)
      .where(eq(employees.code, emp.code))
      .limit(1);
    if (existing[0]) continue;
    const inserted = await db
      .insert(employees)
      .values(emp as any)
      .returning();
    const e = inserted[0];
    await db.insert(employeeCompensation).values({
      employeeId: e.id,
      basic: String(salary.basic),
      housing: String(salary.housing),
      transport: String(salary.transport),
      food: String(salary.food),
      other: String(salary.other),
      currency: salary.currency,
    });
    if (bank)
      await db
        .insert(employeeBankDetails)
        .values({ employeeId: e.id, ...bank });
    empCreated++;
  }
  console.log(`[seed] demo employees created: ${empCreated}`);

  await pool.end();
  console.log("[seed] done");
}

main().catch(err => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
