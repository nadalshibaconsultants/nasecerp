import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Permission, Role } from "@/lib/auth/types";

type Props = { children: React.ReactNode; requirePerm?: Permission | Permission[]; requireRole?: Role | Role[] };

export default function ProtectedRoute({ children, requirePerm, requireRole }: Props) {
  const { isAuthenticated, loading, canAny, hasRole, currentUser } = useAuth();
  const [location, navigate] = useLocation();

  // Only redirect once the session-restore (silent /auth/refresh + /me) has
  // settled — otherwise a hard reload / deep-link bounces to /login before the
  // token in localStorage can re-authenticate.
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const redirect = typeof window !== "undefined"
        ? `${location}${window.location.search || ""}`
        : location;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [loading, isAuthenticated, location, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-6 w-6 rounded-full border-2 border-muted border-t-foreground animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (!isAuthenticated) return null;
  const perms = !requirePerm ? [] : Array.isArray(requirePerm) ? requirePerm : [requirePerm];
  const roles = !requireRole ? [] : Array.isArray(requireRole) ? requireRole : [requireRole];
  const hasPerm = perms.length === 0 || canAny(perms);
  const hasReqRole = roles.length === 0 || hasRole(...roles);

  if (!hasPerm || !hasReqRole) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md p-6 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-3xl">🔒</div>
          <h2 className="text-lg font-bold text-amber-900 mt-2">Access denied</h2>
          <p className="text-sm text-amber-800 mt-1">Your role <strong>{currentUser?.role}</strong> doesn't have permission to view this page. Talk to the Director or HR Manager if this is wrong.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
