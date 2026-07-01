import { describe, expect, it } from "vitest";
import { computeInvoiceTotals, scenarioToFlags, validateDocumentReadiness } from "./e-invoicing.validation.js";

describe("e-invoicing validation", () => {
  it("computes line, VAT, invoice, and tax breakdown totals", () => {
    const totals = computeInvoiceTotals([
      { description: "Design", itemName: "Design Services", quantity: 2, unitOfMeasure: "EA", netPrice: 100, baseQuantity: 1, taxCategoryCode: "S", taxRate: 5, itemType: "S" },
      { description: "Export", itemName: "Export Services", quantity: 1, unitOfMeasure: "EA", netPrice: 50, baseQuantity: 1, taxCategoryCode: "Z", taxRate: 0, itemType: "S" },
    ]);

    expect(totals.totalNetAmount).toBe(250);
    expect(totals.totalTaxAmount).toBe(10);
    expect(totals.totalWithTax).toBe(260);
    expect(totals.taxBreakdown).toHaveLength(2);
  });

  it("builds the UAE transaction scenario flag string", () => {
    expect(scenarioToFlags("continuous-supply")).toBe("00001000");
    expect(scenarioToFlags("free-zone")).toBe("10001000");
    expect(scenarioToFlags("exports")).toBe("00001001");
  });

  it("rejects domestic tax invoices with missing mandatory identities", () => {
    const result = validateDocumentReadiness({
      category: "tax-invoice",
      scenario: "continuous-supply",
      transactionTypeCode: "00001000",
      seller: { tin: "123", trn: "123456789012003" },
      buyer: { name: "Buyer", trn: "" },
      lines: [{ id: "L1" }],
      totalNetAmount: 100,
      totalTaxAmount: 5,
      totalWithTax: 105,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/Seller TIN/);
    expect(result.errors.join(" ")).toMatch(/Buyer TRN/);
  });
});
