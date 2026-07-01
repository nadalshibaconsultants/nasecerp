/**
 * Canvas signature pad — produces a base64 PNG.
 * Use in StageGateApprovalCard, HR letters, contractor sign-offs.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

type Props = {
  width?: number;
  height?: number;
  value?: string;
  onChange: (dataUrl: string) => void;
};

export default function SignaturePad({ width = 400, height = 150, value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2; ctx.lineCap = "round";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    }
  }, [value]);

  function pt(e: any): [number, number] {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left;
    const y = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top;
    return [x, y];
  }

  function down(e: any) {
    e.preventDefault();
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    const [x, y] = pt(e);
    ctx.beginPath(); ctx.moveTo(x, y);
    setDrawing(true);
  }
  function move(e: any) {
    if (!drawing) return;
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    const [x, y] = pt(e);
    ctx.lineTo(x, y); ctx.stroke();
  }
  function up() {
    if (!drawing) return;
    setDrawing(false);
    const c = canvasRef.current!;
    onChange(c.toDataURL("image/png"));
  }
  function clear() {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    onChange("");
  }
  function confirmIt() { const c = canvasRef.current!; onChange(c.toDataURL("image/png")); }

  return (
    <div className="space-y-2">
      <div className="border border-slate-300 rounded bg-white inline-block">
        <canvas
          ref={canvasRef} width={width} height={height}
          onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
          onTouchStart={down} onTouchMove={move} onTouchEnd={up}
          style={{ cursor: "crosshair", touchAction: "none" }}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} className="gap-1"><Eraser className="w-3 h-3" /> Clear</Button>
        <Button type="button" size="sm" onClick={confirmIt} className="gap-1"><Check className="w-3 h-3" /> Confirm signature</Button>
      </div>
    </div>
  );
}
