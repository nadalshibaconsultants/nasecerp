import { randomUUID } from "node:crypto";
import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
  apBills,
  arInvoices,
  customers,
  eInvoiceClients,
  eInvoiceCompanyProfiles,
  eInvoiceDocuments,
  eInvoiceEvents,
  eInvoiceWebhookLogs,
  suppliers,
} from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAnyPerm, requirePerm } from "../../middleware/rbac.js";
import { HttpError } from "../../middleware/errors.js";
import { writeAudit } from "../../middleware/audit.js";
import { COA, postAutoJournal } from "../../lib/auto-journal.js";
import { env } from "../../env.js";
import { submitToAsp } from "./asp.js";
import {
  computeInvoiceTotals,
  createIssuedInvoiceSchema,
  createReceivedInvoiceSchema,
  scenarioToFlags,
  validateDocumentReadiness,
} from "./e-invoicing.validation.js";

export const eInvoicingRouter = Router();
eInvoicingRouter.use(requireAuth);

const DEFAULT_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

const companyProfileUpdateSchema = z.object({
  tin: z.string().optional(),
  trn: z.string().optional(),
  participantId: z.string().optional(),
  legalName: z.string().min(1).optional(),
  tradeLicenseAuthority: z.string().optional(),
  registrationType: z.string().optional(),
  registrationId: z.string().optional(),
  address: z.record(z.string(), z.unknown()).optional(),
  vatRegistered: z.boolean().optional(),
  taxGroupMember: z.boolean().optional(),
  taxGroupTin: z.string().optional(),
  annualRevenueBand: z.string().optional(),
  aspName: z.string().optional(),
  aspEndpoint: z.string().url().optional().or(z.literal("")),
  aspEnvironment: z.string().optional(),
  aspStatus: z.string().optional(),
  aspCredentialRef: z.string().optional(),
  aspAppointmentDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  goLiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  voluntaryOnboardingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  retentionYears: z.number().int().min(5).optional(),
  notes: z.string().optional(),
});

const clientCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  tin: z.string().optional(),
  trn: z.string().optional(),
  legalRegId: z.string().optional(),
  legalRegType: z.string().optional(),
  electronicAddress: z.string().optional(),
  electronicIdentifier: z.string().optional(),
  address: z.record(z.string(), z.unknown()).default({}),
  freeZone: z.boolean().default(false),
  freeZoneEntity: z.string().optional(),
  beneficiaryName: z.string().optional(),
  beneficiaryAddress: z.string().optional(),
  onEInvoicingSystem: z.boolean().default(false),
  active: z.boolean().default(true),
});

eInvoicingRouter.get("/company-profile", requirePerm("finance:read"), async (_req, res, next) => {
  try {
    const profile = await getProfile();
    res.json(toCompanyProfileApi(profile));
  } catch (err) { next(err); }
});

eInvoicingRouter.patch("/company-profile", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const input = companyProfileUpdateSchema.parse(req.body);
    const current = await getProfile();
    const updated = await db.update(eInvoiceCompanyProfiles).set({
      tin: input.tin,
      trn: input.trn,
      participantId: input.participantId,
      legalName: input.legalName,
      tradeLicenseAuthority: input.tradeLicenseAuthority,
      registrationType: input.registrationType,
      registrationId: input.registrationId,
      address: input.address,
      vatRegistered: input.vatRegistered,
      taxGroupMember: input.taxGroupMember,
      taxGroupTin: input.taxGroupTin,
      annualRevenueBand: input.annualRevenueBand,
      aspName: input.aspName,
      aspEndpoint: input.aspEndpoint || null,
      aspEnvironment: input.aspEnvironment,
      aspStatus: input.aspStatus,
      aspCredentialRef: input.aspCredentialRef,
      aspAppointmentDeadline: input.aspAppointmentDeadline,
      goLiveDate: input.goLiveDate,
      voluntaryOnboardingDate: input.voluntaryOnboardingDate,
      retentionYears: input.retentionYears,
      notes: input.notes,
      updatedByUserId: req.user!.sub,
      updatedAt: new Date(),
    } as any).where(eq(eInvoiceCompanyProfiles.id, current.id)).returning();
    await writeAudit(req, { action: "update-e-invoice-company-profile", entityType: "e-invoice-company-profile", entityId: current.id, before: current, after: updated[0] });
    res.json(toCompanyProfileApi(updated[0]));
  } catch (err) { next(err); }
});

