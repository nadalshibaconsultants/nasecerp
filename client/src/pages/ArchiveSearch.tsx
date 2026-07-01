/**
 * Project Archive — full-text search across completed projects, drawings, RFIs,
 * NCRs, risks, lessons learnt. Critical for bidding similar projects later.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, FolderOpen, FileText, MessageSquareWarning, ShieldAlert, ClipboardCheck, Activity } from "lucide-react";
import { projectsStore, drawingsStore, rfisStore, ncrsStore, risksStore, lessonItemsStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { Link } from "wouter";

type Hit = { kind: string; icon: React.ReactNode; title: string; sub: string; projectId?: string; link?: string };

export default function ArchiveSearch() {
  const [q, setQ] = useState("");
  const projects = useCollection(projectsStore);
  const drawings = useCollection(drawingsStore);
  const rfis = useCollection(rfisStore);
  const ncrs = useCollection(ncrsStore);
  const risks = useCollection(risksStore);
  const lessons = useCollection(lessonItemsStore);

  const hits = useMemo<Hit[]>(() => {
    if (!q.trim() || q.length < 2) return [];
    const needle = q.toLowerCase();
    const out: Hit[] = [];
    for (const p of projects) {
      if ((`${p.name || p.nameEn} ${p.client} ${(p as any).community || ""} ${(p as any).type || ""}`).toLowerCase().includes(needle)) {
        out.push({ kind: "Project", icon: <FolderOpen className="w-3 h-3" />, title: p.name || p.nameEn, sub: `${p.client} - ${p.stage}`, projectId: p.id, link: `/projects/${p.stage}/${p.id}` });
      }
    }
    for (const d of drawings) {
      if (`${d.drawingNumber} ${d.title}`.toLowerCase().includes(needle)) {
        const p = projects.find((pr) => pr.id === d.projectId);
        out.push({ kind: "Drawing", icon: <FileText className="w-3 h-3" />, title: `${d.drawingNumber} - ${d.title}`, sub: `${p?.name || d.projectId} - Rev ${d.currentRev}`, projectId: d.projectId, link: p ? `/projects/${p.stage}/${d.projectId}?tab=dcc-rfi` : undefined });
      }
    }
    for (const r of rfis) {
      if (`${r.reference} ${r.subject} ${r.question}`.toLowerCase().includes(needle)) {
        const p = projects.find((pr) => pr.id === r.projectId);
        out.push({ kind: "RFI", icon: <MessageSquareWarning className="w-3 h-3" />, title: `${r.reference} - ${r.subject}`, sub: `${p?.name || r.projectId} - ${r.status}`, projectId: r.projectId, link: p ? `/projects/${p.stage}/${r.projectId}?tab=dcc-rfi` : undefined });
      }
    }
    for (const n of ncrs) {
      if (`${n.reference} ${n.description}`.toLowerCase().includes(needle)) {
        const p = projects.find((pr) => pr.id === n.projectId);
        out.push({ kind: "NCR", icon: <ShieldAlert className="w-3 h-3" />, title: `${n.reference}`, sub: n.description.slice(0, 100), projectId: n.projectId, link: p ? `/projects/${p.stage}/${n.projectId}?tab=quality` : undefined });
      }
    }
    for (const r of risks) {
      if (`${r.code} ${r.title} ${r.description}`.toLowerCase().includes(needle)) {
        const p = projects.find((pr) => pr.id === r.projectId);
        out.push({ kind: "Risk", icon: <Activity className="w-3 h-3" />, title: `${r.code} - ${r.title}`, sub: r.description.slice(0, 100), projectId: r.projectId, link: p ? `/projects/${p.stage}/${r.projectId}?tab=risks` : undefined });
      }
    }
    for (const l of lessons) {
      if (l.text.toLowerCase().includes(needle)) {
        out.push({ kind: "Lesson", icon: <ClipboardCheck className="w-3 h-3" />, title: l.text.slice(0, 90), sub: `${l.discipline}${l.problemSource ? ` - ${l.problemSource}` : ""}` });
      }
    }
    return out;
  }, [q, projects, drawings, rfis, ncrs, risks, lessons]);

  const grouped = useMemo(() => {
    const g: Record<string, Hit[]> = {};
    for (const h of hits) (g[h.kind] = g[h.kind] || []).push(h);
    return g;
  }, [hits]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Knowledge Base</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Search className="w-6 h-6 text-blue-600" /> Project Archive Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Find any project, drawing, RFI, NCR, risk or lesson learnt across the firm's history.</p>
      </div>
      <Card><CardContent className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search... e.g. 'curtain wall', 'DCD', 'Al Wasl', 'chloride'" className="pl-10 h-10 text-base" autoFocus />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          {q.trim().length === 0 ? "Start typing - minimum 2 characters" : `${hits.length} result${hits.length === 1 ? "" : "s"} across ${Object.keys(grouped).length} categories`}
        </p>
      </CardContent></Card>

      {Object.entries(grouped).map(([kind, list]) => (
        <Card key={kind}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{list.length}</Badge>{kind}s
          </CardTitle></CardHeader>
          <CardContent className="p-0">
            {list.slice(0, 25).map((h, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 border-t border-slate-100 hover:bg-slate-50">
                <div className="mt-0.5">{h.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{h.title}</p>
                  <p className="text-[10px] text-muted-foreground">{h.sub}</p>
                </div>
                {h.link && <Link href={h.link}><span className="text-[10px] text-blue-600 underline cursor-pointer">Open →</span></Link>}
              </div>
            ))}
            {list.length > 25 && <p className="px-3 py-2 text-[10px] text-muted-foreground">+ {list.length - 25} more...</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
