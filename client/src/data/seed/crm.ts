import type { Lead, LeadActivity } from "@/lib/crm/types";

const today = new Date();
function days(n: number) { return new Date(today.getTime() + n * 86_400_000).toISOString(); }

export const SEED_LEADS: Lead[] = [
  { id: "ld-1", companyName: "Sobha Realty", contactName: "Rashid Al-Suwaidi", contactRole: "Development Manager", contactEmail: "rashid@sobha.ae", contactPhone: "+971 4 555 1010",
    industry: "Real Estate", source: "referral", stage: "qualified", estimatedValueAED: 1850000, probability: 60, expectedCloseDate: days(45),
    ownerUserId: "u-bd", notes: "Master plan tender — 4 hectare mixed-use. Awaiting RFP.",
    createdAt: days(-25), updatedAt: days(-2) },
  { id: "ld-2", companyName: "Damac Properties", contactName: "Layla Hassan", contactRole: "Procurement Lead", contactEmail: "layla@damac.ae",
    industry: "Real Estate", source: "tender", stage: "proposal", estimatedValueAED: 2400000, probability: 45, expectedCloseDate: days(28),
    ownerUserId: "u-bd", notes: "Submitted technical and commercial. Negotiation phase next week.",
    createdAt: days(-40), updatedAt: days(-3) },
  { id: "ld-3", companyName: "Aldar", contactName: "Mohammed Al-Suwaidi", contactRole: "Director Engineering",
    contactEmail: "msuwaidi@aldar.ae", contactPhone: "+971 2 810 1234",
    industry: "Real Estate", source: "existing-client", stage: "negotiation", estimatedValueAED: 3200000, probability: 75,
    expectedCloseDate: days(15), ownerUserId: "u-bd",
    notes: "Repeat client — Yas Island commercial. Final fee under negotiation.",
    createdAt: days(-60), updatedAt: days(-1) },
  { id: "ld-4", companyName: "Meraas", contactName: "Khaled Mahfouz",
    industry: "Hospitality", source: "website", stage: "new", estimatedValueAED: 1200000, probability: 25,
    ownerUserId: "u-bd",
    notes: "Inbound enquiry — boutique hotel concept. Initial call scheduled.",
    createdAt: days(-3), updatedAt: days(-3) },
  { id: "ld-5", companyName: "Wasl Properties", contactName: "Fatima Al-Marri",
    industry: "Mixed-use", source: "cold", stage: "qualified", estimatedValueAED: 850000, probability: 50,
    expectedCloseDate: days(60), ownerUserId: "u-bd",
    notes: "Wasl Crescent II — design competition expected.",
    createdAt: days(-15), updatedAt: days(-5) },
  { id: "ld-6", companyName: "Emaar Hospitality", contactName: "Saleh Al-Ali",
    industry: "Hospitality", source: "referral", stage: "won", estimatedValueAED: 980000, probability: 100,
    expectedCloseDate: days(-12), ownerUserId: "u-bd",
    notes: "Awarded — JBR Hotel renovation. Project being created.",
    createdAt: days(-90), updatedAt: days(-12) },
  { id: "ld-7", companyName: "Nakheel", contactName: "Hamda Al-Falasi",
    industry: "Master Plan", source: "tender", stage: "lost", estimatedValueAED: 4500000, probability: 0,
    ownerUserId: "u-bd",
    notes: "Lost on price — competitor 18% lower.",
    createdAt: days(-120), updatedAt: days(-30) },
];

export const SEED_LEAD_ACTIVITIES: LeadActivity[] = [
  { id: "la-1", leadId: "ld-1", type: "meeting", by: "Sara Khan (bd-manager)", at: days(-2), summary: "Site visit + concept brief", detail: "1.5h workshop. They want LEED Gold." },
  { id: "la-2", leadId: "ld-2", type: "proposal-sent", by: "Sara Khan (bd-manager)", at: days(-3), summary: "Technical + commercial proposal issued", detail: "Ref TP-2026-088." },
  { id: "la-3", leadId: "ld-3", type: "call", by: "Sara Khan (bd-manager)", at: days(-1), summary: "Fee negotiation call", detail: "They asked for 5% reduction; we counter-offered 3%." },
  { id: "la-4", leadId: "ld-6", type: "stage-change", by: "Sara Khan (bd-manager)", at: days(-12), summary: "Won → moved to project pipeline" },
];
