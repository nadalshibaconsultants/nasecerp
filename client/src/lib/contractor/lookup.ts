import { contractorsStore, contractorUsersStore, usersStore } from "@/lib/stores";
import type { ContractorCompany } from "@/lib/contractor-portal-data";

// Legacy demo accounts (localStorage backend) — kept as a fallback so the
// portal demo cards keep working when the API is unreachable.
const DEMO_USER_COMPANY: Record<string, string> = {
  "u-contractor-abc": "abc-construction",
  "u-contractor-gulfmep": "gulf-mep",
  "u-contractor-skyline": "skyline-facades",
};

export function contractorForAuthUserId(userId: string, email?: string): ContractorCompany | undefined {
  const companies = contractorsStore.list();

  // Real backend: contractor_users links the auth account to a company
  // (by user id, or by the account email for invite-only links).
  const links = contractorUsersStore.list();
  const myEmail = email ?? usersStore.list().find((u) => u.id === userId)?.username;
  const link = links.find((l) => l.userId === userId)
    ?? (myEmail ? links.find((l) => l.email.toLowerCase() === myEmail.toLowerCase()) : undefined);
  if (link) {
    const company = companies.find((c) => c.id === link.companyId);
    if (company) return company;
  }

  // Demo fallback
  const cid = DEMO_USER_COMPANY[userId];
  return cid ? companies.find((c) => c.id === cid) : undefined;
}
