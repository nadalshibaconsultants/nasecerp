# NASEC ERP — Database & Schema Audit Report
**Audited:** 12 June 2026 · Live PostgreSQL 16 (66 tables, 176 indexes) + ORM schema
**Important note:** this ERP uses **Drizzle ORM**, not Prisma. All Prisma-specific review points were applied to their Drizzle equivalents (`pgTable` definitions in `server/src/db/schema/`), which serve the same role.

---

## Schema Health Score: **78 / 100**

| Area | Score | Notes |
|---|---|---|
| Structure & relations | 8/10 | All 66 tables have PKs; 87 FKs; no circular dependencies; 2 generic JSONB tables trade integrity for flexibility |
| Module coverage | 8/10 | All core modules present; procurement & expense claims are client-side only |
| Data integrity | 7/10 | Strong uniques on business keys; journal reference not unique; some risky CASCADEs |
| Scalability | 8/10 | Growth tables well-indexed; 35 unindexed FK columns; fine to 1,000+ users |
| Security | 8/10 | RLS on 63 tables, RBAC + per-user grants, full audit log; no soft delete, no row blame |
| Auditability | 6/10 | audit_log captures actor+before/after; but created_by/updated_by/deleted_at absent on rows |
| Multi-company | 5/10 | Multi-branch (office) + multi-currency yes; no company entity |
| ORM best practices | 8/10 | Consistent naming, enums, composite indexes; JSONB arrays lack GIN indexes |

---

## 1. Database Structure Validation

**Verified healthy:**
- 66 base tables, **every table has a primary key** (UUID v4 defaults).
- 87 foreign keys; no circular dependencies; no duplicate/redundant entities found.
- 176 indexes including correct composite indexes on hot paths: `attendance_punches(employee_id, timestamp)`, `notifications(user_id, read_at)`, `task_timer_sessions(user_id, ended_at)`, `leave_requests(from_date, to_date)`, `submittals(sla_deadline)`.
- Migration discipline: Drizzle versioned migrations + idempotent boot patches + RLS application.

**Issues found:**

| # | Severity | Finding |
|---|---|---|
| S1 | HIGH | **35 FK columns without an index** — most are `*_by_user_id` audit references (low risk), but `attendance_punches.project_id`, `attendance_punches.geofence_id`, `ar_invoices.project_id`, `ar_receipts.customer_id`, `supplier_payments.supplier_id`, `tasks.reporter_user_id` are actively filtered/joined in queries and will degrade as data grows. |
| S2 | HIGH | `journal_entries.reference` has **no unique constraint** — duplicate journal references possible (financial reporting integrity). The auto-journal engine dedupes by (source, source_ref_id) but that pair also has **no unique index** — protection is application-level only. |
| S3 | MEDIUM | `payslips` lacks unique `(payroll_run_id, employee_id)` — duplicate payslips per run are possible at DB level. |
| S4 | MEDIUM | `project_items` / `finance_items` are generic JSONB buckets (23 rows today). Flexible by design, but: no FK integrity inside `data`, no per-kind validation, and **no GIN index on `data`** for containment queries. |
| S5 | MEDIUM | `tasks.assignee_user_ids` JSONB array is queried with `@>` containment but has **no GIN index**, and member UUIDs have no FK integrity. |
| S6 | LOW | Timestamp naming inconsistency: `audit_log.at`, `files.uploaded_at` vs `created_at` elsewhere. |

## 2. ERP Module Coverage

**Fully represented in the database:** HR (employees, compensation, bank details, documents, dependents, leave + balances + handovers, payroll runs + payslips, letters, training, assets, disciplinary, reviews, onboarding) · Attendance (geofences, punches, location pings, daily rollups) · Projects (projects, stages, team members, risks, documents, doc folders, drawings, RFIs, stage-gate approvals, authority submittals) · Tasks (tasks, messages, timer sessions, timesheets) · CRM (leads, activities, conversions) · Finance (COA, journals, customers, AR invoices/receipts, suppliers, AP bills/payments, banks, transactions, VAT returns, petty cash, fixed assets + generic finance items) · Contractor portal (companies, users, submittals, revisions, messages) · Documents/files (+ unused `file_acl`) · Notifications · Auth (users, refresh tokens, password resets) · Audit log · Office config.

