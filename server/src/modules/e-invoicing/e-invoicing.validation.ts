import { z } from "zod";

export const invoiceCategorySchema = z.enum([
  "tax-invoice",
  "self-billed-tax",
  "tax-credit-note",
  "self-billed-credit",
  "commercial-invoice",
  "commercial-credit-note",
]);

export const invoiceScenarioSchema = z.enum([
  "free-zone",
  "deemed-supply",
  "margin-scheme",
  "summary",
  "continuous-supply",
  "agent-billing",
  "e-commerce",
  "exports",
]);

export const invoiceLineSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1),
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unitOfMeasure: z.string().min(1).default("EA"),
  netPrice: z.number().nonnegative(),
  grossPrice: z.number().nonnegative().optional(),
  baseQuantity: z.number().positive().default(1),
  taxCategoryCode: z.string().min(1).default("S"),
  taxRate: z.number().min(0).max(100).default(5),
  itemType: z.enum(["G", "S", "B"]).default("S"),
});

export const createIssuedInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).optional(),
  category: invoiceCategorySchema.default("tax-invoice"),
  scenario: invoiceScenarioSchema.default("continuous-supply"),
  clientId: z.string().uuid(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currencyCode: z.string().min(3).max(3).default("AED"),
  transactionTypeCode: z.string().regex(/^[01]{8}$/).optional(),
  paymentMeansCode: z.string().default("30"),
  projectId: z.string().uuid().nullable().optional(),
  projectName: z.string().optional(),
  milestone: z.string().optional(),
  precedingInvoiceRef: z.string().optional(),
  precedingInvoiceUuid: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1),
});

export const createReceivedInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  invoiceUuid: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().min(1),
  supplierTin: z.string().optional(),
  supplierTrn: z.string().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currencyCode: z.string().min(3).max(3).default("AED"),
  poRef: z.string().optional(),
  grnRef: z.string().optional(),
  projectName: z.string().optional(),
  description: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1),
});

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

export function scenarioToFlags(scenario: z.infer<typeof invoiceScenarioSchema>): string {
  const flags = ["0", "0", "0", "0", "0", "0", "0", "0"];
  const order = ["free-zone", "deemed-supply", "margin-scheme", "summary", "continuous-supply", "agent-billing", "e-commerce", "exports"];
  const idx = order.indexOf(scenario);
  if (idx >= 0) flags[idx] = "1";
  if (scenario !== "summary") flags[4] = "1";
  return flags.join("");
}

export function computeInvoiceTotals(lines: InvoiceLineInput[]) {
  const normalized = lines.map((line, idx) => {
    const netAmount = round2(line.quantity * line.netPrice);
    const vatAmountAED = round2(netAmount * (line.taxRate / 100));
    const grossPrice = round2(line.grossPrice ?? line.netPrice * (1 + line.taxRate / 100));
    return {
      ...line,
      id: line.id ?? `L${idx + 1}`,
      grossPrice,
      netAmount,
      vatAmountAED,
      lineAmountAED: netAmount,
    };
  });
  const totalNetAmount = round2(normalized.reduce((sum, line) => sum + line.netAmount, 0));
  const totalTaxAmount = round2(normalized.reduce((sum, line) => sum + line.vatAmountAED, 0));
  const totalWithTax = round2(totalNetAmount + totalTaxAmount);
  const byCategory = new Map<string, { categoryCode: string; taxableAmount: number; taxAmount: number; rate: number }>();
  for (const line of normalized) {
    const key = `${line.taxCategoryCode}:${line.taxRate}`;
    const current = byCategory.get(key) ?? { categoryCode: line.taxCategoryCode, taxableAmount: 0, taxAmount: 0, rate: line.taxRate };
    current.taxableAmount = round2(current.taxableAmount + line.netAmount);
    current.taxAmount = round2(current.taxAmount + line.vatAmountAED);
    byCategory.set(key, current);
  }
  return {
    lines: normalized,
    taxBreakdown: [...byCategory.values()],
    totalNetAmount,
    totalTaxAmount,
    totalWithTax,
    amountDue: totalWithTax,
  };
}

export function validateDocumentReadiness(input: {
  category: string;
  scenario: string;
  transactionTypeCode: string;
  seller?: Record<string, unknown>;
  buyer?: Record<string, unknown>;
  lines?: unknown[];
  totalNetAmount: number;
  totalTaxAmount: number;
  totalWithTax: number;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sellerTin = String(input.seller?.tin ?? "");
  const sellerTrn = String(input.seller?.trn ?? "");
  const buyerTrn = String(input.buyer?.trn ?? "");
  const buyerCountry = String((input.buyer?.address as any)?.country ?? "");

  if (!/^\d{10}$/.test(sellerTin)) errors.push("Seller TIN must be 10 digits.");
  if (!/^\d{15}$/.test(sellerTrn)) errors.push("Seller TRN must be 15 digits.");
  if (!/^[01]{8}$/.test(input.transactionTypeCode)) errors.push("Transaction type code must be exactly 8 binary flags.");
  if (!Array.isArray(input.lines) || input.lines.length === 0) errors.push("At least one invoice line is required.");
  if (input.totalWithTax < input.totalNetAmount) errors.push("Invoice total with tax cannot be below net total.");
  if (input.category === "tax-invoice" && input.scenario !== "exports" && buyerCountry !== "SA" && !/^\d{15}$/.test(buyerTrn)) {
    errors.push("Buyer TRN must be 15 digits for domestic tax invoices.");
  }
  if (input.scenario === "exports" && buyerTrn) warnings.push("Export invoice has a buyer TRN; confirm this is required for the counterparty.");
  if (input.totalTaxAmount === 0 && input.scenario !== "exports" && input.category.includes("tax")) {
    warnings.push("Tax invoice has zero VAT outside export scenario. Confirm zero-rated or exempt treatment.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
