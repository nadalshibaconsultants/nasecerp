# NASEC ERP — Real Backend Development Plan

**Stack chosen:** Node.js + Express + TypeScript + PostgreSQL + Drizzle ORM
**Auth:** Email + password (bcrypt) + JWT (access + refresh)
**Authorization:** Strict per-row enforcement — API middleware + Postgres RLS (defense-in-depth)
**Sequencing:** Full schema & scaffolding first → modules implemented end-to-end one at a time (HR → Projects → Tasks → Attendance → CRM → Finance → Documents → Contractor)

---

## 1. Repository Layout (target)

```
nasec-deploy-v34b/
├── client/                          # existing React SPA (kept)
├── server/
│   ├── src/
│   │   ├── index.ts                 # Express bootstrap
│   │   ├── env.ts                   # zod-validated env vars
│   │   ├── db/
│   │   │   ├── client.ts            # pg pool + Drizzle
│   │   │   ├── schema/              # one file per domain
│   │   │   │   ├── auth.ts
│   │   │   │   ├── hr.ts
│   │   │   │   ├── projects.ts
│   │   │   │   ├── tasks.ts
│   │   │   │   ├── attendance.ts
│   │   │   │   ├── crm.ts
│   │   │   │   ├── finance.ts
│   │   │   │   ├── documents.ts
│   │   │   │   ├── contractor.ts
│   │   │   │   └── audit.ts
│   │   │   ├── migrations/          # drizzle-kit generated
│   │   │   └── rls.sql              # row-level security policies
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT verify, attach req.user
│   │   │   ├── rbac.ts              # requirePerm("hr:write") etc.
│   │   │   ├── rls-context.ts       # SET LOCAL app.user_id, app.role per request
│   │   │   ├── audit.ts             # write to audit_log
│   │   │   ├── errors.ts            # uniform error responses
│   │   │   └── rate-limit.ts
│   │   ├── modules/                 # feature modules — same shape
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.schema.ts   # zod request/response
│   │   │   ├── hr/
│   │   │   │   ├── employees.routes.ts
│   │   │   │   ├── leaves.routes.ts
│   │   │   │   ├── payroll.routes.ts
│   │   │   │   ├── letters.routes.ts
│   │   │   │   ├── training.routes.ts
│   │   │   │   ├── assets.routes.ts
│   │   │   │   ├── disciplinary.routes.ts
│   │   │   │   ├── reviews.routes.ts
│   │   │   │   └── onboarding.routes.ts
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   ├── attendance/
│   │   │   ├── crm/
│   │   │   ├── finance/
│   │   │   ├── documents/
│   │   │   └── contractor/
│   │   ├── jobs/                    # cron / background
│   │   │   ├── document-expiry.ts
│   │   │   ├── leave-accrual.ts
│   │   │   ├── attendance-rollup.ts
│   │   │   └── sla-timers.ts
│   │   ├── lib/
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts          # bcrypt
│   │   │   ├── storage.ts           # local FS or S3-compatible
│   │   │   ├── mailer.ts            # nodemailer / Resend
│   │   │   ├── pdf.ts               # letters/payslips
│   │   │   └── permissions.ts       # role→perm map (shared with FE)
│   │   └── seed/                    # dev seed scripts
│   ├── drizzle.config.ts
│   ├── tsconfig.json
│   └── package.json
├── shared/
│   └── api-types.ts                 # types shared between server & client
└── docker-compose.yml               # add postgres service
```

---

## 2. Database Schema — Tables (Drizzle/Postgres)

### 2.1 Auth & Identity
- `users` (id uuid pk, email unique, password_hash, role enum, office enum, status, employee_id fk nullable, last_login_at, created_at, updated_at)
- `refresh_tokens` (id, user_id fk, token_hash, expires_at, revoked_at, user_agent, ip)
- `password_resets` (id, user_id, token_hash, expires_at, used_at)
- `sessions` (optional — for active-session tracking)

