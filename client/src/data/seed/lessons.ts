/**
 * Seed of the Lessons Learnt Design Checklist.
 *
 * Items 1..29 (with gaps) come from the NASEC "Lesson learnt checklist.xlsx"
 * uploaded by the company. Additional items below the original list are
 * professional-grade additions covering façade, BIM, sustainability,
 * authority, commercial and HSE — all flagged isCore: true (cannot be
 * deleted, only deactivated by Director).
 */
import type { LessonItem } from "@/lib/lessons/types";

const now = new Date().toISOString();
const I = (
  id: string,
  discipline: LessonItem["discipline"],
  text: string,
  extra: Partial<LessonItem> = {}
): LessonItem => ({
  id,
  discipline,
  text,
  isActive: true,
  isCore: true,
  addedAt: now,
  addedByDisplay: "System (Seeded)",
  ...extra,
});

export const SEED_LESSON_ITEMS: LessonItem[] = [
  // ===== ARCHITECTURE (from Excel) =====
  I("ll-arch-001", "arch", "Podium / Basement clear height to be minimum 2.80m", { itemNumber: 1, problemSource: "M.Wolf" }),
  I("ll-arch-002", "arch", "Garbage room to be in the ground floor to allow for the truck height", { itemNumber: 2, problemSource: "M.Wolf" }),
  I("ll-arch-003", "arch", "Manoeuvring for all cars to be considered", { itemNumber: 3, problemSource: "M.Wolf" }),
  I("ll-arch-004", "arch", "Projections outside the plot limit to be respected as allowed", { itemNumber: 4, problemSource: "Alsatwa" }),
  I("ll-arch-005", "arch", "Door architraves to be allowed and to be shown in the door schedule detail sheet", { itemNumber: 5, problemSource: "M.Wolf" }),
  I("ll-arch-006", "arch", "Shops clear height to be 3.5m minimum", { itemNumber: 6, problemSource: "M.Wolf" }),
  I("ll-arch-007", "arch", "Windows / curtain walls types and details to be specified in the door/window schedule by Type, Brand and Model number", { itemNumber: 7, problemSource: "Al Satwa / Vita" }),
  I("ll-arch-008", "arch", "DCD requirements to be considered for door opening and fireman lift shaft", { itemNumber: 8, problemSource: "Al Satwa" }),
  I("ll-arch-009", "arch", "In case of a basement, ensure clear height of 2.4m below the substation / LV room after allowing for the 0.8m depth trench", { itemNumber: 9 }),
  I("ll-arch-010", "arch", "Str. beams / drop panels to be coordinated with door openings, driveways, façade (balconies) and lift shaft before doing the final BP application", { itemNumber: 10, problemSource: "M.Wolf / All Villas" }),
  I("ll-arch-011", "arch", "Drainage points location in balconies to be considered", { itemNumber: 11, problemSource: "M.Wolf" }),
  I("ll-arch-012", "arch", "Internal / external roof level to be checked \"after combo\" (combo thickness to be considered)", { itemNumber: 12, problemSource: "All Villas" }),
  I("ll-arch-013", "arch", "Slab limit to be coordinated with external finishes", { itemNumber: 13, problemSource: "All Villas" }),
  I("ll-arch-014", "arch", "In case of special paint, name exactly the paint reference code in the finish schedule", { itemNumber: 14, problemSource: "Vita" }),
  I("ll-arch-015", "arch", "In case of renovation project, the scope of work to be clearly mentioned in the drawings; all drawings shall be coordinated together", { itemNumber: 15, problemSource: "Vita" }),
  I("ll-arch-016", "arch", "MEP shafts to be coordinated with the architectural; the architect must not add/delete any shaft without coordinating with the MEP engineer first", { itemNumber: 16, problemSource: "AliSaadoon" }),
  I("ll-arch-017", "arch", "Structure elements to be shown and considered in the arch drawings for any shades or façade decorative elements", { itemNumber: 17, problemSource: "Al Satwa" }),
  I("ll-arch-018", "arch", "Boundary wall finishes (from inside) to be shown in the boundary wall layout", { itemNumber: 18, problemSource: "AliSaadoon" }),
  I("ll-arch-019", "arch", "All the finishes to be coordinated within design sheets and specified by brand and model number if available", { itemNumber: 19, problemSource: "Vita" }),
  I("ll-arch-020", "arch", "Shops / Ground floor common areas to be at least 15cm higher than pavement level", { itemNumber: 20, problemSource: "M.Wolf" }),
  I("ll-arch-021", "arch", "Basement / Underground pump room access hatch to be considered in Ground floor slab", { itemNumber: 21, problemSource: "M.Wolf" }),
  I("ll-arch-022", "arch", "Sloped ramps start point and end points to be studied in Revit and applicable for the construction", { itemNumber: 22, problemSource: "M.Wolf" }),
  I("ll-arch-023", "arch", "Lift shaft opening to be coordinated with the mechanical engineer and designed as per the supplier requirements before obtaining the BP", { itemNumber: 23, problemSource: "M.Wolf" }),
  I("ll-arch-024", "arch", "Foundation levels to be coordinated with basement / lower ground finish level before obtaining the BP", { itemNumber: 24, problemSource: "M.Wolf" }),
  I("ll-arch-026", "arch", "GF restaurant exhaust shaft to be considered within building boundary to maintain façade look", { itemNumber: 26, problemSource: "M.Wolf" }),
  I("ll-arch-027", "arch", "Coordinating tie beams / retaining walls with ground floor shops and entrances", { itemNumber: 27, problemSource: "M.Wolf" }),
  I("ll-arch-028", "arch", "Tank cover slab to be shown in arch sections in water-tank detail sheet", { itemNumber: 28, problemSource: "M.Wolf" }),
  I("ll-arch-029", "arch", "Door openings to be as per DCD requirements", { itemNumber: 29, problemSource: "Al Satwa" }),

  // ===== STRUCTURAL (from Excel) =====
  I("ll-str-001", "str", "Slab edges & shaft openings to be coordinated with arch / mechanical", { problemSource: "AliSaadoon" }),
  I("ll-str-002", "str", "Substations, sump pits and gratings to be considered in STR drawings", { problemSource: "M.Wolf" }),
  I("ll-str-003", "str", "Swimming pool balance tank to be considered in STR calculations either concrete or GRP", { problemSource: "M.Wolf" }),

  // ===== MEP / PLUMBING (from Excel) =====
  I("ll-mep-001", "mep-plumbing", "MEP shafts to be coordinated with the architectural; MEP not to add any shaft without coordinating with the architect first", { problemSource: "AliSaadoon" }),
  I("ll-mep-002", "mep-plumbing", "Ground floor / Podium gratings to be coordinated with STR drawings", { problemSource: "M.Wolf" }),
  I("ll-mep-003", "mep-plumbing", "Swimming pool balance tank to be GRP", { problemSource: "M.Wolf" }),

  // ===== ELECTRICAL (placeholder header in Excel — kept for completeness) =====
  I("ll-ele-001", "electrical", "DEWA load schedule to be reconciled with final MEP load study before submission", {
    recommendedAction: "Cross-check the single-line diagram against DEWA load application before BP submission",
  }),

  // ===== ADDITIONS — Façade & Envelope =====
  I("ll-fac-001", "facade", "Cladding system & insulation U-value to comply with Dubai Building Code 2021 (Chapter 6 — Energy Efficiency)"),
  I("ll-fac-002", "facade", "Façade fire performance to comply with UAE Fire & Life Safety Code 2024 — LPCB BR 135 / UL 263 certified materials only"),
  I("ll-fac-003", "facade", "Curtain wall mullion grid to be coordinated with slab edges, shadow lines and external lighting points"),
  I("ll-fac-004", "facade", "Glazing G-value, VLT and SHGC values to be specified in the façade schedule"),

  // ===== ADDITIONS — BIM & Coordination =====
  I("ll-bim-001", "bim", "BIM model shared in IFC by all disciplines at the end of Concept and Schematic; clash report < 50 Priority 1 clashes before G3"),
  I("ll-bim-002", "bim", "Revit model shared at LOD 300 minimum at Schematic; LOD 350 at end of Detailed Design"),
  I("ll-bim-003", "bim", "Common Data Environment (ISO 19650) folder structure to be set up at S2 (Concept) latest"),

  // ===== ADDITIONS — Sustainability =====
  I("ll-sus-001", "sustainability", "If LEED-targeted: energy model run at end of Schematic with EAc1 score ≥ 12 points (Gold target)"),
  I("ll-sus-002", "sustainability", "If Estidama Pearl-targeted: Pearl rating workshop with client signed-off at S2 end"),
  I("ll-sus-003", "sustainability", "Dubai Green Building Regulations (compliance certificate) requirements integrated into BODR"),

  // ===== ADDITIONS — Authority & Permits =====
  I("ll-aut-001", "authority", "DM Concept review meeting held before formal submission — informal feedback documented"),
  I("ll-aut-002", "authority", "All NOC dependencies (DCD, DEWA, RTA, etc.) listed with target dates against the gate schedule"),
  I("ll-aut-003", "authority", "If Trakhees jurisdiction (Palm Jumeirah / DWC etc.) — community NOC liaison engaged at S2"),
  I("ll-aut-004", "authority", "Plot setbacks, FAR and height verified against the latest DM Affection Plan"),

  // ===== ADDITIONS — Commercial / Cost =====
  I("ll-com-001", "commercial", "Cost estimate at S3 (Schematic) within ±10% of client budget; variance memo issued if outside"),
  I("ll-com-002", "commercial", "Subconsultant scope of works and fees aligned with the main consultancy agreement and milestones"),
  I("ll-com-003", "commercial", "Variation order register opened at the end of S3 with the current baseline scope"),

  // ===== ADDITIONS — HSE / Public Safety =====
  I("ll-hse-001", "hse", "Construction phase plan / preliminary HSE plan reviewed by HSE manager before tender"),
  I("ll-hse-002", "hse", "Tower crane swing-radius assessment if site adjacent to public road / RTA NOC dependency identified"),

  // ===== ADDITIONS — General =====
  I("ll-gen-001", "general", "Stage-gate handover memo signed off by Lead Architect, PM and Design Manager before client submission"),
  I("ll-gen-002", "general", "Drawing register (DR) and document register (DC) updated with all titles, revisions and statuses"),
];