eInvoicingRouter.get("/summary", requirePerm("finance:read"), async (_req, res, next) => {
  try {
    const profile = await getProfile();
    const docs = await db.select().from(eInvoiceDocuments).where(eq(eInvoiceDocuments.companyId, DEFAULT_COMPANY_ID));
    const issued = docs.filter((d) => d.direction === "issued" && !d.deletedAt);
    const received = docs.filter((d) => d.direction === "received" && !d.deletedAt);
    const confirmed = issued.filter((d) => d.status === "confirmed").length;
    const pending = issued.filter((d) => ["submitted", "validated", "transmitted"].includes(d.status)).length;
    const failed = issued.filter((d) => d.status === "failed").length;
    const totalValue = round2(issued.reduce((sum, d) => sum + Number(d.totalWithTax ?? 0), 0));
    const readiness = readinessChecklist(profile, issued.length);
    res.json({
      counts: {
        issued: issued.length,
        received: received.length,
        confirmed,
        pending,
        failed,
        pendingApApproval: received.filter((d) => d.status === "pending-approval").length,
      },
      totalValue,
      readiness,
      company: toCompanyProfileApi(profile),
    });
  } catch (err) { next(err); }
});

eInvoicingRouter.get("/invoices", requirePerm("finance:read"), async (_req, res, next) => {
  try {
    const rows = await db.select().from(eInvoiceDocuments)
      .where(and(eq(eInvoiceDocuments.companyId, DEFAULT_COMPANY_ID), eq(eInvoiceDocuments.direction, "issued")))
      .orderBy(desc(eInvoiceDocuments.issueDate), desc(eInvoiceDocuments.createdAt));
    res.json(rows.filter((r) => !r.deletedAt).map(toDocumentApi));
  } catch (err) { next(err); }
});

eInvoicingRouter.get("/invoices/:id", requirePerm("finance:read"), async (req, res, next) => {
  try {
    const doc = await getDocument(req.params.id);
    if (doc.direction !== "issued") throw new HttpError(404, "Issued invoice not found");
    res.json(toDocumentApi(doc));
  } catch (err) { next(err); }
});

eInvoicingRouter.post("/invoices", requireAnyPerm("finance:write", "finance:invoices:write"), async (req, res, next) => {
  try {
    const input = createIssuedInvoiceSchema.parse(req.body);
    const profile = await getProfile();
    const client = await getClient(input.clientId);
    if (!client.customerId) throw new HttpError(409, "E-invoice client is not linked to a Finance customer.");

    const issueDate = input.issueDate ?? today();
    const dueDate = input.dueDate ?? addDays(issueDate, 30);
    const invoiceNumber = input.invoiceNumber ?? `NASEC/${issueDate.slice(0, 4)}/INV-${Date.now().toString().slice(-6)}`;
    const invoiceUuid = randomUUID();
    const transactionTypeCode = input.transactionTypeCode ?? scenarioToFlags(input.scenario);
    const totals = computeInvoiceTotals(input.lines);
    const seller = {
      name: profile.legalName,
      tin: profile.tin,
      trn: profile.trn,
      address: profile.address,
    };
    const buyer = {
      name: client.name,
      tin: client.tin,
      trn: client.trn,
      address: client.address,
    };

    const validation = validateDocumentReadiness({
      category: input.category,
      scenario: input.scenario,
      transactionTypeCode,
      seller,
      buyer,
      lines: totals.lines,
      totalNetAmount: totals.totalNetAmount,
      totalTaxAmount: totals.totalTaxAmount,
      totalWithTax: totals.totalWithTax,
    });
    if (!validation.valid) throw new HttpError(400, "E-invoice validation failed", validation);

    let arInvoiceId: string | null = null;
    if (!input.category.includes("credit")) {
      arInvoiceId = await ensureArInvoice({
        invoiceNumber,
        customerId: client.customerId,
        issueDate,
        dueDate,
        currencyCode: input.currencyCode,
        projectId: input.projectId ?? undefined,
        lines: totals.lines,
        totalNetAmount: totals.totalNetAmount,
        totalTaxAmount: totals.totalTaxAmount,
        totalWithTax: totals.totalWithTax,
      });
    }

    const statusHistory = [statusEvent("draft", "E-invoice created and linked with Finance AR.")];
    const inserted = await db.insert(eInvoiceDocuments).values({
      companyId: DEFAULT_COMPANY_ID,
      direction: "issued",
      category: input.category,
      status: "draft",
      invoiceNumber,
      invoiceUuid,
      issueDate,
      dueDate,
      currencyCode: input.currencyCode,
      transactionTypeCode,
      paymentMeansCode: input.paymentMeansCode,
      scenario: input.scenario,
      seller,
      buyer,
      lines: totals.lines,
      taxBreakdown: totals.taxBreakdown,
      totalNetAmount: String(totals.totalNetAmount),
      totalTaxAmount: String(totals.totalTaxAmount),
      totalWithTax: String(totals.totalWithTax),
      amountDue: String(totals.amountDue),
      retentionExpiry: addYears(issueDate, Number(profile.retentionYears ?? 5)),
      arInvoiceId,
      eInvoiceClientId: client.id,
      customerId: client.customerId,
      projectId: input.projectId ?? null,
      projectName: input.projectName,
      milestone: input.milestone,
      precedingInvoiceRef: input.precedingInvoiceRef,
      precedingInvoiceUuid: input.precedingInvoiceUuid,
      statusHistory,
      createdByUserId: req.user!.sub,
      updatedByUserId: req.user!.sub,
    } as any).returning();
    await db.insert(eInvoiceEvents).values({
      companyId: DEFAULT_COMPANY_ID,
      documentId: inserted[0].id,
      status: "draft",
      message: "E-invoice created from ERP.",
    } as any);
    await writeAudit(req, { action: "create-e-invoice", entityType: "e-invoice", entityId: inserted[0].id, after: { invoiceNumber, arInvoiceId } });
    res.status(201).json(toDocumentApi(inserted[0]));
  } catch (err) { next(err); }
});

