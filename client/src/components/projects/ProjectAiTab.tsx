/**
 * Per-project AI Assistant — chat with Claude scoped to this project's context.
 */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Settings, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { projectsStore, rfisStore, risksStore, drawingsStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";

const KEY = "nasec-ai-key";
const MODEL = "nasec-ai-model";
type Msg = { role: "user" | "assistant"; content: string; ts: string };

export default function ProjectAiTab({ projectId }: { projectId: string }) {
  const project = useCollection(projectsStore).find((p) => p.id === projectId);
  const rfis = useCollection(rfisStore).filter((r) => r.projectId === projectId);
  const risks = useCollection(risksStore).filter((r) => r.projectId === projectId);
  const drawings = useCollection(drawingsStore).filter((d) => d.projectId === projectId);

  const HIST_KEY = `nasec-ai-history-${projectId}`;
  const [key, setKey] = useState(() => localStorage.getItem(KEY) || "");
  const [model, setModel] = useState(() => localStorage.getItem(MODEL) || "claude-sonnet-4-6");
  const [msgs, setMsgs] = useState<Msg[]>(() => { try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch { return []; } });
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { localStorage.setItem(HIST_KEY, JSON.stringify(msgs.slice(-40))); }, [msgs, HIST_KEY]);

  const systemPrompt = `You are a senior AEC consultancy assistant for NASEC working on the project below.

PROJECT CONTEXT:
- Name: ${project?.name}
- Client: ${project?.client}
- Stage: ${project?.stage}
- Open RFIs: ${rfis.filter((r) => r.status !== "closed").length}
- Active risks: ${risks.filter((r) => r.status !== "closed" && r.status !== "realised").length} (top: ${risks.slice(0, 3).map((r) => r.title).join("; ")})
- Drawings on register: ${drawings.length}

Be concise. Reference UAE practice (DM, DCD, DEWA, Trakhees, DDA, FTA), UAE Building Code 2021, UAE Fire & Life Safety Code 2024, FIDIC conventions where relevant.`;

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
        body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const j = await r.json();
      const text = j.content?.[0]?.text || j.error?.message || "(no response)";
      setMsgs([...next, { role: "assistant", content: text, ts: new Date().toISOString() }]);
    } catch (e: any) {
      toast.error("API call failed", { description: e.message });
    } finally { setLoading(false); }
  }

  function clearHistory() { setMsgs([]); localStorage.removeItem(HIST_KEY); toast.success("History cleared"); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Bot className="w-5 h-5 text-purple-600" /> Project AI Assistant</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Scoped to <strong>{project?.name}</strong> — knows about its RFIs, risks, drawings.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} className="gap-1"><Settings className="w-3.5 h-3.5" /> Settings</Button>
          <Button variant="outline" size="sm" onClick={clearHistory} className="gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear</Button>
        </div>
      </div>

      {showSettings && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardContent className="space-y-2 p-3">
            <div className="text-[11px] flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 text-amber-600" />For production, use a server proxy to keep the key off the browser.</div>
            <div><label className="text-xs">Anthropic API Key</label>
              <Input type="password" value={key} onChange={(e) => { setKey(e.target.value); localStorage.setItem(KEY, e.target.value); }} placeholder="sk-ant-..." className="font-mono text-xs" />
            </div>
            <div><label className="text-xs">Model</label>
              <Input value={model} onChange={(e) => { setModel(e.target.value); localStorage.setItem(MODEL, e.target.value); }} className="font-mono text-xs" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card><CardContent className="p-0 flex flex-col" style={{ height: "60vh" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-8">
              <Bot className="w-12 h-12 mx-auto mb-2 text-muted-foreground/40" />
              <p>Try: "Draft a covering letter to DM for the resubmission of {project?.name}"</p>
              <p className="mt-1">Or: "Summarise the top 3 risks on this project"</p>
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
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything about this project..." rows={2} className="flex-1" />
          <Button onClick={send} disabled={loading || !draft.trim()} className="self-end gap-1"><Send className="w-4 h-4" /> Send</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