**Missing entities:**

| Module | Missing | Severity |
|---|---|---|
| Procurement | `purchase_requests`, `rfqs`, `purchase_orders`, `grns` — LPO/GRN exist only as client-side seed collections, not server tables | HIGH (committed-cost accounting depends on POs) |
| Finance | `expense_claims` (employee claim → approval → reimbursement) | MEDIUM |
| Multi-company | `companies` entity (see §6) | MEDIUM |
| Inventory | Not present — acceptable for a consultancy (non-stock business) | LOW |
| Project phases | Covered via `project_stages` + the stage/gate model — adequate | — |

## 3. Data Integrity Review

- **Delete rules:** 47 CASCADE / 35 SET NULL / 5 RESTRICT. ⚠️ Risk: deleting an `employee` cascades into punches, leaves, **payslips** — i.e., deleting a person erases payroll history (financial records should never cascade). Recommend RESTRICT on `payslips.employee_id`, `letters_issued.employee_id`, and AR/AP references; `submittals.contractor_company_id` already correctly RESTRICTs.
- **Unique business keys present:** users.email, employees.code+email, projects.code, ar_invoices.number, ap_bills.internal_ref, suppliers/customers/coa/bank/fixed-asset codes, submittals.ref. **Missing:** journal_entries.reference (S2), payslips composite (S3).
- **Composite PK** on `leave_balances (employee_id, leave_type, year)` — correct.
- Money columns consistently `numeric(16,2)`, FX as `numeric(6,4)` — correct for IFRS-grade arithmetic (no floats).
- Enums used for all state machines (15 pg enums: statuses, types, roles) — prevents invalid states.

## 4. Enterprise Scalability Review

**Verdict: comfortably supports 100–1,000 users; 5,000 users needs the items below.**

- Hot growth tables are already indexed (punches, audit, pings, sessions, notifications — verified above).
- **At 5,000 users / multi-year data:** partition `attendance_punches`, `location_pings`, and `audit_log` by month (pg native partitioning); add retention jobs (pings 90d, audit archive yearly).
- Fix S1 unindexed FKs before they matter (cheap now).
- `files` stores bytes on disk/S3 with only metadata in PG — correct; SHA-256 dedupe index present.
- Several list endpoints load whole tables and filter in JS (e.g., budget-control scans all bills) — fine at current volume; move filters into SQL `WHERE` as data grows.
- N+1 risks (the Drizzle equivalent of the Prisma concern): employee list does batched lookups (good); contractor `companyNameMap()` per request is a candidate for caching.

## 5. Security Review

**Present and verified:** role-based access (10 roles + per-user `extra_permissions`) · **Row-Level Security enabled on 63/66 tables** with per-request context (`app.user_id/role/office`) · full `audit_log` with actor, action, before/after snapshots · session tracking via rotating `refresh_tokens` (+ nightly cleanup job) · password resets table · bcrypt hashing · rate limiting · helmet.

**Gaps:**

| # | Severity | Gap |
|---|---|---|
| SEC1 | MEDIUM | **No soft delete** anywhere (only `project_team_members.removed_at`). Hard deletes lose rows; audit_log keeps a JSON snapshot but not a restorable record. Add `deleted_at/deleted_by` to: employees, projects, tasks, invoices, bills, journal entries. |
| SEC2 | MEDIUM | No `created_by/updated_by` columns on rows (blame requires digging through audit_log). |
| SEC3 | LOW | `file_acl` table exists but is unused (0 rows; ACL enforced in route code instead) — either wire it or drop it. |
| SEC4 | LOW | MFA: client has a TwoFactorSetup component, but there are no server-side MFA secret/recovery tables — MFA is not actually enforced. |

