/**
 * Centralised formatters. Use these instead of ad-hoc toLocaleString /
 * toLocaleDateString — guarantees consistency across the whole app.
 */
import { OFFICES } from "@/lib/office/configs";
import type { OfficeId } from "@/lib/office/types";

export function fmtMoney(amount: number, currency: "AED" | "EGP" = "AED"): string {
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}
export function fmtMoneyForOffice(amount: number, office?: OfficeId): string {
  return fmtMoney(amount, OFFICES[office || "dubai"].currency);
}
export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
export function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: true });
}
export function fmtRel(iso?: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return fmtDate(iso);
}
export function fmtNumber(n: number, digits = 0): string {
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
