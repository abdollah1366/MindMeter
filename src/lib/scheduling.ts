import "server-only";
import { db } from "@/lib/db";
import { tehranMidnight, tehranParts } from "@/lib/tehran-time";

const MS = 60 * 1000;
export const BOOKING_DAYS = 14;
/** حداقل فاصله‌ی رزرو تا شروع نوبت (دقیقه) */
export const MIN_LEAD_MIN = 60;
/** وضعیت‌هایی که زمان را اشغال می‌کنند */
export const ACTIVE_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "IN_PROGRESS"];
/** نوبت پرداخت‌نشده بعد از این مدت آزاد می‌شود */
export const PAYMENT_HOLD_MIN = 15;

export type Slot = { startsAt: Date; endsAt: Date };

/** نوبت‌های پرداخت‌نشده‌ی منقضی را لغو می‌کند تا زمانشان آزاد شود */
export async function releaseStaleHolds() {
  await db.appointment.updateMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: new Date(Date.now() - PAYMENT_HOLD_MIN * MS) } },
    data: { status: "CANCELLED", cancelReason: "پرداخت در مهلت مقرر انجام نشد." },
  });
}

/** زمان‌های خالی متخصص در روزهای آینده */
export async function getFreeSlots(clinicianId: string, now = new Date()): Promise<Slot[]> {
  await releaseStaleHolds();
  const clinician = await db.clinicianProfile.findUnique({
    where: { id: clinicianId },
    include: { availability: true },
  });
  if (!clinician || clinician.status !== "APPROVED" || !clinician.acceptsOnline) return [];

  const from = tehranMidnight(now);
  const to = tehranMidnight(now, BOOKING_DAYS);
  const busy = await db.appointment.findMany({
    where: { clinicianId, status: { in: ACTIVE_STATUSES }, startsAt: { lt: to }, endsAt: { gt: from } },
    select: { startsAt: true, endsAt: true },
  });

  const len = clinician.sessionMinutes;
  const slots: Slot[] = [];
  for (let i = 0; i < BOOKING_DAYS; i++) {
    const midnight = tehranMidnight(now, i);
    const { weekday } = tehranParts(new Date(midnight.getTime() + 12 * 60 * MS));
    for (const a of clinician.availability.filter((x) => x.weekday === weekday)) {
      for (let m = a.startMinute; m + len <= a.endMinute; m += len) {
        const startsAt = new Date(midnight.getTime() + m * MS);
        const endsAt = new Date(startsAt.getTime() + len * MS);
        if (startsAt.getTime() < now.getTime() + MIN_LEAD_MIN * MS) continue;
        if (busy.some((b) => b.startsAt < endsAt && b.endsAt > startsAt)) continue;
        slots.push({ startsAt, endsAt });
      }
    }
  }
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** پنجره‌ی ورود به اتاق ویزیت: ۱۰ دقیقه قبل تا ۳۰ دقیقه بعد از پایان */
export function visitWindow(a: { startsAt: Date; endsAt: Date }) {
  return { opensAt: new Date(a.startsAt.getTime() - 10 * MS), closesAt: new Date(a.endsAt.getTime() + 30 * MS) };
}

export function canJoin(a: { startsAt: Date; endsAt: Date; status: string }, now = new Date()) {
  const w = visitWindow(a);
  return ["CONFIRMED", "IN_PROGRESS"].includes(a.status) && now >= w.opensAt && now <= w.closesAt;
}

export const APPOINTMENT_STATUS: Record<string, { label: string; style: string }> = {
  PENDING_PAYMENT: { label: "در انتظار پرداخت", style: "bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "قطعی", style: "bg-emerald-50 text-emerald-700" },
  IN_PROGRESS: { label: "در حال برگزاری", style: "bg-brand-50 text-brand-700" },
  COMPLETED: { label: "انجام‌شده", style: "bg-slate-100 text-slate-600" },
  CANCELLED: { label: "لغوشده", style: "bg-rose-50 text-rose-700" },
};

export const REFERRAL_STATUS: Record<string, { label: string; style: string }> = {
  NEW: { label: "در انتظار پذیرش", style: "bg-amber-50 text-amber-700" },
  ACCEPTED: { label: "پذیرفته‌شده", style: "bg-emerald-50 text-emerald-700" },
  DECLINED: { label: "ردشده", style: "bg-rose-50 text-rose-700" },
  BOOKED: { label: "نوبت رزرو شد", style: "bg-brand-50 text-brand-700" },
  CLOSED: { label: "بسته‌شده", style: "bg-slate-100 text-slate-600" },
};
