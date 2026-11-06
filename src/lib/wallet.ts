import "server-only";
import { db } from "@/lib/db";

export const MIN_PAYOUT = 100_000;
const COMMISSION_KEY = "commissionPercent";

export const LEDGER_LABEL: Record<string, string> = {
  VISIT: "ویزیت آنلاین",
  COURSE: "فروش دوره",
  PAYOUT: "درخواست تسویه",
  PAYOUT_REVERSAL: "بازگشت درخواست تسویه",
  ADJUSTMENT: "اصلاح توسط مدیر",
};

/** درصد کمیسیون سایت (پیش‌فرض ۱۵٪ یا PLATFORM_COMMISSION_PERCENT) */
export async function commissionPercent() {
  const row = await db.siteSetting.findUnique({ where: { key: COMMISSION_KEY } });
  const v = Number(row?.value ?? process.env.PLATFORM_COMMISSION_PERCENT ?? 15);
  return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 15;
}

export async function setCommissionPercent(v: number) {
  await db.siteSetting.upsert({ where: { key: COMMISSION_KEY }, create: { key: COMMISSION_KEY, value: String(v) }, update: { value: String(v) } });
}

export function split(gross: number, percent: number) {
  const commission = Math.round((gross * percent) / 100);
  return { commission, net: gross - commission };
}

async function credit(clinicianId: string, kind: "VISIT" | "COURSE", sourceId: string, gross: number, note: string) {
  if (gross <= 0) return null;
  const { commission, net } = split(gross, await commissionPercent());
  try {
    return await db.ledgerEntry.create({ data: { clinicianId, kind, sourceId, gross, commission, amount: net, note } });
  } catch {
    return null; // قبلاً ثبت شده
  }
}

/** درآمد ویزیت انجام‌شده (فقط نوبت پرداخت‌شده) */
export async function creditVisit(appointmentId: string) {
  const a = await db.appointment.findUnique({ where: { id: appointmentId }, include: { payments: { where: { status: "PAID" } }, patient: true } });
  if (!a || a.status !== "COMPLETED" || a.payments.length === 0) return null;
  const paid = a.payments.reduce((s, p) => s + p.amount, 0);
  return credit(a.clinicianId, "VISIT", a.id, paid, `ویزیت ${a.startsAt.toISOString().slice(0, 10)}`);
}

/** سهم مدرس از فروش دوره */
export async function creditCourse(enrollmentId: string) {
  const e = await db.enrollment.findUnique({ where: { id: enrollmentId }, include: { course: true } });
  if (!e || e.status !== "ACTIVE" || !e.course.instructorId || e.price <= 0) return null;
  return credit(e.course.instructorId, "COURSE", e.id, e.price, e.course.title);
}

export async function balanceOf(clinicianId: string) {
  const r = await db.ledgerEntry.aggregate({ where: { clinicianId }, _sum: { amount: true } });
  return r._sum.amount ?? 0;
}

/** شبا: IR و ۲۴ رقم، با کنترل mod 97 */
export function normalizeIban(raw: string) {
  const s = raw
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .toUpperCase()
    .replace(/[\s-]/g, "");
  const iban = /^\d{24}$/.test(s) ? `IR${s}` : s;
  if (!/^IR\d{24}$/.test(iban)) return null;
  const rearranged = iban.slice(4) + "1827" + iban.slice(2, 4); // I=18, R=27
  let rem = 0;
  for (const ch of rearranged) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1 ? iban : null;
}

/** تکمیل خودکار ویزیت‌هایی که شروع شده‌اند ولی متخصص «پایان» را نزده است (۲ ساعت بعد از زمان پایان) */
export async function autoCompleteVisits(now = new Date()) {
  const stale = await db.appointment.findMany({
    where: { status: "IN_PROGRESS", endsAt: { lt: new Date(now.getTime() - 2 * 3600_000) } },
    select: { id: true },
  });
  for (const a of stale) {
    await db.appointment.update({ where: { id: a.id }, data: { status: "COMPLETED", endedAt: now } });
    await creditVisit(a.id);
  }
  return stale.length;
}