eInvoicingRouter.post("/invoices/:id/validate", requirePerm("finance:read"), async (req, res, next) => {
  try {
    const doc = await getDocument(req.params.id);
    const result = validateDocumentReadiness({
      category: doc.category,
      scenario: doc.scenario,
      transactionTypeCode: doc.transactionTypeCode,
      seller: doc.seller as any,
      buyer: doc.buyer as any,
      lines: doc.lines as any[],
      totalNetAmount: Number(doc.totalNetAmount),
      totalTaxAmount: Number(doc.totalTaxAmount),
      totalWithTax: Number(doc.totalWithTax),
    });
    res.json(result);
  } catch (err) { next(err); }
});

eInvoicingRouter.post("/invoices/:id/submit", requireAnyPerm("finance:write", "finance:invoices:write"), async (req, res, next) => {
  try {
    const doc = await getDocument(req.params.id);
    if (doc.direction !== "issued") throw new HttpError(404, "Issued invoice not found");
    if (["confirmed", "cancelled"].includes(doc.status)) throw new HttpError(409, `Cannot submit a ${doc.status} invoice.`);

    const validation = validateDocumentReadiness({
      category: doc.category,
      scenario: doc.scenario,
      transactionTypeCode: doc.transactionTypeCode,
      seller: doc.seller as any,
      buyer: doc.buyer as any,
      lines: doc.lines as any[],
      totalNetAmount: Number(doc.totalNetAmount),
      totalTaxAmount: Number(doc.totalTaxAmount),
      totalWithTax: Number(doc.totalWithTax),
    });
    if (!validation.valid) throw new HttpError(400, "E-invoice validation failed", validation);

    const asp = await submitToAsp({ id: doc.id, invoiceNumber: doc.invoiceNumber, invoiceUuid: doc.invoiceUuid });
    const history = [
      ...((doc.statusHistory as any[]) ?? []),
      statusEvent("validated", "PINT-AE readiness validation passed."),
      statusEvent(asp.status, asp.message),
    ];
    const updated = await db.update(eInvoiceDocuments).set({
      status: asp.status,
      xmlGenerated: true,
      aspSubmissionId: asp.externalId,
      aspLastResponse: asp.response,
      aspSubmittedAt: new Date(),
      statusHistory: history,
      updatedByUserId: req.user!.sub,
      updatedAt: new Date(),
    } as any).where(eq(eInvoiceDocuments.id, doc.id)).returning();
    await db.insert(eInvoiceEvents).values({
      companyId: DEFAULT_COMPANY_ID,
      documentId: doc.id,
      status: asp.status,
      message: asp.message,
      payload: asp.response,
    } as any);
    await writeAudit(req, { action: "submit-e-invoice", entityType: "e-invoice", entityId: doc.id, after: { status: asp.status, aspSubmissionId: asp.externalId } });
    res.json(toDocumentApi(updated[0]));
  } catch (err) { next(err); }
});

eInvoicingRouter.get("/ap-inbox", requirePerm("finance:read"), async (_req, res, next) => {
  try {
    const rows = await db.select().from(eInvoiceDocuments)
      .where(and(eq(eInvoiceDocuments.companyId, DEFAULT_COMPANY_ID), eq(eInvoiceDocuments.direction, "received")))
      .orderBy(desc(eInvoiceDocuments.issueDate), desc(eInvoiceDocuments.createdAt));
    res.json(rows.filter((r) => !r.deletedAt).map(toReceivedApi));
  } catch (err) { next(err); }
});

