// Scheduled pull of new attendance punches from Firebase RTDB.
// No-op unless FIREBASE_SYNC_ENABLED=true and credentials are configured.
export async function runFirebaseAttendanceSync() {
  if (process.env.FIREBASE_SYNC_ENABLED !== "true") return;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.warn("[job:firebase-sync] enabled but no FIREBASE_SERVICE_ACCOUNT_* set — skipping");
    return;
  }
  const { runImport } = await import("../integrations/firebase-attendance.js");
  const res = await runImport();
  console.log(`[job:firebase-sync] imported ${res.inserted} new punches (${res.unmatched} unmatched)`);
}
