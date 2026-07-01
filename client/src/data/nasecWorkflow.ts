/**
 * NASEC PROJECT WORKFLOW TEMPLATE — Master Configuration Data
 * Source: WF-TPL-001 (Rev 02), aligned QMS C-3.1.1 Project Management Manual, Rev 01
 * Imported verbatim from NASEC_Project_Workflow_Template_v2.xlsx
 * DO NOT modify without QMS change control approval.
 */

// ═══════════════════════════════════════════════════════════════
// SHEET 1: ROLES — Master Roles Library (12 roles)
// ═══════════════════════════════════════════════════════════════
export interface NasecRole {
  code: string;
  title: string;
  reportsTo: string;
  primaryFunction: string;
  manualRef: string;
  category: "core" | "support";
  department: string;
  minGrade: string;
}

export const NASEC_ROLES: NasecRole[] = [
  { code: "PM", title: "Project Manager", reportsTo: "Projects Division Head / PCEO", primaryFunction: "Single point of accountability for the project. Plans, organises, executes, monitors and closes the project. Owns Client relationship, schedule, budget, quality, risk.", manualRef: "PMM §4.2", category: "core", department: "Projects", minGrade: "Senior PM" },
  { code: "LA", title: "Lead Architect", reportsTo: "Project Manager", primaryFunction: "Architectural design lead. Owns design intent, BODR architectural section, base plans, drawing standards, design coordination across disciplines.", manualRef: "PMM §4.5.1, §5.6, §5.8", category: "core", department: "Architecture", minGrade: "Senior Architect" },
  { code: "LM", title: "Lead Mechanical", reportsTo: "Project Manager", primaryFunction: "Mechanical / HVAC design lead. Owns MEP-M criteria, calculations, drawings, specifications, BOQ takeoff and Civil Defence / DEWA submissions for mechanical scope.", manualRef: "PMM §4.5.1, §5.7", category: "core", department: "Mechanical", minGrade: "Senior Mechanical Engineer" },
  { code: "LE", title: "Lead Electrical", reportsTo: "Project Manager", primaryFunction: "Electrical / Low-Current design lead. Owns electrical criteria, calculations, drawings, specifications, BOQ takeoff and DEWA / Etisalat / du submissions.", manualRef: "PMM §4.5.1, §5.7", category: "core", department: "Electrical", minGrade: "Senior Electrical Engineer" },
  { code: "LS", title: "Lead Structural", reportsTo: "Project Manager", primaryFunction: "Structural design lead. Owns structural criteria, calculations, drawings, geotechnical coordination, specifications, BOQ takeoff and structural authority submissions.", manualRef: "PMM §4.5.1, §5.7", category: "core", department: "Structural", minGrade: "Senior Structural Engineer" },
  { code: "CM", title: "Commercial Manager", reportsTo: "Project Manager / PCEO", primaryFunction: "Commercial lead. Owns budget, cost estimates, BOQ pricing, tender documents, contract conditions, variations, claims and payment certification. Combined QS + Contracts function.", manualRef: "PMM §4.2.8, §5.9.7, §5.9.8, §5.10", category: "core", department: "Commercial", minGrade: "Senior QS / Commercial Manager" },
  { code: "AE", title: "Authority Engineer", reportsTo: "Project Manager", primaryFunction: "Owns all Dubai authority submissions. Engages from the moment Client approves Stage 2 (preliminary design approval to DM/Trakhees) and again after Stage 3 client approval (final building permit). Tracks NOCs from DCD, DEWA, RTA, Etisalat/du, DCAA, DLD and other authorities through to Practical Completion.", manualRef: "PMM §4.5.2 (SAC role) + Authorities Approval Manual", category: "core", department: "Authority Approvals", minGrade: "Senior Authority Engineer" },
  { code: "PE", title: "Project Engineer", reportsTo: "Project Manager", primaryFunction: "Technical right-hand to PM. Manages technical coordination, document control, deliverable compilation and squad checks.", manualRef: "PMM §4.3", category: "support", department: "Projects", minGrade: "Project Engineer" },
  { code: "PCE", title: "Project Controls Engineer", reportsTo: "Project Manager", primaryFunction: "Schedule, man-hour budget control, progress curves and PBCR maintenance.", manualRef: "PMM §4.4", category: "support", department: "Project Controls", minGrade: "Project Controls Engineer" },
  { code: "BIM", title: "BIM Manager", reportsTo: "Project Manager", primaryFunction: "BIM execution plan, model federation, clash detection, model audits.", manualRef: "PMM §3.1, §5.3.7", category: "support", department: "BIM", minGrade: "BIM Manager" },
  { code: "SM", title: "Specification Manager", reportsTo: "Project Manager", primaryFunction: "Outline (BODR) and full project specifications, MasterFormat compliance.", manualRef: "PMM §5.8.3, §5.9.6", category: "support", department: "Architecture", minGrade: "Specification Writer" },
  { code: "QS", title: "Quantity Surveyor", reportsTo: "Commercial Manager", primaryFunction: "Material takeoff, BOQ build-up, cost estimates (often delegated by CM).", manualRef: "PMM §5.9.7", category: "support", department: "Commercial", minGrade: "Quantity Surveyor" },
];

// ═══════════════════════════════════════════════════════════════
// SHEET 2: STAGES — 8 Stages + 5 Client Approval Gates
// ═══════════════════════════════════════════════════════════════
export interface NasecStage {
  id: string;
  name: string;
  type: "stage" | "gate";
  description: string;
  keyDeliverable: string;
  approvalWindow: string;
  leadRole: string;
  manualRef: string;
}

