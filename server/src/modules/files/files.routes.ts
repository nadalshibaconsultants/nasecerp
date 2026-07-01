import { Router } from "express";
import multer from "multer";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { files } from "../../db/schema/index.js";
import { storage, fileKey } from "../../lib/storage.js";
import { requireAuth } from "../../middleware/auth.js";
import { userHasPerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";

// Employee files hold sensitive HR documents (passports, contracts, bank
// details): only HR/director may add or remove them; employees may view
// the ones attached to their own employee record.
function isEmployeeFile(entityType?: string | null, scope?: string | null): boolean {
  return entityType === "employee" || (scope === "hr" && entityType !== "training" && entityType !== "asset");
}

async function assertEmployeeFileRead(req: any, entityId?: string | null) {
  if (await userHasPerm(req, "hr:read")) return;
  if (entityId && req.user?.employeeId && entityId === req.user.employeeId) return;
  throw new HttpError(403, "Not permitted to view this employee's documents");
}

async function assertEmployeeFileWrite(req: any) {
  if (!(await userHasPerm(req, "hr:write"))) {
    throw new HttpError(403, "Only HR and the Director can manage employee documents");
  }
}

export const filesRouter = Router();
filesRouter.use(requireAuth);

// Map frontend entityType → coarse storage scope
function scopeFromEntityType(entityType?: string): "hr" | "project" | "finance" | "crm" | "letter" | "contractor" | "other" {
  switch (entityType) {
    case "employee": case "training": case "asset": return "hr";
    case "project": case "drawing": case "boq": case "snag": case "ir": case "wir": return "project";
    case "contract": return "finance";
    default: return "other";
  }
}

function toStoredFile(row: any) {
  return {
    id: row.id,
    name: row.originalName,
    mimeType: row.mime,
    sizeBytes: row.sizeBytes,
    dataUrl: `/api/v1/files/${row.id}`,                // served as a URL — frontend renders `<img src={f.dataUrl}>` unchanged
    uploadedAt: row.uploadedAt instanceof Date ? row.uploadedAt.toISOString() : row.uploadedAt,
    uploadedBy: row.uploadedByDisplay ?? "",
    entityType: row.entityType ?? "other",
    entityId: row.entityId ?? "",
    category: row.category ?? undefined,
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

const ALLOWED_MIME = [
  "application/pdf",
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
  "application/zip",
  // Voice notes / audio from the task chat
  "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-m4a",
];

const scopeSchema = z.enum(["hr", "project", "finance", "crm", "letter", "contractor", "other"]);

// LIST — filter by entityType/entityId or scope. Always scoped to current user via RLS.
filesRouter.get("/", async (req, res, next) => {
  try {
    const { entityType, entityId, scope, scopeId } = req.query as Record<string, string>;
    if (isEmployeeFile(entityType, scope)) await assertEmployeeFileRead(req, entityId);
    const conds: any[] = [];
    if (entityType) conds.push(eq(files.entityType, entityType));
    if (entityId)   conds.push(eq(files.entityId, entityId));
    if (scope)      conds.push(eq(files.scope, scope as any));
    if (scopeId)    conds.push(eq(files.scopeId, scopeId));
    const q = conds.length ? db.select().from(files).where(and(...conds)) : db.select().from(files);
    const rows = await q.orderBy(desc(files.uploadedAt));
    res.json(rows.map(toStoredFile));
  } catch (err) { next(err); }
});

filesRouter.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "No file uploaded");
    if (!ALLOWED_MIME.includes(req.file.mimetype)) throw new HttpError(415, `Unsupported MIME: ${req.file.mimetype}`);

    const entityType = (req.body.entityType as string | undefined) ?? null;
    const entityId = (req.body.entityId as string | undefined) ?? null;
    const category = (req.body.category as string | undefined) ?? null;
    const uploadedByDisplay = (req.body.uploadedByDisplay as string | undefined) ?? req.user!.email;
    const scope = req.body.scope ? scopeSchema.parse(req.body.scope) : scopeFromEntityType(entityType ?? undefined);
    const scopeId = req.body.scopeId && req.body.scopeId !== "" ? String(req.body.scopeId) : null;
    if (isEmployeeFile(entityType, scope)) await assertEmployeeFileWrite(req);

    const inserted = await db.insert(files).values({
      originalName: req.file.originalname,
      mime: req.file.mimetype,
      sizeBytes: req.file.size,
      storagePath: "pending",
      sha256: "pending",
      scope,
      scopeId,
      entityType,
      entityId,
      category,
      uploadedByUserId: req.user!.sub,
      uploadedByDisplay,
    } as any).returning();
    const row = inserted[0];

    const key = fileKey(scope, row.id, req.file.originalname);
    const stored = await storage.put(key, req.file.buffer, req.file.mimetype);

    const updated = await db.update(files)
      .set({ storagePath: stored.storagePath, sha256: stored.sha256 })
      .where(eq(files.id, row.id))
      .returning();

    await writeAudit(req, { action: "upload-file", entityType: "file", entityId: row.id, after: { name: row.originalName, scope, entityType, entityId, sizeBytes: row.sizeBytes } });
    res.status(201).json(toStoredFile(updated[0]));
  } catch (err) { next(err); }
});

filesRouter.get("/:id", async (req, res, next) => {
  try {
    const rows = await db.select().from(files).where(eq(files.id, req.params.id)).limit(1);
    const f = rows[0];
    if (!f) throw new HttpError(404, "File not found");
    if (isEmployeeFile(f.entityType, f.scope)) await assertEmployeeFileRead(req, f.entityId);
    const key = f.storagePath.startsWith("s3://")
      ? f.storagePath.replace(/^s3:\/\/[^/]+\//, "")
      : f.storagePath;
    const buf = await storage.get(key);
    res.setHeader("Content-Type", f.mime);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(f.originalName)}"`);
    res.send(buf);
  } catch (err) { next(err); }
});

filesRouter.delete("/:id", async (req, res, next) => {
  try {
    const rows = await db.select().from(files).where(eq(files.id, req.params.id)).limit(1);
    const f = rows[0];
    if (!f) throw new HttpError(404, "File not found");
    if (isEmployeeFile(f.entityType, f.scope)) await assertEmployeeFileWrite(req);
    const key = f.storagePath.startsWith("s3://")
      ? f.storagePath.replace(/^s3:\/\/[^/]+\//, "")
      : f.storagePath;
    await storage.delete(key);
    await db.delete(files).where(eq(files.id, req.params.id));
    await writeAudit(req, { action: "delete-file", entityType: "file", entityId: req.params.id });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
