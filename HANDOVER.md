# NASEC ERP — Developer Handover (v21)

You are picking up an extensively-built React + Vite + TypeScript ERP for **NASEC (Nadal Al Shiba Engineering Consultants)** — a UAE-based AEC consultancy with offices in Dubai (main) and Cairo (back office). This document is the engineering briefing: current state, deliberate design choices, recent additions, known limitations, and priority roadmap.

Read `README.md` first for the system overview. This document fills in *what the previous build decided and why*.

---

## 1. State of play

The product is a single-page web app + Capacitor-wrapped iOS/Android shell that covers HR, attendance, payroll, projects (pre- and post-contract), tasks, documents, CRM, contractor portal, authority submittals, e-invoicing, NASEC workflow gates, project timelines, risk management, finance, reports and approvals — with role-based access for ten roles (director, hr-manager, finance-manager, accountant, pm, design-lead, site-engineer, bd-manager, employee, contractor).

Data persists via a **pluggable Backend adapter** (`lib/backend/`). LocalStorage is the default; a Supabase adapter is already wired and can be turned on in Settings → Backend.

### Latest changes (v19 → v21)

- **Leave Handover workflow** (v19): when an employee files a leave request, a per-task hand-over plan can be prepared in HR → Leave. The Design Manager approves in `/approvals`; on approval, tasks are auto-reassigned to the appointed cover users, notifications fire, audit log is written. Files: `lib/handover/types.ts`, `components/hr/HandoverDialog.tsx`, `pages/Approvals.tsx`, `components/hr/LeaveManagement.tsx`, `lib/stores.ts` (`leaveHandoversStore`).
- **Sidebar nesting** (v20): `DashboardLayout.tsx` now supports two-level navigation. **Attendance** lives as a child of **HR & Workforce**, **E-Invoicing** lives as a child of **Finance**. Auto-expands on the active route; respects permission filtering; collapses cleanly when the sidebar is icon-only.
- **Risk Management Plan** (v21): the basic Risks tab in each project was replaced with a Dubai-AEC compliant ISO 31000 module. New files: `lib/risks/types.ts`, `components/projects/RisksTab.tsx`, `data/seed/risks.ts`, `risksStore` in `lib/stores.ts`. Features include 19 risk categories, inherent-vs-residual 5×5 scoring, four treatment strategies, KRIs/triggers/contingency, mitigation actions, review cadence, escalation thresholds, heat-map visualisation, register filtering & CSV export, framework reference and Dubai-realistic demo seed.

---

## 2. Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite 7 + TypeScript |
| Styling | Tailwind v4 + shadcn/ui (Radix primitives) |
| Routing | wouter |
| State | Per-collection stores via `createCollection<T>()` (lib/store), persisted through the active Backend adapter |
| Charts/Forms | recharts, react-hook-form, sonner (toasts) |
| Auth | localStorage session + role-based permission map (`lib/auth/permissions.ts`) |
| Mobile | Capacitor 6 wrapping the same SPA; auto-geofence service via `@capacitor-community/background-geolocation` |
| Server | Express stub in `server/index.ts` (mostly static; ready for API endpoints if needed) |
| Build | `pnpm build` → Vite for client + esbuild for server bundle |

Run locally with `pnpm install && pnpm dev`. Production build: `pnpm build && pnpm start`.

---

## 3. Architecture conventions (read this before editing anything)

### 3.1 The store layer is everything

Every persistent entity is a `Collection<T>` registered in `client/src/lib/stores.ts`. Components consume them via the `useCollection(store)` hook which re-renders on change. Mutations go through `store.put`, `store.remove`, `store.upsertMany`, `store.reseed`. **Never write to `localStorage` directly** — always go through the store. The backend adapter handles localStorage today, Supabase realtime tomorrow.

### 3.2 Pluggable backend (`lib/backend/`)

`getBackend()` returns the active adapter. Default is `LocalBackend` (localStorage + DOM event subscriptions). `SupabaseBackend` reads from `localStorage` for the connection config (set via Settings → Backend) and proxies CRUD + realtime to a Supabase project. The SQL schema lives in `supabase/schema.sql`.

When you add a new store, also add the corresponding table to `supabase/schema.sql` and an RLS policy.

### 3.3 Auth & permissions