export const NASEC_STAGES: NasecStage[] = [
  { id: "S1", name: "Stage 1 — Data Collection & Design Brief", type: "stage", description: "Receipt of project, mobilisation, basic data collection, kick-off meetings, finalised Project Design Brief.", keyDeliverable: "Project Design Brief + Data Collection Report", approvalWindow: "Project-specific (set in Consultancy Agreement)", leadRole: "PM + LA", manualRef: "PMM §5.5, §5.6.2" },
  { id: "G1", name: "★ Client Acceptance Gate — after Stage 1", type: "gate", description: "Client written acceptance of Stage 1 deliverable.", keyDeliverable: "Acceptance letter / written confirmation", approvalWindow: "10 working days from submission", leadRole: "Client", manualRef: "Consultancy Agreement" },
  { id: "S2", name: "Stage 2 — Concept Design", type: "stage", description: "Develop site & building concepts, design ideas, preliminary visualisation, concept package + initial cost.", keyDeliverable: "Concept Design Package (Architectural / Interior / Landscape)", approvalWindow: "Project-specific", leadRole: "PM + LA", manualRef: "PMM §5.6" },
  { id: "G2", name: "★ Client Approval Gate — after Stage 2", type: "gate", description: "Client written approval of Concept Design. Triggers AE preliminary design submission to authority.", keyDeliverable: "Approval letter → AE submits to DM / Trakhees", approvalWindow: "20 working days from submission", leadRole: "Client → AE", manualRef: "Consultancy Agreement + Auth. Manual" },
  { id: "S3", name: "Stage 3 — Schematic Design + BODR", type: "stage", description: "Schematic drawings, design criteria for all disciplines, BODR, outline specs, budgetary estimate. AE leads preliminary authority submission in parallel.", keyDeliverable: "Schematic Drawings + Bases of Design Report (BODR)", approvalWindow: "Project-specific", leadRole: "PM + LA + LM/LE/LS + CM + AE", manualRef: "PMM §5.8" },
  { id: "G3", name: "★ Client Approval Gate — after Stage 3", type: "gate", description: "Client written approval of Schematic + BODR. Triggers AE final building permit submission to DM / Trakhees.", keyDeliverable: "Approval letter → AE submits final building permit", approvalWindow: "20 working days from submission", leadRole: "Client → AE", manualRef: "Consultancy Agreement + Auth. Manual" },
  { id: "S4", name: "Stage 4 — Draft Detailed Design + Tender Documents", type: "stage", description: "Detailed drawings, calculations, full specifications, draft BOQ, draft tender package and front-end documents. AE pursues building permit + NOCs.", keyDeliverable: "Draft DD Drawings + Specs + BOQ + Tender Docs", approvalWindow: "Project-specific", leadRole: "PM + All Leads + CM + AE", manualRef: "PMM §5.9" },
  { id: "G4", name: "★ Client Approval Gate — after Stage 4", type: "gate", description: "Client written approval of Draft DD package.", keyDeliverable: "Approval letter", approvalWindow: "20 working days from submission", leadRole: "Client", manualRef: "Consultancy Agreement" },
  { id: "S5", name: "Stage 5 — Final Detailed Design + Tender Documents", type: "stage", description: "IFC drawing set, final specs, priced BOQ, final tender package. All NOCs/permits secured by AE before submission.", keyDeliverable: "IFC Drawings + Final Spec + Priced BOQ + Tender Package + NOCs", approvalWindow: "Project-specific", leadRole: "PM + All Leads + CM + AE", manualRef: "PMM §5.9.11" },
  { id: "G5", name: "★ Client Approval Gate — after Stage 5", type: "gate", description: "Client written approval of Final DD package, ready for tender.", keyDeliverable: "Approval letter", approvalWindow: "20 working days from submission", leadRole: "Client", manualRef: "Consultancy Agreement" },
  { id: "S6", name: "Stage 6 — Prequalification of Contractors", type: "stage", description: "Prepare PQD, screen contractors, issue prequalified shortlist (only if contracted).", keyDeliverable: "Prequalification Documents + Shortlist", approvalWindow: "Project-specific", leadRole: "PM + CM", manualRef: "PMM §5.10.2" },
  { id: "S7", name: "Stage 7 — Tender Services", type: "stage", description: "Tender period, analysis, award, contract preparation. Sub-stages 7a-7d per Consultancy Agreement.", keyDeliverable: "Tender Analysis Report + Award Recommendation + Contract", approvalWindow: "Project-specific (per sub-stage)", leadRole: "PM + CM", manualRef: "PMM §5.10" },
  { id: "S8", name: "Stage 8 — Post-Contract & Supervision", type: "stage", description: "Site supervision, design intent compliance, RFI/IR responses, variations, payment certification, snagging, completion. AE handles construction-phase amendments.", keyDeliverable: "Monthly Reports + Variations + IPCs + Practical Completion Certificate", approvalWindow: "Project-specific", leadRole: "PM + All Leads + CM + AE", manualRef: "Construction Manual" },
];

// ═══════════════════════════════════════════════════════════════
// SHEET 3: RACI — Master Responsibility Assignment Matrix (74 activities × 11 roles)
// ═══════════════════════════════════════════════════════════════
export type RaciValue = "R" | "A" | "C" | "I" | "";

export interface RaciActivity {
  stage: string;
  activity: string;
  PM: RaciValue; LA: RaciValue; LM: RaciValue; LE: RaciValue; LS: RaciValue;
  CM: RaciValue; AE: RaciValue; PE: RaciValue; BIM: RaciValue; SM: RaciValue; QS: RaciValue;
}

