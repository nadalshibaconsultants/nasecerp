// Server-side mirror of client/src/lib/auth/permissions.ts.
// Single source of truth — keep in sync with the frontend file.

export type Role =
  | "director"
  | "hr-manager"
  | "finance-manager"
  | "accountant"
  | "pm"
  | "design-lead"
  | "site-engineer"
  | "bd-manager"
  | "employee"
  | "contractor"
  | "client";

export type Permission =
  | "*"
  | "hr:read"
  | "hr:write"
  | "hr:payroll:read"
  | "hr:payroll:write"
  | "hr:letters:read"
  | "hr:letters:write"
  | "hr:disciplinary:read"
  | "hr:disciplinary:write"
  | "hr:reviews:read"
  | "hr:reviews:write"
  | "attendance:read"
  | "attendance:write"
  | "attendance:override"
  | "projects:read"
  | "projects:write"
  | "projects:approve"
  | "projects:postcontract:write"
  | "projects:precontract:write"
  | "tasks:read"
  | "tasks:write"
  | "finance:read"
  | "finance:write"
  | "finance:invoices:write"
  | "crm:read"
  | "crm:write"
  | "documents:read"
  | "documents:write"
  | "reports:read"
  | "settings:read"
  | "settings:write"
  | "self:read"
  | "contractor:portal"
  | "client:portal";

const HR_ALL: Permission[] = [
  "hr:read",
  "hr:write",
  "hr:payroll:read",
  "hr:payroll:write",
  "hr:letters:read",
  "hr:letters:write",
  "hr:disciplinary:read",
  "hr:disciplinary:write",
  "hr:reviews:read",
  "hr:reviews:write",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  director: ["*"],
  // Every non-contractor role can create + assign tasks; visibility is scoped
  // per-user in tasks.routes.ts (reporter or assignee).
  "hr-manager": [
    ...HR_ALL,
    "attendance:read",
    "attendance:override",
    "self:read",
    "documents:read",
    "reports:read",
    "projects:read",
    "tasks:read",
    "tasks:write",
    "settings:read",
    "settings:write",
  ],
  "finance-manager": [
    "finance:read",
    "finance:write",
    "finance:invoices:write",
    "hr:payroll:read",
    "reports:read",
    "projects:read",
    "tasks:read",
    "tasks:write",
    "documents:read",
    "self:read",
  ],
  accountant: [
    "finance:read",
    "finance:invoices:write",
    "reports:read",
    "tasks:read",
    "tasks:write",
    "self:read",
  ],
  pm: [
    "projects:read",
    "projects:write",
    "projects:approve",
    "projects:postcontract:write",
    "tasks:read",
    "tasks:write",
    "attendance:read",
    "documents:read",
    "documents:write",
    "reports:read",
    "crm:read",
    "hr:read",
    "self:read",
  ],
  "design-lead": [
    "projects:read",
    "projects:write",
    "projects:approve",
    "projects:precontract:write",
    "tasks:read",
    "tasks:write",
    "documents:read",
    "documents:write",
    "self:read",
  ],
  "site-engineer": [
    "projects:read",
    "tasks:read",
    "tasks:write",
    "attendance:read",
    "attendance:write",
    "documents:read",
    "self:read",
  ],
  "bd-manager": [
    "crm:read",
    "crm:write",
    "projects:read",
    "reports:read",
    "tasks:read",
    "tasks:write",
    "self:read",
  ],
  employee: ["tasks:read", "tasks:write", "attendance:read", "attendance:write", "self:read"],
  // The contractor portal reads projects (to attach submittals), reads doc
  // folders and mirrors submittals into the documents register — those routes
  // gate on projects:read / documents:* so the portal needs them too.
  contractor: ["contractor:portal", "projects:read", "documents:read", "documents:write"],
  client: ["client:portal"],
};

export function hasPermission(role: Role, perm: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes("*")) return true;
  return perms.includes(perm);
}

export function hasAnyPermission(role: Role, perms: Permission[]): boolean {
  return perms.some(p => hasPermission(role, p));
}

// Role permissions OR per-user grants (the `extra_permissions` column).
export function effectiveHas(
  role: Role,
  extra: string[] | null | undefined,
  perm: Permission
): boolean {
  if (hasPermission(role, perm)) return true;
  const e = extra ?? [];
  if (e.includes("*") || e.includes(perm)) return true;
  const readImplications: Partial<Record<Permission, Permission[]>> = {
    "projects:read": ["projects:write", "projects:approve", "projects:postcontract:write", "projects:precontract:write"],
    "tasks:read": ["tasks:write"],
    "finance:read": ["finance:write", "finance:invoices:write"],
    "crm:read": ["crm:write"],
    "documents:read": ["documents:write"],
    "hr:read": ["hr:write"],
  };
  return (readImplications[perm] ?? []).some((writePerm) => e.includes(writePerm));
}
export function effectiveHasAny(
  role: Role,
  extra: string[] | null | undefined,
  perms: Permission[]
): boolean {
  return perms.some(p => effectiveHas(role, extra, p));
}
