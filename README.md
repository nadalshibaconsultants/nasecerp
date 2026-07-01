# NASEC ERP

Enterprise platform for **Nadal Al Shiba Engineering Consultants** — a UAE-headquartered AEC (Architecture, Engineering, Construction) consultancy with a back office in Cairo.

The system is a multi-office, multi-role, role-based ERP covering the consultancy lifecycle from sales lead → tender → design → construction supervision → project closeout, with a separate contractor-facing portal.

---

## Quick facts

- **Stack:** React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui + wouter
- **Persistence today:** Browser `localStorage` via a pluggable backend adapter
- **Persistence target:** Supabase (Postgres + Realtime + Storage + Auth) — adapter is written and ready to activate
- **Mobile:** Capacitor wrapping for native iOS + Android, with native-OS-level background geofence attendance
- **Offices supported:** 🇦🇪 Dubai (Mon–Fri, AED, UAE labour law) and 🇪🇬 Cairo (Sun–Thu, EGP, Egyptian labour law including PIT + social insurance)
- **Roles:** Director · HR Manager · Finance Manager · Accountant · PM · Design Lead · Site Engineer · BD Manager · Employee · Contractor

---

## What's built

### Core platform
- Authentication with 10 roles (passwordless preview; SSO planned)
- Role-based permission map; route guards; per-element guards
- Per-project ACL (PMs / Site Engineers see only their projects)
- Settings → User Management (Director adds/edits users, resets passwords)
- Black + gold NASEC brand identity applied throughout (logo, favicon, sidebar, login, PDF letterheads)
- Pluggable backend adapter (`localStorage` default, Supabase wired and activatable in Settings)
- Notifications system with auto-derived alerts (doc expiry, training expiry, leave requests, overdue tasks, out-of-fence punches)
- Centralised currency/date formatters (`lib/format.ts`)
- Comprehensive audit log capturing actor, module, action, subject

### HR & Workforce (multi-office)
- **Employees:** full UAE/Egyptian schema (personal, employment, contract, salary breakdown, visa/Emirates ID/passport/labour card with expiry tracking, dependents, bank details). 12 Dubai + 8 Cairo demo employees seeded.
- **Office switcher** (All / 🇦🇪 Dubai / 🇪🇬 Cairo) drives every HR + Finance + Attendance + Reports view.
- **Per-office labour rules**: UAE 30-day annual leave / 90 sick / 21+30 gratuity; Egypt 21 annual / 180 sick / 30+30 gratuity + 11% SI employee + Egyptian PIT brackets.
- **Leave management** (request → approve → balance → calendar).
- **Payroll preview** derived live from attendance with currency, PIT, SI per office.
- **Payslip PDF generation** + WPS-style SIF CSV export.
- **HR Letters:** Salary Certificate, NOC, Experience Letter, Employment Contract, all with NASEC letterhead PDF.
- **Gratuity / EOSB calculator** with UAE Decree-Law 33/2021 + Egyptian Labor Law branches.
- **Onboarding wizard** with the 10-step joining checklist (offer → visa → EID → labour card → bank → assets → induction → training → probation).
- **Training & certifications register** with expiry alerts (PMP, OSHA, NEBOSH, etc.).
- **Asset assignments** (laptop, phone, vehicle, software, PPE).
- **Disciplinary actions log.**
- **Performance reviews** with multi-dimensional scoring.
- **Org chart** from `managerEmployeeId`.
- **Self-service "My HR"** for every employee.
- **Document expiry dashboard** (visa, EID, passport, labour card with traffic-light badges).

### Attendance (geofence-driven, auto-detected)
- **Live Presence** — auto-detected from continuous mobile location stream (no manual punching).
- Per-employee status: on-site / in-office / in-transit / off-duty / offline.
- **Geofence zones list** with per-site active count + colour dot.
- **Location simulator** stand-in for the mobile app — admin moves an employee → app auto-emits in/out punches when they cross a fence.
- **Office-aware**: UAE Mon–Fri vs Egyptian Sun–Thu calendars applied per employee.
- Recent punches feed.
- 30 days of seeded punches across multiple sites for realistic demo.

