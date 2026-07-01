/**
 * ContractorAccessTab — PM's view inside Project Detail (Post-Contract only)
 * Manage contractor invitations, access, allowed types, and portal settings
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Mail,
  Shield,
  Users,
  Settings,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit2,
  Copy,
  HardHat,
  Globe,
  Lock,
  Eye,
} from "lucide-react";
import {
  SUBMITTAL_TYPES,
  SITE_ROLES,
  type ContractorCompany,
  type SiteRoleCode,
} from "@/lib/contractor-portal-data";
import { contractorsStore } from "@/lib/stores";
import { useCollection } from "@/lib/store";

export default function ContractorAccessTab() {
  const contractors = useCollection(contractorsStore);
  // Use contractorsStore.put / .remove for mutations going forward.
  const setContractors = (next: any) => {
    if (typeof next === "function") next(contractors).forEach((c: any) => contractorsStore.put(c));
    else next.forEach((c: any) => contractorsStore.put(c));
  };
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompany, setInviteCompany] = useState("");
  const [inviteType, setInviteType] = useState("Main Contractor");

  const handleInvite = () => {
    if (!inviteEmail || !inviteCompany) {
      toast.error("Please fill all fields");
      return;
    }
    toast.success(`Invitation sent to ${inviteEmail}`, {
      description: `${inviteCompany} will receive portal access once they accept.`,
    });
    setShowInvite(false);
    setInviteEmail("");
    setInviteCompany("");
  };

  const handleSuspend = (id: string) => {
    setContractors(contractors.map((c) => c.id === id ? { ...c, status: "suspended" as const } : c));
    toast.warning("Contractor access suspended");
  };

  const handleReactivate = (id: string) => {
    setContractors(contractors.map((c) => c.id === id ? { ...c, status: "active" as const } : c));
    toast.success("Contractor access reactivated");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HardHat className="w-5 h-5 text-orange-600" />
            Contractor Portal Access
          </h2>
          <p className="text-sm text-slate-500">Manage external contractor access to this project's portal</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => { navigator.clipboard.writeText("https://portal.nasec.ae/contractor-portal"); toast.success("Portal URL copied"); }}>
            <Copy className="w-3 h-3" /> Copy Portal URL
          </Button>
          <Button size="sm" className="gap-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setShowInvite(true)}>
            <Plus className="w-3 h-3" /> Invite Contractor
          </Button>
        </div>
      </div>

      <Tabs defaultValue="contractors">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="contractors" className="gap-1"><Users className="w-3 h-3" /> Contractors ({contractors.length})</TabsTrigger>
          <TabsTrigger value="routing" className="gap-1"><Globe className="w-3 h-3" /> Routing Rules</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1"><Settings className="w-3 h-3" /> Portal Settings</TabsTrigger>
        </TabsList>

        {/* Contractors List */}
        <TabsContent value="contractors" className="mt-4 space-y-4">
          {/* Invite Form */}
          {showInvite && (
            <Card className="border border-orange-200 bg-orange-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-600" />
                  Invite New Contractor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Company Name *</Label>
                    <Input placeholder="Company name" value={inviteCompany} onChange={(e) => setInviteCompany(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Admin Email *</Label>
                    <Input type="email" placeholder="admin@company.ae" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={inviteType} onValueChange={setInviteType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Main Contractor">Main Contractor</SelectItem>
                        <SelectItem value="Sub-Contractor">Sub-Contractor</SelectItem>
                        <SelectItem value="Specialist Supplier">Specialist Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white gap-1" onClick={handleInvite}>
                    <Mail className="w-3 h-3" /> Send Invitation
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contractor Cards */}
          {contractors.map((contractor) => (
            <ContractorCard
              key={contractor.id}
              contractor={contractor}
              onSuspend={() => handleSuspend(contractor.id)}
              onReactivate={() => handleReactivate(contractor.id)}
            />
          ))}
        </TabsContent>

        {/* Routing Rules */}
        <TabsContent value="routing" className="mt-4 space-y-4">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm">Auto-Routing Configuration</CardTitle>
              <p className="text-xs text-slate-500">Submittals are automatically routed based on discipline and type. Modify reviewer assignments below.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(["SA", "SS", "SM", "SE", "SC", "RE", "BIM", "HSE", "PM", "CM"] as SiteRoleCode[]).map((role) => (
                  <div key={role} className="flex items-center justify-between p-2 rounded border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${SITE_ROLES[role].color}`}>{role}</Badge>
                      <span className="text-sm text-slate-700">{SITE_ROLES[role].label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        Reviews: {role === "PM" ? "EOT, VO, General" : role === "HSE" ? "HSE, PTW" : role === "CM" ? "PQ, VO" : "Discipline-specific"}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toast.info("Edit routing rules (demo)")}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portal Settings */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Mandatory MFA</p><p className="text-xs text-slate-500">Require multi-factor authentication for all portal users</p></div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Session Timeout</p><p className="text-xs text-slate-500">Auto-logout after inactivity</p></div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Audit Logging</p><p className="text-xs text-slate-500">Log all portal actions for compliance</p></div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">IP Restriction</p><p className="text-xs text-slate-500">Limit access to specific IP ranges</p></div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> SLA Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Working Days Calendar</p><p className="text-xs text-slate-500">UAE: Mon-Fri, excludes public holidays</p></div>
                <Badge variant="outline" className="text-[10px]">UAE 2026</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Auto-Escalation</p><p className="text-xs text-slate-500">Escalate to PM when SLA is breached</p></div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">SLA Warning Threshold</p><p className="text-xs text-slate-500">Notify reviewer before deadline</p></div>
                <Select defaultValue="2">
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="2">2 days before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4" /> Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Show IFC Drawings</p><p className="text-xs text-slate-500">Allow contractors to view IFC drawings</p></div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Show Reviewer Names</p><p className="text-xs text-slate-500">Display reviewer identity to contractors</p></div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Cross-Contractor Visibility</p><p className="text-xs text-slate-500">Allow contractors to see other contractors' submittals</p></div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContractorCard({ contractor, onSuspend, onReactivate }: { contractor: ContractorCompany; onSuspend: () => void; onReactivate: () => void }) {
  const statusColors = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    invited: "bg-blue-100 text-blue-700 border-blue-200",
    suspended: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <Card className={`border ${contractor.status === "suspended" ? "border-red-200 opacity-75" : "border-slate-200"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-slate-900">{contractor.name}</h3>
              <Badge className={`text-[9px] ${statusColors[contractor.status]}`}>{contractor.status}</Badge>
              <Badge variant="outline" className="text-[9px]">{contractor.type}</Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">TL: {contractor.tradeLicense}</p>

            {/* Users */}
            <div className="flex items-center gap-2 mt-2">
              {contractor.users.map((u) => (
                <div key={u.id} className="flex items-center gap-1.5 p-1 rounded bg-slate-50 border border-slate-200">
                  <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px]">{u.avatar}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-[10px] font-medium">{u.name}</p>
                    <p className="text-[9px] text-slate-400">{u.role}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Allowed Types */}
            <div className="flex flex-wrap gap-1 mt-2">
              {contractor.allowedTypes.slice(0, 8).map((t) => (
                <Badge key={t} variant="outline" className="text-[9px] px-1">{t}</Badge>
              ))}
              {contractor.allowedTypes.length > 8 && (
                <Badge variant="outline" className="text-[9px] px-1">+{contractor.allowedTypes.length - 8} more</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            {contractor.status === "active" && (
              <Button variant="outline" size="sm" className="text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={onSuspend}>
                <Lock className="w-3 h-3" /> Suspend
              </Button>
            )}
            {contractor.status === "suspended" && (
              <Button variant="outline" size="sm" className="text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={onReactivate}>
                <CheckCircle2 className="w-3 h-3" /> Reactivate
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => toast.info("Edit contractor settings (demo)")}>
              <Edit2 className="w-3 h-3" /> Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
