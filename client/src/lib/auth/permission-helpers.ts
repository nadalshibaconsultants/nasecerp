import type { Permission } from "./types";

const READ_IMPLICATIONS: Partial<Record<Permission, Permission[]>> = {
  "projects:read": ["projects:write", "projects:approve", "projects:postcontract:write", "projects:precontract:write"],
  "tasks:read": ["tasks:write"],
  "finance:read": ["finance:write", "finance:invoices:write"],
  "crm:read": ["crm:write"],
  "documents:read": ["documents:write"],
  "hr:read": ["hr:write"],
};

export function permissionSetHas(grants: Permission[], perm: Permission): boolean {
  if (grants.includes("*") || grants.includes(perm)) return true;
  return (READ_IMPLICATIONS[perm] ?? []).some((writePerm) => grants.includes(writePerm));
}