### 2.2 HR (16 tables)
- `employees` (id, code unique, first_name, last_name, arabic_name, gender, dob, nationality, marital_status, email, phone, emergency_contact jsonb, home_address jsonb, photo_url, office enum, job_title, department, manager_employee_id fk self, status enum, contract_type enum, hired_at, terminated_at)
- `employee_compensation` (employee_id fk pk, basic, housing, transport, food, other, currency, effective_from, effective_to)
- `employee_bank_details` (employee_id fk pk, iban, account_no, swift, bank_name)
- `employee_documents` (id, employee_id fk, type enum [passport|emirates-id|visa|labour-card|other], number, issue_date, expiry_date, file_id fk nullable, status)
- `dependents` (id, employee_id fk, relation enum, name, dob, nationality, visa_sponsor, visa_expiry)
- `leave_balances` (employee_id fk, leave_type enum, year, entitlement, accrued, used, balance)
- `leave_requests` (id, employee_id fk, type enum, start_date, end_date, days, status enum, reason, manager_user_id fk, manager_decided_at, hr_user_id, hr_decided_at, handover_assignee_employee_id fk nullable)
- `leave_handovers` (id, leave_request_id fk, task_id fk, cover_user_id fk, status)
- `training_records` (id, employee_id fk, category enum, name, provider, issue_date, expiry_date, cost, currency, certificate_file_id)
- `asset_assignments` (id, employee_id fk, type enum, identifier, assigned_at, returned_at, condition, notes)
- `disciplinary_actions` (id, employee_id fk, level enum, reason, issued_by_user_id fk, issued_at, expires_at, file_id)
- `performance_reviews` (id, employee_id fk, period_start, period_end, reviewer_user_id fk, scores jsonb, comments, status)
- `onboarding_checklists` (id, employee_id fk, step enum, status, completed_at, completed_by_user_id, notes)
- `payroll_runs` (id, office, period_year, period_month, status, run_by_user_id, run_at, totals jsonb)
- `payslips` (id, payroll_run_id fk, employee_id fk, gross, deductions jsonb, net, currency, file_id)
- `letters_issued` (id, employee_id fk, type enum [noc|salary-cert|experience|contract|termination|other], issued_at, issued_by_user_id, file_id, payload jsonb)

### 2.3 Projects (10 tables)
- `projects` (id, code unique, name, stage enum, type, community, client_name, contract_value, currency, office, pm_user_id fk, design_lead_user_id fk, started_at, target_end_at, actual_end_at, progress numeric, current_sub_stage)
- `project_team_members` (project_id fk, user_id fk, role_on_project, added_at, removed_at, pk composite)
- `project_stages` (id, project_id fk, sub_stage_code [S1..S8|G1..G5|IFC|...], status, planned_start, planned_end, actual_start, actual_end, variance_reason)
- `stage_gate_approvals` (id, project_id, gate_code, approver_role, approver_user_id, status, decided_at, comments)
- `authority_submittals` (id, project_id, authority enum [DDA|DEWA|RTA|DCD|ETISALAT|DU|EMPOWER|OTHER], submission_no, submitted_at, status, returned_at, remarks, file_id)
- `project_risks` (id, project_id, category enum (19), description, inherent_prob, inherent_impact, residual_prob, residual_impact, treatment enum, status enum, owner_user_id, due_date, contingency_plan)
- `risk_actions` (id, risk_id fk, action, owner_user_id, due_date, status)
- `project_documents` (id, project_id, folder enum [authority|site|client|drawings|contracts|reports|rfis|extra], name, version, status, file_id, uploaded_by_user_id, uploaded_at)
- `drawings` (id, project_id, code, title, discipline, revision, status enum, file_id, issued_at)
- `rfis` (id, project_id, ref_no, subject, raised_by_user_id, raised_at, status, due_date, closed_at, response, file_id)

### 2.4 Tasks (3 tables)
- `tasks` (id, title, description, project_id fk nullable, status enum, priority enum, category, assignee_user_id fk, reporter_user_id fk, due_date, completed_at, created_at, updated_at)
- `task_timer_sessions` (id, task_id fk, user_id fk, started_at, ended_at, duration_seconds, note)
- `timesheets` (id, user_id fk, week_start_date, week_end_date, status, submitted_at, approved_by_user_id, approved_at, hours jsonb)

### 2.5 Attendance (3 tables)
- `geofences` (id, project_id fk, name, latitude, longitude, radius_m, site_name, active)
- `attendance_punches` (id, employee_id fk, geofence_id fk nullable, project_id nullable, type enum [in|out], timestamp, source enum [mobile|simulator|manual], latitude, longitude, accuracy_m, override_by_user_id nullable, override_reason)
- `location_pings` (id, employee_id fk, latitude, longitude, accuracy_m, timestamp) — *partitioned by month*

