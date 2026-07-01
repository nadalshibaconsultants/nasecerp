import { apiFetch } from "@/lib/backend/api";

export type DashboardKpis = {
  projects: { active: number };
  tasks: { open: number; overdue: number };
  crm: { openLeads: number; openPipelineAed: number; wonLast90Days: { count: number; valueAed: number } };
  hr: { pendingLeaves: number };
  finance: { arOpen: { count: number; valueAed: number }; apOpen: { count: number; valueAed: number } };
};

export const getDashboard = () => apiFetch<DashboardKpis>("/reports/dashboard");
export const getProjectPnl = (id: string) => apiFetch<{ projectId: string; contractValueAed: number; invoicedAed: number; directCostAed: number; grossMarginAed: number; grossMarginPct: number; percentInvoiced: number }>(`/reports/projects/${id}/pnl`);
export const getAttendanceSummary = (params: { from?: string; to?: string; employeeId?: string } = {}) => {
  const qs = new URLSearchParams(params as any).toString();
  return apiFetch(`/reports/attendance/summary${qs ? `?${qs}` : ""}`);
};
export const getPayrollSummary = (year?: number) =>
  apiFetch(`/reports/payroll/summary${year ? `?year=${year}` : ""}`);
export const getCrmPipeline = () => apiFetch("/reports/crm/pipeline");
export const getFinanceAging = (type: "ar" | "ap" = "ar") =>
  apiFetch(`/reports/finance/aging?type=${type}`);
