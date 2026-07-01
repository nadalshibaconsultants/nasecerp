import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { HardHat, ArrowRight, Building2 } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCollection } from "@/lib/store";
import { usersStore, contractorsStore } from "@/lib/stores";

export default function ContractorLogin() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const users = useCollection(usersStore);
  const contractors = useCollection(contractorsStore);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const contractorUsers = users.filter((u) => u.role === "contractor");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await login(email.trim(), password);
      if (!r.ok) { toast.error(r.error || "Login failed"); return; }
      if (r.user?.role !== "contractor") { toast.error("Not a contractor account"); return; }
      toast.success(`Welcome, ${r.user.displayName}`);
      navigate("/contractor-portal/dashboard");
    } finally {
      setSubmitting(false);
    }
  }
  // The contractor cards prefill the email field — the backend authenticates
  // by password, so pick a card then type the password (loginAs is retired).
  function quick(userId: string) {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    setEmail(u.username);
  }
  function companyOf(userId: string) {
    const map: Record<string, string> = { "u-contractor-abc": "abc-construction", "u-contractor-gulfmep": "gulf-mep", "u-contractor-skyline": "skyline-facades" };
    return contractors.find((c) => c.id === map[userId]);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl w-full">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Logo variant="light" size={36} />
              <div className="border-l border-slate-200 pl-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Contractor Portal</div>
                <div className="text-xs text-muted-foreground">Submit RFIs · MOS · Shop Drawings · NCRs · etc.</div>
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><HardHat className="w-6 h-6" /> Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Use the email issued by NASEC during your contractor onboarding.</p>

            <form onSubmit={submit} className="mt-6 space-y-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@yourcompany.ae" className="mt-1" autoComplete="email" />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Signing in…" : <>Sign in <ArrowRight className="w-4 h-4 ml-1" /></>}</Button>
            </form>
            <p className="text-[11px] text-slate-500 mt-4">Need internal access? Use the <a href="/login" className="text-emerald-700 hover:underline">main ERP login</a> instead.</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" /> Demo contractors</h2>
              <Badge variant="outline" className="text-[10px]">Fill email</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Click a card to fill its email, then enter the password to sign in.</p>
            <div className="grid grid-cols-1 gap-2">
              {contractorUsers.map((u) => {
                const c = companyOf(u.id);
                return (
                  <button key={u.id} onClick={() => quick(u.id)} className="text-left p-3 rounded border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="text-white text-[10px]" style={{ background: u.avatarColor }}>{u.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{u.displayName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{c?.name || u.username} · {c?.type || ""}</div>
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
