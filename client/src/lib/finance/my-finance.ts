// Employee finance self-service — store + helpers backed by /api/v1/my-finance.
// Staff submit expense claims / invoice uploads and track approval status;
// finance reviews them. Petty cash the user holds is read-only.
import { createApiCollection } from "@/lib/store";
import { apiFetch } from "@/lib/backend/api";

export type StaffFinanceStatus = "submitted" | "approved" | "rejected";

export type StaffFinanceSubmission = {
  id: string;
  docType: "expense" | "invoice";
  title: string;
  amount?: number;
  currency?: string;
  category?: string;   // expense category
  vendor?: string;     // invoice vendor
  date?: string;
  description?: string;
  projectId?: string;
  fileId?: string;
  fileName?: string;
  // server-managed
  ownerUserId?: string;
  ownerEmail?: string;
  employeeId?: string | null;
  office?: string | null;
  status: StaffFinanceStatus;
  submittedAt?: string;
  reviewedByUserId?: string;
  reviewedByEmail?: string;
  reviewedAt?: string;
  rejectReason?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const staffFinanceStore = createApiCollection<StaffFinanceSubmission>(
  "staff-finance",
  {
    list: "/my-finance",
    create: "/my-finance",
    update: (id) => `/my-finance/${id}`,
    remove: (id) => `/my-finance/${id}`,
  },
  {
    // Strip client-only / server-managed fields before POST.
    beforeCreate: (s) => {
      const { id, status, ownerUserId, ownerEmail, employeeId, office, submittedAt, reviewedByUserId, reviewedByEmail, reviewedAt, rejectReason, createdAt, updatedAt, ...rest } = s as any;
      return rest;
    },
  },
);

export async function decideSubmission(id: string, decision: "approve" | "reject", reason?: string) {
  const res = await apiFetch<StaffFinanceSubmission>(`/my-finance/${id}/decision`, {
    method: "PATCH",
    body: { decision, reason },
  });
  staffFinanceStore.refresh?.();
  return res;
}

export type PettyCashFloatLite = {
  id: string;
  office?: string;
  custodianDisplay?: string;
  custodianUserId?: string;
  floatAmount?: number;
  currentBalance?: number;
  currency?: string;
  isActive?: boolean;
};

export type PettyCashVoucherLite = {
  id: string;
  voucherNumber?: string;
  floatId?: string;
  date?: string;
  type?: string;
  payee?: string;
  amount?: number;
  description?: string;
  status?: string;
};

export async function fetchMyPettyCash(): Promise<{ floats: PettyCashFloatLite[]; vouchers: PettyCashVoucherLite[] }> {
  return apiFetch<{ floats: PettyCashFloatLite[]; vouchers: PettyCashVoucherLite[] }>("/my-finance/petty-cash");
}
