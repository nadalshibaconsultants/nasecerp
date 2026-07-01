# NASEC ERP — Go-Live Checklist

Final hardening + cutover steps before promoting the system to production on AWS.

---

## 1. Infrastructure (AWS, single-region)

- [ ] **RDS Postgres 16** (db.m6g.large, Multi-AZ, encrypted at rest, deletion-protection on)
- [ ] **Subnet group** in 2 AZs; RDS placed in private subnets only
- [ ] **ALB** (public) → ECS service / EC2 with API container on port 4000
- [ ] **ACM cert** attached to ALB for `erp.<company>.ae`
- [ ] **S3 bucket** `nasec-erp-files-prod` for uploaded files, versioning ON, default encryption SSE-S3
- [ ] **S3 bucket** `nasec-erp-backups-prod` for nightly dumps (lifecycle: STANDARD_IA after 30d → GLACIER after 90d → expire 7y)
- [ ] **CloudFront** distribution fronting the static SPA (`dist/`) with SPA-fallback origin error mapping
- [ ] **Route 53** records for `erp.<company>.ae` (ALB) and `app.<company>.ae` (CloudFront)
- [ ] **IAM role** for the API task with least-privilege S3 access (only the two buckets)
- [ ] **Security groups**: ALB only on 443 from internet; API only on 4000 from ALB; RDS only on 5432 from API
- [ ] **WAF** rules: rate limit, OWASP managed ruleset, geo allowlist (UAE + Egypt + corp IPs)
- [ ] **CloudWatch** alarms on: 5xx > 1% for 5 min, p99 latency > 2s for 5 min, RDS CPU > 80%, disk free < 20%

## 2. Application config

- [ ] Server `.env.production` populated; **no defaults left** (`SECURE_COOKIES=true`, real `JWT_SECRET`/`JWT_REFRESH_SECRET` ≥ 64 random bytes each)
- [ ] `STORAGE_DRIVER=s3` + `AWS_S3_BUCKET=nasec-erp-files-prod`
- [ ] `RESEND_API_KEY` set; `MAIL_FROM=no-reply@<company>.ae` (verified domain in Resend)
- [ ] `CORS_ORIGINS=https://app.<company>.ae` only (no localhost)
- [ ] `COOKIE_DOMAIN=.<company>.ae`
- [ ] Frontend `VITE_API_BASE_URL=https://erp.<company>.ae/api/v1`
- [ ] Confirm `pnpm build` succeeds; `dist/` deployed to CloudFront origin (S3 or EC2 nginx)
- [ ] Confirm `npm run db:migrate` ran against RDS — every migration file in `server/src/db/migrations/` applied + `rls.sql` re-run
- [ ] Confirm `npm run seed:initial` ran (creates first director; document the temporary password handoff)

## 3. Database hardening

- [ ] RLS verified on every table (`SELECT relname FROM pg_class WHERE relrowsecurity = false AND relkind = 'r' AND relnamespace = 'public'::regnamespace;` returns 0 rows)
- [ ] `audit_log_no_update` and `audit_log_no_delete` triggers present (`SELECT tgname FROM pg_trigger WHERE tgrelid = 'audit_log'::regclass`)
- [ ] App database role is **not** a superuser; only `SELECT/INSERT/UPDATE/DELETE` on app tables (no `ALTER`, no `CREATE`, no `BYPASSRLS`)
- [ ] Connection pool maxed at 20 (current) — bump if load testing demands
- [ ] **PITR / WAL archiving** enabled on RDS (automated backups, 35-day retention)
- [ ] Nightly logical dump via [scripts/backup.sh](server/scripts/backup.sh) cron'd on the bastion or as an ECS Scheduled Task → uploads to `nasec-erp-backups-prod`
- [ ] Restore drill executed once on a fresh RDS instance — record actual RTO

## 4. Authentication / identity

