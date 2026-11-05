import { toPersianDigits } from "./scoring";

export const CLINICIAN_KIND: Record<string, string> = {
  PSYCHOLOGIST: "روانشناس",
  PHYSICIAN: "پزشک / روانپزشک",
};

export const CLINICIAN_STATUS: Record<string, { label: string; style: string }> = {
  PENDING: { label: "در انتظار بررسی", style: "bg-amber-50 text-amber-700" },
  APPROVED: { label: "تأییدشده", style: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "ردشده", style: "bg-rose-50 text-rose-700" },
};

export function displayName(u: { firstName: string | null; lastName: string | null; phone?: string }) {
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return n || (u.phone ? toPersianDigits(u.phone) : "بدون نام");
}