`lib/auth/permissions.ts` maps each role to a list of `Permission` strings. `useAuth()` exposes `can(perm)`, `canAny([perms])`, `hasRole(...roles)`, `currentUser`. Every protected route wraps the page in `ProtectedRoute requiredPerm="..."`. The sidebar filters items via `canAny(item.perms)`.

Contractor isolation is enforced at the App-router level by `ContractorRedirect` — contractor-role users land on `/portal/contractor` regardless of the URL they tried.

### 3.4 Multi-office

Dubai and Cairo have different working calendars, currencies, gratuity laws and labour rules. The `lib/office/` directory encapsulates per-office config. Employees carry an `office` field (`"dubai" | "cairo"`). HR, Finance, Attendance and Payroll modules all switch logic on this field.

### 3.5 Notifications

`notificationsStore` plus the pure `deriveAlerts(state)` function in `lib/notifications/derive.ts`. The bell in `DashboardLayout` reads both: stored notifications + freshly derived alerts (doc expiries, training expiries, overdue tasks, etc.). New flows should push a `Notification` record on important state changes (handover submitted, risk escalated, etc.).

### 3.6 Audit log

Every meaningful mutation pushes a row to `auditStore` with `actor`, `module`, `action` and `subject`. Use `useCurrentActor()` for the actor string. The HR → Audit Log page renders the log.

---

## 4. The NASEC project workflow (important domain logic)

NASEC's design lifecycle is encoded in `data/nasecWorkflow.ts` and the project's `stage` enum:

- **pipeline** — opportunity tracking only
- **pre-contract** — eight design stages (S1–S8) interleaved with five client gates (G1–G5)
- **post-contract** — IFC issuance, substructure → enabling → MEP → fit-out → handover
- **completed** — closed out

### 4.1 Stage-gate approvals (3-person before client)

`components/projects/StageGateApprovalCard.tsx` enforces an internal triple-sign-off (Lead Architect → PM → Design Manager) before any pre-contract gate can be marked client-ready. Records live in `stageApprovalsStore`.

### 4.2 Timeline with Pause/Resume + Mitigate

`PreContractTimelineTab.tsx` and `PostContractTimelineTab.tsx` each render an auto-proposed Gantt programme. Both support:
- **Pause** (client put project on hold) → all remaining activities shift by the elapsed pause window on Resume.
- **Mitigate** → revise remaining stage durations; creates a programme revision.

History panels show the audit trail of pauses and mitigations.

### 4.3 Authority parallel track

Pre-contract has authority milestones running parallel to the main stages (DM preliminary approval triggered by G2, NOCs + BP triggered by G4). These live alongside the main timeline rather than blocking it.

---

## 5. The new Risk Management Plan (project Risks tab)

**Schema**: `lib/risks/types.ts` defines `ProjectRisk` with full ISO 31000 fields:

- 19 risk categories (`design`, `technical`, `authority`, `regulatory`, `commercial`, `contractual`, `financial`, `schedule`, `hse`, `environmental`, `sustainability`, `geotechnical`, `stakeholder`, `third-party`, `resource`, `quality`, `ip-data`, `force-majeure`, `reputational`)
- 5×5 probability/impact for inherent and residual risk
- Four treatments: avoid / transfer / mitigate / accept
- Seven workflow states: identified → assessed → treated → monitoring → escalated → closed → realised
- Cost (AED) and schedule (days) impact estimates
- KRIs, trigger conditions, contingency plan
- Linked task / document / submittal IDs (extensibility hooks)
- Mitigation actions sub-collection with status, owner, due date
- Review log

**Helpers**: `inherentScore()`, `residualScore()`, `riskZone()` (low/moderate/high/extreme), `riskZoneColor()`, `escalationLevel()` (team/pm/director/client-board).

**UI**: `components/projects/RisksTab.tsx` exposes three tabs:
1. **Register** — KPI strip + filter bar (search/category/status/zone) + sortable table + drill-down dialog.
2. **Heat Map** — Dubai DM 5×5 grid with counts per cell.
3. **Framework** — six-step ISO 31000 workflow + reference standards (ISO 31000/45001/19650, Dubai Building Code 2021, UAE Fire & Life Safety Code 2024, FIDIC, RIBA, LEED/Estidama).

**Demo seed**: 11 Dubai-realistic risks across Al Wasl Tower, Palm Villas, Dubai Creek, Marina Heights — covering DM permit delay, DCD UAE Fire Code 2024 façade, DEWA load NOC, Trakhees community NOC, marine chloride durability, DDA Creek planning, LEED Gold shortfall, long-lead curtain wall, RTA tower-crane public safety, FIDIC 14.8 late-payment exposure.

