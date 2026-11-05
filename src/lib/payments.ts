import "server-only";
import { db } from "@/lib/db";
import { ACTIVE_STATUSES } from "@/lib/scheduling";

/**
 * ثبت پرداخت موفق و قطعی کردن نوبت.
 * اگر مهلت نگه‌داری نوبت تمام شده و زمان آن در این فاصله رزرو شده باشد، نوبت لغو می‌ماند
 * و پرداخت برای بازگشت وجه در پنل ادمین دیده می‌شود.
 */
export async function markPaid(paymentId: string, refId: string) {
  const p = await db.payment.update({ where: { id: paymentId }, data: { status: "PAID", refId, paidAt: new Date() } });
  if (!p.appointmentId) return;
  const a = await db.appointment.findUnique({ where: { id: p.appointmentId } });
  if (!a) return;
  if (a.status === "PENDING_PAYMENT") {
    await db.appointment.update({ where: { id: a.id }, data: { status: "CONFIRMED" } });
  } else if (a.status === "CANCELLED") {
    const clash = await db.appointment.findFirst({
      where: { id: { not: a.id }, clinicianId: a.clinicianId, status: { in: ACTIVE_STATUSES }, startsAt: { lt: a.endsAt }, endsAt: { gt: a.startsAt } },
    });
    await db.appointment.update({
      where: { id: a.id },
      data: clash
        ? { cancelReason: "پرداخت پس از پایان مهلت انجام شد و زمان رزرو شده بود؛ مبلغ بازگردانده می‌شود." }
        : { status: "CONFIRMED", cancelReason: null },
    });
  }
}