### Projects
- Full CRUD: create, edit (in-place), delete with audit.
- 4 pipeline stages: Pipeline → Pre-Contract → Post-Contract → Completed.
- **Project Detail workspace** with: Overview · Stages & Pipeline · **Timeline (Gantt)** · Team & Roles · Tasks · Document Logs · Drawings · **Authority Submittals** · Financials · Time & Effort · Meetings · Risks · Client Portal · Contractor Access (Post-Contract only) · Project Chat.
- **Timeline (Gantt):**
  - **Pre-Contract:** auto-proposed durations × project-type multiplier (villa 0.7×, tower 1.5×, master-plan 1.8×, etc.) with UAE working calendar, drag-resize, variance categorisation (Internal/Client/Authority/Scope/Force-Majeure).
  - **Post-Contract:** baseline programme upload (P6 XER / MSP / Excel parser stubbed), WBS hierarchy, critical-path highlighting, baseline-vs-actual-vs-forecast overlay, SPI / CPI / float-consumption, multiple revisions with side-by-side compare, WBS → consultant-sub-stage mapping, EOT / VO / NCR linkage.
- **Authority Submittals tracker** — spreadsheet-style log of DDA / DEWA / ETISALAT / Du / DCD / RTA / Empower with inline-editable status, dates, remarks. Seeded with the standard UAE submission checklist.
- **Per-project Time & Effort** view with hours derived from real attendance.

### Tasks (with timer)
- Full CRUD task management with priority + due dates.
- **Kanban** (To Do / In Progress / Blocked / Done) + List view.
- **My Tasks** — per-user view, sorted by overdue → urgent → priority → due.
- **Built-in TaskTimer**: one running timer at a time, Start / Pause / Stop with HH:MM:SS clock, persists across reloads.
- **Past-sessions log** per task.
- **Overdue notifications with red severity** in the bell icon.

### Timesheets + approvals workflow
- **My Timesheet** — weekly grid (Mon–Sun for Dubai, Sun–Thu for Cairo) of timer hours grouped by project + task.
- "Submit for approval" creates a generic `ApprovalRequest` routed to project PM (or Director if no PM).
- **Approvals queue** — incoming for action, outgoing submitted by me, decision audit-logged, notification to requester on decision.
- Approved hours roll up into Project Financials and Reports.

### CRM (sales pipeline)
- Lead types (referral / website / tender / cold / event / existing-client) and stages (New → Qualified → Proposal → Negotiation → Won → Lost).
- **Kanban board** with drag arrows.
- KPIs: open pipeline AED, weighted forecast (Σ value × probability), won YTD, win rate.
- Activity log per lead.
- **Lead → Project conversion** — one click on a Won lead spawns a new project.

### Finance (multi-office, multi-currency)
- Office switcher with currency badge (AED Dubai / EGP Cairo).
- Invoices, VAT/Tax (UAE 5% FTA + Egypt 14% ETA with e-invoicing notes), Project Costing, P&L chart.
- **Live Labor Cost roll-up** per project, derived from real attendance with hourly rate per employee per office.
- **Payroll Roll-up** per employee with SI + PIT deductions.

### Documents register
- **Project tree on the left** (Manus-style) — collapsible per-project hierarchy.
- Standard 8-folder taxonomy per project (01 Authority Approvals → DDA/DEWA/RTA sub-folders, 02 Site, 03 Client Approvals, 04 Drawings, 05 Contracts & Commercial, 06 Reports & Studies, 07 RFIs & Submittals, 08 Extra).
- **File rows** with status badge (Draft / For Approval / Final / Stamped / Superseded), version, uploader, time-ago, size.
- Access-role display + retention policy per folder.
- Search across files, status filter, list/grid view.
- 25+ demo files across the standard folders.

### Contractor Portal (isolated stack)
- **Contractor role** with the `contractor:portal` permission — bounces away from any internal route.
- 3 seeded contractor companies: ABC Construction LLC (main), Gulf MEP Systems, Skyline Façades.
- One-click demo login cards.
- **Simplified new-submittal form**: Type + Discipline + Description + Files.
- **Auto-routing on submit**: discipline → site-role primary reviewer (SA/SS/SM/SE/SC/CM); PM + RE always receive a copy regardless. Notifications fire to all matching internal users.
- Submittal mirrors automatically into the Documents register under `07. RFIs & Submittals`.
- **Rev N submission flow** — Resubmit button auto-increments revision, retains history.
- **Conversation thread** per submittal (contractor ↔ consultant).
- SLA timers with UAE working-day calendar + green/amber/red.
- Status response by consultant (Approved / Approved with Comments / Resubmit / Rejected / Need More Info).

### Notifications
- Bell icon in top bar with red-badged unread count.
- **Auto-derived alerts**:
  - Visa / Emirates ID / passport / labour card expiry (≤60d warning, ≤30d / expired critical)
  - Training certificate expiry
  - Pending leave requests → managers
  - Out-of-geofence punches → HR + employee
  - **Overdue tasks → assignee with critical (red) severity**