**Exports**: CSV export of filtered register for client reporting.

The component is mounted in `ProjectDetail.tsx` at line ~745: `<RisksTab projectId={project.id} phase={effectiveStage === "post-contract" ? "post-contract" : effectiveStage === "pre-contract" ? "pre-contract" : "both"} />`.

---

## 6. Leave Handover (HR + Approvals flow)

When an employee files a leave request, the HR queue exposes a **"Hand over tasks"** button. Opening it lists the employee's open tasks (status ≠ done) and lets the line manager pick a cover for each — with a bulk-assign helper. Submitting creates a `LeaveHandover` record (status `submitted`) and notifies all directors.

The director sees the live handover in `/approvals` (top of the queue, tagged "Live"). Approving:
- Reassigns every covered task's `assigneeUserId` to the appointed cover user.
- Notifies each cover via the bell.
- Notifies the employee of the decision.
- Writes an audit entry.

Rejecting marks the handover for revision and notifies the employee.

Files: `lib/handover/types.ts`, `components/hr/HandoverDialog.tsx`, `components/hr/LeaveManagement.tsx`, `pages/Approvals.tsx`, store in `lib/stores.ts` (`leaveHandoversStore`).

---

## 7. Demo accounts

All demo accounts use password `password` (auth is intentionally loose for the prototype — re-enable hashing before any real-world use).

| Role | Username | Display name |
|---|---|---|
| Director | `director` | Demo Director |
| HR Manager | `hr-manager` | Demo HR Manager |
| Finance Manager | `finance-manager` | Demo Finance Manager |
| PM | `pm` | Demo Project Manager |
| Design Lead | `design-lead` | Demo Design Lead |
| Site Engineer | `site-engineer` | Demo Site Engineer |
| BD Manager | `bd-manager` | Demo BD Manager |
| Employee | `employee` | Demo Employee |
| Contractor (ABC) | `rashid@abcconstruction.ae` | Rashid Al Maktoum |
| Contractor (Gulf MEP) | `vikram@gulfmep.ae` | Vikram Patel |
| Contractor (Skyline) | `hans@skylinefacades.com` | Hans Mueller |

Demo-user picker on the login page lets you sign in with any of these in one click.

---

## 8. Mobile (Capacitor)

Run `pnpm cap:sync` to push the latest web build into the iOS/Android shells. Open Xcode/Android Studio via `pnpm cap:open-ios` / `pnpm cap:open-android`.

Key mobile-only features:
- Auto-geofence punch-in/out via `lib/native/geofence-service.ts` (runs as a background service on the device, registers the user's current location every minute and fires punches when crossing a project's geofence).
- `components/mobile/MobileShell.tsx` provides role-aware bottom-tab navigation when on a native shell. The shell is flat (not nested) on purpose — bottom tabs aren't a place for hierarchy.

See `mobile/MOBILE-BUILD.md` for the build pipeline.

---

## 9. Known limitations & gotchas

1. **Passwords are not hashed** in the demo seed — `passwordHash: "password"` is literal. Replace with a real hash before any production rollout.
2. **File uploads use base64 data URLs in localStorage** — fine for the demo, but will blow the 5–10 MB localStorage quota on real usage. Supabase Storage migration is wired and ready in `lib/files/`; flip the switch when Supabase is connected.
3. **Some pages still carry static demo arrays merged with live store data** (notably `pages/Approvals.tsx`, where leave-handover items are real but expense/timesheet/invoice/document items are static seed data). Convert these to live stores when the corresponding modules need it.
4. **The MobileShell tabs are role-mapped** — when adding a new role or feature, update the `TABS_BY_ROLE` record in `components/mobile/MobileShell.tsx`.
5. **TypeScript-strict** — the project compiles with `tsc --noEmit -p tsconfig.json` clean. Run this before committing to catch regressions.
6. **Avoid Set spreads with downlevel ES targets** — use `new Set(prev); n.add(x)` rather than `new Set([...prev, x])`.

---

## 10. Build, test, ship

```bash
pnpm install          # installs both client and server deps
pnpm dev              # vite dev server at :5173
pnpm check            # tsc --noEmit (must be clean)
pnpm build            # vite build + esbuild server bundle into dist/
pnpm start            # node dist/index.js (serves the built SPA + Express stub)
```

