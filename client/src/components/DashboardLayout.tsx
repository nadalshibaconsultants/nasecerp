/**
 * DashboardLayout - auth-aware
 *  - Sidebar items filtered by user permissions
 *  - Two-level nav: HR has Attendance as child, Finance has E-Invoicing as child
 *  - Top-bar UserMenu with role badge + sign-out
 */
import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Users, Clock, DollarSign, FolderKanban, ListTodo, UserCircle,
  FileArchive, BarChart3, LayoutDashboard, ChevronLeft, ChevronRight,
  Search, Menu, CheckCircle2, MessageSquare, GitBranch, Receipt,
  ChevronDown, ShoppingCart, Languages, Settings, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import UserMenu from "@/components/auth/UserMenu";
import { useI18n } from "@/lib/i18n";
import Logo from "@/components/brand/Logo";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useAuth } from "@/lib/auth/AuthContext";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { Permission } from "@/lib/auth/types";
import { permissionSetHas } from "@/lib/auth/permission-helpers";

type NavItem = {
  path: string;
  label: string;
  icon: any;
  perms?: Permission[];
  children?: NavItem[];
};

const ALL_NAV: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    path: "/hr",
    label: "HR & Workforce",
    icon: Users,
    perms: ["hr:read", "hr:payroll:read"],
    children: [
      { path: "/attendance", label: "Attendance", icon: Clock, perms: ["attendance:read"] },
    ],
  },
  { path: "/my-hr", label: "My HR", icon: UserCircle, perms: ["self:read"] },
  { path: "/my-finance", label: "My Finance", icon: Wallet, perms: ["self:read"] },
  { path: "/my-tasks", label: "My Tasks", icon: ListTodo, perms: ["self:read"] },
  {
    path: "/finance",
    label: "Finance",
    icon: DollarSign,
    perms: ["finance:read"],
    children: [
      { path: "/finance/e-invoicing", label: "E-Invoicing", icon: Receipt, perms: ["finance:read"] },
      { path: "/finance/procurement", label: "Procurement", icon: ShoppingCart, perms: ["finance:read"] },
    ],
  },
  { path: "/projects", label: "Projects", icon: FolderKanban, perms: ["projects:read", "self:read"] },
  { path: "/tasks", label: "Tasks", icon: ListTodo, perms: ["tasks:read"] },
  { path: "/crm", label: "CRM", icon: UserCircle, perms: ["crm:read"] },
  { path: "/documents", label: "Documents", icon: FileArchive, perms: ["documents:read"] },
  { path: "/reports", label: "Reports & BI", icon: BarChart3, perms: ["reports:read"] },
  { path: "/approvals", label: "Approvals", icon: CheckCircle2 },
  { path: "/chat", label: "Chat", icon: MessageSquare },
  { path: "/workflow", label: "NASEC Workflow", icon: GitBranch, perms: ["projects:read"] },
  { path: "/settings", label: "Settings", icon: Settings, perms: ["settings:read"] },
];

function filterNav(items: NavItem[], canAny: (perms: Permission[]) => boolean): NavItem[] {
  return items
    .filter((it) => !it.perms || canAny(it.perms))
    .map((it) => ({
      ...it,
      children: it.children ? filterNav(it.children, canAny) : undefined,
    }));
}

function findItemByPath(items: NavItem[], path: string): NavItem | undefined {
  for (const it of items) {
    if (it.path === path) return it;
    if (it.children) {
      const c = findItemByPath(it.children, path);
      if (c) return c;
    }
  }
  return undefined;
}

function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      className="px-2 py-1 text-xs rounded-md border border-border hover:bg-secondary flex items-center gap-1"
      title="Switch language"
    >
      <Languages className="w-3.5 h-3.5" /> {lang === "en" ? "AR" : "EN"}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [location] = useLocation();
  const { canAny, currentUser } = useAuth();
  const clientCanAny = (perms: Permission[]) => {
    if (currentUser?.role !== "client") return canAny(perms);
    return perms.some((perm) => permissionSetHas(currentUser.extraPermissions ?? [], perm));
  };

  const navItems = useMemo(
    () => {
      if (currentUser?.role === "client") {
        return filterNav(ALL_NAV.filter((item) => item.path === "/projects" || item.perms), clientCanAny);
      }
      return filterNav(ALL_NAV, canAny);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canAny, currentUser]
  );

  // Auto-expand any parent whose path or child path matches the current route
  useEffect(() => {
    const next: Record<string, boolean> = { ...expanded };
    let changed = false;
    for (const it of navItems) {
      if (it.children && it.children.length > 0) {
        const hit = it.path === location || it.children.some((c) => c.path === location);
        if (hit && !next[it.path]) {
          next[it.path] = true;
          changed = true;
        }
      }
    }
    if (changed) setExpanded(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, navItems]);

  const currentModule = findItemByPath(navItems, location);

  function toggleExpand(path: string) {
    setExpanded((m) => ({ ...m, [path]: !m[path] }));
  }

  function renderItem(item: NavItem, depth: number) {
    const Icon = item.icon;
    const hasChildren = !!item.children && item.children.length > 0;
    const isOpen = !!expanded[item.path];
    const childActive = hasChildren && item.children!.some((c) => c.path === location);
    const isActive = location === item.path;
    const showActive = isActive || (!isOpen && childActive);

    return (
      <div key={item.path}>
        <div
          className={`group flex items-center gap-2 pr-1 rounded-md transition-all duration-150 cursor-pointer ${
            showActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-[3px] border-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          }`}
          style={{ paddingLeft: depth === 0 ? 12 : 12 + depth * 14 }}
        >
          <Link href={item.path} className="flex-1">
            <div
              className="flex items-center gap-3 py-2.5"
              onClick={() => setMobileOpen(false)}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${showActive ? "text-sidebar-primary" : ""}`} />
              {!collapsed && <span className={`text-sm font-medium truncate ${depth > 0 ? "opacity-90" : ""}`}>{item.label}</span>}
            </div>
          </Link>
          {hasChildren && !collapsed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item.path);
              }}
              className="p-1 rounded hover:bg-sidebar-accent/60"
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
              />
            </button>
          )}
        </div>
        {hasChildren && (isOpen || collapsed) && (
          <div className={collapsed ? "" : "mt-0.5 space-y-0.5"}>
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 ease-out ${collapsed ? "w-[68px]" : "w-[260px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center flex-shrink-0">
              <Logo variant="dark" size={collapsed ? 22 : 26} />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">ERP Platform</span>
                <span className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest">Engineering Consultants</span>
              </div>
            )}
          </div>
        </div>

        {!collapsed && currentUser && (
          <div className="px-3 py-2 border-b border-sidebar-border/40">
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Signed in as</div>
            <div className="text-sm font-medium truncate">{currentUser.displayName}</div>
            <Badge variant="outline" className="mt-1 text-[9px] border-sidebar-foreground/30 text-sidebar-foreground/80">{ROLE_LABELS[currentUser.role]}</Badge>
          </div>
        )}

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => renderItem(item, 0))}
          {navItems.length === 0 && !collapsed && <div className="px-3 py-2 text-xs text-sidebar-foreground/60">No modules available for your role.</div>}
        </nav>

        <div className="hidden lg:flex items-center justify-center py-3 border-t border-sidebar-border">
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></Button>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">NASEC ERP</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">{currentModule?.label || "Dashboard"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center relative">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 w-[200px] lg:w-[280px] h-9 bg-secondary border-0" />
            </div>
            <LangToggle />
            <NotificationCenter />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
