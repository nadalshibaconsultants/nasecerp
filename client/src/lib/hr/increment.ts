// Salary-increment self-service — store + helpers backed by /api/v1/hr/increment-requests.
// Employees may request only after 1 year of service; HR approves/rejects.
import { createApiCollection } from "@/lib/store";
import { apiFetch } from "@/lib/backend/api";

export type IncrementStatus = "submitted" | "approved" | "rejected";

export type IncrementRequest = {
  id: string;
  ownerUserId?: string;
  ownerEmail?: string;
  employeeId?: string;
  employeeName?: string;
  employeeCode?: string;
  joinDate?: string;
  reason?: string;
  requestedPercent?: number;
  requestedAmount?: number;
  status: IncrementStatus;
  requestedAt?: string;
  reviewedByEmail?: string;
  reviewedAt?: string;
  decisionNote?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type IncrementEligibility = {
  eligible: boolean;
  joinDate?: string;
  eligibleDate?: string;
  completedOneYear?: boolean;
  pending?: boolean;
  reason?: string;
};

export const incrementRequestsStore = createApiCollection<IncrementRequest>(
  "salary-increment",
  {
    list: "/hr/increment-requests",
    create: "/hr/increment-requests",
    update: (id) => `/hr/increment-requests/${id}`,
    remove: (id) => `/hr/increment-requests/${id}`,
  },
);

export async function fetchIncrementEligibility(): Promise<IncrementEligibility> {
  return apiFetch<IncrementEligibility>("/hr/increment-requests/eligibility");
}

export async function submitIncrementRequest(body: { reason?: string; requestedPercent?: number; requestedAmount?: number }) {
  const res = await apiFetch<IncrementRequest>("/hr/increment-requests", { method: "POST", body });
  incrementRequestsStore.refresh?.();
  return res;
}

export async function decideIncrementRequest(id: string, decision: "approve" | "reject", note?: string) {
  const res = await apiFetch<IncrementRequest>(`/hr/increment-requests/${id}/decision`, { method: "PATCH", body: { decision, note } });
  incrementRequestsStore.refresh?.();
  return res;
}
