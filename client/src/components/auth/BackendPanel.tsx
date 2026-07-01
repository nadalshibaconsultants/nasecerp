/**
 * BackendPanel — connect the ERP to a Supabase backend or stay local.
 * Director-only (parent SettingsPage already gates).
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, Cloud, Power, ExternalLink, BookOpen, AlertTriangle } from "lucide-react";
import { activateBackend, getBackend, loadBackendConfig, onBackendChange } from "@/lib/backend";
import type { BackendInfo } from "@/lib/backend/types";

export default function BackendPanel() {
  const [info, setInfo] = useState<BackendInfo>(getBackend().info());
  const initial = loadBackendConfig();
  const [url, setUrl] = useState(initial.supabase?.url || "");
  const [anonKey, setAnonKey] = useState(initial.supabase?.anonKey || "");

  useEffect(() => {
    const tick = () => setInfo(getBackend().info());
    const off = onBackendChange(tick);
    const interval = setInterval(tick, 1000);
    return () => { off(); clearInterval(interval); };
  }, []);

  function connect() {
    if (!url.trim() || !anonKey.trim()) { toast.error("Paste both URL and anon key"); return; }
    if (!url.startsWith("https://")) { toast.error("URL must start with https://"); return; }
    activateBackend({ kind: "supabase", supabase: { url: url.trim(), anonKey: anonKey.trim() } });
    toast.success("Switching to Supabase backend… give it a moment.");
  }
  function disconnect() {
    activateBackend({ kind: "local" });
    toast.success("Reverted to localStorage backend");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2"><Database className="w-4 h-4" /> Backend</h2>
        <Badge className={info.kind === "supabase" && info.ready ? "bg-emerald-100 text-emerald-700 border-emerald-200" : info.kind === "supabase" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"}>
          {info.kind === "supabase" ? (info.ready ? "Connected · Supabase" : "Connecting · Supabase") : "Local · Browser only"}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-4 text-sm space-y-1">
          <div className="flex items-center gap-2"><Power className="w-4 h-4 text-slate-500" /> <strong>Active backend:</strong> {info.kind === "supabase" ? "Supabase (Postgres + Realtime)" : "Browser localStorage (single-user demo)"}</div>
          {info.message && <div className="text-xs text-slate-500 ml-6">{info.message}</div>}
          <div className="text-xs text-slate-500 ml-6">{info.kind === "local" ? "Data stays on this machine. Other users see only seeded demo data until you connect to a backend." : "Multi-user — every connected device sees the same data in real time."}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Cloud className="w-4 h-4" /> Connect to Supabase</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-600">Pick up your project URL + anon (public) key from <strong>Supabase → Settings → API</strong>. Once connected, every action across HR, projects, attendance, contractor portal — everything — syncs in real time across devices.</p>
          <div><Label className="text-xs">Project URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourproject.supabase.co" className="mt-1 font-mono text-xs" /></div>
          <div><Label className="text-xs">anon public key</Label><Input value={anonKey} onChange={(e) => setAnonKey(e.target.value)} placeholder="eyJ…" className="mt-1 font-mono text-xs" /></div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={connect} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"><Cloud className="w-3.5 h-3.5" /> Connect & switch backend</Button>
            <Button variant="outline" onClick={disconnect} disabled={info.kind === "local"} className="gap-1.5"><Power className="w-3.5 h-3.5" /> Disconnect (revert to local)</Button>
            <a href="https://app.supabase.com" target="_blank" rel="noreferrer" className="ml-auto text-xs text-emerald-700 hover:underline inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Open Supabase</a>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-800"><AlertTriangle className="w-3.5 h-3.5" /> Setup checklist</div>
          <ol className="list-decimal pl-5 space-y-1 text-slate-700">
            <li>Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">supabase.com</a> — pick a UAE-close region (Frankfurt / Mumbai).</li>
            <li>SQL Editor → paste <code className="bg-slate-100 px-1 rounded">supabase/schema.sql</code> from this repo → Run.</li>
            <li>Database → Replication → toggle <code className="bg-slate-100 px-1 rounded">nasec_kv</code> to Realtime ON.</li>
            <li>Settings → API → copy <strong>Project URL</strong> + <strong>anon public</strong> key.</li>
            <li>Paste them above → Connect.</li>
          </ol>
          <div className="flex items-center gap-2 mt-2"><BookOpen className="w-3.5 h-3.5" /> Full guide: <code>supabase/BACKEND-SETUP.md</code> in your project folder.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">What flips when you connect</CardTitle></CardHeader>
        <CardContent className="text-xs text-slate-700 space-y-1">
          <Row label="Persistence" before="Single browser, ~5 MB cap" after="Hosted Postgres, multi-user" />
          <Row label="Sync between devices" before="None" after="Realtime via Supabase channels" />
          <Row label="File uploads" before="Base64 in localStorage, 4 MB cap" after="Supabase Storage bucket, multi-MB OK*" />
          <Row label="Auth" before="Email-only demo login" after="Same UI; SSO can be layered next" />
          <Row label="Backups" before="None" after="Supabase daily backups (free tier 7 days)" />
          <p className="text-[10px] text-slate-500 mt-2">* File uploads currently still use the local data-URL pattern. The Supabase Storage swap is the follow-up iteration; the architecture is wired for it.</p>
        </CardContent>
      </Card>
    </div>
  );
}
function Row({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="grid grid-cols-12 gap-2 py-1 border-b border-slate-100">
      <div className="col-span-3 font-medium">{label}</div>
      <div className="col-span-4 text-slate-500"><span className="text-[10px] uppercase mr-1">Before</span>{before}</div>
      <div className="col-span-5 text-emerald-700"><span className="text-[10px] uppercase mr-1">After</span>{after}</div>
    </div>
  );
}
