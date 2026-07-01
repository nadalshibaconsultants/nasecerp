/**
 * AI Assistant — Claude API chat tied to the user's project context.
 * Settings panel stores the Anthropic API key in localStorage. Calls go
 * direct to the Anthropic Messages API. For production a server proxy is
 * required to avoid CORS + key exposure.
 */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Settings, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const KEY = "nasec-ai-key";
const MODEL = "nasec-ai-model";
const HIST = "nasec-ai-history";

type Msg = { role: "user" | "assistant"; content: string; ts: string };

const SYSTEM = `You are a senior AEC consultancy assistant working with NASEC, a Dubai-based engineering consultancy.
Be concise. When asked about UAE practice quote the relevant authority (Dubai Municipality, DCD, DEWA, Trakhees, DDA, FTA).
Default to UAE Building Code 2021 + UAE Fire & Life Safety Code 2024 + FIDIC contract conventions.`;

export default function AiAssistant() {
  const [key, setKey] = useState(() => localStorage.getItem(KEY) || "");
  const [model, setModel] = useState(() => localStorage.getItem(MODEL) || "claude-sonnet-4-6");
  const [msgs, setMsgs] = useState<Msg[]>(() => { try { return JSON.parse(localStorage.getItem(HIST) || "[]"); } catch { return []; } });
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { localStorage.setItem(HIST, JSON.stringify(msgs.slice(-40))); }, [msgs]);

  async function send() {
    if (!draft.trim()) return;
    if (!key) { setShowSettings(true); return toast.error("Set your Anthropic API key first"); }
    const userMsg: Msg = { role: "user", content: draft, ts: new Date().toISOString() };
    const next = [...msgs, userMsg];
    setMsgs(next); setDraft(""); setLoading(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model, max_tokens: 1024, system: SYSTEM,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const j = await r.json();
      const text = j.content?.[0]?.text || j.error?.message || "(no response)";
      setMsgs([...next, { role: "assistant", content: text, ts: new Date().toISOString() }]);
    } catch (e: any) {
      toast.error("API call failed", { description: e.message });
    } finally { setLoading(false); }
  }

  function clearHistory() { setMsgs([]); localStorage.removeItem(HIST); toast.success("History cleared"); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Assistant</p>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="w-6 h-6 text-purple-600" /> Claude AI Assistant</h1>
          <p className="text-sm text-muted-foreground mt-1">UAE/AEC-tuned assistant for drafting letters, code lookups, RFI responses.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} className="gap-1"><Settings className="w-3.5 h-3.5" /> Settings</Button>
          <Button variant="outline" size="sm" onClick={clearHistory} className="gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear</Button>
        </div>
      </div>

      {showSettings && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Settings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-[11px] flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 text-amber-600" />For production deployment, replace direct browser calls with a server proxy. The browser-only mode exposes your key to anyone who can inspect this app's network traffic.</div>
            <div><label className="text-xs">Anthropic API Key</label>
              <Input type="password" value={key} onChange={(e) => { setKey(e.target.value); localStorage.setItem(KEY, e.target.value); }} placeholder="sk-ant-..." className="font-mono text-xs" />
            </div>
            <div><label className="text-xs">Model</label>
              <Input value={model} onChange={(e) => { setModel(e.target.value); localStorage.setItem(MODEL, e.target.value); }} className="font-mono text-xs" />
              <p className="text-[10px] text-muted-foreground mt-1">Options: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card><CardContent className="p-0 flex flex-col" style={{ height: "65vh" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-8">
              <Bot className="w-12 h-12 mx-auto mb-2 text-muted-foreground/40" />
              <p>Try: "Draft a covering letter to Dubai Municipality for resubmission of Al Wasl Tower BP application"</p>
              <p className="mt-1">Or: "Summarise the Lessons Learnt items for the Architecture discipline"</p>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${m.role === "user" ? "bg-blue-100" : "bg-slate-100"}`}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{m.role === "user" ? "You" : "Claude"}</p>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && <div className="text-xs text-muted-foreground italic">Claude is thinking...</div>}
          <div ref={endRef} />
        </div>
        <div className="border-t p-3 flex gap-2">
          <Textarea
            value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything... (Shift+Enter for newline)"
            rows={2} className="flex-1"
          />
          <Button onClick={send} disabled={loading || !draft.trim()} className="self-end gap-1">
            <Send className="w-4 h-4" /> Send
          </Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
