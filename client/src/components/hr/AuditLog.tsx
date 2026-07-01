import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, History } from "lucide-react";
import { auditStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";

export default function AuditLog() {
  const audit = useCollection(auditStore);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let list = [...audit].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (moduleFilter !== "all") list = list.filter((a) => a.module === moduleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.subject.toLowerCase().includes(q) || (a.detail || "").toLowerCase().includes(q) || a.actor.toLowerCase().includes(q));
    }
    return list;
  }, [audit, search, moduleFilter]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2"><History className="w-4 h-4" /> Audit Log <span className="text-xs text-slate-500 ml-2">{audit.length} entries</span></h3>
      </div>
      <Card>
        <CardContent className="p-3 flex gap-2 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2 text-slate-400" />
            <Input className="pl-8 h-9 w-72" placeholder="Search subject, actor, detail…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {["hr", "attendance", "payroll", "letters", "training", "assets", "leave", "disciplinary", "performance"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-slate-500">{filtered.length} of {audit.length}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="text-left px-3 py-2">When</th><th className="text-left px-3 py-2">Actor</th><th className="text-left px-3 py-2">Module</th><th className="text-left px-3 py-2">Action</th><th className="text-left px-3 py-2">Subject</th><th className="text-left px-3 py-2">Detail</th></tr></thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 tabular-nums text-xs">{new Date(a.timestamp).toLocaleString("en-GB", { timeZone: "UTC", hour12: true })}</td>
                  <td className="px-3 py-2 text-xs">{a.actor}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{a.module}</Badge></td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[10px] capitalize">{a.action}</Badge></td>
                  <td className="px-3 py-2">{a.subject}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{a.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
