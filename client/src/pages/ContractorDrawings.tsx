/**
 * Contractor Drawings — Read-only access to IFC drawings
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  Download,
  FileText,
  FolderOpen,
  Eye,
  Calendar,
} from "lucide-react";

const DEMO_DRAWINGS = [
  { id: "1", ref: "A-MHT-001", title: "Ground Floor Plan", discipline: "Architecture", revision: "C", date: "2026-04-15", status: "IFC" },
  { id: "2", ref: "A-MHT-002", title: "Typical Floor Plan (L5-L40)", discipline: "Architecture", revision: "B", date: "2026-04-10", status: "IFC" },
  { id: "3", ref: "S-MHT-001", title: "Foundation Layout", discipline: "Structural", revision: "D", date: "2026-03-28", status: "IFC" },
  { id: "4", ref: "S-MHT-010", title: "PT Slab Layout L4-L12", discipline: "Structural", revision: "C", date: "2026-04-20", status: "IFC" },
  { id: "5", ref: "M-MHT-001", title: "HVAC Layout Ground Floor", discipline: "Mechanical", revision: "B", date: "2026-04-05", status: "IFC" },
  { id: "6", ref: "M-MHT-012", title: "HVAC Layout Level 12", discipline: "Mechanical", revision: "C", date: "2026-04-25", status: "IFC" },
  { id: "7", ref: "E-MHT-001", title: "Electrical SLD Main Switchboard", discipline: "Electrical", revision: "B", date: "2026-04-08", status: "IFC" },
  { id: "8", ref: "E-MHT-015", title: "Lighting Layout Typical Floor", discipline: "Electrical", revision: "A", date: "2026-05-01", status: "IFC" },
  { id: "9", ref: "F-MHT-001", title: "Curtain Wall Elevation - North", discipline: "Façade", revision: "B", date: "2026-04-18", status: "IFC" },
  { id: "10", ref: "C-MHT-001", title: "Site Drainage Layout", discipline: "Civil", revision: "C", date: "2026-03-20", status: "IFC" },
];

export default function ContractorDrawings() {
  const [search, setSearch] = useState("");
  const filtered = DEMO_DRAWINGS.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.ref.toLowerCase().includes(search.toLowerCase()) ||
    d.discipline.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">IFC Drawings</h1>
        <p className="text-sm text-slate-500">Read-only access to Issued for Construction drawings</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search by reference, title, or discipline..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="border border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left p-3 font-medium text-slate-600">Reference</th>
                  <th className="text-left p-3 font-medium text-slate-600">Title</th>
                  <th className="text-left p-3 font-medium text-slate-600">Discipline</th>
                  <th className="text-center p-3 font-medium text-slate-600">Rev</th>
                  <th className="text-left p-3 font-medium text-slate-600">Date</th>
                  <th className="text-center p-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs font-medium text-slate-800">{d.ref}</td>
                    <td className="p-3 text-slate-700">{d.title}</td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px]">{d.discipline}</Badge></td>
                    <td className="p-3 text-center"><Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{d.revision}</Badge></td>
                    <td className="p-3 text-xs text-slate-500">{d.date}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.info("Viewer would open (demo)")}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.info("Download started (demo)")}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-slate-400">Only IFC (Issued for Construction) drawings are visible. For superseded revisions, contact the project team.</p>
    </div>
  );
}
