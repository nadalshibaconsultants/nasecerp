# NASEC ERP — Complete Project Report
**Nad Al Shiba Engineering Consultants · ERP Platform v34b**
**Report date:** 11 June 2026
**Prepared by:** Aziz (r.aziz@nadalshibaconsultants.com)

---

## 1. Executive Summary

The NASEC ERP has been taken from a frontend-only demo (data stored in the browser's localStorage) to a **fully integrated client–server platform**: a complete production backend was built, every frontend module was connected to it, the mobile attendance application (Firebase) was integrated with live data flowing into payroll-ready attendance records, and the whole system was stabilised — it now compiles cleanly, passes all automated tests, builds for production, and every major flow has been verified end-to-end against a live database.

---

## 2. Backend Platform (Built from the Ground Up)

### 2.1 Technology stack

| Layer | Technology |
|---|---|
| API server | Node.js + Express (TypeScript, ESM) |
| Database | PostgreSQL 16 with Drizzle ORM + versioned migrations |
| Authentication | JWT — 15-minute access tokens + 30-day HttpOnly refresh cookies, bcrypt password hashing |
| Authorisation | Role-based access control (10 roles) + per-user permission grants + PostgreSQL Row-Level Security |
| Realtime | socket.io on `/api/v1/realtime` — per-user, per-role, per-project and per-task channels |
| Files | Pluggable storage driver — local disk or AWS S3 (me-central-1), SHA-256 integrity, multipart upload |
| PDF generation | pdf-lib — HR letters and payslips generated server-side |
| Email | Resend integration (password reset, notifications) |
| Logging / hardening | pino structured logs, helmet security headers, CORS allow-list, rate limiting (global + strict login limiter) |
| Deployment | Docker Compose — Postgres + API + nginx web tier; Caddy alternative; Netlify build for static client |

### 2.2 Database

Full relational schema (~45 tables) covering: users/auth/refresh-tokens/password-resets, audit log, employees + compensation + documents + dependents, leave + handovers, payroll runs + payslips, letters, training/assets/disciplinary/reviews/onboarding, geofences + punches + location pings + daily rollups, projects + stages + teams + approvals + authority submittals + risks + drawings + RFIs + doc folders/documents, generic project-items and finance-items (JSONB) for Quality/HSE/DCC and finance sub-registers, tasks + assignees + messages + timer sessions + timesheets, CRM leads + activities, finance (GL accounts, journal entries with double-entry balance validation, customers, AR invoices/receipts, suppliers, AP bills/payments, bank accounts/transactions, VAT returns, petty cash, fixed assets), contractor companies/users/submittals/revisions/messages, notifications, files.

- Idempotent migration runner (`db:migrate`) — Drizzle migrations + safe `ADD COLUMN IF NOT EXISTS` patches + RLS policy application.
- Seed scripts: initial director + demo clients, **real 66-person staff roster** from the C-7.6.20 Staff Log (Rev 02) with linked login accounts, document seeds, and a localStorage importer for legacy data.

### 2.3 Security model

- 10 roles: director, hr-manager, finance-manager, accountant, pm, design-lead, site-engineer, bd-manager, employee, contractor (+ client portal role).
- ~30 granular permissions (`hr:read`, `hr:payroll:write`, `finance:invoices:write`, `attendance:override`, `projects:approve`, …) enforced on every route; directors can grant extra per-user permissions from Settings → Access Control.
- Row-Level Security in Postgres: per-request context (`app.user_id`, `app.role`, `app.office`) scopes sensitive tables at the database level.
- Full audit trail: every meaningful mutation writes actor, action, entity and before/after payloads.

### 2.4 Scheduled jobs (node-cron)

| Job | Schedule | Purpose |
|---|---|---|
| Document expiry | daily | Alerts for passports/visas/IDs expiring ≤ 60 days |
| Leave accrual | monthly | Accrues leave balances per office rules (UAE / Egypt) |
| Attendance rollup | nightly | Aggregates punches into per-day records for payroll |
| SLA timers | hourly | Flags overdue contractor submittals, escalates |
| Refresh-token cleanup | nightly | Purges expired sessions |
| **Firebase attendance sync** | **every 15 min** | Pulls new punches from the mobile app |

---

## 3. Frontend → Backend Integration (Every Module Connected)

The frontend's store layer (`createApiCollection`) was wired so that **every module reads and writes through the REST API** with optimistic UI updates, automatic rollback on failure, and seed-data fallback only when the API is unreachable.

| Module | Connected endpoints |
|---|---|
| **Authentication** | Login / logout / refresh / me / change-password / forgot + reset password / register. Both login pages (staff + contractor portal) migrated to real password auth. |
| **Users & Access Control** | Admin user CRUD, role + per-user permission management, read-only user directory for assignment pickers |
| **HR — Employees** | Employee CRUD + nested documents and dependents |
| **HR — Leave** | Requests, approve/reject, balances, leave handover plans |
| **HR — Payroll** | Payroll runs, finalisation, PDF payslips (incl. self-service "my payslips") |
| **HR — Letters** | Server-generated PDF letters (NOC, salary certificate, experience, contract, termination, warning) stored as files |
| **HR — Other** | Training, assets, disciplinary, reviews, onboarding — full CRUD |
| **Attendance** | Geofences, punches, GPS location batch ingest, daily rollups, **Firebase status + sync** |
| **Projects** | Project CRUD, stages, team assignment, stage-gate approvals, authority submittals, risks (ISO 31000 register), drawings, RFIs, document folders + register |
| **Quality / HSE / DCC** | NCRs, inspection requests, MARs, WIRs, incidents, toolbox talks, safety inspections, PPE, drawing revisions, transmittals, meetings — via generic project-items API |
| **Tasks** | Task CRUD, multi-assignee, task chat (text/file/voice messages), task timers (start/stop/manual log), sessions, timesheets with submit/approve/reject |
| **CRM** | Leads, activities, lead → project conversion |
| **Finance** | Chart of accounts, journal entries (double-entry validation + posting), customers, AR invoices + receipts, suppliers, AP bills + payments, bank accounts + transactions, VAT returns, petty cash floats + vouchers, fixed assets — plus cheques, recurring expenses, utilities, insurance, subscriptions, government fees, budgets, departments, WPS runs via the finance-items API |
| **Contractor Portal** | Companies, contractor user links, submittals (create/respond/resubmit/update with SLA routing + revision history), submittal messages, per-company isolation |
| **Files** | Multipart upload, listing by entity, secure download, delete — used by HR docs, task attachments, submittals, document register |
| **Notifications** | List, create (incl. company-wide broadcast), mark read, realtime socket push; bell merges server notifications with client-derived alerts |
| **Reports** | Executive dashboard, project P&L, attendance summary, payroll summary, CRM pipeline, AR/AP aging |

**Total API surface: ~300 endpoints across 21 route modules**, each guarded by the appropriate permission.

---

## 4. Attendance Application (Firebase) Integration

The company's mobile punch app (Firebase Realtime Database, project **nasecattapp**) is now a live data source for the ERP:

- Server connects with service-account credentials (key kept in gitignored `secrets/`, mounted read-only in Docker).
- Correct data node identified and configured (`/Attendance` — case-sensitive path was the blocker).
- **Initial import: 498 punch records read, 374 matched to staff and imported** with timestamp, in/out type, GPS site context. Matching works by Firebase UID → app user profile → staff ID / email / full name.
- Import is **idempotent** (re-running inserts 0 duplicates) and runs **automatically every 15 minutes**, plus a manual **Sync now** button in the Attendance page header.
- The Attendance page shows live presence per employee (Online / Checked out / No punch today), site, the day's **IN and OUT times, and total worked time in h/m** after punch-out; employee search by name or staff ID and site filtering work across all tables; per-employee history dialog with monthly stats.
- Imported punches feed the existing aggregation pipeline → daily records → payroll hours, overtime, project labor cost and reports.
- Outstanding: 7 app accounts (124 punches) lack a staff ID/email in their Firebase profile and need it added to auto-match.

---

## 5. Defects Found and Fixed (Stabilisation)

**Blocking defects:**
1. Production API **crashed on boot** — 34 ESM imports missing `.js` extensions across the database schema; server could never start from the built output.
2. **Contractor login broken** — missing `await` on the async login call + use of a retired demo impersonation function.
3. **Contractor portal returned 403 for contractors** — the contractor role lacked the permissions its own endpoints required.
4. **Contractor company lookup hardcoded to demo IDs** — real contractors could never create submittals; replaced with live lookup via contractor-user links (by user ID or email).
5. **Notifications were write-only into a void** — the client created and marked notifications via endpoints that didn't exist, with a mismatched data shape; added create (with broadcast fan-out + socket push), mark-read, delete, and boundary translation.
6. **Submittal respond/resubmit hit a non-existent endpoint** — added a portal-shape PATCH route with status translation (UI labels ↔ DB enum: Approved ↔ code-a, etc.) and per-company guards.
7. **Logged task time silently vanished** — the timer posted to a read-only route; added manual session create/edit/delete endpoints with ownership checks.
8. 18 TypeScript compile errors (zod v4 syntax, type mismatches, missing fields) across client and server; `firebase-admin` dependency declared but not installed.
9. Vite dev server had **no `/api` proxy** — the frontend couldn't reach the backend in development; added proxy with websocket support matching production nginx.
10. Server test suite failing — provisioned Postgres (Docker), created the test database, migrated; **all tests now pass**.

**Functional improvements made on request:**
- "Last punch" now shows both IN and OUT with total hours/minutes.
- Attendance employee search fixed to cover name + staff ID across all tables.
- Firebase status banner removed; Sync now relocated to the page header.
- HR page: sub-module tab menu moved directly under the office switcher (All / Dubai / Cairo).

---

## 6. Verification

| Check | Result |
|---|---|
| TypeScript — client + server | ✅ 0 errors |
| Server test suite (auth, finance journal balancing) | ✅ 7/7 passing |
| Client production build (Vite) | ✅ |
| Server production build (tsc) | ✅ |
| API boot + health + login | ✅ verified live |
| All module list endpoints with director token | ✅ 200 across HR, attendance, projects, tasks, CRM, finance, contractor, notifications, admin |
| End-to-end contractor flow (company → user → login → submittal → respond → resubmit) | ✅ verified live |
| Notification create / broadcast / mark-read | ✅ verified live |
| Timer session create / edit / delete | ✅ verified live |
| Firebase import idempotency | ✅ re-sync inserts 0 duplicates |

---

## 7. Deployment & Operations

- **One-command production deploy:** `docker compose up` — Postgres (persistent volume), API (port 4000, internal), nginx web tier (port 80) proxying `/api` + websockets to the API.
- Database migrations and seeds are scripted and idempotent (`db:migrate`, `seed:initial`, `seed:staff`).
- Local development: `pnpm dev:all` runs the web client (port 3000, proxied) and API (port 4000) together.
- Environment template (`.env.example`) documents all configuration: database, JWT secrets, CORS, cookies, storage driver (local/S3), email, seed credentials, Firebase.

## 8. Pre-Go-Live Checklist

1. Change the default director password and force staff password changes (initial credentials = Staff ID).
2. Add staff ID / email to the 7 unmatched Firebase profiles so their punch history imports.
3. Generate fresh JWT secrets for production and enable `SECURE_COOKIES=true` behind HTTPS.
4. Decide whether remaining demo/sample content on a few pages should be stripped for production.
5. Point DNS / TLS (Caddy config provided) and run `docker compose up` on the production host.
