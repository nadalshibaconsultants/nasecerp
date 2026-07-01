/**
 * Demo documents seed: standard folder hierarchy across Marina Heights,
 * Al Wasl Tower, JLT, Dubai Creek, plus 25-30 realistic files showing every
 * status (Draft / For Approval / Final / Stamped / Superseded).
 */
import type { DocFolder, DocumentFile } from "@/lib/documents/types";

const now = new Date();
function days(n: number) { return new Date(now.getTime() + n * 86_400_000).toISOString().slice(0, 10); }
function ts(n: number) { return new Date(now.getTime() + n * 86_400_000).toISOString(); }

// Folder template — created per project on seed. Top-level folders 01-08, sub-folders only under 01.
const TOP_LEVEL = [
  { code: "01", name: "Authority Approvals", retention: "Permanent" as const, accessRoles: ["director", "pm", "design-lead", "site-engineer"] as any, indicator: "alert" as const },
  { code: "02", name: "Site Documents", retention: "Project lifetime" as const, indicator: "ok" as const },
  { code: "03", name: "Client Approvals", retention: "Permanent" as const, accessRoles: ["director", "pm", "design-lead"] as any, indicator: "warn" as const },
  { code: "04", name: "Drawings", retention: "Permanent" as const, indicator: "ok" as const },
  { code: "05", name: "Contracts & Commercial", retention: "Permanent" as const, accessRoles: ["director", "pm", "finance-manager", "accountant"] as any, indicator: "ok" as const },
  { code: "06", name: "Reports & Studies", retention: "10 years" as const, indicator: "ok" as const },
  { code: "07", name: "RFIs & Submittals", retention: "Project lifetime" as const, indicator: "warn" as const },
  { code: "08", name: "Extra / Miscellaneous", retention: "5 years" as const, indicator: "ok" as const },
];

const AUTH_SUBFOLDERS = [
  "Trakheesi", "Dubai Municipality (DM)", "DDA / TECOM / Free Zone", "Civil Defence",
  "DEWA", "RTA", "Etisalat / du", "Empower / Tabreed", "Other NOCs",
];

const PROJECT_IDS = ["marina-heights", "al-wasl-tower", "jlt-commercial", "dubai-creek"];

export const SEED_FOLDERS: DocFolder[] = (() => {
  const out: DocFolder[] = [];
  for (const pid of PROJECT_IDS) {
    TOP_LEVEL.forEach((tl, i) => {
      const folderId = `fld-${pid}-${tl.code}`;
      out.push({
        id: folderId, projectId: pid, order: i + 1,
        code: tl.code, name: `${tl.code}. ${tl.name}`,
        retention: tl.retention,
        accessRoles: (tl as any).accessRoles,
        indicator: tl.indicator,
      });
      if (tl.code === "01") {
        AUTH_SUBFOLDERS.forEach((sub, j) => {
          out.push({
            id: `fld-${pid}-${tl.code}-${j}`,
            projectId: pid, parentId: folderId,
            order: j + 1, name: sub,
            retention: tl.retention,
            indicator: "ok",
          });
        });
      }
    });
  }
  return out;
})();

// Seed files — Marina Heights authority approvals matching the screenshot
const MH_AUTH_TRAKHEESI = "fld-marina-heights-01-0"; // first sub-folder under 01
const MH_AUTH_DM = "fld-marina-heights-01-1";
const MH_AUTH_DDA = "fld-marina-heights-01-2";
const MH_AUTH_CD = "fld-marina-heights-01-3";
const MH_AUTH_DEWA = "fld-marina-heights-01-4";
const MH_AUTH_RTA = "fld-marina-heights-01-5";
const MH_SITE = "fld-marina-heights-02";
const MH_CLIENT = "fld-marina-heights-03";
const MH_DRAWINGS = "fld-marina-heights-04";
const MH_CONTRACTS = "fld-marina-heights-05";
const MH_REPORTS = "fld-marina-heights-06";
const MH_RFI = "fld-marina-heights-07";

