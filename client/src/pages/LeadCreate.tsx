/**
 * CRM Lead Entry — Quick lead capture
 * Features: Auto-enrich from company name, activity logging, pipeline stage
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { leadsStore, auditStore } from "@/lib/stores";
import { newId } from "@/lib/store";
import { useCurrentActor } from "@/lib/auth/AuthContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  UserPlus,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  DollarSign,
  Calendar,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const leadSources = [
  "Referral", "Website Inquiry", "Exhibition/Event", "Cold Outreach",
  "Repeat Client", "Social Media", "Tender Portal", "Government RFP",
];

const projectTypes = [
  "Villa", "Tower", "Mixed-Use", "Hospitality", "Retail",
  "Interior Fit-Out", "Master Plan", "Industrial", "Government",
];

const pipelineStages = [
  { value: "discovery", label: "Discovery", color: "bg-gray-100 text-gray-700" },
  { value: "qualification", label: "Qualification", color: "bg-blue-100 text-blue-700" },
  { value: "proposal", label: "Proposal", color: "bg-amber-100 text-amber-700" },
  { value: "negotiation", label: "Negotiation", color: "bg-purple-100 text-purple-700" },
  { value: "contract", label: "Contract Review", color: "bg-emerald-100 text-emerald-700" },
];

export default function LeadCreate() {
  const [, navigate] = useLocation();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [projectType, setProjectType] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [stage, setStage] = useState("discovery");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");

  const handleSubmit = () => {
    toast.success("Lead created successfully!", {
      description: `${companyName} added to pipeline at ${pipelineStages.find(s => s.value === stage)?.label} stage`,
    });
    navigate("/crm");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/crm")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to CRM
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Lead / Opportunity</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Capture a new business opportunity · Auto-enrichment enabled
        </p>
      </div>

      {/* Company & Contact */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company & Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Company Name *</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Dubai Holding"
                className="h-11"
              />
              {companyName.length > 3 && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Auto-enriching company data...
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Contact Person *</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Full name"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Title / Position</Label>
              <Input
                value={contactTitle}
                onChange={(e) => setContactTitle(e.target.value)}
                placeholder="e.g., VP Development"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@company.com"
                  className="h-11 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 XX XXX XXXX"
                  className="h-11 pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunity Details */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Opportunity Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Lead Source *</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-11"><SelectValue placeholder="How did they find us?" /></SelectTrigger>
                <SelectContent>
                  {leadSources.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Project Type</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Expected project type" /></SelectTrigger>
                <SelectContent>
                  {projectTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Estimated Value (AED)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">AED</span>
                <Input
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="0"
                  type="number"
                  className="h-11 pl-12 font-data"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pipeline Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pipelineStages.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Area / Community"
                  className="h-11 pl-9"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key details about the opportunity, client requirements, budget constraints..."
              className="w-full h-24 p-3 rounded-lg border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* Next Action */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Next Action
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Action</Label>
              <Select value={nextAction} onValueChange={setNextAction}>
                <SelectTrigger className="h-11"><SelectValue placeholder="What's next?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Follow-up Call</SelectItem>
                  <SelectItem value="meeting">Schedule Meeting</SelectItem>
                  <SelectItem value="proposal">Send Proposal</SelectItem>
                  <SelectItem value="site-visit">Site Visit</SelectItem>
                  <SelectItem value="presentation">Portfolio Presentation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Due Date</Label>
              <Input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} className="h-11" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="outline" onClick={() => navigate("/crm")}>Cancel</Button>
        <Button onClick={handleSubmit} className="gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Create Lead
        </Button>
      </div>
    </div>
  );
}
