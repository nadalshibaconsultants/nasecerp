/**
 * Contractor Inbox — Consultant-issued items (NCR, SI, SNAG, etc.)
 * Read-only view with acknowledge/action buttons
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Inbox,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Eye,
  MessageSquare,
} from "lucide-react";
import { type ConsultantIssuedItem } from "@/lib/contractor-portal-data";
import { consultantIssuedStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";

export default function ContractorInbox() {
  const items = useCollection(consultantIssuedStore);
  const setItems = (_: any) => { /* not used after migration; updates go through consultantIssuedStore.put */ };
  const actionRequired = items.filter((i) => i.status === "Action Required");
  const acknowledged = items.filter((i) => i.status === "Acknowledged" || i.status === "Closed");
  const issued = items.filter((i) => i.status === "Issued");

  const handleAcknowledge = (id: string) => {
    setItems(items.map((i) => i.id === id ? { ...i, status: "Acknowledged" as const } : i));
    toast.success("Item acknowledged");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">From Consultant</h1>
        <p className="text-sm text-slate-500">Items issued by the supervision team requiring your attention</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-red-200 bg-red-50/30">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold font-data text-red-800">{actionRequired.length}</p>
            <p className="text-[11px] text-red-600">Action Required</p>
          </CardContent>
        </Card>
        <Card className="border border-blue-200 bg-blue-50/30">
          <CardContent className="p-3 text-center">
            <FileText className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold font-data text-blue-800">{issued.length}</p>
            <p className="text-[11px] text-blue-600">Newly Issued</p>
          </CardContent>
        </Card>
        <Card className="border border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-bold font-data text-emerald-800">{acknowledged.length}</p>
            <p className="text-[11px] text-emerald-600">Acknowledged</p>
          </CardContent>
        </Card>
      </div>

      {/* Items List */}
      <Tabs defaultValue="action">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="action" className="gap-1">
            <AlertTriangle className="w-3 h-3" /> Action Required ({actionRequired.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1">
            <Inbox className="w-3 h-3" /> All Items ({items.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="action" className="mt-4 space-y-2">
          {actionRequired.length === 0 ? (
            <Card className="border border-dashed"><CardContent className="p-8 text-center text-sm text-slate-500">No pending actions</CardContent></Card>
          ) : (
            actionRequired.map((item) => <InboxItemCard key={item.id} item={item} onAcknowledge={handleAcknowledge} />)
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-2">
          {items.map((item) => <InboxItemCard key={item.id} item={item} onAcknowledge={handleAcknowledge} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InboxItemCard({ item, onAcknowledge }: { item: ConsultantIssuedItem; onAcknowledge: (id: string) => void }) {
  const statusColors: Record<string, string> = {
    "Issued": "bg-blue-100 text-blue-700",
    "Acknowledged": "bg-slate-100 text-slate-600",
    "Action Required": "bg-red-100 text-red-700",
    "Closed": "bg-emerald-100 text-emerald-700",
  };
  const typeColors: Record<string, string> = {
    "NCR": "bg-red-50 border-red-200",
    "SI": "bg-blue-50 border-blue-200",
    "SNAG": "bg-amber-50 border-amber-200",
  };

  return (
    <Card className={`border ${typeColors[item.type] || "border-slate-200"}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-slate-800">{item.ref}</span>
              <Badge className={`text-[9px] ${statusColors[item.status] || ""}`}>{item.status}</Badge>
              <Badge variant="outline" className="text-[9px]">{item.type}</Badge>
            </div>
            <p className="text-sm text-slate-700">{item.title}</p>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
              <span>Issued by: {item.issuedBy}</span>
              <span>•</span>
              <span>{item.issuedDate}</span>
              {item.dueDate && (
                <>
                  <span>•</span>
                  <span className="text-red-600 flex items-center gap-0.5"><Clock className="w-3 h-3" /> Due: {item.dueDate}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {item.status === "Action Required" && (
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => onAcknowledge(item.id)}>
                <CheckCircle2 className="w-3 h-3" /> Acknowledge
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => toast.info("Detail view (demo)")}>
              <Eye className="w-3 h-3" /> View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