export const SEED_DOC_FILES: DocumentFile[] = [
  // Marina Heights — Authority Approvals
  { id: "df-1", folderId: MH_AUTH_DM, projectId: "marina-heights", name: "DM Building Permit Application.pdf",
    status: "stamped", version: "v1.0", uploadedByUserId: "u-pm", uploadedByDisplay: "Ahmed M.",
    uploadedAt: ts(-2), sizeBytes: 2_400_000, mimeType: "application/pdf" },
  { id: "df-2", folderId: MH_AUTH_TRAKHEESI, projectId: "marina-heights", name: "Trakheesi Submission Set — Rev03.pdf",
    status: "for-approval", version: "v3.0", uploadedByUserId: "u-pm", uploadedByDisplay: "Ahmed M.",
    uploadedAt: ts(-5), sizeBytes: 45_200_000, mimeType: "application/pdf" },
  { id: "df-3", folderId: MH_AUTH_CD, projectId: "marina-heights", name: "Civil Defence NOC — Fire Safety.pdf",
    status: "stamped", version: "v1.0", uploadedByUserId: "u-design", uploadedByDisplay: "Sarah J.",
    uploadedAt: ts(-7), sizeBytes: 1_800_000, mimeType: "application/pdf" },
  { id: "df-4", folderId: MH_AUTH_DEWA, projectId: "marina-heights", name: "DEWA Load Schedule Approval.pdf",
    status: "final", version: "v2.0", uploadedByUserId: "u-design", uploadedByDisplay: "Mohammed H.",
    uploadedAt: ts(-14), sizeBytes: 3_100_000, mimeType: "application/pdf" },
  { id: "df-5", folderId: MH_AUTH_RTA, projectId: "marina-heights", name: "RTA Access Road NOC.pdf",
    status: "stamped", version: "v1.0", uploadedByUserId: "u-pm", uploadedByDisplay: "Ahmed M.",
    uploadedAt: ts(-21), sizeBytes: 890_000, mimeType: "application/pdf" },
  { id: "df-6", folderId: MH_AUTH_DM, projectId: "marina-heights", name: "DM Comments Response Letter.pdf",
    status: "draft", version: "v1.0", uploadedByUserId: "u-pm", uploadedByDisplay: "Ahmed M.",
    uploadedAt: ts(-1), sizeBytes: 1_200_000, mimeType: "application/pdf" },
  // Marina Heights — site, client, drawings, contracts, reports, RFIs
  { id: "df-7", folderId: MH_SITE, projectId: "marina-heights", name: "Site Survey Report.pdf",
    status: "final", version: "v1.0", uploadedByUserId: "u-site", uploadedByDisplay: "Omar A.",
    uploadedAt: ts(-30), sizeBytes: 4_500_000 },
  { id: "df-8", folderId: MH_SITE, projectId: "marina-heights", name: "Site Photos Week 17.zip",
    status: "final", version: "v1.0", uploadedByUserId: "u-site", uploadedByDisplay: "Omar A.",
    uploadedAt: ts(-3), sizeBytes: 28_000_000 },
  { id: "df-9", folderId: MH_CLIENT, projectId: "marina-heights", name: "Concept Design Sign-off.pdf",
    status: "stamped", version: "v1.0", uploadedByUserId: "u-design", uploadedByDisplay: "Priya N.",
    uploadedAt: ts(-90), sizeBytes: 2_100_000 },
  { id: "df-10", folderId: MH_CLIENT, projectId: "marina-heights", name: "Schematic Design Approval.pdf",
    status: "for-approval", version: "v2.0", uploadedByUserId: "u-design", uploadedByDisplay: "Priya N.",
    uploadedAt: ts(-12), sizeBytes: 3_800_000 },
  { id: "df-11", folderId: MH_DRAWINGS, projectId: "marina-heights", name: "Architectural Floor Plans L1-15.pdf",
    status: "stamped", version: "Rev C", uploadedByUserId: "u-design", uploadedByDisplay: "Priya N.",
    uploadedAt: ts(-30), sizeBytes: 18_500_000 },
  { id: "df-12", folderId: MH_DRAWINGS, projectId: "marina-heights", name: "Structural Substructure GA.pdf",
    status: "final", version: "Rev B", uploadedByUserId: "u-design", uploadedByDisplay: "James W.",
    uploadedAt: ts(-25), sizeBytes: 12_000_000 },
  { id: "df-13", folderId: MH_DRAWINGS, projectId: "marina-heights", name: "MEP Coordination Set L1-20.pdf",
    status: "for-approval", version: "Rev A", uploadedByUserId: "u-design", uploadedByDisplay: "Rashid B.",
    uploadedAt: ts(-8), sizeBytes: 22_000_000 },
  { id: "df-14", folderId: MH_CONTRACTS, projectId: "marina-heights", name: "Construction Contract — ABC Construction.pdf",
    status: "stamped", version: "v1.0", uploadedByUserId: "u-pm", uploadedByDisplay: "Ahmed M.",
    uploadedAt: ts(-180), sizeBytes: 6_400_000 },
  { id: "df-15", folderId: MH_CONTRACTS, projectId: "marina-heights", name: "VO-014 — Façade Spec Upgrade.pdf",
    status: "final", version: "v1.0", uploadedByUserId: "u-pm", uploadedByDisplay: "Ahmed M.",
    uploadedAt: ts(-55), sizeBytes: 950_000 },
  { id: "df-16", folderId: MH_REPORTS, projectId: "marina-heights", name: "Q1 2026 Project Status Report.pdf",
    status: "final", version: "v1.0", uploadedByUserId: "u-pm", uploadedByDisplay: "Ahmed M.",
    uploadedAt: ts(-15), sizeBytes: 4_200_000 },
  { id: "df-17", folderId: MH_REPORTS, projectId: "marina-heights", name: "Soil Investigation Report.pdf",
    status: "final", version: "v1.0", uploadedByUserId: "u-design", uploadedByDisplay: "James W.",
    uploadedAt: ts(-200), sizeBytes: 7_800_000 },
  { id: "df-18", folderId: MH_RFI, projectId: "marina-heights", name: "RFI-MHT-MEP-0024 — Duct Routing Conflict L12.pdf",
    status: "for-approval", version: "v1.0", uploadedByUserId: "u-pm", uploadedByDisplay: "Vikram P.",
    uploadedAt: ts(-2), sizeBytes: 1_400_000 },
  { id: "df-19", folderId: MH_RFI, projectId: "marina-heights", name: "RFI-MHT-STR-0018 — Rebar Cover Zone B.pdf",
    status: "final", version: "v2.0", uploadedByUserId: "u-pm", uploadedByDisplay: "John M.",
    uploadedAt: ts(-8), sizeBytes: 1_100_000 },
  { id: "df-20", folderId: MH_RFI, projectId: "marina-heights", name: "NCR-008 Pile Cap Rebar Cover.pdf",
    status: "final", version: "v1.0", uploadedByUserId: "u-design", uploadedByDisplay: "Noor A.",
    uploadedAt: ts(-30), sizeBytes: 720_000 },

  // Al Wasl Tower — design-phase files
  { id: "df-21", folderId: "fld-al-wasl-tower-04", projectId: "al-wasl-tower", name: "Al Wasl Tower — Concept Massing Rev A.pdf",
    status: "for-approval", version: "Rev A", uploadedByUserId: "u-design", uploadedByDisplay: "Priya N.",
    uploadedAt: ts(-15), sizeBytes: 14_500_000 },
  { id: "df-22", folderId: "fld-al-wasl-tower-06", projectId: "al-wasl-tower", name: "Al Wasl — BODR (Basis of Design Report).pdf",
    status: "draft", version: "v0.5", uploadedByUserId: "u-design", uploadedByDisplay: "Priya N.",
    uploadedAt: ts(-7), sizeBytes: 8_900_000 },
  { id: "df-23", folderId: "fld-al-wasl-tower-05", projectId: "al-wasl-tower", name: "Tender BOQ — Al Wasl.xlsx",
    status: "draft", version: "v0.3", uploadedByUserId: "u-finance", uploadedByDisplay: "Mohammed I.",
    uploadedAt: ts(-10), sizeBytes: 1_200_000 },

  // JLT Commercial — construction-phase files
  { id: "df-24", folderId: "fld-jlt-commercial-04", projectId: "jlt-commercial", name: "JLT Tower B — IFC Drawings Pack.zip",
    status: "stamped", version: "v3.0", uploadedByUserId: "u-pm", uploadedByDisplay: "Ahmed M.",
    uploadedAt: ts(-90), sizeBytes: 65_000_000 },
  { id: "df-25", folderId: "fld-jlt-commercial-07", projectId: "jlt-commercial", name: "WIR-JLT-STR-0089 — Slab L18 Rebar.pdf",
    status: "for-approval", version: "v1.0", uploadedByUserId: "u-site", uploadedByDisplay: "Omar A.",
    uploadedAt: ts(-1), sizeBytes: 2_300_000 },
];
