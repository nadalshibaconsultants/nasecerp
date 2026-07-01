# Pre-Contract Stage Structure Verification

## Acceptance Criteria Check

1. ✅ **8 Stages + 5 Gates in correct order**: S1, G1, S2, G2, S3, G3, S4, G4, S5, G5, S6, S7, S8
2. ✅ **Gates shown as star/diamond markers** (amber) — differentiated from stage circles (green)
3. ✅ **Parallel Authority Track** shown below timeline with 2 milestones:
   - "Authority Preliminary Design Approval" (triggered by G2, runs with S3) — status: under review
   - "NOCs + Final Building Permit (BP)" (triggered by G4, runs with S5) — status: not started
4. ✅ **Gate detail panel** shows "Gate Requirements" with amber styling and "Record Client Approval" button
5. ✅ **Stage detail panel** shows "Deliverables" with green styling and "Complete & Advance" button
6. ✅ **Project list cards** show progress bar with diamond markers for gates and bars for stages
7. ✅ **Current stage label** shows code + name (e.g., "S3: Schematic + BODR")
8. ✅ **Overall percentage** calculated from 13 total items (8 stages + 5 gates)
9. ✅ **Build passes** without TypeScript errors
10. ✅ **No other modules affected** — only ProjectDetail and ProjectsModule changed

## Demo Projects in Pre-Contract
- Al Wasl Tower: Stage 4 (G2 — Client Approval Gate after Stage 2) — 31% overall
- Dubai Creek Residences: Stage 1 (G1 — Gate 1) — 8% overall
- Palm Villas Phase 2: Stage 2 (S2 — Concept Design) — 15% overall
- Business Bay Tower B: Stage 5 (G3 — Gate 3) — at-risk status
