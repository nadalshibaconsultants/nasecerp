/**
 * ContractorPortalLayout — Separate layout for contractor-facing portal
 * Visually distinct from internal ERP — teal/slate theme
 * No access to internal modules, chat, financials, etc.
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FileText,
  Plus,
  Inbox,
  FolderOpen,
  Settings,
  LogOut,
  Bell,
  HardHat,
  Menu,
  X,
  BarChart3,
} from "lucide-react";

const navItems = [
  { path: "/contractor-portal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/contractor-portal/submittals", label: "My Submittals", icon: FileText },
  { path: "/contractor-portal/new", label: "New Submittal", icon: Plus },
  { path: "/contractor-portal/inbox", label: "From Consultant", icon: Inbox },
  { path: "/contractor-portal/drawings", label: "Drawings", icon: FolderOpen },
  { path: "/contractor-portal/stats", label: "Statistics", icon: BarChart3 },
];

export default function ContractorPortalLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-[240px] bg-slate-900 text-slate-200 transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <HardHat className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">NASEC</p>
              <p className="text-[10px] text-teal-400 uppercase tracking-wider">Contractor Portal</p>
            </div>
          </div>
        </div>

        {/* Project Selector */}
        <div className="p-3 border-b border-slate-700/50">
          <div className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700">
            <p className="text-[10px] text-slate-400 uppercase">Active Project</p>
            <p className="text-sm font-medium text-white truncate">Marina Heights Tower</p>
            <p className="text-[10px] text-slate-400 font-mono">AR-2026-MHT-0018</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path !== "/contractor-portal/dashboard" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path}>
                <button className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-teal-600/20 text-teal-300 font-medium"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}>
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.label === "New Submittal" && (
                    <Badge className="ml-auto bg-teal-600 text-white text-[9px] px-1.5">NEW</Badge>
                  )}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2 px-2">
            <Avatar className="h-7 w-7 border border-slate-600">
              <AvatarFallback className="bg-teal-700 text-white text-[10px]">RM</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">Rashid Al Maktoum</p>
              <p className="text-[10px] text-slate-400 truncate">ABC Construction LLC</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-md hover:bg-slate-100">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500">
              <span>Contractor Portal</span>
              <span>/</span>
              <span className="text-slate-900 font-medium">
                {navItems.find((n) => location.startsWith(n.path))?.label || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="relative" onClick={() => toast.info("No new notifications")}>
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center">2</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-teal-100 text-teal-700 text-[10px]">RM</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">Rashid</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2"><Settings className="w-3.5 h-3.5" /> Account Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-red-600" onClick={() => { toast.info("Logged out"); window.location.href = "/contractor-portal"; }}>
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
