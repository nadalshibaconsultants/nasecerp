/**
 * Minimal 2FA scaffold — generates a base32 TOTP secret and the otpauth URL.
 * Pair with a real backend that validates TOTP codes before login. This UI
 * lets the user set up Microsoft Authenticator / Google Authenticator now,
 * and stores the secret per-user in localStorage as a placeholder.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, KeyRound, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function genSecret(len = 32): string {
  let out = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) out += BASE32_ALPHABET[b % 32];
  return out;
}

export default function TwoFactorSetup() {
  const { currentUser } = useAuth();
  const userKey = `nasec-2fa-${currentUser?.id || "anon"}`;
  const [secret, setSecret] = useState<string>(() => localStorage.getItem(userKey) || "");
  const [code, setCode] = useState("");
  const issuer = "NASEC%20ERP";
  const account = currentUser?.username || "user";
  const otpauthUrl = secret ? `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}` : "";
  const qrUrl = otpauthUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}` : "";

  function enable() {
    const s = genSecret();
    setSecret(s);
    localStorage.setItem(userKey, s);
    toast.success("2FA secret generated - scan the QR with your authenticator app");
  }
  function disable() {
    if (!confirm("Disable 2FA for this account?")) return;
    setSecret("");
    localStorage.removeItem(userKey);
    toast.success("2FA disabled");
  }
  function verify() {
    if (!code.match(/^\d{6}$/)) return toast.error("Enter the 6-digit code from your authenticator");
    // Real verification needs a backend (TOTP server-side check). This is a placeholder.
    toast.success("Code accepted (stub — server verification required for production)");
    setCode("");
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Two-Factor Authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!secret ? (
          <>
            <p className="text-xs text-muted-foreground">Protect your NASEC ERP account with TOTP (Microsoft / Google / 1Password authenticators).</p>
            <Button onClick={enable} className="gap-1"><KeyRound className="w-3.5 h-3.5" /> Enable 2FA</Button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-start gap-4">
              <div className="text-center">
                <img src={qrUrl} alt="2FA QR" width={200} height={200} className="border" />
                <p className="text-[10px] text-muted-foreground mt-1">Scan with authenticator app</p>
              </div>
              <div className="flex-1 min-w-[200px] space-y-2">
                <p className="text-xs">Account: <strong>{account}</strong></p>
                <p className="text-xs">Secret (manual entry): <code className="text-[10px] bg-slate-100 px-1 break-all">{secret}</code></p>
                <Badge variant="outline" className="text-[10px]">Algorithm: SHA1 / 30s / 6-digit</Badge>
                <div className="pt-2">
                  <label className="text-xs">Enter the current 6-digit code to verify:</label>
                  <div className="flex gap-2 mt-1">
                    <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} className="font-mono w-32" placeholder="123456" />
                    <Button onClick={verify} size="sm">Verify</Button>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={disable} className="text-red-600">Disable 2FA</Button>
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-600" />
              <span>This is a TOTP secret scaffold. For production, store the secret server-side, verify codes against it during login, and rate-limit attempts.</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
