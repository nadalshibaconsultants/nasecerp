import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import Logo from "@/components/brand/Logo";
import { useCollection } from "@/lib/store";
import { usersStore } from "@/lib/stores";
import { ROLE_LABELS, ROLE_HOME } from "@/lib/auth/permissions";
import { clientHomePath } from "@/lib/auth/client-home";

export default function AuthLoginPage() {
  const { login } = useAuth();
  const users = useCollection(usersStore);
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = (() => {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get("redirect") || "";
    return value.startsWith("/") && !value.startsWith("//") ? value : "";
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await login(username.trim(), password);
      if (!r.ok) { toast.error(r.error || "Login failed"); return; }
      toast.success(`Welcome, ${r.user!.displayName}`);
      navigate(redirectTo || (r.user!.role === "client" ? clientHomePath(r.user!) : ROLE_HOME[r.user!.role]));
    } finally {
      setSubmitting(false);
    }
  }
  // The role cards prefill the email field — the backend authenticates by
  // password, so pick a card then type the password (loginAs is retired).
  function quickFill(userId: string) {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    setUsername(u.username);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-orange-50/40 flex items-center justify-center p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl w-full">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Logo variant="light" size={42} />
              <div className="border-l border-slate-200 pl-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-500">ERP Platform</div>
                <div className="text-xs text-muted-foreground">Nadal Al Shiba Engineering Consultants</div>
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your NASEC email and password.</p>

            <form onSubmit={submit} className="mt-6 space-y-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="director@nasec.local" className="mt-1" autoComplete="email" />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" autoComplete="current-password" />
                <p className="text-[10px] text-muted-foreground mt-1">Demo login: <span className="font-medium">director@nasec.local</span> / <span className="font-medium">ChangeMe!123</span></p>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Signing in…" : <>Sign in <ArrowRight className="w-4 h-4 ml-1" /></>}</Button>
            </form>

            <div className="mt-6 p-3 bg-slate-50 rounded text-xs text-slate-600">
              <Sparkles className="w-3.5 h-3.5 inline mr-1 text-emerald-500" />
              Each role sees a different ERP. Swap accounts any time via the user menu in the top-right.
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" /> Pick a role</h2>
              <Badge variant="outline" className="text-[10px]">Fill email</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Click a card to fill its email, then enter the password to sign in as that role.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {users.map((u) => {
                const initials = u.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("");
                return (
                  <button key={u.id} type="button" onClick={() => quickFill(u.id)} className="text-left p-3 rounded border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-white text-[10px]" style={{ background: u.avatarColor }}>{initials}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{u.displayName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{ROLE_LABELS[u.role]}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