- Per-user filtered. Deep-link to relevant page on click.
- Mark single / mark all read.

### Mobile (Capacitor)
- `capacitor.config.ts` with `appId: ae.nasec.erp`, status bar, splash, background geolocation.
- Mobile bottom-tab navigator auto-replaces sidebar on narrow viewports or native builds.
- **Auto-geofence service** (`lib/native/geofence-service.ts`) — uses `@capacitor-community/background-geolocation`. Registers all project geofences with the OS; OS fires enter/exit events; service auto-emits punches via the same store layer.
- **Site Engineer mobile home page** — "You're at [site]" banner, hours stats, my tasks, open RFIs.
- Full step-by-step iOS + Android build instructions in `mobile/MOBILE-BUILD.md`.

### Settings
- **User Management** (Director only): add/edit/delete users, reset passwords, change roles, link to employees, view permission matrix.
- **Backend tab**: paste Supabase URL + anon key → click Connect → app switches from localStorage to multi-user Postgres + Realtime.
- **Offices tab**: view per-office labour rules (working week, leave entitlements, gratuity formula, payroll deductions, public holidays).
- **Company tab**: company info.

---

## Architecture

```
client/
├── index.html                  Entry HTML (NASEC ERP title, favicon, fonts)
├── public/
│   ├── logo.png                Real NASEC logo (transparent PNG, processed)
│   ├── logo.svg                Bundled wordmark fallback
│   └── _redirects              Netlify-style SPA redirect (for direct deploys)
└── src/
    ├── App.tsx                 Routes + AuthProvider + ProtectedRoute + ContractorRedirect
    ├── main.tsx                Entry point
    ├── index.css               Tailwind v4 + theme tokens (black brand)
    ├── components/
    │   ├── ui/                 shadcn/ui primitives (button, card, dialog, etc.)
    │   ├── auth/               LoginPage, ProtectedRoute, RoleGuard, UserMenu, BackendPanel
    │   ├── brand/Logo.tsx      Wordmark/logo with fallback chain
    │   ├── mobile/MobileShell.tsx   Bottom-tab navigator
    │   ├── notifications/      NotificationCenter (bell dropdown)
    │   ├── office/             OfficeSwitcher, OfficesPanel (Settings)
    │   ├── projects/           ProjectEditDialog, AuthoritySubmittalsTab
    │   ├── files/FileUpload.tsx     Generic file uploader (data-URL today, Supabase Storage tomorrow)
    │   ├── timer/TaskTimer.tsx Inline timer per task
    │   ├── timeline/           GanttChart, Pre/Post-Contract Timeline tabs
    │   ├── hr/                 EmployeeFormDialog, LeaveManagement, HRLetters, Payslip, Gratuity, Onboarding, Training, Assets, Disciplinary, Reviews, OrgChart, AuditLog, SelfService
    │   └── attendance/         LivePresence, PunchSimulator (legacy stand-in)
    ├── pages/                  Top-level route components
    │   ├── HRModule, FinanceModule, AttendanceModule, ProjectsModule, ProjectDetail,
    │   │  ProjectCreate, TasksModule, MyTasks, MyTimesheet, CRMModule,
    │   │  DocumentsModule, ReportsModule, Approvals, SettingsPage,
    │   │  Dashboard, MobileSiteHome
    │   ├── Contractor*.tsx     7 portal pages (Login, Dashboard, New Submittal, Submittals,
    │                          SubmittalDetail, Inbox, Drawings, Stats)
    │   └── …
    ├── lib/                    Domain models + utilities (no UI)
    │   ├── auth/               Role + Permission + AuthContext + permission map
    │   ├── backend/            Pluggable adapter — local.ts (default), supabase.ts
    │   ├── store/index.ts      Generic createCollection / createSingleton / useCollection
    │   ├── stores.ts           Central registry of all 25+ collections
    │   ├── office/             Office types + configs (Dubai/Cairo, calendars, currency)
    │   ├── hr/                 Employee types, leave-utils, pdf-utils, extra HR types
    │   ├── attendance/         Punches, presence derivation, auto-punch on geofence cross
    │   ├── payroll/            Per-office payroll computation + project labour cost
    │   ├── timer/              TaskTimerSession + timesheet utilities
    │   ├── tasks/              Task type + status/priority enums
    │   ├── projects/           Project type + ACL (visibleProjects, canEditProject)
    │   ├── documents/          DocFolder + DocumentFile hierarchy types
    │   ├── crm/                Lead + LeadActivity types
    │   ├── notifications/      Auto-derive alerts (deriveAlerts)
    │   ├── files/              StoredFile + utils (base64 today, Supabase Storage next)
    │   ├── authority/          AuthoritySubmittal types
    │   ├── contractor/         Comments + auth-user-to-company lookup
    │   ├── contractor-portal-data.ts  Submittal types, routing engine, demo data
    │   ├── native/             Capacitor: platform detection, geofence service
    │   ├── timeline-utils.ts   UAE calendar, variance, SPI/CPI, critical-path solver
    │   └── format.ts           Centralised money/date formatters
    └── data/seed/              Demo data for every store

server/index.ts                 Tiny Express static-file host (production deploys serve dist/ directly)
shared/const.ts                 Constants shared across client + server
supabase/
├── schema.sql                  Run this in your Supabase SQL editor to create tables + RLS
└── BACKEND-SETUP.md            Step-by-step Supabase setup guide
mobile/MOBILE-BUILD.md          Step-by-step iOS + Android compile + install guide
capacitor.config.ts             Capacitor wrapping config
vite.config.ts, tsconfig.json   Build configuration
HANDOVER.md                     Hand-off document for the next developer
README.md                       This file
```

