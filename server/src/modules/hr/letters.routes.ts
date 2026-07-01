import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  lettersIssued, employees, employeeCompensation, files,
} from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAnyPerm, requirePerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";
import { generateLetterPdf, type LetterType } from "../../lib/pdf.js";
import { storage, fileKey } from "../../lib/storage.js";

export const lettersRouter = Router();
lettersRouter.use(requireAuth);

const issueSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(["noc","salary-certificate","experience-letter","employment-contract","termination","warning"]),
  recipient: z.string().optional(),
  extra: z.record(z.string(), z.string()).optional(),
});

const requestSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(["noc","salary-certificate","experience-letter","employment-contract"]),
  recipient: z.string().optional(),
  note: z.string().optional(),
});

const isHrActor = (req: any) => req.user?.role === "director" || req.user?.role === "hr-manager";

lettersRouter.get("/", requireAnyPerm("hr:letters:read", "self:read"), async (req, res, next) => {
  try {
    const q = db.select().from(lettersIssued);
    const rows = isHrActor(req)
      ? await q
      : req.user?.employeeId
        ? await q.where(eq(lettersIssued.employeeId, req.user.employeeId))
        : [];
    res.json(rows);
  } catch (e) { next(e); }
});

lettersRouter.post("/requests", requireAnyPerm("self:read", "hr:letters:write"), async (req, res, next) => {
  try {
    const input = requestSchema.parse(req.body);
    if (!isHrActor(req) && input.employeeId !== req.user?.employeeId) throw new HttpError(403, "Employees can request certificates only for themselves");
    const emp = (await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1))[0];
    if (!emp) throw new HttpError(404, "Employee not found");

    const reference = `NSC/HR/REQ/${new Date().getUTCFullYear()}/${Date.now().toString(36).toUpperCase()}`;
    const requestedAt = new Date().toISOString();
    const inserted = await db.insert(lettersIssued).values({
      employeeId: emp.id,
      type: input.type,
      reference,
      recipient: input.recipient ?? null,
      issueDate: requestedAt.slice(0, 10),
      issuedByUserId: null,
      payload: {
        status: "submitted",
        requestedAt,
        requestedByUserId: req.user!.sub,
        requestedBy: req.user!.role,
        note: input.note ?? null,
      },
    }).returning();
    await writeAudit(req, { action: "request-letter", entityType: "letter", entityId: inserted[0].id, after: { reference, type: input.type, employeeId: emp.id } });
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

lettersRouter.post("/requests/:id/approve", requirePerm("hr:letters:write"), async (req, res, next) => {
  try {
    const letter = (await db.select().from(lettersIssued).where(eq(lettersIssued.id, req.params.id)).limit(1))[0];
    if (!letter) throw new HttpError(404, "Letter request not found");
    const payload = (letter.payload as any) ?? {};
    if (payload.status && payload.status !== "submitted") throw new HttpError(409, `Cannot approve a ${payload.status} request`);

    const emp = (await db.select().from(employees).where(eq(employees.id, letter.employeeId)).limit(1))[0];
    if (!emp) throw new HttpError(404, "Employee not found");
    const comp = (await db.select().from(employeeCompensation).where(eq(employeeCompensation.employeeId, emp.id)).limit(1))[0];
    const issueDate = new Date().toISOString().slice(0, 10);
    const basic = Number(comp?.basic ?? 0);
    const allowances = Number(comp?.housing ?? 0) + Number(comp?.transport ?? 0) + Number(comp?.food ?? 0) + Number(comp?.other ?? 0);

    const pdf = await generateLetterPdf(letter.type as LetterType, {
      employee: {
        name: `${emp.firstName} ${emp.lastName}`,
        code: emp.code,
        jobTitle: emp.jobTitle,
        department: emp.department,
        nationality: emp.nationality ?? undefined,
        passportNo: emp.passportNo ?? undefined,
        joinDate: String(emp.joinDate),
        office: emp.office,
      },
      salary: comp ? { gross: basic + allowances, currency: comp.currency, basic, allowances } : undefined,
      reference: letter.reference,
      issueDate,
      recipient: letter.recipient ?? undefined,
      extra: { note: payload.note ?? "" },
    });

    const fileRow = (await db.insert(files).values({
      originalName: `${letter.reference.replace(/\//g, "_")}.pdf`,
      mime: "application/pdf",
      sizeBytes: pdf.length,
      storagePath: "pending",
      sha256: "pending",
      scope: "letter",
      scopeId: letter.id,
      uploadedByUserId: req.user!.sub,
    }).returning())[0];
    const key = fileKey("letter", fileRow.id, fileRow.originalName);
    const stored = await storage.put(key, pdf, "application/pdf");
    await db.update(files).set({ storagePath: stored.storagePath, sha256: stored.sha256 }).where(eq(files.id, fileRow.id));

    const approvedAt = new Date().toISOString();
    const updated = (await db.update(lettersIssued).set({
      issueDate,
      issuedByUserId: req.user!.sub,
      fileId: fileRow.id,
      payload: { ...payload, status: "approved", approvedAt, approvedByUserId: req.user!.sub },
    }).where(eq(lettersIssued.id, letter.id)).returning())[0];
    await writeAudit(req, { action: "approve-letter", entityType: "letter", entityId: letter.id, after: { reference: letter.reference, type: letter.type } });
    res.json(updated);
  } catch (e) { next(e); }
});

lettersRouter.post("/requests/:id/reject", requirePerm("hr:letters:write"), async (req, res, next) => {
  try {
    const letter = (await db.select().from(lettersIssued).where(eq(lettersIssued.id, req.params.id)).limit(1))[0];
    if (!letter) throw new HttpError(404, "Letter request not found");
    const payload = (letter.payload as any) ?? {};
    const updated = (await db.update(lettersIssued).set({
      payload: { ...payload, status: "rejected", rejectedAt: new Date().toISOString(), rejectedByUserId: req.user!.sub },
    }).where(eq(lettersIssued.id, letter.id)).returning())[0];
    await writeAudit(req, { action: "reject-letter", entityType: "letter", entityId: letter.id, after: { reference: letter.reference, type: letter.type } });
    res.json(updated);
  } catch (e) { next(e); }
});

lettersRouter.post("/", requirePerm("hr:letters:write"), async (req, res, next) => {
  try {
    const input = issueSchema.parse(req.body);
    const emp = (await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1))[0];
    if (!emp) throw new HttpError(404, "Employee not found");
    const comp = (await db.select().from(employeeCompensation).where(eq(employeeCompensation.employeeId, emp.id)).limit(1))[0];

    const reference = `NSC/${input.type.toUpperCase().slice(0,3)}/${Date.now().toString(36)}`;
    const issueDate = new Date().toISOString().slice(0,10);
    const basic = Number(comp?.basic ?? 0);
    const allowances = Number(comp?.housing ?? 0) + Number(comp?.transport ?? 0) + Number(comp?.food ?? 0) + Number(comp?.other ?? 0);

    const pdf = await generateLetterPdf(input.type as LetterType, {
      employee: {
        name: `${emp.firstName} ${emp.lastName}`,
        code: emp.code,
        jobTitle: emp.jobTitle,
        department: emp.department,
        nationality: emp.nationality ?? undefined,
        passportNo: emp.passportNo ?? undefined,
        joinDate: String(emp.joinDate),
        office: emp.office,
      },
      salary: comp ? { gross: basic + allowances, currency: comp.currency, basic, allowances } : undefined,
      reference, issueDate, recipient: input.recipient,
      extra: input.extra,
    });

    // Insert letter row first to get id
    const letter = (await db.insert(lettersIssued).values({
      employeeId: emp.id,
      type: input.type,
      reference,
      recipient: input.recipient ?? null,
      issueDate,
      issuedByUserId: req.user!.sub,
      payload: input.extra ?? {},
    }).returning())[0];

    // Store PDF as a file row
    const fileRow = (await db.insert(files).values({
      originalName: `${reference.replace(/\//g, "_")}.pdf`,
      mime: "application/pdf",
      sizeBytes: pdf.length,
      storagePath: "pending",
      sha256: "pending",
      scope: "letter",
      scopeId: letter.id,
      uploadedByUserId: req.user!.sub,
    }).returning())[0];

    const key = fileKey("letter", fileRow.id, fileRow.originalName);
    const stored = await storage.put(key, pdf, "application/pdf");
    await db.update(files).set({ storagePath: stored.storagePath, sha256: stored.sha256 }).where(eq(files.id, fileRow.id));
    await db.update(lettersIssued).set({ fileId: fileRow.id }).where(eq(lettersIssued.id, letter.id));

    await writeAudit(req, { action: "issue-letter", entityType: "letter", entityId: letter.id, after: { reference, type: input.type, employeeId: emp.id } });
    res.status(201).json({ ...letter, fileId: fileRow.id });
  } catch (e) { next(e); }
});

lettersRouter.delete("/:id", requirePerm("hr:letters:write"), async (req, res, next) => {
  try {
    const deleted = await db.delete(lettersIssued).where(eq(lettersIssued.id, req.params.id)).returning();
    if (!deleted[0]) throw new HttpError(404, "Letter not found");
    await writeAudit(req, { action: "delete-letter", entityType: "letter", entityId: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
