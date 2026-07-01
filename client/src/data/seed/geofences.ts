/**
 * Geofence seed — one fence per active project site.
 * Real coordinates approximate the actual community in Dubai.
 */
import type { Geofence } from "@/lib/attendance/types";

export const SEED_GEOFENCES: Geofence[] = [
  // Marina Heights Tower — Dubai Marina (JBR)
  { id: "marina-heights", projectId: "marina-heights", name: "Marina Heights Tower — Site",
    center: { lat: 25.0772, lng: 55.1411 }, radiusM: 120,
    createdAt: "2025-11-01T08:00:00Z", updatedAt: "2025-11-01T08:00:00Z" },
  // JLT Commercial Complex
  { id: "jlt-commercial", projectId: "jlt-commercial", name: "JLT Commercial Complex — Site",
    center: { lat: 25.0691, lng: 55.1418 }, radiusM: 100,
    createdAt: "2025-06-01T08:00:00Z", updatedAt: "2025-06-01T08:00:00Z" },
  // Al Wasl Tower (Pre-Contract — design site visits only)
  { id: "al-wasl-tower", projectId: "al-wasl-tower", name: "Al Wasl Tower — Plot",
    center: { lat: 25.1948, lng: 55.2625 }, radiusM: 80,
    createdAt: "2026-01-15T08:00:00Z", updatedAt: "2026-01-15T08:00:00Z" },
  // Dubai Creek Residences
  { id: "dubai-creek", projectId: "dubai-creek", name: "Dubai Creek Residences — Plot",
    center: { lat: 25.1989, lng: 55.3479 }, radiusM: 90,
    createdAt: "2026-03-01T08:00:00Z", updatedAt: "2026-03-01T08:00:00Z" },
  // Palm Villas Phase 2
  { id: "palm-villas", projectId: "palm-villas", name: "Palm Villas Phase 2 — Compound",
    center: { lat: 25.1124, lng: 55.1390 }, radiusM: 200,
    createdAt: "2026-02-01T08:00:00Z", updatedAt: "2026-02-01T08:00:00Z" },
  // Business Bay Tower B
  { id: "business-bay-tower", projectId: "business-bay-tower", name: "Business Bay Tower B — Plot",
    center: { lat: 25.1881, lng: 55.2767 }, radiusM: 90,
    createdAt: "2025-09-01T08:00:00Z", updatedAt: "2025-09-01T08:00:00Z" },
];

// Office geofence — NASEC HQ (assumed Business Bay)
export const OFFICE_GEOFENCE: Geofence = {
  id: "office",
  projectId: "office",
  name: "NASEC HQ Office",
  center: { lat: 25.1872, lng: 55.2730 },
  radiusM: 60,
  createdAt: "2018-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
};