## 6. Multi-Company Readiness

- **Multi-branch: YES** — `office` text column ("dubai"/"cairo") on employees, projects, invoices, journals, payroll + `office_config` (currency, working week, leave rules) + RLS office context.
- **Multi-currency: YES** — currency + fx_rate columns on all money documents; AED/EGP active.
- **Multi-department: PARTIAL** — employee.department is free text; finance departments live in `finance_items` (kind=department) with no FK.
- **Multi-company: NO** — no `companies` table; everything assumes one legal entity. To support it: add `companies(id, name, trn, base_currency, country)`, replace `office` text with FK to a `branches` table carrying `company_id`, and add `company_id` to financial documents + RLS policies.
- **Multi-country: PARTIAL** — UAE/Egypt rules are hardcoded per office; a config-driven country table would generalize it.

## 7. ORM (Drizzle) Best Practices

- Naming: consistent camelCase models / snake_case columns ✅; enums for all states ✅; relations declared with explicit `references()` ✅; many-to-many done via join tables (`project_team_members`) or JSONB array (tasks — see S5) ⚠️.
- Composite indexes declared in schema and present in DB ✅.
- Under-normalization (intentional): journal `lines`, invoice `lines`, payroll `totals`, submittal `watchers` as JSONB — acceptable document-style modelling for line items; do not FK-join into them.
- Over-normalization: none observed.

## 8. File Storage & Documents

- Central `files` table (mime, size, sha256, scope, entity_type/entity_id, uploader) with bytes on local disk or S3 ✅.
- Employee documents: dedicated `employee_documents` register (passport/EID/visa/labour card types + expiry dates) **plus** file attachments per section (contract / id-visa / bank-family categories) ✅ with HR-only write enforcement.
- Project documents, contractor submittal attachments, payroll/letter PDFs (server-generated), client docs (via customers), vendor docs (suppliers have trade-licence fields; file linkage works via entity_type) ✅.
- Gap: `employee_documents.file_id` is a bare UUID without FK to `files` (LOW).

## 9. Audit Trail Review

| Field | Coverage |
|---|---|
| created_at | 49/66 tables (17 use other names or none — rollups, config, pings) |
| updated_at | **23/66** — missing on 43 tables (most are append-only, but customers, suppliers, bank_accounts, leave_requests, payroll_runs should have it) |
| created_by / updated_by | **0 tables** (compensated by audit_log actor) |
| deleted_at / deleted_by | **0 tables** (see SEC1) |
| Central audit log | ✅ actor, action, entity, before/after JSON, indexed by time/actor/entity |

## 10. Prioritized Action Plan

**Critical (do first):**
1. Unique index on `journal_entries(reference)` and on `journal_entries(source, source_ref_id)` — protects financial ledger integrity (S2).
2. Change CASCADE → RESTRICT for payroll/financial children of `employees` (payslips, letters) — prevents payroll history loss.

**High:**
3. Add the ~10 actively-queried FK indexes (punches.project_id/geofence_id, ar_invoices.project_id, ar_receipts.customer_id, supplier_payments.supplier_id, tasks.reporter_user_id, …).
4. Unique `(payroll_run_id, employee_id)` on payslips.
5. Server-side procurement tables (PR → PO → GRN) so committed-cost accounting is DB-backed.

**Medium:**
6. Soft delete (`deleted_at/deleted_by`) on the 8 core entities; filter in list queries.
7. `created_by/updated_by` on financially material tables.
8. GIN indexes: `tasks USING gin(assignee_user_ids)`, `project_items USING gin(data)`.
9. `companies`/`branches` entities if multi-company is on the roadmap.
10. Expense claims module.

**Low:**
11. updated_at on mutable master-data tables; standardize timestamp names; wire or drop `file_acl`; FK `employee_documents.file_id → files.id`; partitioning + retention policies when row counts reach millions.
