import type { Permission, User } from "./types";
import { permissionSetHas } from "./permission-helpers";

const CLIENT_MODULE_HOME: { perm: Permission; path: string }[] = [
  { perm: "projects:read", path: "/projects" },
  { perm: "tasks:read", path: "/tasks" },
  { perm: "attendance:read", path: "/attendance" },
  { perm: "documents:read", path: "/documents" },
  { perm: "reports:read", path: "/reports" },
  { perm: "finance:read", path: "/finance" },
  { perm: "crm:read", path: "/crm" },
  { perm: "hr:read", path: "/hr" },
];

export function clientHomePath(user?: User): string {
  if (user?.role !== "client") return "/dashboard";
  return "/projects";
  const grants = user.extraPermissions ?? [];
  return CLIENT_MODULE_HOME.find((item) => permissionSetHas(grants, item.perm))?.path ?? "/client/no-access";
}
