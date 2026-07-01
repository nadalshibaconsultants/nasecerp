/**
 * BIM Viewer — IFC.js scaffold. Drop an .ifc file and it renders inline.
 * Uses web-ifc-viewer from a CDN; in production move to bundled dependency.
 */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Box, Upload, RotateCcw, AlertTriangle } from "lucide-react";

const IFC_CDN_VIEWER = "https://cdn.jsdelivr.net/npm/web-ifc-viewer@1.0.218/dist/ifc-viewer-api.js";

declare global { interface Window { IfcViewerAPI: any; } }

export default function BimViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [status, setStatus] = useState<string>("Load CDN script to begin...");
  const [fileName, setFileName] = useState<string>("");

  function loadCDN() {
    if (window.IfcViewerAPI) { initViewer(); return; }
    setStatus("Loading IFC.js from CDN...");
    const s = document.createElement("script");
    s.src = IFC_CDN_VIEWER;
    s.onload = () => initViewer();
    s.onerror = () => setStatus("Failed to load IFC.js (network blocked or CDN unavailable). For production install web-ifc-viewer as a bundled dependency.");
    document.body.appendChild(s);
  }

  function initViewer() {
    if (!containerRef.current || !window.IfcViewerAPI) return;
    try {
      const v = new window.IfcViewerAPI({ container: containerRef.current, backgroundColor: { x: 0xf8, y: 0xfa, z: 0xfc } });
      v.axes.setAxes(); v.grid.setGrid();
      setViewer(v);
      setStatus("Viewer ready. Choose an IFC file to load.");
    } catch (e: any) { setStatus(`Viewer init failed: ${e.message}`); }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !viewer) return;
    setFileName(f.name);
    setStatus(`Loading ${f.name}...`);
    const url = URL.createObjectURL(f);
    viewer.IFC.loadIfcUrl(url).then(() => setStatus(`Loaded ${f.name}`)).catch((err: any) => setStatus(`Load failed: ${err.message}`));
  }

  function reset() {
    if (!viewer) return;
    viewer.IFC.dispose();
    setFileName("");
    setStatus("Viewer reset");
  }

  useEffect(() => () => { if (viewer) viewer.dispose?.(); }, [viewer]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">3D Model Viewer</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Box className="w-6 h-6 text-indigo-600" /> BIM Viewer (IFC)</h1>
        <p className="text-sm text-muted-foreground mt-1">Inline ISO 19650 IFC viewing for federation models. Pan/rotate/zoom in browser.</p>
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
        <div>
          <strong>Deployment note:</strong> the CDN-loaded viewer works for review but for production install <code>web-ifc-viewer</code> + <code>web-ifc</code> as bundled dependencies, host the WASM files locally, and integrate clash-detection and property querying. The current scaffold loads the viewer lazily so it does not bloat the main bundle.
        </div>
      </CardContent></Card>
    </div>
  );
}