- [ ] Seed director email matches a real mailbox the user controls
- [ ] First login forces a password change (manual today — recommend wiring a `force_password_reset` flag in a follow-up)
- [ ] Password reset emails are reaching inboxes (test with `/auth/forgot-password` + Resend webhook)
- [ ] Refresh cookie has `secure=true; httpOnly=true; SameSite=Lax; domain=.<company>.ae`
- [ ] All 10 demo roles created with real users + employee_id linkage where applicable

## 5. Data import / cutover

- [ ] Export from running SPA: Settings → Backend → Export localStorage JSON dump
- [ ] Run `npm run seed:import path/to/dump.json` against prod RDS
- [ ] Spot-check: employees count, projects count, finance balances all match the demo state
- [ ] After cutover, **disable** the legacy localStorage adapter by removing `LocalBackend` from `client/src/lib/backend/index.ts` — leave only the real-API adapter

## 6. Observability

- [ ] Pino-http logs streamed to CloudWatch Logs (JSON)
- [ ] One log-based metric: 4xx rate, 5xx rate, login failures/min
- [ ] Sentry (or equivalent) wired with DSN in env — both server and client
- [ ] Daily digest email to ops with: total users active, files uploaded, audit-log size, RDS storage %

## 7. Security review

- [ ] Helmet CSP tightened for production (currently disabled — re-enable with explicit allowlist for CloudFront origin)
- [ ] Rate limits in production tuned (auth: 5/min, global: 100/min — confirm acceptable under load test)
- [ ] CORS origin allowlist verified (no `*`)
- [ ] File upload MIME allowlist applied (current cap 25 MB, server-enforced)
- [ ] No secrets in git history (`git log -p | grep -i 'jwt_secret\|aws_secret\|password'` is empty)
- [ ] Dependency audit clean: `cd server && npm audit --omit=dev` and `pnpm audit` from repo root

## 8. Load test (k6)

Suggested baseline scenario before launch:

```bash
k6 run -e BASE=https://erp.<company>.ae -e TOKEN=<jwt> tests/load/erp.js
```

Targets: 50 RPS sustained at p95 < 500ms on `/api/v1/projects`, `/api/v1/tasks`, `/api/v1/hr/employees`.

## 9. Smoke test (manual, post-deploy)

Run these in order against the production URL:

1. Log in as director → see dashboard KPIs
2. Create employee → upload passport scan → letter-issue NOC → PDF downloads
3. Create project → add team member → create task → start/stop timer
4. Submit leave → approve → balance updates
5. Run payroll for current month → finalize → payslip PDFs accessible
6. Create AR invoice → server recomputes VAT → AR aging report includes it
7. Create unbalanced journal → API rejects with 400
8. Contractor user logs in → sees only own company submittals
9. Reload page → session restored via refresh cookie
10. Log out → verify cookie cleared, socket disconnected

## 10. Rollback

- [ ] Document rollback steps: previous ECS task definition + restore latest RDS snapshot
- [ ] Keep prior SPA bundle in CloudFront origin for 14 days

---

## Phase 12 deliverables in this commit

- Append-only audit log enforced by Postgres triggers (`audit_log_no_modify()`) in [server/src/db/rls.sql](server/src/db/rls.sql)
- Vitest + Supertest harness ([server/vitest.config.ts](server/vitest.config.ts), [server/src/test/setup.ts](server/src/test/setup.ts))
- Example tests: auth happy/sad paths ([server/src/modules/auth/auth.test.ts](server/src/modules/auth/auth.test.ts)), journal balance enforcement ([server/src/modules/finance/journal-balance.test.ts](server/src/modules/finance/journal-balance.test.ts))
- Backup + restore scripts ([server/scripts/backup.sh](server/scripts/backup.sh), [server/scripts/restore.sh](server/scripts/restore.sh))
- This checklist

Run the test suite locally:

```bash
createdb nasec_erp_test
cd server
npm install
DATABASE_URL=postgres://nasec:nasec_dev_pw@localhost:5432/nasec_erp_test npm run db:migrate
npm test
```
