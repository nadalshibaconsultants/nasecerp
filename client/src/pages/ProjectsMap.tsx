/**
 * Projects Map — Leaflet-based GIS view of every active project.
 * Leaflet loaded from CDN; no dependency added to package.json.
 */
import { useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { projectsStore, geofencesStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";
import { Link } from "wouter";

declare global { interface Window { L: any; } }

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

export default function ProjectsMap() {
  const projects = useCollection(projectsStore);
  const geofences = useCollection(geofencesStore);
  const mapRef = useRef<HTMLDivElement>(null);

  // Centroid: Dubai
  const dubaiCentre: [number, number] = [25.1972, 55.2744];

  useEffect(() => {
    // Inject Leaflet CSS once
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    let cleanup: (() => void) | undefined;
    function init() {
      if (!window.L || !mapRef.current) return;
      const L = window.L;
      const map = L.map(mapRef.current).setView(dubaiCentre, 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      // Plot geofences (project sites)
      for (const g of geofences) {
        const proj = projects.find((p) => p.id === g.projectId);
        if (!proj) continue;
        const colour = proj.stage === "post-contract" ? "#f97316" : proj.stage === "pre-contract" ? "#10b981" : "#64748b";
        L.circle([g.center.lat, g.center.lng], {
          color: colour, fillColor: colour, fillOpacity: 0.25, radius: g.radiusM,
        }).addTo(map).bindPopup(
          `<div style="font-family: ui-sans-serif"><strong>${proj.name}</strong><br/>` +
          `<span style="font-size: 11px; color: #666">${proj.client} - ${proj.stage}</span><br/>` +
          `<a href="/projects/${proj.stage}/${proj.id}" style="color: #2563eb; font-size: 12px">Open project &rarr;</a></div>`
        );
      }
      cleanup = () => map.remove();
    }
    if (!window.L) {
      const s = document.createElement("script"); s.src = LEAFLET_JS; s.onload = init; document.body.appendChild(s);
    } else { init(); }
    return () => { if (cleanup) cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geofences.length, projects.length]);

  const counts = useMemo(() => ({
    pre: projects.filter((p) => p.stage === "pre-contract").length,
    post: projects.filter((p) => p.stage === "post-contract").length,
    other: projects.filter((p) => p.stage !== "pre-contract" && p.stage !== "post-contract").length,
  }), [projects]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Geographic Information System</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="w-6 h-6 text-emerald-600" /> Projects Map</h1>
        <p className="text-sm text-muted-foreground mt-1">All active sites geofenced on the Dubai map. Click a circle to open the project.</p>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Badge className="bg-emerald-100 text-emerald-700">Pre-Contract · {counts.pre}</Badge>
        <Badge className="bg-orange-100 text-orange-700">Post-Contract · {counts.post}</Badge>
        <Badge className="bg-slate-100 text-slate-700">Other · {counts.other}</Badge>
      </div>
      <Card><CardContent className="p-0">
        <div ref={mapRef} style={{ height: "70vh", borderRadius: "8px" }} />
      </CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Project register</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
          <thead className="bg-slate-50"><tr>
            <th className="text-left px-2 py-2">Project</th><th className="text-left px-2 py-2">Client</th>
            <th className="text-left px-2 py-2">Stage</th><th className="text-left px-2 py-2">Community</th>
            <th className="text-left px-2 py-2"></th>
          </tr></thead>
          <tbody>{projects.map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="px-2 py-1.5 font-medium">{p.name}</td>
              <td className="px-2 py-1.5">{p.client}</td>
              <td className="px-2 py-1.5 capitalize">{p.stage}</td>
              <td className="px-2 py-1.5 text-[10px]">{(p as any).community || "—"}</td>
              <td className="px-2 py-1.5 text-right"><Link href={`/projects/${p.stage}/${p.id}`}><span className="text-blue-600 underline cursor-pointer">Open →</span></Link></td>
            </tr>))}
          </tbody>
        </table></CardContent></Card>
    </div>
  );
}