eInvoicingRouter.post("/ap-inbox", requireAnyPerm("finance:write", "finance:invoices:write"), async (req, res, next) => {
  try {
    const input = createReceivedInvoiceSchema.parse(req.body);
    const profile = await getProfile();
    const totals = computeInvoiceTotals(input.lines);
    const supplierId = input.supplierId ?? await ensureSupplier({
      name: input.supplierName,
      trn: input.supplierTrn,
      currency: input.currencyCode,
    });
    const invoiceUuid = input.invoiceUuid ?? randomUUID();
    const seller = { name: input.supplierName, tin: input.supplierTin, trn: input.supplierTrn };
    const buyer = { name: profile.legalName, tin: profile.tin, trn: profile.trn, address: profile.address };
    const inserted = await db.insert(eInvoiceDocuments).values({
      companyId: DEFAULT_COMPANY_ID,
      direction: "received",
      category: "tax-invoice",
      status: "pending-approval",
      invoiceNumber: input.invoiceNumber,
      invoiceUuid,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currencyCode: input.currencyCode,
      transactionTypeCode: "00001000",
      paymentMeansCode: "30",
      scenario: "continuous-supply",
      seller,
      buyer,
      lines: totals.lines,
      taxBreakdown: totals.taxBreakdown,
      totalNetAmount: String(totals.totalNetAmount),
      totalTaxAmount: String(totals.totalTaxAmount),
      totalWithTax: String(totals.totalWithTax),
      amountDue: String(totals.amountDue),
      supplierId,
      projectName: input.projectName,
      poRef: input.poRef,
      grnRef: input.grnRef,
      matchStatus: input.poRef && input.grnRef ? "3-way-matched" : "needs-review",
      statusHistory: [statusEvent("received", "Supplier e-invoice received into AP inbox.")],
      sourcePayload: input,
      createdByUserId: req.user!.sub,
      updatedByUserId: req.user!.sub,
    } as any).returning();
    await writeAudit(req, { action: "receive-e-invoice", entityType: "e-invoice", entityId: inserted[0].id, after: { invoiceNumber: input.invoiceNumber } });
    res.status(201).json(toReceivedApi(inserted[0]));
  } catch (err) { next(err); }
});

eInvoicingRouter.post("/ap-inbox/:id/approve", requireAnyPerm("finance:write", "finance:invoices:write"), async (req, res, next) => {
  try {
    const doc = await getDocument(req.params.id);
    if (doc.direction !== "received") throw new HttpError(404, "AP inbox item not found");
    if (doc.status === "posted" && doc.apBillId) return res.json(toReceivedApi(doc));
    if (!doc.supplierId) throw new HttpError(409, "Inbound invoice is missing a linked supplier.");

    const apBillId = await ensureApBill(doc);
    const history = [...((doc.statusHistory as any[]) ?? []), statusEvent("posted", "Approved and posted to Finance AP bill.")];
    const updated = await db.update(eInvoiceDocuments).set({
      status: "posted",
      apBillId,
      statusHistory: history,
      updatedByUserId: req.user!.sub,
      updatedAt: new Date(),
    } as any).where(eq(eInvoiceDocuments.id, doc.id)).returning();
    await db.insert(eInvoiceEvents).values({
      companyId: DEFAULT_COMPANY_ID,
      documentId: doc.id,
      status: "posted",
      message: "Approved and posted to AP.",
    } as any);
    await writeAudit(req, { action: "approve-e-invoice-ap", entityType: "e-invoice", entityId: doc.id, after: { apBillId } });
    res.json(toReceivedApi(updated[0]));
  } catch (err) { next(err); }
});

eInvoicingRouter.get("/clients", requirePerm("finance:read"), async (_req, res, next) => {
  try {
    const rows = await db.select().from(eInvoiceClients)
      .where(eq(eInvoiceClients.companyId, DEFAULT_COMPANY_ID))
      .orderBy(eInvoiceClients.name);
    res.json(rows.filter((r) => !r.deletedAt).map(toClientApi));
  } catch (err) { next(err); }
});