### 2.6 CRM (3 tables)
- `leads` (id, name, company, contact_person, email, phone, source, stage enum, estimated_value, currency, probability, expected_close, owner_user_id fk, created_at)
- `lead_activities` (id, lead_id fk, type enum [call|email|meeting|note], subject, body, occurred_at, by_user_id)
- `lead_conversions` (id, lead_id fk, project_id fk, converted_at, by_user_id)

### 2.7 Finance (10 tables)
- `coa_accounts` (id, code unique, name, type enum, parent_id fk self, office, active)
- `invoices` (id, type enum [ar|ap], number, project_id fk nullable, client_or_vendor, issue_date, due_date, currency, subtotal, tax, total, status, file_id)
- `invoice_lines` (id, invoice_id fk, description, qty, unit_price, tax_rate, amount)
- `journal_entries` (id, date, ref, memo, posted, posted_by_user_id, posted_at)
- `journal_lines` (id, journal_id fk, account_id fk, debit, credit, project_id nullable)
- `vat_returns` (id, office, period_year, period_quarter, output_tax, input_tax, net_due, status, filed_at, filed_by_user_id)
- `bank_accounts` (id, office, bank_name, account_no, iban, currency, balance, active)
- `petty_cash` (id, office, balance, custodian_user_id)
- `petty_cash_txns` (id, petty_cash_id fk, date, type enum [in|out], amount, description, by_user_id, file_id)
- `fixed_assets` (id, name, category, acquired_at, cost, depreciation_method, useful_life_months, current_value, status, location)

### 2.8 Documents (2 tables)
- `files` (id uuid, original_name, mime, size_bytes, storage_path, sha256, uploaded_by_user_id, uploaded_at, scope enum [hr|project|finance|crm|letter|contractor|other], scope_id uuid nullable)
- `file_acl` (file_id fk, principal_type enum [role|user|project|employee], principal_id, permission enum [read|write|delete])

### 2.9 Contractor Portal (5 tables)
- `contractor_companies` (id, name, trade_license, contact_person, email, phone, active)
- `contractor_users` (id, user_id fk, contractor_company_id fk)
- `submittals` (id, project_id fk, contractor_company_id fk, type enum, discipline, ref_no, title, submitted_at, status, due_at, sla_hours, current_revision, file_id)
- `submittal_revisions` (id, submittal_id fk, revision_no, status enum, reviewer_user_id, reviewed_at, comments, file_id)
- `submittal_messages` (id, submittal_id fk, by_user_id, body, at, file_id nullable)

### 2.10 Audit & System (3 tables)
- `audit_log` (id bigserial, at, actor_user_id, action, entity_type, entity_id, before jsonb, after jsonb, ip, user_agent) — *append-only*
- `notifications` (id, user_id fk, type, title, body, link, read_at, created_at)
- `office_config` (office pk, labour_rules jsonb, working_week jsonb, public_holidays jsonb, currency, tax_rate)

**Total: ~70 tables.**

---

## 3. Authorization Model

### 3.1 Role → Permissions
Mirror `client/src/lib/auth/permissions.ts` server-side in `server/src/lib/permissions.ts` — single source of truth shared via `shared/`.

### 3.2 Two-layer enforcement
1. **API middleware** (`rbac.ts`): `router.post("/employees", requirePerm("hr:write"), handler)`
2. **Postgres RLS**: every table has policies keyed off `current_setting('app.user_id')` and `current_setting('app.role')`, set per request in `rls-context.ts` via `SET LOCAL`.

### 3.3 Sample RLS pattern (rls.sql excerpt)
```sql
-- Employees: directors & HR see all in office; managers see direct reports; employees see self only
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_select ON employees FOR SELECT USING (
  current_setting('app.role') = 'director'
  OR (current_setting('app.role') = 'hr-manager' AND office = current_setting('app.office'))
  OR id = current_setting('app.employee_id')::uuid
  OR manager_employee_id = current_setting('app.employee_id')::uuid
);

CREATE POLICY employees_modify ON employees FOR ALL USING (
  current_setting('app.role') IN ('director', 'hr-manager')
);
```

Equivalent policies written for every table per role matrix.

---

## 4. API Surface (REST, JSON)

All routes prefixed `/api/v1`. Standard CRUD plus domain actions.

