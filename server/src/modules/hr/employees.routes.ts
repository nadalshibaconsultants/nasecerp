import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  employees, employeeCompensation, employeeBankDetails,
  employeeDocuments, dependents,
} from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm, requireAnyPerm, userHasPerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";
import {
  createEmployeeSchema, updateEmployeeSchema,
  createDocumentSchema, createDependentSchema,
} from "./hr.schema.js";
import { toFrontendEmployee } from "./hr.mapper.js";

export const employeesRouter = Router();
employeesRouter.use(requireAuth);

async function employeePayload(rows: typeof employees.$inferSelect[]) {
  if (rows.length === 0) return [];
  const comps = await db.select().from(employeeCompensation);
  const banks = await db.select().from(employeeBankDetails);
  const compMap = new Map(comps.map((c) => [c.employeeId, c]));
  const bankMap = new Map(banks.map((b) => [b.employeeId, b]));
  return rows.map((e) => toFrontendEmployee(e, compMap.get(e.id) as any, bankMap.get(e.id) as any));
}

// LIST — HR/director see all; employees see only their linked profile.
employeesRouter.get("/", requireAnyPerm("hr:read", "self:read"), async (req, res, next) => {
  try {
    if (!(await userHasPerm(req, "hr:read"))) {
      if (!req.user?.employeeId) return res.json([]);
      const own = await db.select().from(employees).where(eq(employees.id, req.user.employeeId)).limit(1);
      return res.json(await employeePayload(own));
    }
    const emps = await db.select().from(employees).orderBy(employees.code);
    res.json(await employeePayload(emps));
  } catch (err) { next(err); }
});

// GET ONE (with nested documents + dependents)
employeesRouter.get("/:id", requireAnyPerm("hr:read", "self:read"), async (req, res, next) => {
  try {
    if (!(await userHasPerm(req, "hr:read")) && req.params.id !== req.user?.employeeId) {
      throw new HttpError(403, "Not permitted to view this employee profile");
    }
    const rows = await db.select().from(employees).where(eq(employees.id, req.params.id)).limit(1);
    const e = rows[0];
    if (!e) throw new HttpError(404, "Employee not found");

    const comp = (await db.select().from(employeeCompensation).where(eq(employeeCompensation.employeeId, e.id)).limit(1))[0];
    const bank = (await db.select().from(employeeBankDetails).where(eq(employeeBankDetails.employeeId, e.id)).limit(1))[0];
    const docs = await db.select().from(employeeDocuments).where(eq(employeeDocuments.employeeId, e.id));
    const deps = await db.select().from(dependents).where(eq(dependents.employeeId, e.id));

    const front = toFrontendEmployee(e, comp as any, bank as any);
    res.json({ ...front, documents: docs, dependents: deps });
  } catch (err) { next(err); }
});

// CREATE
employeesRouter.post("/", requirePerm("hr:write"), async (req, res, next) => {
  try {
    const input = createEmployeeSchema.parse(req.body);
    const { salary, bank, ...emp } = input;

    const inserted = await db.insert(employees).values({
      ...emp,
      dob: emp.dob ?? null,
      endDate: emp.endDate ?? null,
      contractEndDate: emp.contractEndDate ?? null,
      probationEndDate: emp.probationEndDate ?? null,
      passportExpiry: emp.passportExpiry ?? null,
      emiratesIdExpiry: emp.emiratesIdExpiry ?? null,
      visaExpiry: emp.visaExpiry ?? null,
      labourCardExpiry: emp.labourCardExpiry ?? null,
    } as any).returning();
    const e = inserted[0];

    if (salary) {
      await db.insert(employeeCompensation).values({
        employeeId: e.id,
        basic: String(salary.basic),
        housing: String(salary.housing ?? 0),
        transport: String(salary.transport ?? 0),
        food: String(salary.food ?? 0),
        other: String(salary.other ?? 0),
        currency: salary.currency ?? (e.office === "dubai" ? "AED" : "EGP"),
      });
    }
    if (bank) {
      await db.insert(employeeBankDetails).values({ employeeId: e.id, ...bank });
    }

    await writeAudit(req, { action: "create-employee", entityType: "employee", entityId: e.id, after: e });
    const comp = (await db.select().from(employeeCompensation).where(eq(employeeCompensation.employeeId, e.id)).limit(1))[0];
    const bnk = (await db.select().from(employeeBankDetails).where(eq(employeeBankDetails.employeeId, e.id)).limit(1))[0];
    res.status(201).json(toFrontendEmployee(e, comp as any, bnk as any));
  } catch (err) { next(err); }
});

