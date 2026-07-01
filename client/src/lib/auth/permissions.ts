import type { Role, Permission } from "./types";

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
  // Every non-contractor role can create tasks and assign them. Visibility is
  // scoped server-side: each user sees tasks they reported or are assigned.
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

export const ROLE_LABELS: Record<Role, string> = {
  director: "Director",
  "hr-manager": "HR Manager",
  "finance-manager": "Finance Manager",
  accountant: "Accountant",
  pm: "Project Manager",
  "design-lead": "Design Lead",
  "site-engineer": "Site Engineer",
  "bd-manager": "Business Development",
  employee: "Employee",
  contractor: "Contractor (Portal)",
  client: "Client (Portal)",
};

export const ROLE_HOME: Record<Role, string> = {
  director: "/dashboard",
  "hr-manager": "/hr",
  "finance-manager": "/finance",
  accountant: "/finance",
  pm: "/projects",
  "design-lead": "/projects",
  "site-engineer": "/attendance",
  "bd-manager": "/crm",
  employee: "/my-hr",
  contractor: "/contractor-portal/dashboard",
  client: "/client/no-access",
};