eInvoicingRouter.post("/clients", requireAnyPerm("finance:write", "crm:write"), async (req, res, next) => {
  try {
    const input = clientCreateSchema.parse(req.body);
    const customerId = await ensureCustomer({
      code: `CUST-${input.code}`,
      name: input.name,
      trn: input.trn,
      currency: "AED",
    });
    const inserted = await db.insert(eInvoiceClients).values({
      companyId: DEFAULT_COMPANY_ID,
      customerId,
      ...input,
      createdByUserId: req.user!.sub,
      updatedByUserId: req.user!.sub,
    } as any).returning();
    await writeAudit(req, { action: "create-e-invoice-client", entityType: "e-invoice-client", entityId: inserted[0].id, after: { code: input.code, name: input.name } });
    res.status(201).json(toClientApi(inserted[0]));
  } catch (err) { next(err); }
});

eInvoicingRouter.post("/clients/sync-finance", requirePerm("finance:write"), async (_req, res, next) => {
  try {
    const financeCustomers = await db.select().from(customers).where(eq(customers.companyId, DEFAULT_COMPANY_ID));
    let created = 0;
    for (const customer of financeCustomers) {
      const code = customer.code.startsWith("CLI-") ? customer.code : `FIN-${customer.code}`;
      const existing = await db.select({ id: eInvoiceClients.id }).from(eInvoiceClients)
        .where(and(eq(eInvoiceClients.companyId, DEFAULT_COMPANY_ID), eq(eInvoiceClients.customerId, customer.id))).limit(1);
      if (existing[0]) continue;
      await db.insert(eInvoiceClients).values({
        companyId: DEFAULT_COMPANY_ID,
        customerId: customer.id,
        code,
        name: customer.name,
        trn: customer.trnNumber,
        address: { line1: customer.address ?? "", city: "", subdivision: "", country: "AE" },
        active: customer.active,
      } as any);
      created += 1;
    }
    res.json({ ok: true, created });
  } catch (err) { next(err); }
});

eInvoicingRouter.get("/compliance", requirePerm("finance:read"), async (_req, res, next) => {
  try {
    const profile = await getProfile();
    const docs = await db.select().from(eInvoiceDocuments).where(eq(eInvoiceDocuments.companyId, DEFAULT_COMPANY_ID));
    const issued = docs.filter((d) => d.direction === "issued" && !d.deletedAt);
    res.json({
      readiness: readinessChecklist(profile, issued.length),
      retention: issued.map((doc) => ({
        id: doc.id,
        invoiceNumber: doc.invoiceNumber,
        buyer: (doc.buyer as any)?.name ?? "",
        retentionExpiry: doc.retentionExpiry,
      })),
      validationRules: [
        "Seller TIN must be 10 digits.",
        "Seller and domestic buyer TRN must be 15 digits when applicable.",
        "Transaction type code must contain 8 binary flags.",
        "Totals must reconcile to line and tax breakdown values.",
        "ASP credentials must be configured through server environment variables.",
      ],
    });
  } catch (err) { next(err); }
});

eInvoicingRouter.get("/asp/status", requirePerm("finance:read"), async (_req, res) => {
  res.json({
    mode: env.EINVOICE_ASP_MODE,
    provider: env.EINVOICE_ASP_PROVIDER || null,
    endpointConfigured: Boolean(env.EINVOICE_ASP_ENDPOINT),
    apiKeyConfigured: Boolean(env.EINVOICE_ASP_API_KEY),
    webhookSecretConfigured: Boolean(env.EINVOICE_WEBHOOK_SECRET),
  });
});

eInvoicingRouter.post("/webhook", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const payload = z.object({
      provider: z.string().default("asp"),
      eventType: z.string().default("status"),
      invoiceUuid: z.string().optional(),
      aspSubmissionId: z.string().optional(),
      status: z.enum(["submitted", "validated", "transmitted", "confirmed", "failed"]).optional(),
      message: z.string().optional(),
    }).parse(req.body);
    const log = await db.insert(eInvoiceWebhookLogs).values({
      companyId: DEFAULT_COMPANY_ID,
      provider: payload.provider,
      eventType: payload.eventType,
      externalId: payload.aspSubmissionId ?? payload.invoiceUuid,
      payload,
    } as any).returning();

    let updatedDocument = null;
    if (payload.status && (payload.invoiceUuid || payload.aspSubmissionId)) {
      const rows = await db.select().from(eInvoiceDocuments)
        .where(payload.invoiceUuid
          ? eq(eInvoiceDocuments.invoiceUuid, payload.invoiceUuid)
          : eq(eInvoiceDocuments.aspSubmissionId, payload.aspSubmissionId!))
        .limit(1);
      const doc = rows[0];
      if (doc) {
        const history = [...((doc.statusHistory as any[]) ?? []), statusEvent(payload.status, payload.message ?? `ASP webhook: ${payload.status}`)];
        const updated = await db.update(eInvoiceDocuments).set({
          status: payload.status,
          confirmedAt: payload.status === "confirmed" ? new Date() : doc.confirmedAt,
          failedReason: payload.status === "failed" ? payload.message ?? "ASP reported failure" : doc.failedReason,
          statusHistory: history,
          updatedAt: new Date(),
        } as any).where(eq(eInvoiceDocuments.id, doc.id)).returning();
        updatedDocument = toDocumentApi(updated[0]);
      }
    }
    await db.update(eInvoiceWebhookLogs).set({ processed: true, processedAt: new Date() }).where(eq(eInvoiceWebhookLogs.id, log[0].id));
    res.json({ ok: true, document: updatedDocument });
  } catch (err) { next(err); }
});