// UPDATE
employeesRouter.patch("/:id", requirePerm("hr:write"), async (req, res, next) => {
  try {
    const input = updateEmployeeSchema.parse(req.body);
    const { salary, bank, ...emp } = input;

    const before = (await db.select().from(employees).where(eq(employees.id, req.params.id)).limit(1))[0];
    if (!before) throw new HttpError(404, "Employee not found");

    const updated = await db.update(employees)
      .set({ ...(emp as any), updatedAt: new Date() })
      .where(eq(employees.id, req.params.id))
      .returning();

    if (salary) {
      const payload = {
        basic: String(salary.basic ?? 0),
        housing: String(salary.housing ?? 0),
        transport: String(salary.transport ?? 0),
        food: String(salary.food ?? 0),
        other: String(salary.other ?? 0),
        currency: salary.currency ?? (updated[0].office === "dubai" ? "AED" : "EGP"),
        updatedAt: new Date(),
      };
      const exists = await db.select().from(employeeCompensation)
        .where(eq(employeeCompensation.employeeId, req.params.id)).limit(1);
      if (exists[0]) {
        await db.update(employeeCompensation).set(payload).where(eq(employeeCompensation.employeeId, req.params.id));
      } else {
        await db.insert(employeeCompensation).values({ employeeId: req.params.id, ...payload });
      }
    }
    if (bank) {
      const exists = await db.select().from(employeeBankDetails)
        .where(eq(employeeBankDetails.employeeId, req.params.id)).limit(1);
      if (exists[0]) {
        await db.update(employeeBankDetails).set({ ...bank, updatedAt: new Date() })
          .where(eq(employeeBankDetails.employeeId, req.params.id));
      } else {
        await db.insert(employeeBankDetails).values({ employeeId: req.params.id, ...bank });
      }
    }

    await writeAudit(req, { action: "update-employee", entityType: "employee", entityId: req.params.id, before, after: updated[0] });

    const comp = (await db.select().from(employeeCompensation).where(eq(employeeCompensation.employeeId, req.params.id)).limit(1))[0];
    const bnk = (await db.select().from(employeeBankDetails).where(eq(employeeBankDetails.employeeId, req.params.id)).limit(1))[0];
    res.json(toFrontendEmployee(updated[0], comp as any, bnk as any));
  } catch (err) { next(err); }
});

// DELETE
employeesRouter.delete("/:id", requirePerm("hr:write"), async (req, res, next) => {
  try {
    const deleted = await db.delete(employees).where(eq(employees.id, req.params.id)).returning();
    if (!deleted[0]) throw new HttpError(404, "Employee not found");
    await writeAudit(req, { action: "delete-employee", entityType: "employee", entityId: req.params.id, before: deleted[0] });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// -------------------- Sub-resource: documents --------------------
employeesRouter.get("/:id/documents", requireAnyPerm("hr:read", "self:read"), async (req, res, next) => {
  try {
    // Employees may list only their own document records; HR/director see all
    if (!(await userHasPerm(req, "hr:read")) && req.params.id !== req.user?.employeeId) {
      throw new HttpError(403, "Not permitted to view this employee's documents");
    }
    const rows = await db.select().from(employeeDocuments).where(eq(employeeDocuments.employeeId, req.params.id));
    res.json(rows);
  } catch (err) { next(err); }
});

employeesRouter.post("/:id/documents", requirePerm("hr:write"), async (req, res, next) => {
  try {
    const input = createDocumentSchema.parse(req.body);
    const inserted = await db.insert(employeeDocuments).values({
      employeeId: req.params.id,
      ...input,
      issueDate: input.issueDate ?? null,
      expiryDate: input.expiryDate ?? null,
    } as any).returning();
    await writeAudit(req, { action: "add-employee-document", entityType: "employee-document", entityId: inserted[0].id, after: inserted[0] });
    res.status(201).json(inserted[0]);
  } catch (err) { next(err); }
});

employeesRouter.delete("/:id/documents/:docId", requirePerm("hr:write"), async (req, res, next) => {
  try {
    const deleted = await db.delete(employeeDocuments).where(eq(employeeDocuments.id, req.params.docId)).returning();
    if (!deleted[0]) throw new HttpError(404, "Document not found");
    await writeAudit(req, { action: "remove-employee-document", entityType: "employee-document", entityId: req.params.docId, before: deleted[0] });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// -------------------- Sub-resource: dependents --------------------
employeesRouter.get("/:id/dependents", requirePerm("hr:read"), async (req, res, next) => {
  try {
    const rows = await db.select().from(dependents).where(eq(dependents.employeeId, req.params.id));
    res.json(rows);
  } catch (err) { next(err); }
});

employeesRouter.post("/:id/dependents", requirePerm("hr:write"), async (req, res, next) => {
  try {
    const input = createDependentSchema.parse(req.body);
    const inserted = await db.insert(dependents).values({
      employeeId: req.params.id,
      ...input,
      dob: input.dob ?? null,
      visaExpiry: input.visaExpiry ?? null,
    } as any).returning();
    await writeAudit(req, { action: "add-dependent", entityType: "dependent", entityId: inserted[0].id, after: inserted[0] });
    res.status(201).json(inserted[0]);
  } catch (err) { next(err); }
});

employeesRouter.delete("/:id/dependents/:depId", requirePerm("hr:write"), async (req, res, next) => {
  try {
    const deleted = await db.delete(dependents).where(eq(dependents.id, req.params.depId)).returning();
    if (!deleted[0]) throw new HttpError(404, "Dependent not found");
    res.json({ ok: true });
  } catch (err) { next(err); }
});
