import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, Settings, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth/AuthContext";
import { ROLE_LABELS } from "@/lib/auth/permissions";

export default function UserMenu() {
  const { currentUser, logout, permissions } = useAuth();
  const [, navigate] = useLocation();
  if (!currentUser) return null;
  const initials = currentUser.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2 h-9">
          <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] text-white" style={{ background: currentUser.avatarColor }}>{initials}</AvatarFallback></Avatar>
          <div className="hidden md:block text-left">
            <div className="text-xs font-medium leading-tight">{currentUser.displayName}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{ROLE_LABELS[currentUser.role]}</div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col">
          <div className="font-medium">{currentUser.displayName}</div>
          <div className="text-xs text-muted-foreground">{currentUser.username}</div>
          <Badge variant="outline" className="mt-1 self-start text-[10px]"><Shield className="w-3 h-3 mr-1" />{ROLE_LABELS[currentUser.role]}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/my-hr")}><UserIcon className="w-4 h-4 mr-2" /> My HR profile</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings")}><Settings className="w-4 h-4 mr-2" /> Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-[10px] text-muted-foreground">{permissions.length === 1 && permissions[0] === "*" ? "All permissions" : `${permissions.length} permissions`}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { logout(); navigate("/login"); }} className="text-red-600"><LogOut className="w-4 h-4 mr-2" /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
