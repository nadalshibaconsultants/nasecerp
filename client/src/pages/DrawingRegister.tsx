/**
 * Drawing Register & Transmittal — ISO 19650 Compliant
 * Features: Drawing issue workflow, transmittal generation, RFI/Submittal entry
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FileText,
  Send,
  Plus,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  Layers,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

// Drawing register data
const drawings = [
  { id: "AR-AWT-001", title: "Ground Floor Plan", discipline: "Architecture", rev: "P03", status: "For Information", issued: "2026-05-01", project: "Al Wasl Tower" },
  { id: "AR-AWT-002", title: "Typical Floor Plan (L5-L20)", discipline: "Architecture", rev: "P02", status: "For Approval", issued: "2026-04-28", project: "Al Wasl Tower" },
  { id: "ST-AWT-001", title: "Foundation Layout", discipline: "Structural", rev: "P04", status: "Approved", issued: "2026-04-20", project: "Al Wasl Tower" },
  { id: "ME-AWT-001", title: "HVAC Layout - Basement", discipline: "MEP", rev: "P01", status: "Draft", issued: "—", project: "Al Wasl Tower" },
  { id: "AR-MHR-001", title: "Elevation - North", discipline: "Architecture", rev: "P05", status: "For Construction", issued: "2026-04-15", project: "Marina Heights" },
  { id: "ID-MHR-001", title: "Lobby Interior Layout", discipline: "Interior", rev: "P02", status: "For Approval", issued: "2026-05-02", project: "Marina Heights" },
  { id: "LS-PV2-001", title: "Landscape Master Plan", discipline: "Landscape", rev: "P01", status: "Draft", issued: "—", project: "Palm Villas Ph.2" },
];

const statusColors: Record<string, string> = {
  "Draft": "bg-gray-100 text-gray-700",
  "For Information": "bg-blue-100 text-blue-700",
  "For Approval": "bg-amber-100 text-amber-700",
  "Approved": "bg-emerald-100 text-emerald-700",
  "For Construction": "bg-purple-100 text-purple-700",
  "Superseded": "bg-red-100 text-red-700",
};

const rfis = [
  { id: "RFI-001", subject: "Foundation depth clarification - Zone B", from: "Contractor", status: "Open", date: "2026-05-03", dueDate: "2026-05-10", project: "Al Wasl Tower" },
  { id: "RFI-002", subject: "Ceiling height discrepancy Level 8", from: "MEP Subcontractor", status: "Responded", date: "2026-04-28", dueDate: "2026-05-05", project: "Marina Heights" },
  { id: "RFI-003", subject: "Material substitution - facade cladding", from: "Contractor", status: "Open", date: "2026-05-05", dueDate: "2026-05-12", project: "Al Wasl Tower" },
];

const submittals = [
  { id: "SUB-001", title: "Facade Stone Samples", type: "Material", status: "Under Review", submitted: "2026-05-01", project: "Al Wasl Tower" },
  { id: "SUB-002", title: "MEP Shop Drawings - Level 3", type: "Shop Drawing", status: "Approved with Comments", submitted: "2026-04-25", project: "Marina Heights" },
  { id: "SUB-003", title: "Landscape Irrigation System", type: "Technical", status: "Pending", submitted: "2026-05-04", project: "Palm Villas Ph.2" },
];

export default function DrawingRegister() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrawings, setSelectedDrawings] = useState<string[]>([]);
  const [showNewDrawing, setShowNewDrawing] = useState(false);
  const [showNewRfi, setShowNewRfi] = useState(false);

  // New drawing form state
  const [newDrawingId, setNewDrawingId] = useState("");
  const [newDrawingTitle, setNewDrawingTitle] = useState("");
  const [newDrawingDiscipline, setNewDrawingDiscipline] = useState("");

  // New RFI form state
  const [rfiSubject, setRfiSubject] = useState("");
  const [rfiProject, setRfiProject] = useState("");

  const filteredDrawings = drawings.filter(d =>
    d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.discipline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleDrawing = (id: string) => {
    setSelectedDrawings(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleCreateTransmittal = () => {
    if (selectedDrawings.length === 0) {
      toast.error("Select at least one drawing to create a transmittal");
      return;
    }
    toast.success(`Transmittal created with ${selectedDrawings.length} drawings`, {
      description: "TR-2026-042 generated. Ready to send to recipient.",
    });
    setSelectedDrawings([]);
  };

  const handleIssueDrawing = () => {
    toast.success("Drawing issued successfully", {
      description: `${newDrawingId} - Rev P01 issued for information`,
    });
    setShowNewDrawing(false);
    setNewDrawingId("");
    setNewDrawingTitle("");
  };

  const handleCreateRfi = () => {
    toast.success("RFI created successfully", {
      description: `RFI-004: "${rfiSubject}" — 7 day response window`,
    });
    setShowNewRfi(false);
    setRfiSubject("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/documents")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Documents
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drawing Register & Transmittals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            ISO 19650 compliant · {drawings.length} drawings · {rfis.length} open RFIs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowNewDrawing(true)}>
            <Plus className="w-4 h-4" />
            New Drawing
          </Button>
          <Button size="sm" className="gap-2" onClick={handleCreateTransmittal} disabled={selectedDrawings.length === 0}>
            <Send className="w-4 h-4" />
            Create Transmittal ({selectedDrawings.length})
          </Button>
        </div>
      </div>

      <Tabs defaultValue="register" className="space-y-4">
        <TabsList>
          <TabsTrigger value="register" className="gap-2">
            <Layers className="w-4 h-4" />
            Drawing Register
          </TabsTrigger>
          <TabsTrigger value="rfi" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            RFIs ({rfis.filter(r => r.status === "Open").length})
          </TabsTrigger>
          <TabsTrigger value="submittals" className="gap-2">
            <Upload className="w-4 h-4" />
            Submittals
          </TabsTrigger>
        </TabsList>

        {/* Drawing Register Tab */}
        <TabsContent value="register">
          {/* New Drawing Form */}
          {showNewDrawing && (
            <Card className="border-2 border-primary/20 bg-primary/5 mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Issue New Drawing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Drawing Number *</Label>
                    <Input
                      value={newDrawingId}
                      onChange={(e) => setNewDrawingId(e.target.value)}
                      placeholder="AR-AWT-003"
                      className="h-10 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Format: [Disc]-[Proj]-[Seq]</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Title *</Label>
                    <Input
                      value={newDrawingTitle}
                      onChange={(e) => setNewDrawingTitle(e.target.value)}
                      placeholder="Drawing title"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Discipline *</Label>
                    <Select value={newDrawingDiscipline} onValueChange={setNewDrawingDiscipline}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Architecture", "Structural", "MEP", "Interior", "Landscape"].map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Status</Label>
                    <Select defaultValue="For Information">
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="For Information">For Information</SelectItem>
                        <SelectItem value="For Approval">For Approval</SelectItem>
                        <SelectItem value="For Construction">For Construction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-3 rounded-lg border-2 border-dashed border-border text-center">
                  <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Drop DWG/PDF file here or click to upload</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowNewDrawing(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleIssueDrawing}>Issue Drawing</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search & filter */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by number, title, or discipline..."
                className="pl-9 h-10"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>

          {/* Register table */}
          <Card className="border border-border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="p-3 w-10">
                      <Checkbox
                        checked={selectedDrawings.length === filteredDrawings.length}
                        onCheckedChange={(v) => setSelectedDrawings(v ? filteredDrawings.map(d => d.id) : [])}
                      />
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Drawing No.</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Title</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Discipline</th>
                    <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase">Rev</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrawings.map(d => (
                    <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedDrawings.includes(d.id)}
                          onCheckedChange={() => toggleDrawing(d.id)}
                        />
                      </td>
                      <td className="p-3 text-sm font-mono font-medium">{d.id}</td>
                      <td className="p-3 text-sm">{d.title}</td>
                      <td className="p-3 text-sm text-muted-foreground">{d.discipline}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="font-mono text-xs">{d.rev}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={`text-[10px] ${statusColors[d.status] || ""}`}>{d.status}</Badge>
                      </td>
                      <td className="p-3 text-sm font-data text-muted-foreground">{d.issued}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* RFI Tab */}
        <TabsContent value="rfi">
          {/* New RFI Form */}
          {showNewRfi && (
            <Card className="border-2 border-primary/20 bg-primary/5 mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Create New RFI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Subject *</Label>
                    <Input
                      value={rfiSubject}
                      onChange={(e) => setRfiSubject(e.target.value)}
                      placeholder="Brief description of the query"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Project *</Label>
                    <Select value={rfiProject} onValueChange={setRfiProject}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Al Wasl Tower">Al Wasl Tower</SelectItem>
                        <SelectItem value="Marina Heights">Marina Heights</SelectItem>
                        <SelectItem value="Palm Villas Ph.2">Palm Villas Ph.2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">From</Label>
                    <Select defaultValue="contractor">
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contractor">Contractor</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="subconsultant">Sub-Consultant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Response Due</Label>
                    <Input type="date" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Related Drawing</Label>
                    <Select>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Link drawing" />
                      </SelectTrigger>
                      <SelectContent>
                        {drawings.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.id} - {d.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Description</Label>
                  <textarea
                    placeholder="Detailed description of the request for information..."
                    className="w-full h-24 p-3 rounded-lg border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowNewRfi(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleCreateRfi}>Create RFI</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end mb-4">
            <Button size="sm" className="gap-2" onClick={() => setShowNewRfi(true)}>
              <Plus className="w-4 h-4" />
              New RFI
            </Button>
          </div>

          <div className="space-y-3">
            {rfis.map(rfi => (
              <Card key={rfi.id} className="border border-border hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        rfi.status === "Open" ? "bg-amber-50" : "bg-emerald-50"
                      }`}>
                        {rfi.status === "Open" ? (
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{rfi.id}</span>
                          <Badge className={rfi.status === "Open" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"} >
                            {rfi.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mt-1">{rfi.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          From: {rfi.from} · Project: {rfi.project}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Due: {rfi.dueDate}</p>
                      <p className="text-[10px] text-muted-foreground">Opened: {rfi.date}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Submittals Tab */}
        <TabsContent value="submittals">
          <div className="flex justify-end mb-4">
            <Button size="sm" className="gap-2" onClick={() => toast.info("New submittal form coming soon")}>
              <Plus className="w-4 h-4" />
              New Submittal
            </Button>
          </div>

          <div className="space-y-3">
            {submittals.map(sub => (
              <Card key={sub.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{sub.id}</span>
                          <Badge variant="secondary" className="text-[10px]">{sub.type}</Badge>
                        </div>
                        <p className="text-sm font-medium mt-0.5">{sub.title}</p>
                        <p className="text-xs text-muted-foreground">{sub.project} · Submitted: {sub.submitted}</p>
                      </div>
                    </div>
                    <Badge className={
                      sub.status === "Approved with Comments" ? "bg-emerald-100 text-emerald-700" :
                      sub.status === "Under Review" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }>
                      {sub.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
