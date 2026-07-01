import { index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { companies, branches, departments, costCenters } from "./enterprise.js";
import { files } from "./files.js";
import { suppliers, apBills } from "./finance.js";

const N16 = { precision: 16, scale: 2 } as const;
const N6 = { precision: 12, scale: 6 } as const;

export const lpoStatusEnum = pgEnum("lpo_status", [
  "draft",
  "submitted",
  "approved",
  "issued",
  "partially-received",
  "received",
  "invoiced",
  "closed",
  "cancelled",
]);

export const grnStatusEnum = pgEnum("grn_status", ["draft", "confirmed", "matched-to-bill"]);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
    reference: text("reference").notNull(),
    date: date("date").notNull(),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
    office: text("office").notNull(),
    currency: text("currency").notNull().default("AED"),
    fxRate: numeric("fx_rate", N6),
    deliveryDate: date("delivery_date"),
    deliveryAddress: text("delivery_address"),
    paymentTermsDays: integer("payment_terms_days"),
    lines: jsonb("lines").notNull().default([]),
    subtotal: numeric("subtotal", N16).notNull().default("0"),
    vatTotal: numeric("vat_total", N16).notNull().default("0"),
    total: numeric("total", N16).notNull().default("0"),
    raisedByUserId: uuid("raised_by_user_id").references(() => users.id, { onDelete: "set null" }),
    raisedByDisplay: text("raised_by_display").notNull().default("System"),
    approverUserId: uuid("approver_user_id").references(() => users.id, { onDelete: "set null" }),
    approverDisplay: text("approver_display"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionNote: text("rejection_note"),
    status: lpoStatusEnum("status").notNull().default("draft"),
    linkedBillId: uuid("linked_bill_id").references(() => apBills.id, { onDelete: "set null" }),
    linkedGrnIds: jsonb("linked_grn_ids").notNull().default([]),
    notes: text("notes"),
    attachmentFileId: uuid("attachment_file_id").references(() => files.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByUserId: uuid("deleted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("purchase_orders_company_idx").on(t.companyId),
    supplierIdx: index("purchase_orders_supplier_idx").on(t.supplierId),
    statusIdx: index("purchase_orders_status_idx").on(t.status),
    dateIdx: index("purchase_orders_date_idx").on(t.date),
    billIdx: index("purchase_orders_linked_bill_idx").on(t.linkedBillId),
    deletedIdx: index("purchase_orders_deleted_at_idx").on(t.deletedAt),
  }),
);

export const goodsReceivedNotes = pgTable(
  "goods_received_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
    reference: text("reference").notNull(),
    date: date("date").notNull(),
    lpoId: uuid("lpo_id").notNull().references(() => purchaseOrders.id, { onDelete: "restrict" }),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
    receivedByUserId: uuid("received_by_user_id").references(() => users.id, { onDelete: "set null" }),
    receivedByDisplay: text("received_by_display").notNull().default("System"),
    warehouseLocation: text("warehouse_location"),
    vehicleNumber: text("vehicle_number"),
    driverName: text("driver_name"),
    supplierDeliveryNote: text("supplier_delivery_note"),
    lines: jsonb("lines").notNull().default([]),
    status: grnStatusEnum("status").notNull().default("draft"),
    matchedBillId: uuid("matched_bill_id").references(() => apBills.id, { onDelete: "set null" }),
    notes: text("notes"),
    attachmentFileId: uuid("attachment_file_id").references(() => files.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByUserId: uuid("deleted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("goods_received_notes_company_idx").on(t.companyId),
    lpoIdx: index("goods_received_notes_lpo_idx").on(t.lpoId),
    supplierIdx: index("goods_received_notes_supplier_idx").on(t.supplierId),
    statusIdx: index("goods_received_notes_status_idx").on(t.status),
    dateIdx: index("goods_received_notes_date_idx").on(t.date),
    billIdx: index("goods_received_notes_matched_bill_idx").on(t.matchedBillId),
    deletedIdx: index("goods_received_notes_deleted_at_idx").on(t.deletedAt),
  }),
);
