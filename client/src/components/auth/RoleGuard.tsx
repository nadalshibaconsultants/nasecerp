import { useAuth } from "@/lib/auth/AuthContext";
import type { Permission, Role } from "@/lib/auth/types";

type Props = { children: React.ReactNode; requirePerm?: Permission | Permission[]; requireRole?: Role | Role[]; fallback?: React.ReactNode };

export default function RoleGuard({ children, requirePerm, requireRole, fallback = null }: Props) {
  const { canAny, hasRole } = useAuth();
  const perms = !requirePerm ? [] : Array.isArray(requirePerm) ? requirePerm : [requirePerm];
  const roles = !requireRole ? [] : Array.isArray(requireRole) ? requireRole : [requireRole];
  const okPerm = perms.length === 0 || canAny(perms);
  const okRole = roles.length === 0 || hasRole(...roles);
  return (okPerm && okRole) ? <>{children}</> : <>{fallback}</>;
}