---

## Running locally

```bash
# 1. Install Node.js LTS (https://nodejs.org/) and pnpm:
npm install -g pnpm

# 2. Install dependencies:
pnpm install

# 3. Dev server:
pnpm dev
# Opens http://localhost:3000

# 4. Production build:
pnpm build
# Outputs to dist/public/

# 5. Type check:
pnpm check

# 6. Preview production build:
pnpm preview
```

---

## Demo accounts

Email-only sign-in during preview (no password). At the login screen, type any email or click a role card.

| Role | Email | What they see |
|---|---|---|
| Director | director@nasec.ae | Full system |
| HR Manager | hr@nasec.ae | Full HR + Settings → User Management |
| Finance Manager | finance@nasec.ae | Finance + Reports + payroll read |
| Accountant | accountant@nasec.ae | Finance invoices only |
| PM (Marina) | pm@nasec.ae | His projects + tasks + attendance |
| Design Lead | design@nasec.ae | Pre-Contract project edits |
| Site Engineer | site@nasec.ae | Site attendance + his projects |
| BD Manager | bd@nasec.ae | CRM full |
| Employee | employee@nasec.ae | My HR + My Tasks only |
| **Contractor** (ABC) | rashid@abcconstruction.ae | Contractor portal only |
| Contractor (MEP) | vikram@gulfmep.ae | Same — different company scope |
| Contractor (Facade) | hans@skylinefacades.com | Same |

---

## Deployment

### Web (static host)
Any static host that supports SPA fallback rewrites works:

- **Tiiny Host** — drag the `dist/public/` zip onto https://tiiny.host. Free 7-day URLs with no signup.
- **Cloudflare Pages** — `dash.cloudflare.com → Pages → Direct Upload`. Permanent `*.pages.dev` URL, free.
- **Netlify Drop** — https://app.netlify.com/drop. Drag the zip, get a `*.netlify.app` URL.
- **Vercel** — connect a Git repo (Vercel doesn't support drag-zip).

A `_redirects` file (Netlify-style) is bundled in `client/public/` to keep client-side routing working.

### Backend (Supabase)
See `supabase/BACKEND-SETUP.md`. Summary:
1. Create a free Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Enable Realtime on the `nasec_kv` table.
4. Copy Project URL + anon key from Settings → API.
5. In the deployed ERP: Settings → Backend → paste both → Connect.

### Mobile (iOS + Android)
See `mobile/MOBILE-BUILD.md`. Summary:
1. `pnpm install` then `pnpm build`.
2. `npx cap add ios` and/or `npx cap add android` (first time only).
3. `npx cap sync` (after every code change).
4. `npx cap open ios` (Mac + Xcode required) or `npx cap open android` (Android Studio).
5. Build and install on a real device.

Auto-geofence attendance requires **Always-Allow** location permission on first install.

---

## Strategic development priorities (Tier 1 → 3)

See **`HANDOVER.md`** for the full opinionated roadmap. Top 5:

1. **Real backend + Microsoft SSO** (Supabase adapter is written; needs project + SSO wiring)
2. **WhatsApp Business + Email notifications** (in-app bell exists; needs external channels)
3. **Director's BI / executive dashboard** (Reports module exists; numbers are placeholders)
4. **Real file storage with previews + watermarking** (FileUpload component exists; needs Supabase Storage swap)
5. **Client Portal** (parallel to Contractor Portal; stubbed but not built)

---

## License
Proprietary — Nadal Al Shiba Engineering Consultants.