export const NASEC_RACI: RaciActivity[] = [
  { stage: "S1", activity: "Project initiation & basic data entry", PM: "A", LA: "C", LM: "", LE: "", LS: "", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S1", activity: "Project organisation chart & staffing plan", PM: "A", LA: "C", LM: "I", LE: "I", LS: "I", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S1", activity: "Baseline programme + man-hour budget setup", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S1", activity: "Project Quality Plan (PQP) preparation", PM: "A", LA: "C", LM: "", LE: "", LS: "", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S1", activity: "Site visits, surveys, geotech briefs", PM: "A", LA: "R", LM: "C", LE: "C", LS: "R", CM: "I", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S1", activity: "Client kick-off & internal kick-off meetings", PM: "A", LA: "R", LM: "", LE: "", LS: "", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S1", activity: "Finalised Project Design Brief", PM: "A", LA: "R", LM: "", LE: "", LS: "", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S1", activity: "Stage 1 invoice + collection", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "G1", activity: "Client written acceptance of Stage 1", PM: "A", LA: "C", LM: "", LE: "", LS: "", CM: "I", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S2", activity: "Update / verify design data", PM: "A", LA: "R", LM: "C", LE: "C", LS: "C", CM: "I", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S2", activity: "Concept generation & design studies", PM: "A", LA: "R", LM: "C", LE: "C", LS: "C", CM: "I", AE: "", PE: "", BIM: "I", SM: "", QS: "" },
  { stage: "S2", activity: "Concept visualisation & presentation materials", PM: "A", LA: "R", LM: "I", LE: "I", LS: "I", CM: "I", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S2", activity: "Concept Design Report (incl. tentative cost)", PM: "A", LA: "R", LM: "C", LE: "C", LS: "C", CM: "R", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S2", activity: "Internal review (PCEO) + Client presentation", PM: "A", LA: "R", LM: "", LE: "", LS: "", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S2", activity: "Concept stage close-out + invoice", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "G2", activity: "Client written approval of Concept Design", PM: "A", LA: "C", LM: "", LE: "", LS: "", CM: "I", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "G2", activity: "AE: prepare Preliminary Design Approval submission", PM: "A", LA: "R", LM: "C", LE: "C", LS: "C", CM: "", AE: "R", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "G2", activity: "AE: submit to DM / Trakhees / DDA (preliminary)", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "", AE: "R", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S3", activity: "BODR preparation — table of contents", PM: "A", LA: "R", LM: "C", LE: "C", LS: "C", CM: "", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S3", activity: "Design criteria — Architectural / Interior / Landscape", PM: "A", LA: "R", LM: "", LE: "", LS: "", CM: "I", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S3", activity: "Design criteria — Mechanical (HVAC, Plumbing, FF)", PM: "A", LA: "C", LM: "R", LE: "", LS: "", CM: "", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S3", activity: "Design criteria — Electrical / Low Current", PM: "A", LA: "C", LM: "", LE: "R", LS: "", CM: "", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S3", activity: "Design criteria — Structural / Geotechnical", PM: "A", LA: "C", LM: "", LE: "", LS: "R", CM: "", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S3", activity: "Schematic drawings — base plans + all disciplines", PM: "A", LA: "R", LM: "R", LE: "R", LS: "R", CM: "", AE: "", PE: "R", BIM: "R", SM: "", QS: "" },
  { stage: "S3", activity: "Outline specifications", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "", AE: "", PE: "", BIM: "", SM: "R", QS: "" },
  { stage: "S3", activity: "Budgetary cost estimate (preliminary BOQ)", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "R" },
  { stage: "S3", activity: "Squad check (Level-2 review)", PM: "A", LA: "R", LM: "R", LE: "R", LS: "R", CM: "", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S3", activity: "AE: respond to authority preliminary comments", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "", AE: "R", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S3", activity: "BODR + Schematic compilation & Client submission", PM: "A", LA: "R", LM: "", LE: "", LS: "", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "G3", activity: "Client written approval of Schematic + BODR", PM: "A", LA: "C", LM: "", LE: "", LS: "", CM: "I", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "G3", activity: "AE: prepare Final Building Permit submission", PM: "A", LA: "R", LM: "R", LE: "R", LS: "R", CM: "", AE: "R", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "G3", activity: "AE: submit Final Building Permit to DM / Trakhees / DDA", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "", AE: "R", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S4", activity: "Incorporate Client + Authority comments on SD/BODR", PM: "A", LA: "R", LM: "R", LE: "R", LS: "R", CM: "C", AE: "C", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S4", activity: "Detailed drawings + design calculations (Architecture)", PM: "A", LA: "R", LM: "", LE: "", LS: "", CM: "", AE: "", PE: "", BIM: "R", SM: "", QS: "" },
  { stage: "S4", activity: "Detailed drawings + calculations (Mechanical)", PM: "A", LA: "", LM: "R", LE: "", LS: "", CM: "", AE: "", PE: "", BIM: "R", SM: "", QS: "" },
  { stage: "S4", activity: "Detailed drawings + calculations (Electrical)", PM: "A", LA: "", LM: "", LE: "R", LS: "", CM: "", AE: "", PE: "", BIM: "R", SM: "", QS: "" },
  { stage: "S4", activity: "Detailed drawings + calculations (Structural)", PM: "A", LA: "", LM: "", LE: "", LS: "R", CM: "", AE: "", PE: "", BIM: "R", SM: "", QS: "" },
  { stage: "S4", activity: "Technical specifications (full project)", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "", AE: "", PE: "", BIM: "", SM: "R", QS: "" },
  { stage: "S4", activity: "Material takeoff + draft BOQ pricing", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "R" },
  { stage: "S4", activity: "Front-end documents + draft tender package", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S4", activity: "AE: pursue building permit + initiate DCD/DEWA NOCs", PM: "A", LA: "", LM: "C", LE: "C", LS: "C", CM: "", AE: "R", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S4", activity: "Interdisciplinary squad check + clash detection", PM: "A", LA: "R", LM: "R", LE: "R", LS: "R", CM: "", AE: "", PE: "R", BIM: "R", SM: "", QS: "" },
  { stage: "S4", activity: "Draft DD submission to Client", PM: "A", LA: "C", LM: "", LE: "", LS: "", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "G4", activity: "Client written approval of Draft DD", PM: "A", LA: "C", LM: "", LE: "", LS: "", CM: "I", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S5", activity: "Final IFC drawing set — all disciplines", PM: "A", LA: "R", LM: "R", LE: "R", LS: "R", CM: "", AE: "", PE: "", BIM: "R", SM: "", QS: "" },
  { stage: "S5", activity: "Final specifications", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "", AE: "", PE: "", BIM: "", SM: "R", QS: "" },
  { stage: "S5", activity: "Final priced BOQ", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "R" },
  { stage: "S5", activity: "Final tender package (Vol 1–5)", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S5", activity: "AE: secure all final NOCs (DCD, DEWA, RTA, Etisalat/du)", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "", AE: "R", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S5", activity: "AE: obtain Building Permit", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "", AE: "R", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S5", activity: "Senior Technical Review (Level-3)", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S5", activity: "PCEO authorisation + Client submission", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "G5", activity: "Client written approval of Final DD + Tender", PM: "A", LA: "C", LM: "", LE: "", LS: "", CM: "I", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S6", activity: "Prequalification Documents (PQD)", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S6", activity: "Contractor screening & evaluation criteria", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S6", activity: "Prequalified shortlist to Client", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S7", activity: "Tender invitation + tender period management", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S7", activity: "Tender queries / clarifications (technical)", PM: "A", LA: "R", LM: "R", LE: "R", LS: "R", CM: "C", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S7", activity: "Tender opening + commercial analysis", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S7", activity: "Tender technical analysis", PM: "A", LA: "R", LM: "R", LE: "R", LS: "R", CM: "C", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S7", activity: "Tender Analysis Report + Award Recommendation", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S7", activity: "Contract preparation", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S8", activity: "Stage-8 staff mobilisation plan", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
  { stage: "S8", activity: "Site supervision — Architecture / Interior / Landscape", PM: "A", LA: "R", LM: "", LE: "", LS: "", CM: "", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S8", activity: "Site supervision — Mechanical", PM: "A", LA: "", LM: "R", LE: "", LS: "", CM: "", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S8", activity: "Site supervision — Electrical", PM: "A", LA: "", LM: "", LE: "R", LS: "", CM: "", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S8", activity: "Site supervision — Structural", PM: "A", LA: "", LM: "", LE: "", LS: "R", CM: "", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S8", activity: "RFI / shop drawing reviews / material approvals", PM: "A", LA: "R", LM: "R", LE: "R", LS: "R", CM: "", AE: "", PE: "", BIM: "C", SM: "", QS: "" },
  { stage: "S8", activity: "AE: construction-phase amendments + DCD inspections", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "", AE: "R", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S8", activity: "Variations / change orders / claims", PM: "A", LA: "C", LM: "C", LE: "C", LS: "C", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S8", activity: "Interim Payment Certificates (IPC)", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "R", AE: "", PE: "", BIM: "", SM: "", QS: "R" },
  { stage: "S8", activity: "Inspections / snagging / handover", PM: "A", LA: "R", LM: "R", LE: "R", LS: "R", CM: "C", AE: "C", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S8", activity: "AE: Building Completion Certificate (DM/DCD)", PM: "A", LA: "", LM: "", LE: "", LS: "", CM: "", AE: "R", PE: "", BIM: "", SM: "", QS: "" },
  { stage: "S8", activity: "Practical Completion Certificate + project closeout", PM: "A", LA: "C", LM: "", LE: "", LS: "", CM: "C", AE: "", PE: "R", BIM: "", SM: "", QS: "" },
];

// ═══════════════════════════════════════════════════════════════
// SHEET 4: STAGE WORKFLOW — Activity Sequences per Stage
// ═══════════════════════════════════════════════════════════════
export interface StageWorkflow {
  stageId: string;
  activitySequence: string;
  lead: string;
  inputs: string;
  output: string;
}

export const NASEC_STAGE_WORKFLOW: StageWorkflow[] = [
  { stageId: "S1", activitySequence: "1.1 Project award & LOA registration\n1.2 PM appointment by Projects Div. Head\n1.3 LA + CM mobilisation\n1.4 Baseline programme + budget setup (PCE/PE)\n1.5 PQP preparation\n1.6 Internal kick-off → Client kick-off\n1.7 Site visits + basic data collection\n1.8 Project Design Brief drafted & signed-off", lead: "PM (A), LA (R), CM (R)", inputs: "LOA, RFP, Tech proposal, Client brief", output: "Approved Project Design Brief" },
  { stageId: "G1", activitySequence: "★ Client Acceptance Gate\nClient reviews Stage 1 deliverables and issues written acceptance.", lead: "Client", inputs: "Stage 1 submission", output: "Acceptance letter (10 WD response window)" },
  { stageId: "S2", activitySequence: "2.1 LM, LE, LS join the team\n2.2 Concept design studies (LA leads)\n2.3 Site/zoning analysis + concept options\n2.4 Tentative cost (CM)\n2.5 PCEO concept review\n2.6 Client concept presentation\n2.7 Concept Design Report compiled", lead: "PM (A), LA (R)", inputs: "Approved brief, Site data, Authority requirements", output: "Concept Design Package" },
  { stageId: "G2", activitySequence: "★ Client Approval Gate → AE engages\nAfter Client approval, AE prepares and submits Preliminary Design Approval to DM / Trakhees / DDA.", lead: "Client → AE", inputs: "Approved Concept Design", output: "Approval letter + Authority preliminary submission lodged (20 WD)" },
  { stageId: "S3", activitySequence: "3.1 Incorporate concept comments\n3.2 BODR table of contents issued\n3.3 Discipline criteria: LA / LM / LE / LS in parallel\n3.4 Schematic drawings — base plans + all disciplines\n3.5 SM prepares outline specs\n3.6 CM/QS prepare budgetary estimate\n3.7 Squad check (Level-2)\n3.8 AE: respond to authority preliminary comments\n3.9 BODR + Schematic submitted to Client", lead: "PM (A), LA (R), LM/LE/LS (R), CM (R), AE (R)", inputs: "Approved concept, Authority preliminary feedback", output: "BODR + Schematic Drawings" },
  { stageId: "G3", activitySequence: "★ Client Approval Gate → AE engages\nAfter Client approval, AE prepares and submits Final Building Permit application to DM / Trakhees / DDA.", lead: "Client → AE", inputs: "Approved Schematic + BODR", output: "Approval letter + Building Permit application lodged (20 WD)" },
  { stageId: "S4", activitySequence: "4.1 Detailed drawings — all disciplines (parallel)\n4.2 Design calculations finalised\n4.3 BIM federation + clash detection\n4.4 SM: full project specifications\n4.5 CM/QS: MTO + draft BOQ\n4.6 CM: front-end docs + draft tender pkg\n4.7 AE: pursue building permit + DCD/DEWA NOCs\n4.8 Interdisciplinary squad check\n4.9 Draft DD submission", lead: "PM (A), All Leads (R), CM (R), AE (R)", inputs: "Approved BODR + Schematic, Permit feedback", output: "Draft DD + Tender Docs" },
  { stageId: "G4", activitySequence: "★ Client Approval Gate", lead: "Client", inputs: "Stage 4 submission", output: "Approval letter (20 WD)" },
  { stageId: "S5", activitySequence: "5.1 IFC drawing set finalised\n5.2 Final specifications\n5.3 Final priced BOQ (CM + QS)\n5.4 Final tender package (Vol 1–5)\n5.5 AE: secure all NOCs and Building Permit\n5.6 STR (Level-3 senior review)\n5.7 PCEO authorisation\n5.8 Submission to Client", lead: "PM (A), All Leads (R), CM (R), AE (R)", inputs: "Approved Draft DD", output: "IFC + Tender Package + Building Permit + NOCs" },
  { stageId: "G5", activitySequence: "★ Client Approval Gate", lead: "Client", inputs: "Stage 5 submission", output: "Approval letter (20 WD) — ready to tender" },
  { stageId: "S6", activitySequence: "6.1 Prequalification Documents (PQD)\n6.2 Contractor advertisements & receipt of expressions\n6.3 Technical/financial screening\n6.4 Prequalified shortlist to Client", lead: "PM (A), CM (R)", inputs: "Approved IFC, Procurement strategy", output: "Prequalified contractor shortlist" },
  { stageId: "S7", activitySequence: "7a — Tender period: tender issue, queries, addenda\n7b — Tender analysis: commercial + technical evaluation\n7c — Tender award: recommendation\n7d — Contract preparation: contract documents", lead: "PM (A), CM (R), Leads (R technical)", inputs: "IFC, BOQ, Front-end docs", output: "Award Recommendation + Signed Contract" },
  { stageId: "S8", activitySequence: "8.1 Stage-8 staff mobilisation\n8.2 Pre-construction kick-off\n8.3 Monthly site supervision (per discipline)\n8.4 RFI / shop drawing / material approval workflow\n8.5 AE: construction amendments + DCD inspections\n8.6 Variations / claims / IPC certification (CM)\n8.7 Inspections + snagging\n8.8 AE: Building Completion Certificate\n8.9 Practical Completion + closeout", lead: "PM (A), All Leads (R), CM (R), AE (R)", inputs: "Signed contract, IFC drawings, Building Permit", output: "Practical Completion Certificate" },
];

// ═══════════════════════════════════════════════════════════════
// SHEET 5: DELIVERABLES — 43 Deliverables Master List
// ═══════════════════════════════════════════════════════════════
export interface NasecDeliverable {
  id: number;
  stage: string;
  name: string;
  format: string;
  accountable: string;
  responsible: string;
  qualityGate: string;
}

export const NASEC_DELIVERABLES: NasecDeliverable[] = [
  { id: 1, stage: "S1", name: "Project Quality Plan (PQP)", format: "PDF + DOC", accountable: "PM", responsible: "PM + PE", qualityGate: "Client review" },
  { id: 2, stage: "S1", name: "Baseline programme (Primavera/MSP)", format: "PDF + native", accountable: "PM", responsible: "PCE", qualityGate: "PCEO authorisation" },
  { id: 3, stage: "S1", name: "Project Organisation Chart", format: "PDF", accountable: "PM", responsible: "PM", qualityGate: "PCEO authorisation" },
  { id: 4, stage: "S1", name: "Staff Mobilisation Plan (Pre-Contract)", format: "PDF", accountable: "PM", responsible: "PM", qualityGate: "Per Consultancy Agreement" },
  { id: 5, stage: "S1", name: "Project Design Brief (signed)", format: "PDF", accountable: "PM", responsible: "LA", qualityGate: "Client written acceptance (10 WD)" },
  { id: 6, stage: "S1", name: "Site Survey + Data Collection Report", format: "PDF + DWG", accountable: "PM", responsible: "LA + LS", qualityGate: "PM sign-off" },
  { id: 7, stage: "S2", name: "Concept Design Report", format: "PDF (A3 booklet)", accountable: "PM", responsible: "LA", qualityGate: "PCEO review + Client approval (20 WD)" },
  { id: 8, stage: "S2", name: "Concept Visualisation Package", format: "PDF + JPEG renders", accountable: "LA", responsible: "LA", qualityGate: "PM sign-off" },
  { id: 9, stage: "S2", name: "Tentative Cost Estimate", format: "Excel + PDF", accountable: "CM", responsible: "CM + QS", qualityGate: "PM review" },
  { id: 10, stage: "S2", name: "Concept Presentation (Client)", format: "PPT / PDF", accountable: "PM", responsible: "LA", qualityGate: "PCEO pre-review" },
  { id: 11, stage: "S3", name: "Bases of Design Report (BODR)", format: "PDF (bound)", accountable: "PM", responsible: "LA + LM + LE + LS", qualityGate: "Squad check (L2) + Client approval (20 WD)" },
  { id: 12, stage: "S3", name: "Schematic Drawings — Architecture", format: "DWG + PDF", accountable: "LA", responsible: "LA", qualityGate: "Squad check (L2)" },
  { id: 13, stage: "S3", name: "Schematic Drawings — Mechanical", format: "DWG + PDF", accountable: "LM", responsible: "LM", qualityGate: "Squad check (L2)" },
  { id: 14, stage: "S3", name: "Schematic Drawings — Electrical", format: "DWG + PDF", accountable: "LE", responsible: "LE", qualityGate: "Squad check (L2)" },
  { id: 15, stage: "S3", name: "Schematic Drawings — Structural", format: "DWG + PDF", accountable: "LS", responsible: "LS", qualityGate: "Squad check (L2)" },
  { id: 16, stage: "S3", name: "Outline Specifications", format: "DOC + PDF", accountable: "SM", responsible: "SM", qualityGate: "LA review" },
  { id: 17, stage: "S3", name: "Budgetary Cost Estimate", format: "Excel + PDF", accountable: "CM", responsible: "CM + QS", qualityGate: "PM review" },
  { id: 18, stage: "S3", name: "Authority Preliminary Submission Package", format: "PDF + DWG", accountable: "AE", responsible: "AE + LA", qualityGate: "Authority acceptance" },
  { id: 19, stage: "S4", name: "Detailed Drawings — Architecture", format: "DWG + PDF (A1)", accountable: "LA", responsible: "LA", qualityGate: "Squad check (L2) + BIM clash clear" },
  { id: 20, stage: "S4", name: "Detailed Drawings — Mechanical", format: "DWG + PDF (A1)", accountable: "LM", responsible: "LM", qualityGate: "Squad check (L2) + BIM clash clear" },
  { id: 21, stage: "S4", name: "Detailed Drawings — Electrical", format: "DWG + PDF (A1)", accountable: "LE", responsible: "LE", qualityGate: "Squad check (L2) + BIM clash clear" },
  { id: 22, stage: "S4", name: "Detailed Drawings — Structural", format: "DWG + PDF (A1)", accountable: "LS", responsible: "LS", qualityGate: "Squad check (L2) + BIM clash clear" },
  { id: 23, stage: "S4", name: "Design Calculations (all disciplines)", format: "PDF + native", accountable: "Discipline Leads", responsible: "LM + LE + LS", qualityGate: "Independent check" },
  { id: 24, stage: "S4", name: "Technical Specifications (full)", format: "DOC + PDF", accountable: "SM", responsible: "SM", qualityGate: "LA + Leads review" },
  { id: 25, stage: "S4", name: "Draft BOQ (all trades)", format: "Excel", accountable: "CM", responsible: "QS", qualityGate: "CM sign-off" },
  { id: 26, stage: "S4", name: "Front-End Tender Documents", format: "DOC + PDF", accountable: "CM", responsible: "CM", qualityGate: "PM + Legal review" },
  { id: 27, stage: "S4", name: "BIM Coordination Report + Clash Detection", format: "PDF + NWD", accountable: "BIM", responsible: "BIM", qualityGate: "Zero critical clashes" },
  { id: 28, stage: "S4", name: "Building Permit Application Package", format: "PDF + DWG", accountable: "AE", responsible: "AE", qualityGate: "Authority acceptance" },
  { id: 29, stage: "S5", name: "IFC Drawings — Architecture", format: "DWG + PDF (A1)", accountable: "LA", responsible: "LA", qualityGate: "STR (L3) + PCEO auth." },
  { id: 30, stage: "S5", name: "IFC Drawings — Mechanical", format: "DWG + PDF (A1)", accountable: "LM", responsible: "LM", qualityGate: "STR (L3) + PCEO auth." },
  { id: 31, stage: "S5", name: "IFC Drawings — Electrical", format: "DWG + PDF (A1)", accountable: "LE", responsible: "LE", qualityGate: "STR (L3) + PCEO auth." },
  { id: 32, stage: "S5", name: "IFC Drawings — Structural", format: "DWG + PDF (A1)", accountable: "LS", responsible: "LS", qualityGate: "STR (L3) + PCEO auth." },
  { id: 33, stage: "S5", name: "Final Specifications", format: "DOC + PDF", accountable: "SM", responsible: "SM", qualityGate: "STR (L3)" },
  { id: 34, stage: "S5", name: "Final Priced BOQ", format: "Excel + PDF", accountable: "CM", responsible: "QS", qualityGate: "CM + PM sign-off" },
  { id: 35, stage: "S5", name: "Final Tender Package (Vol 1–5)", format: "PDF (bound)", accountable: "CM", responsible: "CM + PE", qualityGate: "PCEO authorisation" },
  { id: 36, stage: "S5", name: "Building Permit (secured)", format: "Authority certificate", accountable: "AE", responsible: "AE", qualityGate: "Authority issued" },
  { id: 37, stage: "S5", name: "All NOCs (DCD, DEWA, RTA, Telecom)", format: "Authority certificates", accountable: "AE", responsible: "AE", qualityGate: "All NOCs valid & current" },
  { id: 38, stage: "S6", name: "Prequalification Documents (PQD)", format: "PDF", accountable: "CM", responsible: "CM", qualityGate: "PM approval" },
  { id: 39, stage: "S6", name: "Prequalified Contractor Shortlist", format: "PDF + Excel", accountable: "CM", responsible: "CM", qualityGate: "Client approval" },
  { id: 40, stage: "S7", name: "Tender Analysis Report", format: "PDF + Excel", accountable: "CM", responsible: "CM + Leads", qualityGate: "PM + PCEO review" },
  { id: 41, stage: "S7", name: "Award Recommendation Letter", format: "PDF", accountable: "PM", responsible: "CM", qualityGate: "PCEO authorisation" },
  { id: 42, stage: "S7", name: "Contract Documents (signed)", format: "PDF + hardcopy", accountable: "CM", responsible: "CM", qualityGate: "Legal review + Client signature" },
  { id: 43, stage: "S8", name: "Practical Completion Certificate", format: "PDF", accountable: "PM", responsible: "PM + AE", qualityGate: "Authority + Client sign-off" },
];

// ═══════════════════════════════════════════════════════════════
// SHEET 6: DUBAI AUTHORITIES — 16 Authorities + 12 Codes/Regulations
// ═══════════════════════════════════════════════════════════════
export interface DubaiAuthority {
  code: string;
  name: string;
  scope: string;
  nocType: string;
  triggerStage: string;
  owner: string;
  jurisdictionFilter?: string[];
  projectTypeFilter?: string[];
}

export const DUBAI_AUTHORITIES: DubaiAuthority[] = [
  { code: "DM", name: "Dubai Municipality", scope: "Master planning, building permits, inspections, completion certificates.", nocType: "Building Permit (preliminary + final) + Completion Certificate", triggerStage: "Stage 2 (preliminary) + Stage 3 (final) + Stage 8 (completion)", owner: "AE", jurisdictionFilter: ["DM"] },
  { code: "DCD", name: "Dubai Civil Defence", scope: "Fire & Life Safety NOC. UAE Fire & Life Safety Code 2018.", nocType: "Civil Defence NOC (preliminary + final)", triggerStage: "Stage 3-5 (NOC drawings) + Stage 8 (final inspection)", owner: "AE + LM" },
  { code: "DEWA", name: "Dubai Electricity & Water Authority", scope: "Electricity, water connections, substations, district cooling interface.", nocType: "DEWA NOC (load approval + utility connection)", triggerStage: "Stage 4-5 (load + connection) + Stage 8 (energisation)", owner: "AE + LE" },
  { code: "RTA", name: "Roads & Transport Authority", scope: "Road frontage, access, parking, traffic impact, public transport interfaces.", nocType: "RTA NOC (Traffic Impact Study + Access)", triggerStage: "Stage 3-5 (TIS + access) + Stage 8 (final)", owner: "AE + LA" },
  { code: "Trakhees", name: "Ports, Customs & Free Zone Corp.", scope: "Building permits & approvals in Trakhees free-zones (Palm Jumeirah, Dubai Maritime City, etc.).", nocType: "Trakhees building permit (replaces DM in jurisdiction)", triggerStage: "Stage 2 + Stage 3 approvals", owner: "AE", jurisdictionFilter: ["Trakhees"] },
  { code: "DDA", name: "Dubai Development Authority", scope: "TECOM cluster permits (Internet City, Media City, Studio City, etc.).", nocType: "DDA building permit", triggerStage: "Stage 2 + Stage 3 approvals", owner: "AE", jurisdictionFilter: ["DDA"] },
  { code: "JAFZA", name: "Jebel Ali Free Zone Authority", scope: "Building approvals within JAFZA jurisdiction.", nocType: "JAFZA building permit", triggerStage: "Stage 2 + Stage 3 approvals", owner: "AE", jurisdictionFilter: ["JAFZA"] },
  { code: "DAFZA", name: "Dubai Airport Free Zone Authority", scope: "Building approvals within DAFZA jurisdiction.", nocType: "DAFZA building permit", triggerStage: "Stage 2 + Stage 3 approvals", owner: "AE", jurisdictionFilter: ["DAFZA"] },
  { code: "DCAA", name: "Dubai Civil Aviation Authority", scope: "Height clearance for buildings near airports (DXB, DWC).", nocType: "Aviation height NOC", triggerStage: "Stage 3 (height approval)", owner: "AE", projectTypeFilter: ["aviation-vicinity"] },
  { code: "Etisalat/du", name: "Telecom Operators", scope: "Telecom infrastructure NOCs.", nocType: "Telecom NOC + connection", triggerStage: "Stage 4-5 + Stage 8", owner: "AE + LE" },
  { code: "DHA", name: "Dubai Health Authority", scope: "Healthcare facility licensing — clinics, hospitals.", nocType: "DHA pre-design approval + facility license", triggerStage: "Stage 2 onwards (healthcare projects)", owner: "AE + LA", projectTypeFilter: ["healthcare"] },
  { code: "KHDA", name: "Knowledge & Human Development Authority", scope: "Educational facility approvals.", nocType: "KHDA design approval + facility license", triggerStage: "Stage 2 onwards (educational projects)", owner: "AE + LA", projectTypeFilter: ["educational"] },
  { code: "DTCM", name: "Dept. of Economy & Tourism", scope: "Hospitality / tourism facility classification & approvals.", nocType: "DTCM NOC + hotel classification", triggerStage: "Stage 2 onwards (hospitality projects)", owner: "AE + LA", projectTypeFilter: ["hospitality"] },
  { code: "Dubai Police", name: "Dubai Police", scope: "Security & CCTV system review for public buildings.", nocType: "Security NOC", triggerStage: "Stage 4-5", owner: "AE + LE" },
  { code: "Dubai Customs", name: "Dubai Customs", scope: "Logistics, warehousing, free-trade compliance (logistics projects).", nocType: "Customs NOC", triggerStage: "Project-specific", owner: "AE" },
  { code: "DSO", name: "Dubai Silicon Oasis Authority", scope: "Building approvals within DSO jurisdiction.", nocType: "DSO building permit", triggerStage: "Stage 2 + Stage 3 approvals", owner: "AE", jurisdictionFilter: ["DSO"] },
];

export interface DubaiCode {
  name: string;
  issuer: string;
  scope: string;
  mandatory: string;
  notes: string;
}

export const DUBAI_CODES: DubaiCode[] = [
  { name: "Dubai Building Code (DBC) 2021", issuer: "Dubai Municipality", scope: "Comprehensive, mandatory building code — replaces old DM regulations and NFPA-based codes.", mandatory: "Yes", notes: "Primary reference for all design disciplines." },
  { name: "UAE Fire & Life Safety Code 2018", issuer: "UAE Civil Defence", scope: "Fire safety, means of egress, fire-rated construction, sprinkler / alarm systems.", mandatory: "Yes", notes: "DCD NOC required for compliance." },
  { name: "Al Sa'fat — Dubai Green Building Regulations", issuer: "Dubai Municipality", scope: "4-tier rating (Bronze / Silver / Gold / Platinum). Bronze is mandatory minimum for all new buildings.", mandatory: "Yes (Bronze min.)", notes: "Affects MEP, envelope, water, materials selection." },
  { name: "Dubai Universal Design Code (DUDC)", issuer: "Community Development Authority", scope: "Accessibility / inclusive design standards.", mandatory: "Yes", notes: "Applicable to public + private buildings." },
  { name: "DM Green Building Regulations & Specifications", issuer: "Dubai Municipality", scope: "Energy efficiency, water conservation, indoor air quality.", mandatory: "Yes", notes: "Operates alongside Al Sa'fat." },
  { name: "DEWA Regulations & Standards", issuer: "DEWA", scope: "Electricity & water connection, substations, metering.", mandatory: "Yes", notes: "Required for DEWA NOC." },
  { name: "Dubai District Cooling Regulations", issuer: "Empower / Tabreed / RSB", scope: "District cooling connection requirements (where applicable).", mandatory: "Project-dependent", notes: "Applies to district-cooling-served zones." },
  { name: "Dubai Demolition Code", issuer: "Dubai Municipality", scope: "Demolition methodology, safety, waste handling.", mandatory: "If demolition required", notes: "Pre-S1 task if existing structures." },
  { name: "RTA Manual of Uniform Traffic Control Devices", issuer: "RTA", scope: "Roadway markings, signage, parking standards.", mandatory: "If RTA NOC required", notes: "Triggers Traffic Impact Study." },
  { name: "UAE Wastewater & Stormwater Code", issuer: "Federal / Local", scope: "Drainage design, sewer connection, stormwater.", mandatory: "Yes", notes: "Local Authority approval required." },
  { name: "Federal Law No. 28 / 2001 — Engineering Profession", issuer: "UAE Federal", scope: "Licensing of engineering consultants, supervision obligations.", mandatory: "Yes", notes: "All NASEC engineers must be SOE-registered." },
  { name: "Dubai Law No. 6 / 1979 + Society of Engineers", issuer: "Dubai / SOE", scope: "Local engineering practice law and license requirements.", mandatory: "Yes", notes: "All seals/stamps require SOE membership." },
];

// ═══════════════════════════════════════════════════════════════
// SHEET 7: MANUAL REFS — PMM Cross-References
// ═══════════════════════════════════════════════════════════════
export interface ManualRef {
  topic: string;
  section: string;
  description: string;
  relevance: string;
}

export const NASEC_MANUAL_REFS: ManualRef[] = [
  { topic: "Project Management", section: "§2.2", description: "Project Management — Purpose, Objectives, Knowledge Areas, Phases", relevance: "Foundation for every workflow stage" },
  { topic: "Project Organisation", section: "§3.1", description: "General — Project sizes (Mega/Large/Medium/Small) & teams", relevance: "Determines whether PD is added above PM" },
  { topic: "PM Role", section: "§4.2", description: "Project Manager — Internal obligations, Client/Stakeholder mgmt", relevance: "PM is Accountable on every stage" },
  { topic: "PE Role", section: "§4.3", description: "Project Engineer — Technical co-ordination, deliverables", relevance: "Support the PM on coordination" },
  { topic: "PCE Role", section: "§4.4", description: "Project Controls Engineer (per Project Controls Manual)", relevance: "Schedule + man-hour budget" },
  { topic: "Tech Team", section: "§4.5.1", description: "A&E Design Team", relevance: "LA, LM, LE, LS responsibilities" },
  { topic: "AE Role (SAC)", section: "§4.5.2", description: "Statutory Authorities Coordinator — Authority Engineer in workflow", relevance: "All Dubai authority submissions" },
  { topic: "Project Lifecycle", section: "§5.2", description: "A&E Projects Lifecycle (8 stages)", relevance: "Maps to contractual stages 1–8 + gates" },
  { topic: "PM Concept", section: "§5.3", description: "Efficient PM Concept — communications, files, programme", relevance: "How the workflow runs day-to-day" },
  { topic: "Proposal Stage", section: "§5.4", description: "Proposal — preparation, submission, award", relevance: "Pre-Stage 1 (BD-led)" },
  { topic: "Mobilisation", section: "§5.5", description: "Mobilisation — initiation, kick-off, PQP", relevance: "Stage 1 activities" },
  { topic: "Concept Design", section: "§5.6", description: "Concept Design Stage — data, generation, close-out", relevance: "Stage 2 activities" },
  { topic: "Design Stages", section: "§5.7", description: "A&E Design Stages — staffing, controls, coordination, QC", relevance: "Stage 3-5 governance" },
  { topic: "Quality Reviews", section: "§5.7.6", description: "Technical Review — Level-1, Squad Check, STR", relevance: "Quality gates at every stage" },
  { topic: "Schematic + BODR", section: "§5.8", description: "Schematic Design and BODR Stage", relevance: "Stage 3 deliverables" },
  { topic: "Detailed Design", section: "§5.9", description: "Detailed Design Stage — drawings, specs, BOQ, front-end", relevance: "Stage 4-5 deliverables" },
  { topic: "Tender", section: "§5.10", description: "Tender Stage — prequalification, process, award", relevance: "Stage 6-7" },
  { topic: "Authority Approvals", section: "Auth. Manual", description: "Statutory Authorities Approval Manual", relevance: "AE submissions, NOCs, permits" },
  { topic: "Sub-consultants", section: "Subcons.Manual", description: "Sub-consultants Management Manual", relevance: "Specialist appointments" },
  { topic: "Project Filing", section: "Filing Manual", description: "Project Filing & Backup System Manual", relevance: "ERP folder structure" },
  { topic: "Engineering Changes", section: "Eng.Changes Proc.", description: "Engineering Changes Control Procedure", relevance: "Variations / change orders" },
];

// ═══════════════════════════════════════════════════════════════
// SHEET 8: RECOMMENDATIONS — ERP Automation Backlog
// ═══════════════════════════════════════════════════════════════
export interface Recommendation {
  id: number;
  title: string;
  rationale: string;
  status: "implemented" | "roadmap";
}

export const NASEC_RECOMMENDATIONS: Recommendation[] = [
  { id: 1, title: "Add an electronic 'Stage Gate' approval form per stage", rationale: "Each stage end requires Client written acceptance / approval. Build an ERP form that captures: submission date, Client decision, decision date, comments, attachments; auto-track 10/20 WD windows.", status: "implemented" },
  { id: 2, title: "Auto-trigger AE submission workflow on Client approval", rationale: "When Client approval of S2 is recorded, ERP auto-creates an AE task: 'Prepare Preliminary Design Approval Submission'. Same for S3 → Final Building Permit.", status: "implemented" },
  { id: 3, title: "Auto-trigger Stage-8 staff CVs ahead of mobilisation", rationale: "Per Consultancy Agreement obligations on staff CVs prior to Stage-8 commencement. Configure ERP to send automated reminders.", status: "roadmap" },
  { id: 4, title: "Discipline-coded RFI / Shop Drawing / Material register", rationale: "Standardise prefixes: ARCH-RFI-###, MECH-RFI-###, ELEC-RFI-###, STRC-RFI-### auto-routes to the correct Lead per RACI.", status: "implemented" },
  { id: 5, title: "BIM clash-detection sign-off as a Level-2 squad check artefact", rationale: "Manual §5.7.6 mandates squad check; for BIM projects the clash report becomes the squad-check evidence. ERP should require BIM clash report upload before squad check sign-off.", status: "roadmap" },
  { id: 6, title: "Risk Register per project (PMI 5-step)", rationale: "PM Manual §4.2.11. Embed a register with risk score (1–25), owner, mitigation, status — visible on Project Dashboard.", status: "roadmap" },
  { id: 7, title: "Lock the BODR document once Client-approved", rationale: "Per §5.3.2 — once accepted the design is frozen. ERP makes BODR file read-only after Stage 3 approval; subsequent changes require Variation Order workflow.", status: "implemented" },
  { id: 8, title: "Centralised Dubai Authority NOC log", rationale: "AE owns this. Per project: authority, NOC reference, submission date, validity, expiry. Auto-alert 30 days before expiry.", status: "implemented" },
  { id: 9, title: "Project Closeout Report template", rationale: "Mandated by §4.2.10/§4.3.11. Fields: planned vs actual targets, Client satisfaction score, lessons learnt, team performance.", status: "roadmap" },
  { id: 10, title: "Tie monthly invoicing milestones to deliverable acceptance", rationale: "Stage invoice is generated automatically when stage is marked 'Client Accepted'. CM oversees; reduces collection lag.", status: "roadmap" },
  { id: 11, title: "Sub-consultant register and workflow", rationale: "Per §4.2.3 + Sub-consultants Mgmt Manual. ERP holds Client-approved consultants list with appointment letters, scope, deliverables.", status: "roadmap" },
  { id: 12, title: "Communication Log (7Cs) per project", rationale: "PM Manual §4.2.5. Auto-archive emails sent to / received from Client into the project record.", status: "roadmap" },
  { id: 13, title: "Dubai jurisdictional template selector at project start", rationale: "PM selects jurisdiction (DM / Trakhees / DDA / JAFZA / DAFZA / DSO / DHCC / Dubai South). ERP auto-populates the relevant authority list.", status: "implemented" },
  { id: 14, title: "Al Sa'fat / Dubai Green Building compliance checklist", rationale: "Mandatory Bronze rating minimum. Checklist embedded into S3 BODR template — sustainability inputs flagged at design criteria stage.", status: "implemented" },
];

// ═══════════════════════════════════════════════════════════════
// HELPER: Jurisdiction options for project creation
// ═══════════════════════════════════════════════════════════════
export const JURISDICTIONS = [
  { value: "DM", label: "Dubai Municipality (DM)" },
  { value: "Trakhees", label: "Trakhees / PCFC" },
  { value: "DDA", label: "Dubai Development Authority (DDA)" },
  { value: "JAFZA", label: "Jebel Ali Free Zone (JAFZA)" },
  { value: "DAFZA", label: "Dubai Airport Free Zone (DAFZA)" },
  { value: "DSO", label: "Dubai Silicon Oasis (DSO)" },
  { value: "DHCC", label: "Dubai Healthcare City (DHCC)" },
  { value: "Dubai South", label: "Dubai South" },
] as const;

export const PROJECT_TYPES = [
  { value: "villa", label: "Villa / Residential Compound" },
  { value: "tower", label: "Tower / High-Rise" },
  { value: "mixed-use", label: "Mixed-Use Development" },
  { value: "hospitality", label: "Hospitality / Hotel" },
  { value: "educational", label: "Educational Facility" },
  { value: "healthcare", label: "Healthcare Facility" },
  { value: "industrial", label: "Industrial / Warehouse" },
  { value: "commercial", label: "Commercial / Office" },
  { value: "retail", label: "Retail / Mall" },
] as const;

// Helper: Get authorities for a given jurisdiction + project type
export function getAuthoritiesForProject(jurisdiction: string, projectType: string, nearAirport: boolean = false): DubaiAuthority[] {
  return DUBAI_AUTHORITIES.filter(auth => {
    // Always include authorities with no jurisdiction filter (universal like DCD, DEWA, RTA, Telecom, Police)
    if (!auth.jurisdictionFilter && !auth.projectTypeFilter) return true;
    // Include if jurisdiction matches
    if (auth.jurisdictionFilter && auth.jurisdictionFilter.includes(jurisdiction)) return true;
    // Include if project type matches
    if (auth.projectTypeFilter && auth.projectTypeFilter.includes(projectType)) return true;
    // DCAA only if near airport
    if (auth.code === "DCAA" && nearAirport) return true;
    return false;
  });
}

// Helper: Count R activities per role from RACI
export function getRoleActivityCounts(roleCode: string): { r: number; a: number; c: number; i: number } {
  const counts = { r: 0, a: 0, c: 0, i: 0 };
  NASEC_RACI.forEach(row => {
    const val = row[roleCode as keyof RaciActivity] as string;
    if (val === "R") counts.r++;
    else if (val === "A") counts.a++;
    else if (val === "C") counts.c++;
    else if (val === "I") counts.i++;
  });
  return counts;
}

// Template version control
export const TEMPLATE_VERSION = {
  code: "WF-TPL-001",
  revision: "Rev 02",
  manualRef: "QMS C-3.1.1, Project Management Manual, Rev 01",
  effectiveDate: "2026-01-15",
  issueStatus: "Active — firm-wide standard",
};
