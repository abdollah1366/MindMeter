"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isProfileComplete } from "@/lib/auth/session";
import { ACTIVE_STATUSES, getFreeSlots } from "@/lib/scheduling";
import { hhmmToMinute, formatTehran } from "@/lib/tehran-time";
import { paymentProvider, zarinpalRequest } from "@/lib/zarinpal";
import { toEnglishDigits } from "@/lib/validation";
import { afterPaymentPath, markPaid } from "@/lib/payments";
import { notifyAppointmentCancelled, notifyAppointmentConfirmed } from "@/lib/appointment-notify";

async function approvedClinicianOf(userId: string) {
  const p = await db.clinicianProfile.findUnique({ where: { userId } });
  return p && p.status === "APPROVED" ? p : null;
}

export type ScheduleState = { error?: string; ok?: boolean };

/**
 * ذخیره‌ی ساعات کاری. هر روز یک فیلد متنی مثل «09:00-13:00, 16:00-20:00» دارد.
 */
export async function saveSchedule(_: ScheduleState, form: FormData): Promise<ScheduleState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/panel/schedule");
  const profile = await approvedClinicianOf(user.id);
  if (!profile) return { error: "حساب متخصص شما تأیید نشده است." };

  const price = Number(toEnglishDigits(String(form.get("sessionPrice") ?? "0")).replace(/[,،\s]/g, ""));
  const minutes = Number(toEnglishDigits(String(form.get("sessionMinutes") ?? "45")));
  if (!Number.isInteger(price) || price < 0 || price > 100_000_000) return { error: "تعرفه معتبر نیست." };
  if (![30, 45, 50, 60, 90].includes(minutes)) return { error: "مدت جلسه معتبر نیست." };

  const rows: { weekday: number; startMinute: number; endMinute: number }[] = [];
  for (let wd = 0; wd < 7; wd++) {
    const raw = toEnglishDigits(String(form.get(`day${wd}`) ?? "")).trim();
    if (!raw) continue;
    for (const part of raw.split(/[,،]/).map((s) => s.trim()).filter(Boolean)) {
      const [a, b] = part.split("-").map((s) => hhmmToMinute(s));
      if (a == null || b == null || b - a < minutes) return { error: `بازه‌ی «${part}» معتبر نیست یا از مدت یک جلسه کوتاه‌تر است.` };
      rows.push({ weekday: wd, startMinute: a, endMinute: b });
    }
  }

  await db.$transaction([
    db.availability.deleteMany({ where: { clinicianId: profile.id } }),
    db.availability.createMany({ data: rows.map((r) => ({ ...r, clinicianId: profile.id })) }),
    db.clinicianProfile.update({
      where: { id: profile.id },
      data: { sessionPrice: price, sessionMinutes: minutes, acceptsOnline: form.get("acceptsOnline") === "on" },
    }),
  ]);
  revalidatePath(`/clinicians/${profile.id}`);
  return { ok: true };
}