### 4.1 Auth
- `POST /auth/register` (director-only initially)
- `POST /auth/login` → `{ accessToken, refreshToken, user }`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`
- `POST /auth/change-password`

### 4.2 HR
- `GET/POST /hr/employees`, `GET/PATCH/DELETE /hr/employees/:id`
- `GET/POST /hr/employees/:id/documents`
- `GET/POST /hr/employees/:id/dependents`
- `GET/POST /hr/leaves` (filter by employee/status/period)
- `POST /hr/leaves/:id/approve` (manager)
- `POST /hr/leaves/:id/hr-approve` (HR)
- `POST /hr/leaves/:id/cancel`
- `GET /hr/leaves/balances?employee_id=`
- `GET/POST /hr/training`
- `GET/POST /hr/assets`
- `GET/POST /hr/disciplinary`
- `GET/POST /hr/reviews`
- `GET/POST /hr/onboarding`
- `POST /hr/payroll/runs` (creates run for office+month)
- `POST /hr/payroll/runs/:id/finalize`
- `GET /hr/payroll/runs/:id/payslips`
- `POST /hr/letters` → generates PDF, returns file_id
- `GET /hr/letters?employee_id=`

### 4.3 Projects
- `GET/POST /projects`, `GET/PATCH /projects/:id`
- `GET/POST /projects/:id/team`
- `GET/POST /projects/:id/stages`
- `POST /projects/:id/stages/:code/approve`
- `GET/POST /projects/:id/submittals`
- `GET/POST /projects/:id/risks`, `PATCH /risks/:id`
- `GET/POST /projects/:id/documents`
- `GET/POST /projects/:id/drawings`
- `GET/POST /projects/:id/rfis`

### 4.4 Tasks
- `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/:id`
- `POST /tasks/:id/timer/start`
- `POST /tasks/:id/timer/stop`
- `GET /tasks/:id/timer/sessions`
- `GET /timesheets?user_id=&week=`
- `POST /timesheets/submit`
- `POST /timesheets/:id/approve`

### 4.5 Attendance
- `GET/POST /attendance/geofences`
- `POST /attendance/punches` (mobile)
- `POST /attendance/punches/simulate` (browser)
- `GET /attendance/punches?employee_id=&from=&to=`
- `POST /attendance/punches/:id/override` (HR)
- `POST /attendance/locations/batch` (mobile background)

### 4.6 CRM
- `GET/POST /crm/leads`, `GET/PATCH /crm/leads/:id`
- `POST /crm/leads/:id/activities`
- `POST /crm/leads/:id/convert` → creates project

### 4.7 Finance
- `GET /finance/coa`
- `GET/POST /finance/invoices`
- `POST /finance/invoices/:id/post`
- `GET/POST /finance/journals`
- `GET/POST /finance/vat-returns`
- `GET/POST /finance/bank-accounts`
- `GET/POST /finance/petty-cash`

### 4.8 Documents / Files
- `POST /files` (multipart) → returns file_id
- `GET /files/:id` (streams; checks ACL)
- `DELETE /files/:id`

### 4.9 Contractor Portal
- `POST /contractor/auth/login` (separate subdomain or scoped)
- `GET /contractor/submittals` (own company only)
- `POST /contractor/submittals` / `POST /contractor/submittals/:id/revisions`
- `GET/POST /contractor/submittals/:id/messages`
- Internal reviewer: `POST /submittals/:id/review` (approve/reject/comment)

### 4.10 Admin
- `GET/POST /admin/users`, `PATCH /admin/users/:id` (director only)
- `GET /admin/audit-log` (paginated, filterable)
- `GET /admin/office-config`, `PATCH /admin/office-config/:office`
- `GET /admin/notifications` (own); `POST /admin/notifications/:id/read`

---

## 5. Background Jobs (node-cron in `server/src/jobs/`)

| Job | Schedule | Purpose |
|---|---|---|
| `document-expiry` | daily 03:00 | Scan employee_documents, training_records → create notifications 60/30/7 days before expiry |
| `leave-accrual` | monthly 1st 02:00 | Accrue monthly leave entitlement into leave_balances |
| `attendance-rollup` | daily 02:00 | Aggregate punches into daily hours, flag missing punches |
| `sla-timers` | every 15 min | Update submittal SLA status, escalate overdue |
| `payroll-prep` | monthly 25th | Build preliminary payroll run for HR review |
| `refresh-token-cleanup` | daily | Delete expired refresh tokens |
| `audit-archive` | monthly | Roll audit_log older than 12 months to cold storage |

---

## 6. Frontend Rewire Strategy

Goal: **keep all 43 pages untouched.** Replace only the data layer.

1. **New backend adapter**: `client/src/lib/backend/api.ts` — implements the same `Backend` interface as `local.ts` / `supabase.ts` but talks to `/api/v1/*` via fetch+JWT.
2. **Per-collection mapping**: `lib/stores.ts` currently registers 25+ KV collections. Replace each with a thin wrapper that calls the matching REST endpoints. The `useCollection(store)` hook signature stays identical, so pages don't change.
3. **TanStack Query**: add `@tanstack/react-query` for cache, optimistic updates, realtime invalidation via SSE/WebSocket.
4. **Auth**: rewrite `AuthContext` to call `/api/v1/auth/login`, store accessToken in memory + refreshToken in httpOnly cookie. Replace passwordless demo flow.
5. **File uploads**: replace base64-in-localStorage with `POST /files` → store `file_id`, render via `GET /files/:id`.
6. **Realtime** (Phase 2): WebSocket channel for tasks, attendance, contractor submittals, notifications, chat.

---

## 7. Migration of Existing Demo Data

- Write a one-time importer (`server/src/seed/from-localstorage.ts`) that:
  1. Accepts a JSON dump of the current localStorage (export button added to Settings)
  2. Maps each KV blob into the relational tables
  3. Generates default passwords for existing demo users (forced reset on first login)

---

## 8. Security Hardening

- bcrypt cost factor 12
- JWT: short-lived access (15 min) + rotating refresh (30 days, httpOnly+secure cookie)
- Helmet.js (CSP, HSTS, X-Frame-Options)
- CORS allowlist
- express-rate-limit on `/auth/*` (5/min/IP) and global (100/min/IP)
- Input validation: zod schemas on every route
- SQL injection: Drizzle parameterized only (no raw concat)
- File upload: mime allowlist, size cap (25 MB), virus scan hook (clamav optional), sha256 dedupe
- Audit log: append-only via Postgres trigger; no UPDATE/DELETE permission for app role
- Secrets: `.env` + zod-validated, never logged
- HTTPS termination at reverse proxy (nginx/caddy)

---

## 9. DevOps

**docker-compose.yml** additions:
- `postgres:16` with persistent volume + healthcheck
- `api` (Express server)
- `web` (existing static dist)
- `nginx` (reverse proxy, TLS termination)

**Migrations:** `drizzle-kit generate` → versioned SQL in `server/src/db/migrations/`. Applied on startup or via `pnpm db:migrate`.

**Environments:** `.env.development`, `.env.production`. Required vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `STORAGE_PATH` (or S3 creds), `SMTP_*`, `CORS_ORIGINS`.

---

## 10. Module-by-Module Build Sequence

Each module = (schema migration) → (RLS policies) → (service+routes) → (tests) → (frontend adapter rewire) → (smoke test in UI).

1. **Phase 0 — Scaffolding** (foundation, must land first)
   - Server skeleton, env, db client, Drizzle config
   - `users`, `refresh_tokens`, `audit_log`, `notifications`, `office_config`, `files` tables + RLS
   - Auth module end-to-end (register/login/refresh/me/change-password)
   - Frontend: new `api.ts` backend adapter, rewrite `AuthContext`
   - Hardening (helmet, cors, rate limit, validation)

2. **Phase 1 — HR core**
   - Tables: employees, employee_compensation, employee_bank_details, employee_documents, dependents
   - Routes: /hr/employees + sub-resources
   - Frontend: HRModule, SelfService, employee detail pages
   - Job: document-expiry

3. **Phase 2 — HR workflows**
   - Tables: leave_*, training_records, asset_assignments, disciplinary_actions, performance_reviews, onboarding_checklists, payroll_*, letters_issued, payslips
   - Routes: full HR routes
   - Jobs: leave-accrual, payroll-prep
   - PDF generation: letters + payslips (puppeteer or pdf-lib server-side)
   - Frontend: LeaveManagement, Training, Assets, Disciplinary, Reviews, Onboarding, Payslip, Gratuity, OrgChart

4. **Phase 3 — Projects core**
   - Tables: projects, project_team_members, project_stages, stage_gate_approvals, authority_submittals
   - Routes: /projects + sub-resources
   - Frontend: ProjectsModule, ProjectCreate, ProjectDetail (Overview, Team, Timeline, Stages, Authorities tabs)

5. **Phase 4 — Projects extras**
   - Tables: project_risks, risk_actions, project_documents, drawings, rfis
   - Routes: full project routes
   - Frontend: Risks tab (ISO 31000), Documents, DrawingRegister, RFIs

6. **Phase 5 — Tasks & Timesheets**
   - Tables: tasks, task_timer_sessions, timesheets
   - Routes: /tasks, /timesheets
   - Frontend: TasksModule, MyTasks, TaskTimer, timesheet grid

7. **Phase 6 — Attendance**
   - Tables: geofences, attendance_punches, location_pings (partitioned)
   - Routes: /attendance/*
   - Job: attendance-rollup
   - Frontend: AttendanceModule, LivePresence, PunchSimulator
   - Mobile (Capacitor) integration: POST punches & batched locations

8. **Phase 7 — CRM**
   - Tables: leads, lead_activities, lead_conversions
   - Routes: /crm/*
   - Frontend: CRMModule, LeadCreate

9. **Phase 8 — Finance**
   - Tables: coa_accounts, invoices, invoice_lines, journal_entries, journal_lines, vat_returns, bank_accounts, petty_cash, petty_cash_txns, fixed_assets
   - Routes: /finance/*
   - Frontend: FinanceModule, EInvoicing, Invoices, Charts

10. **Phase 9 — Documents & Files**
    - Tables: files, file_acl
    - Routes: /files/*
    - Migrate all base64 storage to backend file references
    - Frontend: DocumentsModule

11. **Phase 10 — Contractor Portal**
    - Tables: contractor_companies, contractor_users, submittals, submittal_revisions, submittal_messages
    - Routes: /contractor/* (separate auth scope)
    - Job: sla-timers
    - Frontend: ContractorDashboard, SubmittalDetail, Inbox, Drawings, Stats

12. **Phase 11 — Reports & Realtime**
    - Materialized views or scheduled aggregations for KPIs
    - WebSocket (socket.io) for tasks/attendance/notifications/chat
    - Frontend: ReportsModule live data, real-time UI updates

13. **Phase 12 — Hardening & Go-Live**
    - End-to-end test suite (Vitest + Supertest)
    - Load test (k6)
    - Backup strategy (pg_dump nightly + WAL archiving)
    - Production deploy via docker-compose on chosen host

---

## 11. Estimated Effort

| Phase | Scope | Effort (dev-days) |
|---|---|---|
| 0 | Scaffolding + Auth + foundations | 4 |
| 1 | HR core | 4 |
| 2 | HR workflows + PDF | 6 |
| 3 | Projects core | 4 |
| 4 | Projects extras (risks/docs/drawings/RFIs) | 5 |
| 5 | Tasks + Timesheets | 3 |
| 6 | Attendance + mobile sync | 4 |
| 7 | CRM | 2 |
| 8 | Finance | 6 |
| 9 | Files migration | 2 |
| 10 | Contractor Portal | 4 |
| 11 | Reports + Realtime | 4 |
| 12 | Hardening + Go-Live | 4 |
| **Total** | | **~52 dev-days** |

---

## 12. Acceptance Criteria (per module)

For each module to be marked DONE:
- ✅ All tables migrated, RLS policies live and tested
- ✅ All API routes return correct data for each of 10 roles (positive + negative test)
- ✅ Frontend pages work with real backend — no localStorage fallback
- ✅ Demo seed data imported & verified
- ✅ Audit log captures all writes
- ✅ Background jobs registered and tested
- ✅ Manual smoke test passed (UI golden paths)

---

## 13. Open Questions Before Phase 0 Starts

1. **Hosting target?** (VPS/DigitalOcean, AWS, Azure, on-prem?) — affects storage choice (local FS vs S3) and TLS setup.
2. **Email provider?** (SMTP, Resend, SendGrid?) — for password resets & notifications.
3. **Existing demo data — keep or wipe?** If keep, I'll build the localStorage→Postgres importer in Phase 0.
4. **Multi-tenancy?** Currently single-tenant (one company, two offices). Confirm we don't need to support multiple client companies on one deployment.
5. **Mobile app**: keep Capacitor wrapping the same SPA, or split into native API client? (Recommendation: keep wrapping.)

Once these are answered I begin **Phase 0 — Scaffolding** and proceed module by module.
