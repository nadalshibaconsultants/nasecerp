// Seed: standard document folder taxonomy + demo files for every project that
// has none yet. Idempotent — skips projects that already have folders.
import { eq } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import { projects, docFolders, projectDocuments } from "../db/schema/index.js";

type Status = "draft" | "for-approval" | "final" | "stamped" | "superseded";

const TOP: { code: string; name: string; retention?: string; indicator?: string; access?: string[] }[] = [
  { code: "01", name: "01. Authority Approvals", retention: "Permanent", indicator: "alert", access: ["director", "pm", "design-lead", "site-engineer"] },
  { code: "02", name: "02. Site Documents", indicator: "ok" },
  { code: "03", name: "03. Client Approvals", indicator: "warn" },
  { code: "04", name: "04. Drawings", indicator: "ok" },
  { code: "05", name: "05. Contracts & Commercial", indicator: "ok" },
  { code: "06", name: "06. Reports & Studies", indicator: "ok" },
  { code: "07", name: "07. RFIs & Submittals", indicator: "warn" },
  { code: "08", name: "08. Extra / Miscellaneous", indicator: "ok" },
];

const SUB01 = [
  "Trakheesi", "Dubai Municipality (DM)", "DDA / TECOM / Free Zone", "Civil Defence",
  "DEWA", "RTA", "Etisalat / du", "Empower / Tabreed", "Other NOCs",
];

// [ folderKey, name, status, version, uploader, sizeBytes ]
// folderKey: "01:<sub>" for a sub-folder of Authority Approvals, else top code.
const FILES: [string, string, Status, string, string, number][] = [
  ["01:Dubai Municipality (DM)", "DM Comments Response Letter.pdf", "draft", "v1.0", "Ahmed M.", 1_153_433],
  ["01:Dubai Municipality (DM)", "DM Building Permit Application.pdf", "stamped", "v1.0", "Ahmed M.", 2_411_724],
  ["01:Trakheesi", "Trakheesi Submission Set — Rev03.pdf", "for-approval", "v3.0", "Ahmed M.", 45_193_062],
  ["01:Civil Defence", "Civil Defence NOC — Fire Safety.pdf", "stamped", "v1.0", "Sarah J.", 1_782_579],
  ["01:DEWA", "DEWA Load Schedule Approval.pdf", "final", "v2.0", "Mohammed H.", 3_145_728],
  ["01:RTA", "RTA Access Road NOC.pdf", "stamped", "v1.0", "Ahmed M.", 890_240],
  ["02", "Site Inspection Report — Week 12.pdf", "final", "v1.0", "Sarah J.", 2_201_473],
  ["02", "Site Progress Photos — May.pdf", "final", "v1.0", "Sarah J.", 8_912_896],
  ["03", "Client Approval — Concept Design.pdf", "final", "v1.0", "Ahmed M.", 1_572_864],
  ["03", "Client Comments — DD Stage.pdf", "for-approval", "v1.0", "Mohammed H.", 712_704],
  ["04", "GA Plans — Level 1-5.pdf", "final", "v2.0", "Mohammed H.", 12_582_912],
  ["04", "Elevations — North & South.pdf", "final", "v1.0", "Mohammed H.", 6_291_456],
  ["04", "Sections — A-A & B-B.pdf", "draft", "v1.0", "Sarah J.", 4_194_304],
  ["05", "Consultancy Agreement — Signed.pdf", "stamped", "v1.0", "Ahmed M.", 2_097_152],
  ["05", "Fee Proposal — Rev02.pdf", "final", "v2.0", "Ahmed M.", 524_288],
  ["06", "Geotechnical Investigation Report.pdf", "final", "v1.0", "Mohammed H.", 9_437_184],
  ["06", "Traffic Impact Study.pdf", "final", "v1.0", "Sarah J.", 5_242_880],
  ["07", "RFI-014 — Slab Thickness.pdf", "for-approval", "v1.0", "Mohammed H.", 327_680],
  ["07", "RFI-015 — Facade Detail.pdf", "draft", "v1.0", "Sarah J.", 458_752],
  ["07", "Submittal — Curtain Wall System.pdf", "for-approval", "v1.0", "Mohammed H.", 15_728_640],
];

async function main() {
  console.log("[seed:docs] starting…");
  const allProjects = await db.select({ id: projects.id, code: projects.code }).from(projects);
  let foldersCreated = 0, filesCreated = 0, skipped = 0;

  for (const proj of allProjects) {
    const existing = await db.select({ id: docFolders.id }).from(docFolders).where(eq(docFolders.projectId, proj.id)).limit(1);
    if (existing[0]) { skipped++; continue; }

    // Top-level folders
    const topByCode = new Map<string, string>();
    for (let i = 0; i < TOP.length; i++) {
      const t = TOP[i];
      const ins = await db.insert(docFolders).values({
        projectId: proj.id, parentId: null, order: i, code: t.code, name: t.name,
        accessRoles: t.access ?? [], retention: t.retention ?? null, indicator: t.indicator ?? null,
      } as any).returning({ id: docFolders.id });
      topByCode.set(t.code, ins[0].id);
      foldersCreated++;
    }

    // Sub-folders under "01. Authority Approvals"
    const subByName = new Map<string, string>();
    const parent01 = topByCode.get("01")!;
    for (let i = 0; i < SUB01.length; i++) {
      const ins = await db.insert(docFolders).values({
        projectId: proj.id, parentId: parent01, order: i, code: null, name: SUB01[i],
        accessRoles: [], retention: null, indicator: null,
      } as any).returning({ id: docFolders.id });
      subByName.set(SUB01[i], ins[0].id);
      foldersCreated++;
    }

    // Demo files
    for (const [key, name, status, version, uploader, size] of FILES) {
      let folderId: string | undefined;
      if (key.startsWith("01:")) folderId = subByName.get(key.slice(3));
      else folderId = topByCode.get(key);
      if (!folderId) continue;
      await db.insert(projectDocuments).values({
        folderId, projectId: proj.id, name, status, version,
        uploadedByDisplay: uploader, sizeBytes: size, mimeType: "application/pdf",
      } as any);
      filesCreated++;
    }
    console.log(`[seed:docs] ${proj.code}: taxonomy + ${FILES.length} files`);
  }

  console.log(`[seed:docs] folders created: ${foldersCreated}, files created: ${filesCreated}, projects skipped: ${skipped}`);
  await pool.end();
  console.log("[seed:docs] done");
}

main().catch((err) => { console.error("[seed:docs] failed:", err); process.exit(1); });
