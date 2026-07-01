/**
 * Procurement — Local Purchase Orders, Goods Received Notes, 3-way matching.
 */
export type LPOStatus =
  | "draft" | "submitted" | "approved" | "issued" | "partially-received"
  | "received" | "invoiced" | "closed" | "cancelled";

export type LPOLine = {
  id: string;
  description: string;
  qty: number;
  unitOfMeasure: string;
  unitPrice: number;
  vatPct: number;
  glAccountCode: string;
  projectId?: string;
  amountExVat: number;
  vatAmount: number;
  amountIncVat: number;
  qtyReceived?: number;
};

export type LPO = {
  id: string;
  reference: string;                 // "LPO-2026-00123"
  date: string;
  supplierId: string;
  office: "dubai" | "cairo";
  currency: "AED" | "EGP" | "USD" | "EUR" | "GBP";
  fxRate?: number;
  deliveryDate?: string;
  deliveryAddress?: string;
  paymentTermsDays?: number;
  lines: LPOLine[];
  subtotal: number;
  vatTotal: number;
  total: number;
  raisedByDisplay: string;
  approverUserId?: string;
  approverDisplay?: string;
  approvedAt?: string;
  rejectionNote?: string;
  status: LPOStatus;
  linkedBillId?: string;
  linkedGrnIds?: string[];
  notes?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
};

// Goods Received Note
export type GRNLine = {
  id: string;
  lpoLineId: string;
  description: string;
  qtyOrdered: number;
  qtyReceivedThis: number;
  qtyReceivedToDate: number;
  condition: "good" | "damaged" | "short" | "wrong-item";
  remarks?: string;
};

export type GRN = {
  id: string;
  reference: string;                 // "GRN-2026-00045"
  date: string;
  lpoId: string;
  supplierId: string;
  receivedByDisplay: string;
  warehouseLocation?: string;
  vehicleNumber?: string;
  driverName?: string;
  supplierDeliveryNote?: string;
  lines: GRNLine[];
  status: "draft" | "confirmed" | "matched-to-bill";
  matchedBillId?: string;
  notes?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
};
