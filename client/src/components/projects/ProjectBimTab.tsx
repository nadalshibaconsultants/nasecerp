/**
 * Per-project BIM viewer — IFC.js inline.
 */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Box, Upload, RotateCcw, AlertTriangle } from "lucide-react";

const IFC_CDN_VIEWER = "https://cdn.jsdelivr.net/npm/web-ifc-viewer@1.0.218/dist/ifc-viewer-api.js";
declare global { interface Window { IfcViewerAPI: any; } }

export default function ProjectBimTab({ projectId }: { projectId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [status, setStatus] = useState("Load CDN script to begin...");
  const [fileName, setFileName] = useState("");

  function loadCDN() {
    if (window.IfcViewerAPI) { initViewer(); return; }
    setStatus("Loading IFC.js from CDN...");
    const s = document.createElement("script"); s.src = IFC_CDN_VIEWER;
    s.onload = () => initViewer();
    s.onerror = () => setStatus("Failed to load IFC.js (network blocked).");
    document.body.appendChild(s);
  }
  function initViewer() {
    if (!containerRef.current || !window.IfcViewerAPI) return;
    try {
      const v = new window.IfcViewerAPI({ container: containerRef.current, backgroundColor: { x: 0xf8, y: 0xfa, z: 0xfc } });
      v.axes.setAxes(); v.grid.setGrid();
      setViewer(v); setStatus("Viewer ready. Choose an IFC file to load.");
    } catch (e: any) { setStatus(`Init failed: ${e.message}`); }
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f || !viewer) return;
    setFileName(f.name); setStatus(`Loading ${f.name}...`);
    const url = URL.createObjectURL(f);
    viewer.IFC.loadIfcUrl(url).then(() => setStatus(`Loaded ${f.name}`)).catch((err: any) => setStatus(`Load failed: ${err.message}`));
  }
  function reset() { if (!viewer) return; viewer.IFC.dispose(); setFileName(""); setStatus("Reset"); }
  useEffect(() => () => { if (viewer) viewer.dispose?.(); }, [viewer]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Box className="w-5 h-5 text-indigo-600" /> BIM Model Viewer</h2>
        <p className="text-xs text-muted-foreground">ISO 19650 IFC federation viewer for project {projectId}</p>
      </div>
      <Card><CardContent className="p-3 flex items-center gap-2 flex-wrap">
        {!viewer && <Button size="sm" onClick={loadCDN}><Upload className="w-3.5 h-3.5 mr-1" /> Load viewer</Button>}
        {viewer && (
          <>
            <Button size="sm" onClick={() => fileRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1" /> Open IFC file</Button>
            <Button size="sm" variant="outline" onClick={reset}><RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset</Button>
            <input ref={fileRef} type="file" accept=".ifc" onChange={onFile} className="hidden" />
            {fileName && <Badge variant="outline" className="text-[10px]">{fileName}</Badge>}
          </>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto">{status}</span>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <div ref={containerRef} style={{ width: "100%", height: "70vh", background: "#f8fafc", borderRadius: "8px" }} />
      </CardContent></Card>
      <Card className="border-amber-200 bg-amber-50/30"><CardContent className="p-3 text-[11px] flex gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5" />
        <div><strong>Deployment note:</strong> For production install web-ifc-viewer + web-ifc as bundled deps and host the WASM files locally.</div>
      </CardContent></Card>
    </div>
  );
}
