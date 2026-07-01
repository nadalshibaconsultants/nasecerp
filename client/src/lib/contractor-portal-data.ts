/**
 * Contractor Portal — Shared Data, Types, Routing Engine
 * Post-Contract ONLY — uses Site (S-prefix) roles exclusively
 */

// ===== SITE ROLE CODES (Post-Contract ONLY) =====
export type SiteRoleCode = "SA" | "SS" | "SM" | "SE" | "SC" | "RE" | "BIM" | "HSE" | "PM" | "CM";

export const SITE_ROLES: Record<SiteRoleCode, { label: string; color: string }> = {
  SA: { label: "Site Architect", color: "bg-violet-100 text-violet-700 border-violet-200" },
  SS: { label: "Site Structural Engineer", color: "bg-blue-100 text-blue-700 border-blue-200" },
  SM: { label: "Site Mechanical Engineer", color: "bg-red-100 text-red-700 border-red-200" },
  SE: { label: "Site Electrical Engineer", color: "bg-amber-100 text-amber-700 border-amber-200" },
  SC: { label: "Site Civil Engineer", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  RE: { label: "Resident Engineer", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  BIM: { label: "BIM Coordinator", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  HSE: { label: "HSE Officer", color: "bg-orange-100 text-orange-700 border-orange-200" },
  PM: { label: "Project Manager", color: "bg-slate-100 text-slate-700 border-slate-200" },
  CM: { label: "Commercial Manager", color: "bg-pink-100 text-pink-700 border-pink-200" },
};

// ===== DISCIPLINES =====
export const DISCIPLINES = [
  "Architecture",
  "Structural",
  "Mechanical",
  "Electrical / Low Current",
  "Civil",
  "Façade / Cladding",
  "Interior",
  "Landscape",
  "BIM / Coordination",
  "General / Multi-discipline",
] as const;
export type Discipline = (typeof DISCIPLINES)[number];

// ===== SUBMITTAL TYPES (Contractor → Consultant) =====
export const SUBMITTAL_TYPES = [
  { code: "RFI", name: "Request for Information", sla: 7 },
  { code: "MS", name: "Method Statement", sla: 5 },
  { code: "IR", name: "Inspection Request", sla: 2 },
  { code: "MOS", name: "Material on Site / Material Submittal", sla: 7 },
  { code: "SD", name: "Shop Drawing", sla: 14 },
  { code: "PQ", name: "Prequalification", sla: 14 },
  { code: "WIR", name: "Work Inspection Request", sla: 2 },
  { code: "MIR", name: "Material Inspection Request", sla: 7 },
  { code: "PTW", name: "Permit to Work", sla: 1 },
  { code: "HSE", name: "HSE Report", sla: 5 },
  { code: "TQ", name: "Technical Query", sla: 5 },
  { code: "EOT", name: "Extension of Time", sla: 21 },
  { code: "VO", name: "Variation Order Request", sla: 14 },
  { code: "LETTER", name: "Official Correspondence", sla: 5 },
] as const;
export type SubmittalTypeCode = (typeof SUBMITTAL_TYPES)[number]["code"];

// ===== CONSULTANT-ISSUED TYPES (Consultant → Contractor, read-only in portal) =====
export const CONSULTANT_ISSUED_TYPES = ["NCR", "SI", "PC", "PR", "MOM", "SVR", "SNAG"] as const;

// ===== CONTRACTOR TYPES =====
export type ContractorType = "Main Contractor" | "Sub-Contractor" | "Specialist Supplier";

// ===== ROUTING RULES MATRIX =====
export type RoutingRule = {
  primaryReviewer: SiteRoleCode | SiteRoleCode[];
  approver: SiteRoleCode;
  watchers: SiteRoleCode[];
  consulted?: SiteRoleCode[];
};

// Discipline → Primary Reviewer mapping
const DISCIPLINE_ROUTING: Record<string, SiteRoleCode | SiteRoleCode[]> = {
  "Architecture": "SA",
  "Structural": "SS",
  "Mechanical": "SM",
  "Electrical / Low Current": "SE",
  "Civil": "SC",
  "Façade / Cladding": ["SA", "SS"],
  "Interior": "SA",
  "Landscape": "SA",
  "BIM / Coordination": "BIM",
  "General / Multi-discipline": "PM",
};

export function getRoutingRule(type: SubmittalTypeCode, discipline: Discipline): RoutingRule {
  const basePrimary = DISCIPLINE_ROUTING[discipline] || "PM";

  switch (type) {
    case "RFI":
    case "TQ":
      return { primaryReviewer: basePrimary, approver: "PM", watchers: ["RE"] };
    case "MS":
      return { primaryReviewer: basePrimary, approver: "PM", watchers: ["RE"], consulted: ["HSE"] };
    case "IR":
    case "WIR":
      return { primaryReviewer: basePrimary, approver: "PM", watchers: ["RE"] };
    case "MOS":
    case "MIR":
      return { primaryReviewer: basePrimary, approver: "PM", watchers: ["RE"] };
    case "SD":
      return { primaryReviewer: basePrimary, approver: "PM", watchers: ["RE", "BIM"] };
    case "PQ":
      return { primaryReviewer: "CM", approver: "PM", watchers: ["RE"], consulted: Array.isArray(basePrimary) ? basePrimary : [basePrimary] };
    case "PTW":
      return { primaryReviewer: basePrimary, approver: "PM", watchers: ["RE"], consulted: ["HSE"] };
    case "EOT":
      return { primaryReviewer: "PM", approver: "PM", watchers: ["RE", "SA", "SS", "SM", "SE", "SC"], consulted: ["CM"] };
    case "VO":
      return { primaryReviewer: "CM", approver: "PM", watchers: ["RE"], consulted: Array.isArray(basePrimary) ? basePrimary : [basePrimary] };
    case "HSE":
      return { primaryReviewer: "HSE", approver: "PM", watchers: ["RE"] };
    case "LETTER":
      return { primaryReviewer: "PM", approver: "PM", watchers: ["RE"] };
    default:
      return { primaryReviewer: basePrimary, approver: "PM", watchers: ["RE"] };
  }
}

// ===== SLA STATUS =====
export type SLAStatus = "within" | "approaching" | "breached";
export function getSLAStatus(daysRemaining: number): SLAStatus {
  if (daysRemaining <= 0) return "breached";
  if (daysRemaining <= 2) return "approaching";
  return "within";
}
export const SLA_COLORS: Record<SLAStatus, string> = {
  within: "text-emerald-600",
  approaching: "text-amber-600",
  breached: "text-red-600",
};
export const SLA_BG_COLORS: Record<SLAStatus, string> = {
  within: "bg-emerald-50 border-emerald-200",
  approaching: "bg-amber-50 border-amber-200",
  breached: "bg-red-50 border-red-200",
};

// ===== RESPONSE STATUS =====
export type ResponseStatus = "Open" | "Under Review" | "Approved" | "Approved with Comments" | "Resubmit" | "Rejected" | "Need More Info";
export const RESPONSE_STATUS_COLORS: Record<ResponseStatus, string> = {
  "Open": "bg-blue-100 text-blue-700",
  "Under Review": "bg-amber-100 text-amber-700",
  "Approved": "bg-emerald-100 text-emerald-700",
  "Approved with Comments": "bg-teal-100 text-teal-700",
  "Resubmit": "bg-orange-100 text-orange-700",
  "Rejected": "bg-red-100 text-red-700",
  "Need More Info": "bg-purple-100 text-purple-700",
};

// ===== DEMO DATA =====

// Project team for Marina Heights Tower (Post-Contract)
export const MARINA_HEIGHTS_TEAM: Record<SiteRoleCode, { name: string; avatar: string }> = {
  PM: { name: "Ahmed Al Mansouri", avatar: "AM" },
  SA: { name: "Fatima Al Hashimi", avatar: "FH" },
  SS: { name: "Khalid Bin Rashid", avatar: "KR" },
  SM: { name: "Omar Al Suwaidi", avatar: "OS" },
  SE: { name: "Youssef El Khatib", avatar: "YK" },
  SC: { name: "Ibrahim Al Zaabi", avatar: "IZ" },
  RE: { name: "David Thompson", avatar: "DT" },
  BIM: { name: "Priya Sharma", avatar: "PS" },
  HSE: { name: "Mohammed Al Balushi", avatar: "MB" },
  CM: { name: "Sarah Williams", avatar: "SW" },
};

// Contractor Companies
export type ContractorCompany = {
  id: string;
  name: string;
  tradeLicense: string;
  type: ContractorType;
  trades: string[];
  status: "active" | "invited" | "suspended";
  users: ContractorUser[];
  allowedTypes: SubmittalTypeCode[];
};

export type ContractorUser = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Engineer" | "Coordinator";
  avatar: string;
  lastActive: string;
};

export const DEMO_CONTRACTORS: ContractorCompany[] = [
  {
    id: "abc-construction",
    name: "ABC Construction LLC",
    tradeLicense: "DXB-2019-456789",
    type: "Main Contractor",
    trades: ["Architecture", "Structural", "Civil", "Interior"],
    status: "active",
    users: [
      { id: "u1", name: "Rashid Al Maktoum", email: "rashid@abcconstruction.ae", role: "Admin", avatar: "RM", lastActive: "2026-05-08" },
      { id: "u2", name: "John Martinez", email: "john.m@abcconstruction.ae", role: "Engineer", avatar: "JM", lastActive: "2026-05-07" },
    ],
    allowedTypes: ["RFI", "MS", "IR", "MOS", "SD", "PQ", "WIR", "MIR", "PTW", "HSE", "TQ", "EOT", "VO", "LETTER"],
  },
  {
    id: "gulf-mep",
    name: "Gulf MEP Systems LLC",
    tradeLicense: "DXB-2020-234567",
    type: "Sub-Contractor",
    trades: ["Mechanical", "Electrical / Low Current"],
    status: "active",
    users: [
      { id: "u3", name: "Vikram Patel", email: "vikram@gulfmep.ae", role: "Admin", avatar: "VP", lastActive: "2026-05-08" },
    ],
    allowedTypes: ["RFI", "MS", "IR", "MOS", "SD", "WIR", "MIR", "PTW", "HSE", "TQ"],
  },
  {
    id: "skyline-facades",
    name: "Skyline Façades International",
    tradeLicense: "DXB-2021-345678",
    type: "Sub-Contractor",
    trades: ["Façade / Cladding"],
    status: "active",
    users: [
      { id: "u4", name: "Hans Mueller", email: "hans@skylinefacades.com", role: "Admin", avatar: "HM", lastActive: "2026-05-06" },
    ],
    allowedTypes: ["RFI", "MS", "MOS", "SD", "WIR", "TQ", "LETTER"],
  },
];

// Demo Submittals
export type PortalSubmittal = {
  id: string;
  ref: string;
  type: SubmittalTypeCode;
  discipline: Discipline;
  title: string;
  description: string;
  contractor: string;
  contractorUser: string;
  project: string;
  projectCode: string;
  dateSubmitted: string;
  slaDeadline: string;
  daysRemaining: number;
  status: ResponseStatus;
  revision: number;
  primaryReviewer: SiteRoleCode | SiteRoleCode[];
  approver: SiteRoleCode;
  watchers: SiteRoleCode[];
  attachments: string[];
  location?: string;
  priority: "Normal" | "Urgent";
  responseDate?: string;
  responseBy?: string;
  comments?: string;
  fromPortal: boolean;
};

export const DEMO_SUBMITTALS: PortalSubmittal[] = [
  {
    id: "ps-001",
    ref: "RFI-MHT-MEP-0024",
    type: "RFI",
    discipline: "Mechanical",
    title: "HVAC duct routing conflict at Level 12 transfer beam",
    description: "The main supply duct (1200x600mm) as per IFC drawing M-12-001 Rev.C conflicts with the transfer beam TB-12A. Please advise on alternative routing or beam penetration approval.",
    contractor: "Gulf MEP Systems LLC",
    contractorUser: "Vikram Patel",
    project: "Marina Heights Tower",
    projectCode: "MHT",
    dateSubmitted: "2026-05-01",
    slaDeadline: "2026-05-10",
    daysRemaining: 2,
    status: "Under Review",
    revision: 1,
    primaryReviewer: "SM",
    approver: "PM",
    watchers: ["RE"],
    attachments: ["M-12-001_conflict_markup.pdf", "site_photo_L12.jpg"],
    location: "Level 12, Grid C-D / 4-5",
    priority: "Urgent",
    fromPortal: true,
  },
  {
    id: "ps-002",
    ref: "SD-MHT-STR-0142",
    type: "SD",
    discipline: "Structural",
    title: "Post-tension slab layout Level 8-12 (Revised)",
    description: "Revised PT slab layout incorporating RFI-MHT-STR-0018 response. Updated tendon profiles and anchorage details per structural engineer's comments.",
    contractor: "ABC Construction LLC",
    contractorUser: "John Martinez",
    project: "Marina Heights Tower",
    projectCode: "MHT",
    dateSubmitted: "2026-04-28",
    slaDeadline: "2026-05-12",
    daysRemaining: 4,
    status: "Approved with Comments",
    revision: 2,
    primaryReviewer: "SS",
    approver: "PM",
    watchers: ["RE", "BIM"],
    attachments: ["SD-MHT-STR-0142_R2.pdf", "PT_calcs_L8-12.xlsx"],
    location: "Levels 8-12",
    priority: "Normal",
    responseDate: "2026-05-06",
    responseBy: "Khalid Bin Rashid (SS)",
    comments: "Approved. Minor comment: verify anchorage edge distance at Grid A/7. Mark-up attached.",
    fromPortal: true,
  },
  {
    id: "ps-003",
    ref: "SD-MHT-FAC-0015",
    type: "SD",
    discipline: "Façade / Cladding",
    title: "Curtain wall system detail — typical floor bracket",
    description: "Shop drawing for unitized curtain wall bracket connection to slab edge. Includes thermal break detail and waterproofing interface.",
    contractor: "Skyline Façades International",
    contractorUser: "Hans Mueller",
    project: "Marina Heights Tower",
    projectCode: "MHT",
    dateSubmitted: "2026-05-03",
    slaDeadline: "2026-05-17",
    daysRemaining: 9,
    status: "Under Review",
    revision: 1,
    primaryReviewer: ["SA", "SS"],
    approver: "PM",
    watchers: ["RE", "BIM"],
    attachments: ["SD-MHT-FAC-0015_R1.pdf", "bracket_3D_model.dwg"],
    location: "Typical floor (L5-L40)",
    priority: "Normal",
    fromPortal: true,
  },
  {
    id: "ps-004",
    ref: "MOS-MHT-ARC-0085",
    type: "MOS",
    discipline: "Architecture",
    title: "Porcelain tile — lobby flooring (600x1200 Calacatta)",
    description: "Material submittal for main lobby flooring. Manufacturer: Laminam. Model: Calacatta Oro 600x1200x5.6mm. Country of origin: Italy. Includes datasheet, test certificates, and sample photos.",
    contractor: "ABC Construction LLC",
    contractorUser: "Rashid Al Maktoum",
    project: "Marina Heights Tower",
    projectCode: "MHT",
    dateSubmitted: "2026-05-05",
    slaDeadline: "2026-05-12",
    daysRemaining: 4,
    status: "Approved",
    revision: 1,
    primaryReviewer: "SA",
    approver: "PM",
    watchers: ["RE"],
    attachments: ["Laminam_datasheet.pdf", "test_cert_EN14411.pdf", "sample_photos.zip"],
    location: "Ground Floor Lobby",
    priority: "Normal",
    responseDate: "2026-05-07",
    responseBy: "Fatima Al Hashimi (SA)",
    comments: "Approved. Ensure mock-up panel is installed for final colour approval before bulk order.",
    fromPortal: true,
  },
  {
    id: "ps-005",
    ref: "PTW-MHT-MEP-0008",
    type: "PTW",
    discipline: "Mechanical",
    title: "Hot work permit — welding chilled water pipes Level B2",
    description: "Request for hot work permit for welding chilled water pipe connections in Basement 2 plant room. Duration: 2 days. Safety measures: fire watch, extinguisher, welding screens.",
    contractor: "Gulf MEP Systems LLC",
    contractorUser: "Vikram Patel",
    project: "Marina Heights Tower",
    projectCode: "MHT",
    dateSubmitted: "2026-05-07",
    slaDeadline: "2026-05-08",
    daysRemaining: 0,
    status: "Approved",
    revision: 1,
    primaryReviewer: "SM",
    approver: "PM",
    watchers: ["RE"],
    attachments: ["PTW_risk_assessment.pdf", "welder_cert.pdf"],
    location: "Basement 2, Plant Room PR-B2",
    priority: "Urgent",
    responseDate: "2026-05-07",
    responseBy: "Omar Al Suwaidi (SM) + Mohammed Al Balushi (HSE)",
    comments: "Approved. Fire watch must be maintained 30 min after welding ceases. HSE officer to inspect before start.",
    fromPortal: true,
  },
  {
    id: "ps-006",
    ref: "EOT-MHT-GEN-0003",
    type: "EOT",
    discipline: "General / Multi-discipline",
    title: "14-day extension — Ramadan productivity reduction",
    description: "Extension of Time claim for 14 calendar days due to reduced working hours during Ramadan (March 2026). Supporting evidence: approved Ramadan schedule, actual vs planned progress comparison.",
    contractor: "ABC Construction LLC",
    contractorUser: "Rashid Al Maktoum",
    project: "Marina Heights Tower",
    projectCode: "MHT",
    dateSubmitted: "2026-04-15",
    slaDeadline: "2026-05-06",
    daysRemaining: -2,
    status: "Resubmit",
    revision: 1,
    primaryReviewer: "PM",
    approver: "PM",
    watchers: ["RE", "SA", "SS", "SM", "SE", "SC"],
    attachments: ["EOT_claim_Ramadan.pdf", "programme_comparison.mpp"],
    priority: "Normal",
    responseDate: "2026-05-05",
    responseBy: "Ahmed Al Mansouri (PM)",
    comments: "Insufficient evidence. Please provide daily labour records and actual programme update showing critical path impact. Resubmit with Rev.2.",
    fromPortal: true,
  },
  {
    id: "ps-007",
    ref: "MS-MHT-CIV-0012",
    type: "MS",
    discipline: "Civil",
    title: "Dewatering method statement — basement excavation Phase 2",
    description: "Method statement for dewatering system during Phase 2 basement excavation. Includes well-point layout, pump specifications, discharge plan, and environmental monitoring protocol.",
    contractor: "ABC Construction LLC",
    contractorUser: "John Martinez",
    project: "Marina Heights Tower",
    projectCode: "MHT",
    dateSubmitted: "2026-05-06",
    slaDeadline: "2026-05-11",
    daysRemaining: 3,
    status: "Open",
    revision: 1,
    primaryReviewer: "SC",
    approver: "PM",
    watchers: ["RE"],
    attachments: ["MS_dewatering_Ph2.pdf", "pump_specs.pdf", "env_monitoring_plan.pdf"],
    location: "Basement excavation Zone B",
    priority: "Normal",
    fromPortal: true,
  },
  {
    id: "ps-008",
    ref: "WIR-MHT-STR-0034",
    type: "WIR",
    discipline: "Structural",
    title: "Rebar inspection — Level 4 slab pour (Zone A)",
    description: "Work inspection request for reinforcement check before Level 4 slab concrete pour in Zone A. All prerequisite items completed: formwork check, MEP sleeves installed, PT ducts laid.",
    contractor: "ABC Construction LLC",
    contractorUser: "John Martinez",
    project: "Marina Heights Tower",
    projectCode: "MHT",
    dateSubmitted: "2026-05-08",
    slaDeadline: "2026-05-09",
    daysRemaining: 1,
    status: "Open",
    revision: 1,
    primaryReviewer: "SS",
    approver: "PM",
    watchers: ["RE"],
    attachments: ["rebar_schedule_L4_ZoneA.pdf", "formwork_check_cert.pdf"],
    location: "Level 4, Zone A (Grid 1-5 / A-D)",
    priority: "Urgent",
    fromPortal: true,
  },
];

// Consultant-issued items (visible to contractor as read-only inbox)
export type ConsultantIssuedItem = {
  id: string;
  ref: string;
  type: string;
  title: string;
  issuedDate: string;
  issuedBy: string;
  contractor: string;
  status: "Issued" | "Acknowledged" | "Action Required" | "Closed";
  dueDate?: string;
};

export const DEMO_CONSULTANT_ISSUED: ConsultantIssuedItem[] = [
  { id: "ci-001", ref: "NCR-MHT-002", type: "NCR", title: "Rebar spacing non-compliance — shear wall W4", issuedDate: "2026-05-01", issuedBy: "Khalid Bin Rashid (SS)", contractor: "ABC Construction LLC", status: "Action Required", dueDate: "2026-05-08" },
  { id: "ci-002", ref: "SI-MHT-003", type: "SI", title: "Relocate fire hydrant at entrance", issuedDate: "2026-05-02", issuedBy: "Omar Al Suwaidi (SM)", contractor: "Gulf MEP Systems LLC", status: "Acknowledged" },
  { id: "ci-003", ref: "SNAG-MHT-001", type: "SNAG", title: "Basement waterproofing defect — joint B2/J4", issuedDate: "2026-04-28", issuedBy: "David Thompson (RE)", contractor: "ABC Construction LLC", status: "Action Required", dueDate: "2026-05-12" },
];

// UAE Public Holidays 2026
export const UAE_HOLIDAYS_2026 = [
  "2026-01-01", // New Year
  "2026-03-28", // Ramadan start (approx)
  "2026-04-27", // Eid Al Fitr (approx)
  "2026-04-28",
  "2026-04-29",
  "2026-07-05", // Eid Al Adha (approx)
  "2026-07-06",
  "2026-07-07",
  "2026-07-26", // Islamic New Year (approx)
  "2026-10-05", // Prophet's Birthday (approx)
  "2026-12-01", // Commemoration Day
  "2026-12-02", // National Day
  "2026-12-03", // National Day
];

// Auto-numbering helper
export function generateRef(type: SubmittalTypeCode, projectCode: string, discipline: Discipline): string {
  const discCode = {
    "Architecture": "ARC",
    "Structural": "STR",
    "Mechanical": "MEP",
    "Electrical / Low Current": "ELE",
    "Civil": "CIV",
    "Façade / Cladding": "FAC",
    "Interior": "INT",
    "Landscape": "LAN",
    "BIM / Coordination": "BIM",
    "General / Multi-discipline": "GEN",
  }[discipline] || "GEN";
  const seq = String(Math.floor(Math.random() * 900) + 100).padStart(4, "0");
  return `${type}-${projectCode}-${discCode}-${seq}`;
}
