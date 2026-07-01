# ERP PostgreSQL / ORM Audit Report

Date: 2026-06-12  
Scope: live PostgreSQL database in Docker plus backend ORM schema under `server/src/db/schema/*`.

Important finding: this repository does not contain a Prisma schema (`schema.prisma`). The active ORM is Drizzle (`server/drizzle.config.ts`, `server/src/db/schema/*`). The audit below reviews the real PostgreSQL structure and Drizzle schema. Prisma-specific recommendations are included as migration guidance if the project later moves to Prisma.

## Executive Summary

Schema health score: 72 / 100

The ERP database is functional and covers many modules: auth, HR, attendance, payroll, projects, project documents, drawings, RFIs, authority submittals, tasks, finance, CRM, contractor portal, files, notifications, and audit log.

The main architectural weakness is that several ERP submodules are stored in generic JSONB tables (`project_items`, `finance_items`) instead of first-class relational tables. That gives flexibility and fast delivery, but weakens foreign keys, unique constraints, reporting, query performance, and long-term auditability.

Live database snapshot:

- Tables: 66
- Indexes: 186
- Foreign keys: 87
- Unique constraints: 12
- RLS enabled: 63 / 66 tables
- RLS missing: `finance_items`, `project_items`, `task_messages`
- UUID-looking columns without FK: 22
- Foreign keys without a directly matching supporting index: 27
- Tables with full audit columns (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`): 0

## Critical Issues

1. No Prisma schema exists

The user request references Prisma, but the repo is Drizzle-based. There is no `schema.prisma`. If Prisma is required, create a generated Prisma schema from the live database with `prisma db pull`, then normalize naming and relation definitions.

2. Generic JSONB tables weaken ERP integrity

`project_items` stores meetings, design deliverables, transmittals, quality, HSE, inspections, and other project subrecords. `finance_items` stores cheques, recurring expenses, utility bills, insurance, subscriptions, government fees, budgets, WPS runs, departments, etc.

Risk:

- No per-kind required fields.
- No per-kind foreign keys.
- No per-kind unique constraints.
- Hard to report at enterprise scale.
- Hard to enforce workflow status rules.
- High risk of silent data shape drift.

Recommendation:

- Keep JSONB as extension metadata only.
- Promote high-value entities into real tables:
  - `project_deliverables`
  - `project_meetings`
  - `transmittals`
  - `quality_ncrs`
  - `inspection_requests`
  - `hse_incidents`
  - `wps_runs`
  - `cheques`
  - `recurring_expenses`
  - `finance_departments`
  - `budgets`

3. RLS is disabled on important generic tables

RLS is disabled on:

- `project_items`
- `finance_items`
- `task_messages`

These tables contain cross-module business data and should not be globally readable/writable.

Recommendation:

- Enable RLS on all three.
- Scope `project_items` by project membership, project role, and director access.
- Scope `finance_items` by finance permissions and office/company.
- Scope `task_messages` by task participant, project membership, and director access.

4. File/document relation integrity is incomplete

Many document/file columns do not reference `files.id`:

- `employee_documents.file_id`
- `training_records.certificate_file_id`
- `letters_issued.file_id`
- `payslips.file_id`
- `project_documents.file_store_id`
- `task_messages.file_store_id`
- `submittal_messages.attachment_file_id`
- `petty_cash_vouchers.receipt_file_id`
- finance attachment columns

Risk:

- Orphan file references.
- Deleted files can leave broken document links.
- Security ACL and document ownership can drift.

Recommendation:

- Add nullable FKs to `files(id)` with `ON DELETE SET NULL`.
- Add indexes on all file reference columns.

## High Priority Issues

1. Missing audit ownership fields

Most tables have `created_at`; fewer have `updated_at`; none consistently have:

- `created_by_user_id`
- `updated_by_user_id`
- `deleted_at`
- `deleted_by_user_id`

Recommendation:

- Add standard audit columns to all business tables.
- Use `deleted_at` soft delete on master and workflow tables.
- Keep hard delete only for link tables or ephemeral auth tokens.

2. Missing multi-company model

The schema supports `office` and some currency fields, but not true multi-company.

Missing:

- `companies`
- `branches`
- `departments` as relational master data
- `cost_centers`
- `legal_entities`
- `company_id` on almost all business tables
- company-scoped unique keys, e.g. `(company_id, code)`

Risk:

- Expansion from one company to multiple legal entities will require large migrations.
- Current globally unique `code` values will become a blocker.

3. Unindexed foreign keys

27 FK columns do not have a directly matching supporting index, including:

- `ap_bills.approver_user_id`
- `attendance_punches.override_by_user_id`
- `files.uploaded_by_user_id`
- `journal_entries.posted_by_user_id`
- `leave_requests.approved_by_user_id`
- `project_documents.uploaded_by_user_id`
- `project_risks.owner_user_id`
- `project_risks.raised_by_user_id`
- `projects.design_lead_user_id`
- `stage_gate_approvals.requester_user_id`
- `submittals.contractor_user_id`
- `submittals.response_by_user_id`
- `task_messages.user_id`
- `timesheets.approved_by_user_id`

Recommendation:

- Add indexes for FK columns used in joins, filters, approvals, and audit views.
- For low-cardinality or rarely filtered references, confirm with query plans before indexing.

4. UUID columns without FKs

22 UUID columns are not constrained. Important examples:

- `users.employee_id`
- `employees.manager_employee_id`
- `employees.assigned_project_id`
- `employee_documents.file_id`
- `project_items.project_id`
- `doc_folders.parent_id`
- `journal_entries.reversal_of`
- `leave_handovers.task_id`
- `ar_receipts.bank_account_id`
- `supplier_payments.bank_account_id`

Recommendation:

- Add FKs where the referenced entity is known.
- For polymorphic fields (`files.scope_id`) keep as text/uuid plus strict application validation or create typed relation tables.

5. Missing unique composite constraints

Recommended constraints:

- `project_stages(project_id, sub_stage_code)` unique
- `stage_gate_approvals(project_id, stage_code, gate_code)` unique
- `drawings(project_id, drawing_number)` unique
- `rfis(project_id, reference)` unique
- `authority_submittals(project_id, order)` or `(project_id, name)` depending business rule
- `payslips(payroll_run_id, employee_id)` unique
- `payroll_runs(office, period_year, period_month)` unique
- `leave_requests(employee_id, from_date, to_date, type)` partial/conditional duplicate prevention
- `contractor_users(company_id, email)` unique
- `submittal_revisions(submittal_id, revision)` unique
- `timesheets(user_id, week_start_date)` unique

## Medium Priority Issues

1. HR coverage is good but not complete

Covered:

- Employees
- Compensation
- Bank details
- Dependents
- Employee documents
- Leave requests and balances
- Training
- Asset assignment
- Disciplinary
- Performance reviews
- Onboarding
- Payroll runs
- Payslips
- Letters

Missing or weak:

- Gratuity table and provisions/accruals
- Employee contract version history
- Salary revision history
- Employee document versioning
- Certificate request workflow as first-class entity
- Leave delegation/approval workflow history
- End-of-service settlement
- HR organization units as relational tables
- Job grades, positions, designations, cost centers
- Time policy/calendars/shift schedules

2. Project module coverage is good but mixed

Covered:

- Projects
- Project team members
- Project stages
- Stage gate approvals
- Authority submittals
- Risks
- Documents and folders
- Drawings
- RFIs
- Tasks
- Timesheets
- Contractor submittals

Missing or weak:

- Project phases as normalized master/reference records
- WBS / schedule activities
- Deliverables as first-class relational rows
- Meeting minutes as first-class rows
- Transmittals as first-class rows
- Variation orders / claims
- Project budget lines / forecast / cost-to-complete
- Project resource plan
- Client approvals as distinct records with attachments
- Lessons learned has app support, but should be checked for full backend relational coverage

3. Finance coverage is partial enterprise grade

Covered:

- COA
- Customers/suppliers
- AR invoices/receipts
- AP bills/payments
- Journals
- VAT
- Bank accounts/transactions
- Petty cash
- Fixed assets

Weak:

- Journal lines stored as JSONB instead of `journal_entry_lines`
- AR/AP lines stored as JSONB
- Receipt invoice allocation stored as JSONB IDs
- Supplier payment bill allocation stored as JSONB IDs
- No enforced double-entry balance constraint
- No period close table
- No fiscal year/period table
- No exchange-rate table
- No tax codes table
- No dimensions table for department/project/cost center

4. Attachments are supported but not fully normalized

The `files` table and `file_acl` are good foundations. However, many module tables reference file IDs without FK constraints. Some entities store arrays of file IDs in JSONB, which prevents referential integrity.

Recommendation:

- Create `entity_files` table:
  - `file_id`
  - `entity_type`
  - `entity_id`
  - `category`
  - `version`
  - `is_primary`
  - `created_by_user_id`
- Use typed bridge tables for critical modules, e.g. `employee_document_files`, `project_document_files`.

## Low Priority Issues

1. Some fields use free text where enums/master tables would help

Examples:

- employee `gender`, `marital_status`, `department`, `work_location`
- project `type`, `authority`, `client`, `office`
- contractor `type`, submittal `type`, `discipline`
- finance `status` fields in generic or non-enum tables

2. Naming is mixed

Drizzle models are camelCase, columns are snake_case. That is acceptable. However some domains mix `fileId`, `fileStoreId`, `attachmentFileId`, `attachmentFileIds`, and free-form `entityId`.

3. Numeric money fields are mostly good

Money fields use `numeric`, which is correct. Some frontend types assume fixed currencies while database stores text. Consider `currency` reference table.

## Missing ERP Components

Enterprise-wide:

- Companies/legal entities
- Branches/offices as table with FK
- Departments table
- Cost centers
- Currency and exchange rates
- Fiscal periods
- Approval workflow engine
- Notification delivery log
- Soft-delete framework
- Data retention/archive jobs

HR:

- Gratuity/EOS settlement
- Salary revision history
- Contract version history
- Certificate request workflow
- Shift/roster calendar
- Attendance policy and exceptions
- Recruitment/candidate module

Projects:

- WBS/schedule activities
- Project budget and cost forecast
- Deliverable register as relational table
- Meeting minutes as relational table
- Transmittal register as relational table
- Client approval register
- Change/variation/claims register

Finance/procurement:

- Purchase orders/LPOs
- GRNs
- Procurement requisitions
- Inventory/material register
- Journal lines as relational table
- AR/AP invoice lines as relational tables
- Bank reconciliation sessions
- Period close controls

Security/admin:

- Role-permission tables
- User-company membership
- Login/session audit beyond refresh tokens
- MFA/2FA tables
- API key/service account table

## Data Integrity Review

Strengths:

- Most core entities use UUID primary keys.
- Many core relations have FKs with sensible cascade/set-null behavior.
- Enum usage is strong for roles, task status, leave status, finance status, project stage, etc.
- Audit log is append-only through RLS/trigger.
- RLS is enabled on most tables.

Risks:

- Some cascading deletes may be too aggressive for enterprise history:
  - Deleting employee cascades leave, documents, payslips, training, disciplinary, reviews.
  - Deleting project cascades documents, drawings, risks, stages, team, tasks.
- For ERP systems, prefer soft delete or status transitions over hard cascade on master data.
- Financial and payroll records should normally be restrict/delete-protected after posting/approval.
- JSONB ID arrays have no referential integrity.
- No database-level checks for dates (`to_date >= from_date`), positive amounts, valid percentages, or balanced journals.

Recommended check constraints:

- `leave_requests.to_date >= leave_requests.from_date`
- `leave_requests.days >= 0`
- `projects.progress between 0 and 100`
- `ar_invoices.total >= 0`
- `ar_invoices.balance >= 0`
- `ap_bills.total >= 0`
- `payslips.gross >= 0 and payslips.net >= 0`
- `attendance_punches.accuracy_m >= 0`
- `geofences.radius_m > 0`
- `stage_gate_approvals.stage_code/gate_code` constrained to known stage/gate codes

## Scalability Review

100 users:

- Current schema is acceptable.
- Main risk is application-level N+1 queries and JSONB filtering.

500 users:

- Add missing FK indexes.
- Add composite indexes for dashboards and workflow queues.
- Add archive strategy for audit and location tracking.

1,000 users:

- Partition high-volume tables:
  - `location_pings`
  - `attendance_punches`
  - `audit_log`
  - `task_messages`
  - `submittal_messages`
- Move heavy file storage to S3/object storage if not already.
- Add background jobs for rollups and reporting tables.

5,000 users:

- Add tenant/company partitioning or strict company_id indexing.
- Add read replicas for reporting.
- Use queue-backed audit and notification writes.
- Create materialized/reporting views for dashboards.
- Add observability for slow queries and index bloat.

High-growth tables:

- `location_pings`: needs monthly partitioning.
- `attendance_punches`: index by `(employee_id, timestamp desc)` and consider partitioning by month.
- `audit_log`: partition by month or quarter.
- `files`: monitor storage size and orphan files.
- `project_items`/`finance_items`: should not become dumping grounds for high-volume ERP records.

## PostgreSQL Optimization Recommendations

Add or consider:

```sql
create index concurrently if not exists project_items_kind_project_idx
  on project_items(kind, project_id);

create index concurrently if not exists finance_items_kind_created_idx
  on finance_items(kind, created_at desc);

create index concurrently if not exists audit_log_entity_at_idx
  on audit_log(entity_type, entity_id, at desc);

create index concurrently if not exists attendance_punches_employee_ts_desc_idx
  on attendance_punches(employee_id, timestamp desc);

create index concurrently if not exists location_pings_employee_ts_desc_idx
  on location_pings(employee_id, timestamp desc);

create unique index concurrently if not exists project_stages_project_code_uq
  on project_stages(project_id, sub_stage_code);

create unique index concurrently if not exists stage_gate_project_stage_gate_uq
  on stage_gate_approvals(project_id, stage_code, gate_code);

create unique index concurrently if not exists payslips_run_employee_uq
  on payslips(payroll_run_id, employee_id);

create unique index concurrently if not exists payroll_runs_period_uq
  on payroll_runs(office, period_year, period_month);
```

For JSONB queries, add GIN indexes only where queries actually filter by JSON paths. Do not blanket-index every JSONB column.

## Prisma Best Practices Review

Current state:

- No Prisma schema exists.
- The project uses Drizzle.

If migrating to Prisma:

- Generate baseline with `prisma db pull`.
- Preserve snake_case columns using `@map` and `@@map`.
- Define all relations explicitly.
- Replace generic JSONB entities with first-class Prisma models where business-critical.
- Add `@@index` for all FK filter paths.
- Add `@@unique` for composite business keys.
- Avoid implicit many-to-many for audited join tables; use explicit join models such as `ProjectTeamMember`.
- Use enums for stable statuses, but master tables for user-configurable values like departments, authorities, disciplines, cost centers.

N+1 risks:

- Project dashboard loading projects, team, risks, tasks, documents, and approvals separately.
- Employee profile loading documents, compensation, bank, dependents, leaves, payroll.
- Finance dashboard aggregating JSONB invoice/journal lines.

Mitigation:

- Use select/include carefully.
- Add summary endpoints.
- Add denormalized dashboard views/materialized views.

## Security Review

Strengths:

- User roles exist.
- Extra permissions exist.
- Refresh token tracking exists.
- Password reset table exists.
- Audit log exists and is append-only.
- RLS is broadly enabled.
- File ACL foundation exists.

Gaps:

- No normalized role/permission tables.
- No `created_by`, `updated_by`, `deleted_by` columns.
- No soft-delete framework.
- RLS missing on 3 tables.
- No MFA tables.
- No session/device table beyond refresh tokens.
- No company/tenant isolation.
- Some file references bypass FK/ACL integrity.

Recommended security improvements:

- Add `role_permissions`, `user_permissions`, `user_company_roles`.
- Add `sessions` table with device, IP, user agent, revoked reason.
- Add MFA tables.
- Add full audit ownership fields to critical tables.
- Enable and test RLS for every business table.
- Add file ownership bridge table and enforce ACL at DB level where possible.

## Multi-Company Readiness

Current readiness: low to medium.

The schema supports office (`dubai`, `cairo`) and multi-currency text fields. It does not support true multi-company/multi-legal-entity operation.

Required model additions:

- `companies`
- `branches`
- `departments`
- `cost_centers`
- `currencies`
- `exchange_rates`
- `fiscal_years`
- `fiscal_periods`
- `user_company_roles`

Recommended pattern:

- Add `company_id` to users, employees, projects, customers, suppliers, finance, HR workflow, files, audit, and project tables.
- Change global unique keys to composite company-scoped keys:
  - `employees(company_id, code)`
  - `projects(company_id, code)`
  - `customers(company_id, code)`
  - `suppliers(company_id, code)`
  - `coa_accounts(company_id, code)`

## File Storage and Documents

Covered:

- Generic `files` table
- File ACL table
- Employee documents
- Project folders/documents
- Payslip files
- Letter files
- Training certificates
- Finance attachments
- Submittal/message attachments

Missing/weak:

- Contract document versions
- Passport/visa/EID history beyond current top-level fields and employee document rows
- File FK constraints
- Document versioning model
- Entity-file bridge table
- Retention policies enforced by DB/jobs
- File virus scan/status metadata

## Final Priority Plan

Phase 1 - Integrity and security hardening:

1. Enable RLS on `project_items`, `finance_items`, `task_messages`.
2. Add FKs for file IDs and obvious UUID references.
3. Add missing indexes for high-use FK columns.
4. Add composite unique keys for payroll, project stages, drawings, RFIs, approvals.
5. Add check constraints for dates, amounts, percentages.

Phase 2 - Enterprise auditability:

1. Add `created_by_user_id`, `updated_by_user_id`, `deleted_at`, `deleted_by_user_id`.
2. Make master data soft-deletable.
3. Restrict hard deletes for finance/payroll/project records.
4. Add audit triggers or middleware guarantees for all critical mutations.

Phase 3 - Normalize high-value JSONB:

1. Split `project_items` into first-class tables.
2. Split `finance_items` into first-class tables.
3. Replace JSONB ID arrays with relation tables.
4. Add reporting views/materialized views.

Phase 4 - Multi-company foundation:

1. Add company/branch/department/cost center.
2. Backfill company IDs.
3. Convert unique constraints to company-scoped composites.
4. Update RLS by company and role.

Overall conclusion: the database is a strong prototype-to-production foundation, but it is not yet a fully enterprise-hardened ERP schema. It can support the current small team and likely hundreds of users with moderate data volume, but before scaling to 1,000-5,000 users or multiple companies, the generic JSONB tables, missing audit ownership fields, missing soft delete, and multi-company gaps should be fixed.
