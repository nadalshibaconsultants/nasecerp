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

export type User = {
  id: string;
  username: string;
  passwordHash?: string;
  displayName: string;
  role: Role;
  employeeId?: string;
  active: boolean;
  lastLoginAt?: string;
  avatarColor?: string;
  // Per-user module grants on top of the role's defaults (set by a Director).
  extraPermissions?: Permission[];
};

export type Session = { userId: string; startedAt: string };
