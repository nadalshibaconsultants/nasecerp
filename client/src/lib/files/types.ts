export type StoredFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;        // base64 data URL — for the localStorage-backed iteration
  uploadedAt: string;
  uploadedBy: string;     // user displayName
  // Polymorphic linkage — which entity this file belongs to
  entityType: "employee" | "project" | "training" | "asset" | "drawing" | "contract" | "boq" | "snag" | "ir" | "wir" | "other";
  entityId: string;       // id of the linked record
  category?: string;      // free-text: "passport", "EID front", "site photo", etc.
};