Versioned deployment zips (excluding node_modules and dist) live alongside the project folder, e.g. `nasec-deploy-v21.zip` for this handover.

---

## 11. Roadmap (priority order)

1. **Connect Supabase backend** — schema in `supabase/schema.sql`, adapter ready, just needs project URL + service-role key in Settings → Backend.
2. **Replace remaining static demo arrays with live stores** — Approvals, Reports, Finance.
3. **Re-enable password hashing + proper login** — bcrypt on the server stub or Supabase Auth.
4. **File storage migration** — switch `lib/files/` to Supabase Storage; preserves existing base64 URLs as a fallback.
5. **Risk Management v2** — link risks bidirectionally to tasks/submittals/documents, KRI alert generators, monthly client-report PDF.
6. **Notifications email backend** — currently in-app only; add SendGrid or Supabase Edge Function relay.
7. **Reports & BI** — many of the report pages are placeholders; build out cost variance, SPI/CPI by project, NOC age analysis, leave heatmap.
8. **Production hardening** — CSP, rate limiting, audit log immutability via Supabase RLS.

---

## 12. Where to find things

```
client/src/
├── App.tsx                       # Top-level router + ProtectedRoute wrappers
├── components/
│   ├── DashboardLayout.tsx       # Sidebar (now with nested Attendance + E-Invoicing)
│   ├── attendance/               # Live presence, punch simulator
│   ├── auth/                     # UserMenu, BackendPanel
│   ├── brand/                    # Logo
│   ├── contractor/               # Comment thread for portal
│   ├── hr/                       # Employees, leave, training, payroll, gratuity, etc.
│   │   ├── HandoverDialog.tsx    # NEW v19
│   │   └── LeaveManagement.tsx   # NEW v19 (handover-aware)
│   ├── mobile/                   # MobileShell, RoleHome panels
│   ├── notifications/            # NotificationCenter + bell
│   ├── projects/                 # Project sub-tabs
│   │   ├── StageGateApprovalCard.tsx   # 3-person approval
│   │   └── RisksTab.tsx          # NEW v21 — replaces basic risks
│   ├── timeline/                 # Pre/Post-Contract Gantt + Mitigate/Pause
│   └── ui/                       # shadcn primitives
├── data/
│   ├── seed/                     # Demo data (employees, projects, tasks, risks, ...)
│   ├── nasecWorkflow.ts          # Pre/Post-Contract stage definitions
│   └── marinaProgramme.ts        # 80-activity demo programme
├── lib/
│   ├── attendance/               # Geofence types + utils
│   ├── auth/                     # AuthContext, types, permissions map
│   ├── authority/                # Authority submittals types
│   ├── backend/                  # Pluggable adapter (Local / Supabase)
│   ├── contractor/               # Comments + portal helpers
│   ├── crm/                      # Leads, activities
│   ├── documents/                # Doc folder hierarchy types
│   ├── files/                    # FileUpload + StoredFile types
│   ├── handover/                 # NEW v19 — LeaveHandover types
│   ├── hr/                       # Employee, leave-utils, payroll
│   ├── notifications/            # Types + deriveAlerts pure function
│   ├── office/                   # Per-office calendars + rules
│   ├── payroll/                  # Project labour cost rollup
│   ├── projects/                 # Project + StageGateApproval types
│   ├── risks/                    # NEW v21 — ProjectRisk types + helpers
│   ├── store/                    # createCollection/useCollection
│   ├── tasks/                    # Task types
│   ├── timer/                    # Task timer types
│   └── stores.ts                 # All store registrations (single source of truth)
└── pages/                        # One file per route
```

---

## 13. Contact / hand-off checklist

When you take over:

1. `pnpm install && pnpm dev` — verify the app boots and login works with any demo account.
2. `pnpm check && pnpm build` — verify clean tsc + production build.
3. Sign in as `director` and tour: HR → Leave (try the Hand-over Tasks button), Projects → any pre-contract → Risks (browse Register / Heat Map / Framework), Approvals (approve a live handover and observe task reassignment + notification).
4. Sign in as `rashid@abcconstruction.ae` — confirm the contractor portal redirect lands cleanly.
5. Read `supabase/schema.sql` and plan the Supabase migration.

Welcome aboard.