async function getProfile() {
  const rows = await db.select().from(eInvoiceCompanyProfiles)
    .where(eq(eInvoiceCompanyProfiles.companyId, DEFAULT_COMPANY_ID)).limit(1);
  if (!rows[0]) throw new HttpError(404, "E-invoicing company profile not found. Run database migration.");
  return rows[0];
}

async function getClient(id: string) {
  const rows = await db.select().from(eInvoiceClients).where(eq(eInvoiceClients.id, id)).limit(1);
  if (!rows[0] || rows[0].deletedAt) throw new HttpError(404, "E-invoicing client not found");
  return rows[0];
}

async function getDocument(id: string) {
  const rows = await db.select().from(eInvoiceDocuments).where(eq(eInvoiceDocuments.id, id)).limit(1);
  if (!rows[0] || rows[0].deletedAt) throw new HttpError(404, "E-invoice document not found");
  return rows[0];
}

async function ensureCustomer(input: { code: string; name: string; trn?: string | null; currency: string }) {
  const existing = await db.select({ id: customers.id }).from(customers).where(eq(customers.code, input.code)).limit(1);
  if (existing[0]) return existing[0].id;
  const inserted = await db.insert(customers).values({
    companyId: DEFAULT_COMPANY_ID,
    code: input.code,
    name: input.name,
    trnNumber: input.trn,
    currency: input.currency,
    paymentTermsDays: 30,
    active: true,
  } as any).returning({ id: customers.id });
  return inserted[0].id;
}

async function ensureSupplier(input: { name: string; trn?: string | null; currency: string }) {
  const code = `SUP-EINV-${slug(input.name).slice(0, 18)}`;
  const existing = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.code, code)).limit(1);
  if (existing[0]) return existing[0].id;
  const inserted = await db.insert(suppliers).values({
    companyId: DEFAULT_COMPANY_ID,
    code,
    name: input.name,
    trnNumber: input.trn,
    category: "e-invoice",
    currency: input.currency,
    paymentTermsDays: 30,
    active: true,
  } as any).returning({ id: suppliers.id });
  return inserted[0].id;
}

async function ensureArInvoice(input: {
  invoiceNumber: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  currencyCode: string;
  projectId?: string;
  lines: any[];
  totalNetAmount: number;
  totalTaxAmount: number;
  totalWithTax: number;
}) {
  const existing = await db.select({ id: arInvoices.id }).from(arInvoices).where(eq(arInvoices.number, input.invoiceNumber)).limit(1);
  if (existing[0]) return existing[0].id;
  const financeLines = input.lines.map((line) => ({
    id: line.id,
    description: line.description,
    qty: line.quantity,
    unitPrice: line.netPrice,
    vatCode: line.taxRate > 0 ? "STD-5" : "ZERO-RATED",
    accountCode: COA.REV_DESIGN,
    amountExVat: line.netAmount,
    vatAmount: line.vatAmountAED,
    amountIncVat: round2(line.netAmount + line.vatAmountAED),
    projectId: input.projectId,
  }));
  const inserted = await db.insert(arInvoices).values({
    companyId: DEFAULT_COMPANY_ID,
    number: input.invoiceNumber,
    customerId: input.customerId,
    invoiceDate: input.issueDate,
    dueDate: input.dueDate,
    office: "dubai",
    currency: input.currencyCode,
    projectId: input.projectId ?? null,
    lines: financeLines,
    subtotal: String(input.totalNetAmount),
    vatTotal: String(input.totalTaxAmount),
    total: String(input.totalWithTax),
    amountPaid: "0",
    balance: String(input.totalWithTax),
    status: "draft",
    notes: "Created by E-Invoicing module",
  } as any).returning({ id: arInvoices.id });
  await postAutoJournal({
    reference: `INV-${input.invoiceNumber}`,
    narration: `Client e-invoice ${input.invoiceNumber}`,
    source: "ar-invoice",
    sourceRefId: inserted[0].id,
    date: input.issueDate,
    office: "dubai",
    currency: input.currencyCode,
    lines: [
      { accountCode: COA.ACCOUNTS_RECEIVABLE, debit: input.totalWithTax, credit: 0, description: `Invoice ${input.invoiceNumber}`, projectId: input.projectId },
      { accountCode: COA.REV_DESIGN, debit: 0, credit: input.totalNetAmount, description: "Consultancy revenue", projectId: input.projectId },
      { accountCode: COA.VAT_PAYABLE, debit: 0, credit: input.totalTaxAmount, description: "Output VAT" },
    ],
  });
  return inserted[0].id;
}

