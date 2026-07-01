/**
 * HR Forms — Employee Onboarding, Leave Request, Expense Claim
 * Tabbed interface for all HR data-entry workflows
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
import { Progress } from "@/components/ui/progress";
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
  Calendar,
  Receipt,
  Upload,
  Check,
  AlertCircle,
  Building2,
  Plane,
  Clock,
  Send,
} from "lucide-react";
import { toast } from "sonner";

// Onboarding checklist
const onboardingSteps = [
  { id: "personal", label: "Personal Information", required: true },
  { id: "passport", label: "Passport & Visa Details", required: true },
  { id: "emergency", label: "Emergency Contacts", required: true },
  { id: "bank", label: "Bank Account (WPS)", required: true },
  { id: "documents", label: "Document Uploads", required: true },
  { id: "equipment", label: "Equipment & Access", required: false },
  { id: "training", label: "Orientation Schedule", required: false },
];

const leaveTypes = [
  { value: "annual", label: "Annual Leave", balance: 22, color: "text-blue-600" },
  { value: "sick", label: "Sick Leave", balance: 10, color: "text-red-600" },
  { value: "compassionate", label: "Compassionate Leave", balance: 5, color: "text-purple-600" },
  { value: "maternity", label: "Maternity Leave", balance: 45, color: "text-pink-600" },
  { value: "paternity", label: "Paternity Leave", balance: 5, color: "text-indigo-600" },
  { value: "hajj", label: "Hajj Leave", balance: 30, color: "text-emerald-600" },
  { value: "unpaid", label: "Unpaid Leave", balance: 999, color: "text-gray-600" },
];

const expenseCategories = [
  "Travel - Flights", "Travel - Hotel", "Travel - Transport",
  "Client Entertainment", "Office Supplies", "Software/Subscriptions",
  "Professional Development", "Site Visit Expenses", "Printing/Plotting",
];

export default function HRForms() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("onboarding");

  // Onboarding state
  const [onboardingProgress, setOnboardingProgress] = useState(2);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationality, setNationality] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [startDate, setStartDate] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [visaType, setVisaType] = useState("");

  // Leave state
  const [leaveType, setLeaveType] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // Expense state
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseProject, setExpenseProject] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseItems, setExpenseItems] = useState([
    { date: "2026-05-01", category: "Travel - Transport", amount: "250", description: "Taxi to site - Al Wasl Tower" },
    { date: "2026-05-03", category: "Client Entertainment", amount: "480", description: "Client lunch - Dubai Holding" },
  ]);

  const handleOnboardingSubmit = () => {
    toast.success("Employee onboarding initiated", {
      description: `${firstName} ${lastName} added. HR workflow started.`,
    });
  };

  const handleLeaveSubmit = () => {
    toast.success("Leave request submitted", {
      description: "Sent to your line manager for approval.",
    });
  };

  const handleExpenseSubmit = () => {
    const total = expenseItems.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
    toast.success("Expense claim submitted", {
      description: `AED ${total.toLocaleString()} · ${expenseItems.length} items · Pending approval`,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/hr")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to HR
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">HR Forms</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Employee onboarding, leave requests, and expense claims
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="onboarding" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-2">
            <Plane className="w-4 h-4" />
            Leave Request
          </TabsTrigger>
          <TabsTrigger value="expense" className="gap-2">
            <Receipt className="w-4 h-4" />
            Expense Claim
          </TabsTrigger>
        </TabsList>

        {/* Employee Onboarding */}
        <TabsContent value="onboarding">
          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  New Employee Onboarding
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{onboardingProgress}/{onboardingSteps.length} complete</span>
                  <Progress value={(onboardingProgress / onboardingSteps.length) * 100} className="w-24 h-2" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Checklist sidebar */}
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                {onboardingSteps.map((step, i) => (
                  <Badge
                    key={step.id}
                    className={`text-[10px] ${
                      i < onboardingProgress ? "bg-emerald-100 text-emerald-700" :
                      i === onboardingProgress ? "bg-primary text-primary-foreground" :
                      "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {i < onboardingProgress && <Check className="w-3 h-3 mr-1" />}
                    {step.label}
                  </Badge>
                ))}
              </div>

              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b border-border pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">First Name *</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Last Name *</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Nationality *</Label>
                    <Select value={nationality} onValueChange={setNationality}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["UAE", "India", "Pakistan", "Philippines", "Egypt", "Jordan", "UK", "USA", "Other"].map(n => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Department *</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["Architecture", "Structural", "MEP", "Interior Design", "Landscape", "BIM", "Admin", "Finance"].map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Position *</Label>
                    <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Job title" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Start Date *</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10" />
                  </div>
                </div>
              </div>

              {/* Passport & Visa */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b border-border pb-2">Passport & Visa</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Passport Number *</Label>
                    <Input value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} placeholder="Passport #" className="h-10 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Passport Expiry *</Label>
                    <Input type="date" value={passportExpiry} onChange={(e) => setPassportExpiry(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Visa Type *</Label>
                    <Select value={visaType} onValueChange={setVisaType}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employment">Employment Visa</SelectItem>
                        <SelectItem value="golden">Golden Visa</SelectItem>
                        <SelectItem value="freelance">Freelance Visa</SelectItem>
                        <SelectItem value="visit">Visit Visa (Converting)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    System will auto-alert 90 days before passport/visa expiry
                  </p>
                </div>
              </div>

              {/* Document uploads */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b border-border pb-2">Document Uploads</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {["Passport Copy", "Emirates ID", "Visa Copy", "Educational Certificates", "Experience Letters", "Photo (White BG)"].map(doc => (
                    <div key={doc} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="text-sm">{doc}</span>
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <Upload className="w-3 h-3" />
                        Upload
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline">Save Draft</Button>
                <Button onClick={handleOnboardingSubmit} className="gap-2">
                  <Check className="w-4 h-4" />
                  Submit Onboarding
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Request */}
        <TabsContent value="leave">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plane className="w-5 h-5" />
                Leave Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Leave balances */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {leaveTypes.slice(0, 4).map(lt => (
                  <div key={lt.value} className="p-3 rounded-lg border border-border text-center">
                    <p className={`text-xl font-mono font-bold ${lt.color}`}>{lt.balance}</p>
                    <p className="text-[10px] text-muted-foreground">{lt.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Leave Type *</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select leave type" /></SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map(lt => (
                        <SelectItem key={lt.value} value={lt.value}>
                          {lt.label} ({lt.balance} days remaining)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reason</Label>
                  <Input
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Brief reason (optional)"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Start Date *</Label>
                  <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">End Date *</Label>
                  <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className="h-11" />
                </div>
              </div>

              {leaveStart && leaveEnd && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Duration:</span>
                    <span className="text-lg font-mono font-bold">
                      {Math.max(1, Math.ceil((new Date(leaveEnd).getTime() - new Date(leaveStart).getTime()) / (1000 * 60 * 60 * 24)) + 1)} working days
                    </span>
                  </div>
                </div>
              )}

              {/* Approval flow */}
              <div className="p-4 rounded-lg border border-border bg-secondary/20">
                <h4 className="text-sm font-medium mb-2">Approval Flow</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">You</Badge>
                  <span>→</span>
                  <Badge variant="secondary" className="text-[10px]">Line Manager</Badge>
                  <span>→</span>
                  <Badge variant="secondary" className="text-[10px]">HR</Badge>
                  <span>→</span>
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Approved</Badge>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleLeaveSubmit} className="gap-2">
                  <Send className="w-4 h-4" />
                  Submit Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Claim */}
        <TabsContent value="expense">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Expense Claim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Expense Items</Label>
                  <span className="text-sm font-data font-bold">
                    Total: AED {expenseItems.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0).toLocaleString()}
                  </span>
                </div>
                {expenseItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="flex-1 grid grid-cols-4 gap-3">
                      <span className="text-sm font-data">{item.date}</span>
                      <span className="text-sm">{item.category}</span>
                      <span className="text-sm">{item.description}</span>
                      <span className="text-sm font-data font-bold text-right">AED {item.amount}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new item */}
              <div className="p-4 rounded-lg border-2 border-dashed border-border space-y-3">
                <h4 className="text-sm font-medium">Add Expense Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Amount (AED)</Label>
                    <Input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" className="h-9 font-data" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} placeholder="Brief note" className="h-9" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Upload className="w-3 h-3" />
                    Attach Receipt
                  </Button>
                  <Button size="sm" onClick={() => {
                    if (expenseDate && expenseAmount) {
                      setExpenseItems([...expenseItems, { date: expenseDate, category: expenseCategory, amount: expenseAmount, description: expenseDescription }]);
                      setExpenseDate(""); setExpenseAmount(""); setExpenseDescription("");
                      toast.success("Item added");
                    }
                  }}>
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Project allocation */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Charge to Project (optional)</Label>
                <Select value={expenseProject} onValueChange={setExpenseProject}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select project or leave blank for general" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General / Non-Project</SelectItem>
                    <SelectItem value="al-wasl">Al Wasl Tower</SelectItem>
                    <SelectItem value="marina">Marina Heights Residences</SelectItem>
                    <SelectItem value="palm">Palm Villas Phase 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline">Save Draft</Button>
                <Button onClick={handleExpenseSubmit} className="gap-2">
                  <Send className="w-4 h-4" />
                  Submit Claim
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


