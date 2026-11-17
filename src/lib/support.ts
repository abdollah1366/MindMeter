/**
 * برچسبها و ابزارهای مشترک سیستم تیکت پشتیبانی.
 * بدون وابستگی به سرور تا هم در صفحهها و هم در مؤلفههای فرم قابل استفاده باشد.
 */
import { SUPPORT_TOPIC_BY_KEY } from "@/data/support-topics";

export const TICKET_STATUS: Record<string, { label: string; style: string }> = {
  OPEN: { label: "باز", style: "bg-amber-50 text-amber-700" },
  ANSWERED: { label: "پاسخ داده شده", style: "bg-brand-50 text-brand-700" },
  CLOSED: { label: "بسته شده", style: "bg-slate-100 text-slate-600" },
};

export const TICKET_PRIORITY: Record<string, { label: string; style: string }> = {
  LOW: { label: "کم", style: "bg-slate-100 text-slate-600" },
  NORMAL: { label: "عادی", style: "bg-brand-50 text-brand-700" },
  HIGH: { label: "بالا", style: "bg-rose-50 text-rose-700" },
};

export const ROLE_LABEL: Record<string, string> = {
  PATIENT: "مراجع",
  PSYCHOLOGIST: "روانشناس",
  PHYSICIAN: "پزشک",
  ADMIN: "پشتیبانی مایندمتر",
};

export const STAFF_ROLES = ["ADMIN", "PSYCHOLOGIST", "PHYSICIAN"];

export function topicTitle(key: string) {
  return SUPPORT_TOPIC_BY_KEY.get(key as never)?.title ?? key;
}

/** آیا نقش کاربر اجازه استفاده از موضوع پزشکان را دارد؟ */
export function canUseDoctorsTopic(role: string) {
  return STAFF_ROLES.includes(role);
}

export function displayUser(u: { firstName?: string | null; lastName?: string | null; phone?: string }) {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return name || `کاربر ${u.phone?.slice(-4) ?? ""}`.trim();
}

export function statusOf(key: string) {
  return TICKET_STATUS[key] ?? { label: key, style: "bg-slate-100 text-slate-600" };
}

export function priorityOf(key: string) {
  return TICKET_PRIORITY[key] ?? TICKET_PRIORITY.NORMAL;
}
