import express from "express";
import { createServer } from "node:http";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env, corsOrigins } from "./env.js";
import { ensureUaeCoa } from "./lib/auto-journal.js";
import { globalLimiter } from "./middleware/rate-limit.js";
import { notFound, errorHandler } from "./middleware/errors.js";
import { rlsContext } from "./middleware/rls-context.js";
import { optionalAuth } from "./middleware/auth.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { adminUsersRouter } from "./modules/admin/users.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { projectItemsRouter } from "./modules/projects/project-items.routes.js";
import { financeItemsRouter } from "./modules/finance/finance-items.routes.js";
import { myFinanceRouter } from "./modules/finance/my-finance.routes.js";
import { filesRouter } from "./modules/files/files.routes.js";
import { employeesRouter } from "./modules/hr/employees.routes.js";
import { leavesRouter } from "./modules/hr/leaves.routes.js";
import { hrSimpleRouter } from "./modules/hr/simple-crud.routes.js";
import { payrollRouter } from "./modules/hr/payroll.routes.js";
import { lettersRouter } from "./modules/hr/letters.routes.js";
import { incrementRequestsRouter } from "./modules/hr/increment-requests.routes.js";
import { projectsRouter } from "./modules/projects/projects.routes.js";
import { projectExtrasRouter } from "./modules/projects/extras.routes.js";
import { tasksRouter, timesheetsRouter } from "./modules/tasks/tasks.routes.js";
import { attendanceRouter } from "./modules/attendance/attendance.routes.js";
import { crmRouter } from "./modules/crm/crm.routes.js";
import { financeRouter } from "./modules/finance/finance.routes.js";
import { procurementRouter } from "./modules/procurement/procurement.routes.js";
import { eInvoicingRouter } from "./modules/e-invoicing/e-invoicing.routes.js";
import { contractorRouter } from "./modules/contractor/contractor.routes.js";
import { clientPortalRouter } from "./modules/client-portal/client-portal.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { startRealtime } from "./lib/realtime.js";
import { startJobs } from "./jobs/index.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // SPA handles its own CSP
}));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ level: env.LOG_LEVEL }));
app.use(globalLimiter);

app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get("/api/v1/health", (_req, res) => res.json({ ok: true, version: "v1" }));

// Routes — most are auth-required at the router level
app.use("/api/v1/auth", authRouter);

// Authenticated routes go through optionalAuth+rlsContext so RLS vars are set
app.use("/api/v1", optionalAuth, rlsContext);
app.use("/api/v1/admin/users", adminUsersRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/project-items", projectItemsRouter);
app.use("/api/v1/finance-items", financeItemsRouter);
app.use("/api/v1/my-finance", myFinanceRouter);
app.use("/api/v1/files", filesRouter);
app.use("/api/v1/hr/employees", employeesRouter);
app.use("/api/v1/hr/leaves", leavesRouter);
app.use("/api/v1/hr", hrSimpleRouter);                  // /training, /assets, /disciplinary, /reviews, /onboarding
app.use("/api/v1/hr/payroll", payrollRouter);
app.use("/api/v1/hr/letters", lettersRouter);
app.use("/api/v1/hr/increment-requests", incrementRequestsRouter);
// Extras MUST mount before projectsRouter: its specific paths (/doc-folders,
// /documents, /risks, /drawings, /rfis) would otherwise be swallowed by the
// projectsRouter `GET /:id` route, which parses the segment as a project UUID.
app.use("/api/v1/projects", projectExtrasRouter);     // /risks, /doc-folders, /documents, /drawings, /rfis
app.use("/api/v1/projects", projectsRouter);
app.use("/api/v1/tasks", tasksRouter);
app.use("/api/v1/timesheets", timesheetsRouter);
app.use("/api/v1/attendance", attendanceRouter);
app.use("/api/v1/crm", crmRouter);
app.use("/api/v1/finance", financeRouter);
app.use("/api/v1/procurement", procurementRouter);
app.use("/api/v1/e-invoicing", eInvoicingRouter);
app.use("/api/v1/contractor", contractorRouter);
app.use("/api/v1/client-portal", clientPortalRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/audit", auditRouter);

app.use(notFound);
app.use(errorHandler);

export { app };

if (env.NODE_ENV !== "test") {
  const server = createServer(app);
  startRealtime(server);
  server.listen(env.PORT, () => {
    console.log(`[api] listening on http://0.0.0.0:${env.PORT}  (env=${env.NODE_ENV})`);
  void ensureUaeCoa().catch((err) => console.warn("[finance] COA seed failed", err as Error));
    startJobs();
  });
}
