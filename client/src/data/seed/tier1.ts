/**
 * Demo seed for Tier 1 modules: DCC (drawings, RFI), Quality, HSE, Procurement.
 */
import type { Drawing, DrawingRevision, Transmittal, Rfi } from "@/lib/dcc/types";
import type { NCR, InspectionRequest, MAR, WIR } from "@/lib/quality/types";
import type { Incident, ToolboxTalk, SafetyInspection, PPEIssuance } from "@/lib/hse/types";
import type { LPO, GRN } from "@/lib/procurement/types";

const now = new Date().toISOString();
function dminus(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function dplus(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

// ===== DCC =====
export const SEED_DRAWINGS: Drawing[] = [
  { id: "dwg-awt-ar-100", projectId: "al-wasl-tower", drawingNumber: "AR-AWT-100", title: "Ground Floor Plan", discipline: "AR", scale: "1:100", paperSize: "A1", currentRev: "P03", currentStatus: "P03", preparedByDisplay: "Sarah Johnson", checkedByDisplay: "James Wilson", isActive: true, createdAt: now, updatedAt: now },
  { id: "dwg-awt-ar-200", projectId: "al-wasl-tower", drawingNumber: "AR-AWT-200", title: "Typical Floor Plan (L01-L25)", discipline: "AR", scale: "1:100", paperSize: "A1", currentRev: "P02", currentStatus: "P02", preparedByDisplay: "Sarah Johnson", isActive: true, createdAt: now, updatedAt: now },
  { id: "dwg-awt-ar-300", projectId: "al-wasl-tower", drawingNumber: "AR-AWT-300", title: "North Elevation", discipline: "AR", scale: "1:200", paperSize: "A1", currentRev: "P03", currentStatus: "P03", isActive: true, createdAt: now, updatedAt: now },
  { id: "dwg-awt-st-100", projectId: "al-wasl-tower", drawingNumber: "ST-AWT-100", title: "Foundation Layout", discipline: "ST", scale: "1:100", paperSize: "A1", currentRev: "P02", currentStatus: "P02", preparedByDisplay: "Mohammed Hassan", isActive: true, createdAt: now, updatedAt: now },
  { id: "dwg-awt-me-100", projectId: "al-wasl-tower", drawingNumber: "ME-AWT-100", title: "HVAC Single Line Diagram", discipline: "ME", scale: "NTS", paperSize: "A1", currentRev: "P01", currentStatus: "P01", isActive: true, createdAt: now, updatedAt: now },
  { id: "dwg-mh-ar-c01", projectId: "marina-heights", drawingNumber: "AR-MH-100", title: "Tower Ground Floor (Construction)", discipline: "AR", scale: "1:100", paperSize: "A1", currentRev: "C02", currentStatus: "C02", isActive: true, createdAt: now, updatedAt: now },
];

export const SEED_DRAWING_REVISIONS: DrawingRevision[] = [
  { id: "rev-001", drawingId: "dwg-awt-ar-100", rev: "P01", status: "P01", purpose: "for-information", issuedDate: dminus(60), issuedByDisplay: "Sarah Johnson", changeNote: "Initial preliminary issue" },
  { id: "rev-002", drawingId: "dwg-awt-ar-100", rev: "P02", status: "P02", purpose: "for-comments", issuedDate: dminus(40), issuedByDisplay: "Sarah Johnson", changeNote: "Updated lobby per client feedback" },
  { id: "rev-003", drawingId: "dwg-awt-ar-100", rev: "P03", status: "P03", purpose: "for-authority", issuedDate: dminus(15), issuedByDisplay: "Sarah Johnson", changeNote: "Revised core size per DCD fireman lift comment" },
];

export const SEED_TRANSMITTALS: Transmittal[] = [
  { id: "trm-001", reference: "TR-AWT-2026-0042", projectId: "al-wasl-tower", date: dminus(15), fromCompany: "NASEC", toCompany: "Dubai Municipality", purpose: "for-authority", drawings: [{ drawingId: "dwg-awt-ar-100", rev: "P03" }, { drawingId: "dwg-awt-ar-300", rev: "P03" }], coverNote: "Authority submission - Building Permit application package - Rev P03", status: "acknowledged", issuedByDisplay: "Ahmed Al Maktoum", issuedAt: dminus(15) + "T10:00:00Z", acknowledgedAt: dminus(12) + "T14:00:00Z" },
  { id: "trm-002", reference: "TR-AWT-2026-0043", projectId: "al-wasl-tower", date: dminus(10), fromCompany: "NASEC", toCompany: "Dubai Holding (Client)", purpose: "for-client-approval", drawings: [{ drawingId: "dwg-awt-ar-200", rev: "P02" }], coverNote: "Typical floor plan for Schematic gate G3 review", status: "issued", issuedByDisplay: "James Wilson", issuedAt: dminus(10) + "T11:00:00Z" },
];

export const SEED_RFIS: Rfi[] = [
  { id: "rfi-001", reference: "RFI-AWT-2026-0078", projectId: "al-wasl-tower", date: dminus(12), raisedByCompany: "ABC Construction", raisedByDisplay: "Rashid Al Maktoum", raisedToDiscipline: "AR", raisedToDisplay: "Sarah Johnson", subject: "Clarification on lobby finishes - Marble grade", question: "Drawing AR-AWT-100 Rev P03 specifies \"Calacatta Gold marble\" but the finish schedule shows only \"natural marble\". Please confirm exact grade and supplier requirement.", drawingRefs: ["AR-AWT-100"], priority: "high", dueDate: dplus(3), status: "responded", responses: [{ id: "rsp-001", respondedAt: dminus(8) + "T10:00:00Z", respondedByDisplay: "Sarah Johnson", responseText: "Confirmed: Calacatta Gold marble, 20mm thick, polished finish. Supplier to provide 3 samples for client approval before procurement. Reference revised finish schedule AR-AWT-300 Rev P03 Section 3.2." }], createdAt: now, updatedAt: now },
  { id: "rfi-002", reference: "RFI-AWT-2026-0079", projectId: "al-wasl-tower", date: dminus(6), raisedByCompany: "Gulf MEP", raisedByDisplay: "Vikram Patel", raisedToDiscipline: "ME", subject: "HVAC duct routing conflict with structural beam", question: "On grid line C-12, the proposed 800x400mm supply duct conflicts with the 600mm deep structural beam. Drawing ME-AWT-100 Rev P01 shows the duct route but structural is updated. Please advise.", drawingRefs: ["ME-AWT-100", "ST-AWT-100"], priority: "urgent", dueDate: dplus(1), status: "open", responses: [], createdAt: now, updatedAt: now },
  { id: "rfi-003", reference: "RFI-MH-2026-0145", projectId: "marina-heights", date: dminus(3), raisedByCompany: "Site Contractor", raisedByDisplay: "Site team", raisedToDiscipline: "AR", subject: "Façade panel installation sequence", question: "Confirm if curtain wall fixing bracket can be welded or shall be bolted to embedded plates only?", priority: "medium", dueDate: dplus(5), status: "awaiting-response", responses: [], createdAt: now, updatedAt: now },
];

// ===== QUALITY =====
export const SEED_NCRS: NCR[] = [
  { id: "ncr-001", reference: "NCR-MH-2026-0011", projectId: "marina-heights", date: dminus(8), raisedByDisplay: "James Wilson", contractorCompany: "ABC Construction", location: "Tower B - Level 12 - Grid 5/A", discipline: "Structural", description: "Concrete pour for slab L12 area showed honeycomb defects on the lower face. Quality check after formwork removal revealed approximately 15% surface area affected.", rootCause: "Insufficient vibration during pour due to congested rebar zone", correctiveAction: "Remove affected concrete, prepare surface, apply approved repair mortar per spec section 03 30 00", preventiveAction: "Toolbox talk on rebar zone vibration; increase poker count for slabs > 250mm", costAED: 18500, status: "approved", attachmentUrls: [], createdAt: now, updatedAt: now },
  { id: "ncr-002", reference: "NCR-MH-2026-0012", projectId: "marina-heights", date: dminus(3), raisedByDisplay: "Site Engineer", contractorCompany: "Gulf MEP", location: "Mechanical room - Ground floor", discipline: "Mechanical", description: "Chiller pipe insulation thickness measured at 25mm vs specified 50mm armaflex", status: "submitted", createdAt: now, updatedAt: now },
];

export const SEED_IRS: InspectionRequest[] = [
  { id: "ir-001", reference: "IR-MH-2026-0234", projectId: "marina-heights", date: dminus(2), inspectionDate: dminus(1), raisedByContractor: "ABC Construction", location: "Tower B - Level 13 slab", scopeDescription: "Rebar inspection before concrete pour - L13 slab", discipline: "Structural", consultantSupervisor: "James Wilson", result: "passed-with-comments", comments: "OK to pour. Increase spacer count along edge beam", status: "approved-with-comments", createdAt: now, updatedAt: now },
  { id: "ir-002", reference: "IR-MH-2026-0235", projectId: "marina-heights", date: dminus(1), inspectionDate: dplus(0), raisedByContractor: "ABC Construction", location: "Tower B - Level 12 - Block work", scopeDescription: "Block work inspection - apartment 1201-1208", discipline: "Architectural", result: "pending", status: "submitted", createdAt: now, updatedAt: now },
];

export const SEED_MARS: MAR[] = [
  { id: "mar-001", reference: "MAR-AWT-2026-0089", projectId: "al-wasl-tower", date: dminus(20), raisedByContractor: "ABC Construction", materialDescription: "Curtain wall aluminium framing system", manufacturer: "Schueco", modelOrBrand: "Schueco FW 50+ SI", countryOfOrigin: "Germany", certificationRef: "LPCB BR135 / UL263 fire-rated", intendedLocation: "Tower envelope L01-L40", specReference: "Section 08 44 13", compliesWithSpec: true, result: "approved", consultantComments: "Approved subject to vendor providing performance bond and sample façade panel before fabrication", status: "approved", approvedByDisplay: "Sarah Johnson", approvedAt: dminus(15) + "T10:00:00Z", validityDate: dplus(180), createdAt: now, updatedAt: now },
  { id: "mar-002", reference: "MAR-AWT-2026-0090", projectId: "al-wasl-tower", date: dminus(7), raisedByContractor: "Gulf MEP", materialDescription: "VRF outdoor units", manufacturer: "Daikin", modelOrBrand: "VRV X-Series RXYQQ", countryOfOrigin: "Japan", certificationRef: "AHRI 1230 / Eurovent", compliesWithSpec: true, result: "pending", status: "under-review", createdAt: now, updatedAt: now },
];

export const SEED_WIRS: WIR[] = [
  { id: "wir-001", reference: "WIR-MH-2026-0156", projectId: "marina-heights", date: dminus(5), inspectionDate: dminus(3), raisedByContractor: "ABC Construction", workDescription: "Tower B - apartment 1101 - final finishes inspection", buildingArea: "Apartment 1101", inspectorDisplay: "James Wilson", result: "approved-with-comments", comments: "Punch-list issued. Re-inspect after corrections", punchlistItems: ["Touch-up paint near door frames", "Realign skirting at master bedroom", "Clean grout from balcony tiles"], status: "approved-with-comments", createdAt: now, updatedAt: now },
];

// ===== HSE =====
export const SEED_INCIDENTS: Incident[] = [
  { id: "inc-001", reference: "INC-2026-0042", projectId: "marina-heights", date: dminus(15), time: "14:30", location: "Tower B - Level 8 - Service core", severity: "near-miss", involvedPersons: "Steel fixer (subcontractor)", immediateAction: "Stopped work; secured area; toolbox talk to all crews", rootCauseAnalysis: "Loose plywood offcut fell from Level 9 through unprotected shaft opening", correctiveAction: "Installed mesh barrier across all shaft openings; replaced toe boards", preventiveAction: "Weekly shaft-opening audit; mandatory mesh per HSE plan section 4.3", reportedToMOHRE: false, investigatorDisplay: "HSE Officer", status: "closed", closedAt: dminus(8) + "T16:00:00Z", createdAt: now, updatedAt: now },
  { id: "inc-002", reference: "INC-2026-0043", projectId: "marina-heights", date: dminus(4), time: "10:15", location: "Tower B - Ground level - logistics yard", severity: "first-aid", involvedPersons: "Worker - small laceration to hand", injuredDescription: "Small cut on left palm from sharp rebar offcut", bodyPart: "Left hand", natureOfInjury: "Laceration", immediateAction: "First aid applied; tetanus check; worker resumed light duty", reportedToMOHRE: false, status: "actions-pending", createdAt: now, updatedAt: now },
];

export const SEED_TOOLBOX_TALKS: ToolboxTalk[] = [
  { id: "tbt-001", reference: "TBT-MH-2026-0345", projectId: "marina-heights", date: dminus(7), duration: 15, topic: "Working at heights — harness inspection", presenter: "HSE Officer", attendeesCount: 42, keyPoints: "Pre-shift harness inspection mandatory; report any defects; 100% tie-off above 1.8m", createdAt: now },
  { id: "tbt-002", reference: "TBT-MH-2026-0346", projectId: "marina-heights", date: dminus(2), duration: 20, topic: "Hot work — fire watch protocol", presenter: "HSE Officer", attendeesCount: 38, keyPoints: "Hot Work Permit required; fire watch for 30 min post-completion; fire extinguisher within 3m", createdAt: now },
];

export const SEED_SAFETY_INSPECTIONS: SafetyInspection[] = [
  { id: "si-001", reference: "SI-MH-2026-0112", projectId: "marina-heights", date: dminus(5), inspectorDisplay: "HSE Officer", location: "Whole site", totalFindings: 12, criticalFindings: 1, rectifiedCount: 8, pendingCount: 4, score: 87, status: "under-rectification", createdAt: now, updatedAt: now },
];

export const SEED_PPE_ISSUANCES: PPEIssuance[] = [
  { id: "ppe-001", employeeId: "emp-001", ppeKind: "hard-hat", issuedDate: dminus(180), size: "L", notes: "Replace annually" },
  { id: "ppe-002", employeeId: "emp-001", ppeKind: "safety-shoes", issuedDate: dminus(120), size: "42" },
  { id: "ppe-003", employeeId: "emp-002", ppeKind: "high-vis-vest", issuedDate: dminus(90), size: "L" },
];

// ===== PROCUREMENT =====
export const SEED_LPOS: LPO[] = [
  { id: "lpo-001", reference: "LPO-2026-00123", date: dminus(20), supplierId: "sup-eros-stationery", office: "dubai", currency: "AED", deliveryDate: dminus(15), paymentTermsDays: 30, raisedByDisplay: "Aisha Al-Marzouqi", approverDisplay: "Director", approvedAt: dminus(20) + "T11:00:00Z", lines: [
    { id: "l1", description: "A1 plotter paper (white, 90gsm)", qty: 20, unitOfMeasure: "rolls", unitPrice: 95, vatPct: 5, glAccountCode: "6115", amountExVat: 1900, vatAmount: 95, amountIncVat: 1995, qtyReceived: 20 },
    { id: "l2", description: "Whiteboard markers (assorted)", qty: 50, unitOfMeasure: "pcs", unitPrice: 8, vatPct: 5, glAccountCode: "6115", amountExVat: 400, vatAmount: 20, amountIncVat: 420, qtyReceived: 50 },
  ], subtotal: 2300, vatTotal: 115, total: 2415, status: "received", linkedGrnIds: ["grn-001"], createdAt: now, updatedAt: now },
  { id: "lpo-002", reference: "LPO-2026-00124", date: dminus(10), supplierId: "sup-printcity", office: "dubai", currency: "AED", deliveryDate: dplus(5), paymentTermsDays: 30, raisedByDisplay: "Aisha Al-Marzouqi", lines: [
    { id: "l1", description: "Authority submission set - colour print A1 (drawing pack Al Wasl Tower)", qty: 8, unitOfMeasure: "sets", unitPrice: 450, vatPct: 5, glAccountCode: "5060", projectId: "al-wasl-tower", amountExVat: 3600, vatAmount: 180, amountIncVat: 3780 },
  ], subtotal: 3600, vatTotal: 180, total: 3780, status: "issued", createdAt: now, updatedAt: now },
  { id: "lpo-003", reference: "LPO-2026-00125", date: dminus(2), supplierId: "sup-autodesk", office: "dubai", currency: "AED", paymentTermsDays: 30, raisedByDisplay: "Aisha Al-Marzouqi", lines: [
    { id: "l1", description: "Autodesk AEC Collection - additional 2 seats", qty: 2, unitOfMeasure: "annual seats", unitPrice: 4800, vatPct: 5, glAccountCode: "6310", amountExVat: 9600, vatAmount: 480, amountIncVat: 10080 },
  ], subtotal: 9600, vatTotal: 480, total: 10080, status: "draft", createdAt: now, updatedAt: now },
];

export const SEED_GRNS: GRN[] = [
  { id: "grn-001", reference: "GRN-2026-00045", date: dminus(15), lpoId: "lpo-001", supplierId: "sup-eros-stationery", receivedByDisplay: "Aisha Al-Marzouqi", warehouseLocation: "Boulevard Plaza - Storage", lines: [
    { id: "gl1", lpoLineId: "l1", description: "A1 plotter paper", qtyOrdered: 20, qtyReceivedThis: 20, qtyReceivedToDate: 20, condition: "good" },
    { id: "gl2", lpoLineId: "l2", description: "Whiteboard markers", qtyOrdered: 50, qtyReceivedThis: 50, qtyReceivedToDate: 50, condition: "good" },
  ], status: "matched-to-bill", createdAt: now, updatedAt: now },
];
