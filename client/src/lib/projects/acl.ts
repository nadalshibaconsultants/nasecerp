import type { Project } from "./types";
import type { User, Role } from "@/lib/auth/types";

/**
 * Director / HR Manager / Finance Manager / Business Development see all projects.
 * Everyone else sees only projects where they're on the team.
 */
export function visibleProjects(projects: Project[], user?: User | undefined): Project[] {
  if (!user) return [];
  if (user.role === "client") return projects;
  const FULL_VIEW: Role[] = ["director", "hr-manager", "finance-manager", "bd-manager"];
  if (FULL_VIEW.includes(user.role)) return projects;
  return projects.filter((p) => (p.teamUserIds || []).includes(user.id) || p.pmUserId === user.id);
}

export function canEditProject(p: Project, user?: User | undefined): boolean {
  if (!user) return false;
  if (user.role === "director") return true;
  if (user.role === "pm" && (p.pmUserId === user.id || (p.teamUserIds || []).includes(user.id))) return true;
  return false;
}
