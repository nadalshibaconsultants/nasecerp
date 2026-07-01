import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { apiFetch, setAccessToken, getAccessToken, ApiError } from "@/lib/backend/api";
import { getSocket, disconnectSocket } from "@/lib/realtime/socket";
import type { User, Role, Permission } from "./types";
import { ROLE_PERMISSIONS } from "./permissions";
import { permissionSetHas } from "./permission-helpers";

type AuthContextValue = {
  currentUser: User | undefined;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  loginAs: (userId: string) => void;
  logout: () => Promise<void>;
  can: (perm: Permission) => boolean;
  canAny: (perms: Permission[]) => boolean;
  hasRole: (...roles: Role[]) => boolean;
  permissions: Permission[];
};

const AuthContext = createContext<AuthContextValue | null>(null);

type MeResponse = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  office?: string | null;
  employeeId?: string | null;
  avatarColor?: string | null;
  extraPermissions?: Permission[] | null;
};

function mapMe(m: MeResponse): User {
  return {
    id: m.id,
    username: m.email,
    displayName: m.displayName,
    role: m.role,
    employeeId: m.employeeId ?? undefined,
    active: true,
    avatarColor: m.avatarColor ?? undefined,
    extraPermissions: m.extraPermissions ?? [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMe = useCallback(async () => {
    try {
      const me = await apiFetch<MeResponse>("/auth/me");
      setCurrentUser(mapMe(me));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setCurrentUser(undefined);
      else console.warn("[auth] /me failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: try to restore session via existing access token or refresh cookie
  useEffect(() => {
    if (getAccessToken()) {
      fetchMe().then(() => { getSocket(); });
    } else {
      // Attempt silent refresh
      apiFetch<{ accessToken: string }>("/auth/refresh", { method: "POST", auth: false })
        .then(({ accessToken }) => { setAccessToken(accessToken); return fetchMe(); })
        .then(() => { getSocket(); })
        .catch(() => setLoading(false));
    }
  }, [fetchMe]);

  // Effective permissions = role defaults + per-user grants set by a Director.
  const permissions = useMemo<Permission[]>(
    () => currentUser
      ? [...(ROLE_PERMISSIONS[currentUser.role] || []), ...(currentUser.extraPermissions || [])]
      : [],
    [currentUser],
  );
  const can = useCallback(
    (p: Permission) => permissionSetHas(permissions, p),
    [permissions],
  );

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { accessToken, user } = await apiFetch<{ accessToken: string; user: MeResponse }>("/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });
      setAccessToken(accessToken);
      const u = mapMe(user);
      setCurrentUser(u);
      getSocket();
      return { ok: true, user: u };
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed";
      return { ok: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    try { await apiFetch("/auth/logout", { method: "POST", auth: false }); } catch { /* ignore */ }
    disconnectSocket();
    setAccessToken(null);
    setCurrentUser(undefined);
  }, []);

  // Demo-only impersonation removed in real backend — kept as no-op for compatibility
  const loginAs = useCallback((_userId: string) => {
    console.warn("[auth] loginAs() is disabled with the real backend. Use a proper login.");
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      loading,
      login,
      loginAs,
      logout,
      can,
      canAny: (p) => p.some(can),
      hasRole: (...rs) => currentUser ? rs.includes(currentUser.role) : false,
      permissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useCurrentActor(): string {
  const { currentUser } = useAuth();
  return currentUser ? `${currentUser.displayName} (${currentUser.role})` : "System";
}
