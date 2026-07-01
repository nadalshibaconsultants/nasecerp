export type LeadStage = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type LeadSource = "referral" | "website" | "tender" | "cold" | "event" | "existing-client" | "other";

export type Lead = {
  id: string;
  companyName: string;
  contactName: string;
  contactRole?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  source: LeadSource;
  stage: LeadStage;
  estimatedValueAED: number;
  probability: number;       // 0-100
  expectedCloseDate?: string;
  ownerUserId?: string;       // BD or PM
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadActivity = {
  id: string;
  leadId: string;
  type: "call" | "email" | "meeting" | "note" | "stage-change" | "proposal-sent";
  by: string;                 // actor
  at: string;
  summary: string;
  detail?: string;
};
