/**
 * Mobile shell — bottom tab navigator that replaces the desktop sidebar on
 * native builds or narrow viewports. Tabs are role-aware.
 */
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Clock,
  FolderKanban,
  ListTodo,
  UserCircle,
  Bell,
  MapPin,
  Users,
  FileText,
  DollarSign,
} from "lucide-react";
import Logo from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth/AuthContext";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { useAutoGeofence } from "@/lib/native/geofence-service";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import type { Role } from "@/lib/auth/types";

type Tab = { path: string; label: string; icon: any };

const TABS_BY_ROLE: Record<Role, Tab[]> = {
  director: [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/projects", label: "Projects", icon: FolderKanban },
    { path: "/hr", label: "HR", icon: Users },
    { path: "/finance", label: "Finance", icon: DollarSign },
    { path: "/my-tasks", label: "My Tasks", icon: ListTodo },
    { path: "/my-hr", label: "Me", icon: UserCircle },
  ],
  "hr-manager": [
    { path: "/hr", label: "HR", icon: Users },
    { path: "/attendance", label: "Attendance", icon: Clock },
    { path: "/my-tasks", label: "My Tasks", icon: ListTodo },
    { path: "/my-hr", label: "Me", icon: UserCircle },
  ],
  "finance-manager": [
    { path: "/finance", label: "Finance", icon: DollarSign },
    { path: "/reports", label: "Reports", icon: FileText },
    { path: "/my-tasks", label: "My Tasks", icon: ListTodo },
    { path: "/my-hr", label: "Me", icon: UserCircle },
  ],
  accountant: [
    { path: "/finance", label: "Finance", icon: DollarSign },
    { path: "/my-tasks", label: "My Tasks", icon: ListTodo },
    { path: "/my-hr", label: "Me", icon: UserCircle },
  ],
  pm: [
    { path: "/projects", label: "Projects", icon: FolderKanban },
    { path: "/my-tasks", label: "My Tasks", icon: ListTodo },
    { path: "/attendance", label: "Attendance", icon: Clock },
    { path: "/my-hr", label: "Me", icon: UserCircle },
  ],
  "design-lead": [
    { path: "/projects", label: "Projects", icon: FolderKanban },
    { path: "/tasks", label: "Tasks", icon: ListTodo },
    { path: "/documents", label: "Docs", icon: FileText },
    { path: "/my-tasks", label: "My Tasks", icon: ListTodo },
    { path: "/my-hr", label: "Me", icon: UserCircle },
  ],
  "site-engineer": [
    { path: "/mobile/site", label: "Site", icon: MapPin },
    { path: "/attendance", label: "Punches", icon: Clock },
    { path: "/my-tasks", label: "My Tasks", icon: ListTodo },
    { path: "/my-hr", label: "Me", icon: UserCircle },
  ],
  "bd-manager": [
    { path: "/crm", label: "CRM", icon: FolderKanban },
    { path: "/my-tasks", label: "My Tasks", icon: ListTodo },
    { path: "/my-hr", label: "Me", icon: UserCircle },
  ],
  employee: [
    { path: "/my-hr", label: "My HR", icon: UserCircle },
    { path: "/my-tasks", label: "My Tasks", icon: ListTodo },
  ],
  contractor: [
    { path: "/contractor-portal/dashboard", label: "Home", icon: Home },
    {
      path: "/contractor-portal/submittals",
      label: "Submittals",
      icon: ListTodo,
    },
    { path: "/contractor-portal/new", label: "+ New", icon: ListTodo },
    { path: "/contractor-portal/inbox", label: "Inbox", icon: Bell },
    { path: "/contractor-portal/stats", label: "Stats", icon: UserCircle },
  ],
  client: [{ path: "/client-portal/dashboard", label: "Home", icon: Home }],
};

export default function MobileShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = useAuth();
  const [location] = useLocation();
  const tabs = currentUser ? TABS_BY_ROLE[currentUser.role] || [] : [];
  useAutoGeofence(); // no-op on web; live tracking on native

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top mini-header */}
      <header className="h-12 border-b border-border bg-card flex items-center justify-between px-3 shrink-0">
        <Logo variant="light" size={20} />
        {currentUser && (
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Link href="/my-hr">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className="text-[10px] text-white"
                  style={{ background: currentUser.avatarColor }}
                >
                  {currentUser.displayName
                    .split(" ")
                    .map(s => s[0])
                    .slice(0, 2)
                    .join("")}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-16">{children}</main>

      {/* Bottom tab bar */}
      {tabs.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          {tabs.slice(0, 5).map(t => {
            const Icon = t.icon;
            const isActive =
              location === t.path ||
              (t.path !== "/dashboard" && location.startsWith(t.path));
            return (
              <Link key={t.path} href={t.path} className="flex-1">
                <div
                  className={`flex flex-col items-center justify-center h-full gap-0.5 ${isActive ? "text-black" : "text-slate-500"}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{t.label}</span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-black mt-0.5" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