async function ensureApBill(doc: typeof eInvoiceDocuments.$inferSelect) {
  const internalRef = `EINV-AP-${slug(doc.invoiceNumber)}`;
  const existing = await db.select({ id: apBills.id }).from(apBills).where(eq(apBills.internalRef, internalRef)).limit(1);
  if (existing[0]) return existing[0].id;
  const financeLines = ((doc.lines as any[]) ?? []).map((line) => ({
    id: line.id,
    description: line.description,
    qty: line.quantity,
    unitPrice: line.netPrice,
    vatCode: Number(line.taxRate ?? 0) > 0 ? "STD-5" : "ZERO-RATED",
    accountCode: COA.EXP_CONSULTANCY,
    amountExVat: line.netAmount,
    vatAmount: line.vatAmountAED,
    amountIncVat: round2(Number(line.netAmount ?? 0) + Number(line.vatAmountAED ?? 0)),
  }));
  const inserted = await db.insert(apBills).values({
    companyId: DEFAULT_COMPANY_ID,
    number: doc.invoiceNumber,
    internalRef,
    supplierId: doc.supplierId!,
    billDate: doc.issueDate,
    dueDate: doc.dueDate ?? addDays(String(doc.issueDate), 30),
    office: "dubai",
    currency: doc.currencyCode,
    poNumber: doc.poRef,
    lines: financeLines,
    subtotal: String(doc.totalNetAmount),
    vatTotal: String(doc.totalTaxAmount),
    total: String(doc.totalWithTax),
    amountPaid: "0",
    balance: String(doc.totalWithTax),
    status: "approved",
    notes: "Posted from AP E-Invoicing inbox",
  } as any).returning({ id: apBills.id });
  await postAutoJournal({
    reference: `BILL-${doc.invoiceNumber}`,
    narration: `Supplier e-invoice ${doc.invoiceNumber}`,
    source: "ap-bill",
    sourceRefId: inserted[0].id,
    date: String(doc.issueDate),
    office: "dubai",
    currency: doc.currencyCode,
    lines: [
      { accountCode: COA.EXP_CONSULTANCY, debit: Number(doc.totalNetAmount), credit: 0, description: `Bill ${doc.invoiceNumber}` },
      { accountCode: COA.VAT_RECOVERABLE, debit: Number(doc.totalTaxAmount), credit: 0, description: "Input VAT" },
      { accountCode: COA.ACCOUNTS_PAYABLE, debit: 0, credit: Number(doc.totalWithTax), description: "Accounts payable" },
    ],
  });
  return inserted[0].id;
}

function toCompanyProfileApi(row: typeof eInvoiceCompanyProfiles.$inferSelect) {
  return {
    id: row.id,
    tin: row.tin ?? "",
    trn: row.trn ?? "",
    participantId: row.participantId ?? "",
    legalName: row.legalName,
    tradeLicenseAuthority: row.tradeLicenseAuthority ?? "",
    registrationType: row.registrationType ?? "",
    registrationId: row.registrationId ?? "",
    address: row.address ?? {},
    asp: {
      name: env.EINVOICE_ASP_PROVIDER || row.aspName || "",
      endpoint: env.EINVOICE_ASP_ENDPOINT || row.aspEndpoint || "",
      authToken: env.EINVOICE_ASP_API_KEY ? "Configured in server environment" : "Not configured",
      certificate: row.aspCredentialRef ?? "",
      mode: env.EINVOICE_ASP_MODE,
      status: row.aspStatus,
    },
    vatRegistered: row.vatRegistered,
    taxGroupMember: row.taxGroupMember,
    taxGroupTin: row.taxGroupTin ?? "",
    annualRevenue: row.annualRevenueBand,
    aspAppointmentDeadline: row.aspAppointmentDeadline,
    goLiveDate: row.goLiveDate,
    voluntaryOnboardingDate: row.voluntaryOnboardingDate,
    retentionYears: row.retentionYears,
  };
}