async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** رزرو نوبت توسط بیمار */
export async function bookAppointment(form: FormData) {
  const clinicianId = String(form.get("clinicianId") ?? "");
  const startsAtIso = String(form.get("startsAt") ?? "");
  const referralId = String(form.get("referralId") ?? "") || null;
  const back = `/clinicians/${clinicianId}`;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${back}`);
  if (!isProfileComplete(user)) redirect(`/profile?next=${back}`);

  const clinician = await db.clinicianProfile.findUnique({ where: { id: clinicianId } });
  if (!clinician || clinician.userId === user.id) redirect(back);

  const slot = (await getFreeSlots(clinicianId)).find((s) => s.startsAt.toISOString() === startsAtIso);
  if (!slot) redirect(`${back}?error=slot`);

  const free = clinician.sessionPrice === 0;
  const appointment = await db.$transaction(async (tx) => {
    // بررسی دوباره‌ی تداخل داخل تراکنش
    const clash = await tx.appointment.findFirst({
      where: { clinicianId, status: { in: ACTIVE_STATUSES }, startsAt: { lt: slot.endsAt }, endsAt: { gt: slot.startsAt } },
    });
    if (clash) return null;
    return tx.appointment.create({
      data: {
        patientId: user.id,
        clinicianId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        price: clinician.sessionPrice,
        status: free ? "CONFIRMED" : "PENDING_PAYMENT",
        referralId,
      },
    });
  });
  if (!appointment) redirect(`${back}?error=slot`);

  // متخصص برای ویزیت به پرونده دسترسی دارد (بیمار هنگام رزرو این را پذیرفته است)
  if (form.get("shareRecord") === "on") {
    await db.accessGrant.upsert({
      where: { patientId_clinicianId: { patientId: user.id, clinicianId } },
      create: { patientId: user.id, clinicianId },
      update: { revokedAt: null },
    });
  }
  if (referralId) {
    await db.referral.updateMany({ where: { id: referralId, patientId: user.id }, data: { status: "BOOKED" } });
  }

  if (free) {
    await notifyAppointmentConfirmed(appointment.id);
    redirect(`/appointments?booked=${appointment.id}`);
  }

  const payment = await db.payment.create({
    data: {
      userId: user.id,
      appointmentId: appointment.id,
      amount: clinician.sessionPrice,
      provider: paymentProvider(),
      description: `ویزیت آنلاین - ${formatTehran(slot.startsAt)}`,
    },
  });
  redirect(`/pay/${payment.id}`);
}

/** شروع پرداخت (انتقال به درگاه یا پرداخت آزمایشی) */
export async function startPayment(form: FormData) {
  const id = String(form.get("paymentId") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/pay/${id}`);
  const payment = await db.payment.findUnique({ where: { id }, include: { appointment: true, enrollment: true } });
  if (!payment || payment.userId !== user.id) redirect("/appointments");
  if (payment.status === "PAID") redirect(await afterPaymentPath(payment));
  const payable = payment.enrollmentId ? payment.enrollment?.status === "PENDING_PAYMENT" : payment.appointment?.status === "PENDING_PAYMENT";
  if (!payable) redirect(`/pay/${id}`);

  if (payment.provider === "DEV") {
    await markPaid(payment.id, `DEV-${Date.now()}`);
    redirect(await afterPaymentPath(payment));
  }

  const { authority, url } = await zarinpalRequest(
    payment.amount,
    payment.description,
    `${await baseUrl()}/api/pay/zarinpal/callback`,
    user.phone,
  );
  await db.payment.update({ where: { id }, data: { authority } });
  redirect(url);
}

/** لغو نوبت: بیمار تا ۲۴ ساعت قبل، متخصص هر زمان */
export async function cancelAppointment(form: FormData) {
  const id = String(form.get("appointmentId") ?? "");
  const reason = String(form.get("reason") ?? "").trim().slice(0, 300) || null;
  const user = await getCurrentUser();
  if (!user) return;
  const a = await db.appointment.findUnique({ where: { id }, include: { clinician: true } });
  if (!a || !["PENDING_PAYMENT", "CONFIRMED"].includes(a.status)) return;

  const isPatient = a.patientId === user.id;
  const isClinician = a.clinician.userId === user.id;
  if (!isPatient && !isClinician) return;
  if (isPatient && a.status === "CONFIRMED" && a.startsAt.getTime() - Date.now() < 24 * 60 * 60 * 1000) return;

  await db.appointment.update({
    where: { id },
    data: { status: "CANCELLED", cancelReason: reason ?? (isPatient ? "لغو توسط مراجع" : "لغو توسط متخصص") },
  });
  if (a.status === "CONFIRMED") await notifyAppointmentCancelled(id, isPatient);
  revalidatePath("/appointments");
  revalidatePath("/panel/appointments");
}