function toClientApi(row: typeof eInvoiceClients.$inferSelect) {
  return {
    id: row.id,
    customerId: row.customerId,
    code: row.code,
    name: row.name,
    tin: row.tin ?? "",
    trn: row.trn ?? "",
    legalRegId: row.legalRegId ?? "",
    legalRegType: row.legalRegType ?? "TL",
    electronicAddress: row.electronicAddress ?? "",
    electronicIdentifier: row.electronicIdentifier ?? "",
    address: row.address ?? {},
    freeZone: row.freeZone,
    freeZoneEntity: row.freeZoneEntity ?? "",
    beneficiaryName: row.beneficiaryName ?? "",
    beneficiaryAddress: row.beneficiaryAddress ?? "",
    onEInvoicingSystem: row.onEInvoicingSystem,
    active: row.active,
  };
}

function toDocumentApi(row: typeof eInvoiceDocuments.$inferSelect) {
  return {
    id: row.id,
    uuid: row.invoiceUuid,
    invoiceNumber: row.invoiceNumber,
    invoiceDate: row.issueDate,
    category: row.category,
    status: row.status,
    currencyCode: row.currencyCode,
    transactionTypeCode: row.transactionTypeCode,
    paymentDueDate: row.dueDate ?? row.issueDate,
    paymentMeansCode: row.paymentMeansCode,
    scenario: row.scenario,
    seller: row.seller ?? {},
    buyer: row.buyer ?? {},
    lines: row.lines ?? [],
    totalNetAmount: Number(row.totalNetAmount ?? 0),
    totalTaxAmount: Number(row.totalTaxAmount ?? 0),
    totalWithTax: Number(row.totalWithTax ?? 0),
    amountDue: Number(row.amountDue ?? 0),
    taxBreakdown: row.taxBreakdown ?? [],
    precedingInvoiceRef: row.precedingInvoiceRef ?? undefined,
    precedingInvoiceUuid: row.precedingInvoiceUuid ?? undefined,
    statusHistory: row.statusHistory ?? [],
    retentionExpiry: row.retentionExpiry ?? addYears(String(row.issueDate), 5),
    xmlGenerated: row.xmlGenerated,
    pdfGenerated: row.pdfGenerated,
    project: row.projectName ?? "",
    milestone: row.milestone ?? "",
    arInvoiceId: row.arInvoiceId,
    apBillId: row.apBillId,
  };
}

function toReceivedApi(row: typeof eInvoiceDocuments.$inferSelect) {
  const seller = row.seller as any;
  const lines = (row.lines as any[]) ?? [];
  return {
    id: row.id,
    supplierName: seller?.name ?? "",
    invoiceNumber: row.invoiceNumber,
    date: row.issueDate,
    amount: Number(row.totalNetAmount ?? 0),
    vat: Number(row.totalTaxAmount ?? 0),
    total: Number(row.totalWithTax ?? 0),
    currency: row.currencyCode,
    status: row.status,
    poRef: row.poRef ?? "",
    grnRef: row.grnRef ?? "",
    project: row.projectName ?? "",
    description: lines[0]?.description ?? "",
    matchStatus: row.matchStatus ?? "needs-review",
    apBillId: row.apBillId,
  };
}

function readinessChecklist(profile: typeof eInvoiceCompanyProfiles.$inferSelect, issuedCount: number) {
  return [
    { item: "TIN registered with MoF", done: Boolean(profile.tin) },
    { item: "TRN registered with FTA", done: Boolean(profile.trn) },
    { item: "ASP appointed from MoF Central Register", done: Boolean(profile.aspName) },
    { item: "Peppol Participant Identifier configured", done: Boolean(profile.participantId) },
    { item: "ASP API credential stored in server environment", done: Boolean(env.EINVOICE_ASP_API_KEY) || env.EINVOICE_ASP_MODE === "simulation" },
    { item: "Client master data updated with TIN/TRN", done: true },
    { item: "Invoice templates comply with mandatory fields", done: issuedCount > 0 },
    { item: "PINT-AE XML generation validated", done: issuedCount > 0 },
    { item: "Credit Note workflow configured", done: true },
    { item: "Records retention policy configured", done: Number(profile.retentionYears ?? 0) >= 5 },
    { item: "Staff trained on e-invoicing procedures", done: false },
    { item: "Parallel run completed", done: false },
  ];
}

function statusEvent(status: string, message: string) {
  return { status, timestamp: new Date().toISOString(), message };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addYears(isoDate: string, years: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
}

function slug(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
