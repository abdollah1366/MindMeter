import "server-only";
import { db } from "@/lib/db";
import { ACTIVE_STATUSES } from "@/lib/scheduling";
import { activateEnrollment } from "@/lib/academy-server";
import { notifyAppointmentConfirmed } from "@/lib/appointment-notify";
import { notifyLater } from "@/lib/notify";
import { clinicianPlan, planTitle } from "@/lib/clinician-plans";

/**
 * ثبت پرداخت موفق و قطعی کردن نوبت.
 * اگر مهلت نگه‌داری نوبت تمام شده و زمان آن در این فاصله رزرو شده باشد، نوبت لغو می‌ماند
 * و پرداخت برای بازگشت وجه در پنل ادمین دیده می‌شود.
 * پرداخت دوره، ثبت‌نام را فعال می‌کند.
 */
export async function markPaid(paymentId: string, refId: string) {
  const p = await db.payment.update({ where: { id: paymentId }, data: { status: "PAID", refId, paidAt: new Date() } });
  if (p.testPurchaseId) {
    await db.testPurchase.updateMany({ where: { id: p.testPurchaseId, status: "PENDING_PAYMENT" }, data: { status: "PAID", paidAt: new Date() } });
    return;
  }
  if (p.enrollmentId) {
    await activateEnrollment(p.enrollmentId);
    return;
  }
  if (p.clinicianPlanId) {
    const updated = await db.clinicianTestPlan.updateMany({
      where: { id: p.clinicianPlanId, status: "PENDING_PAYMENT" },
      data: { status: "ACTIVE", paidAt: new Date() },
    });
    if (updated.count) {
      const plan = await db.clinicianTestPlan.findUnique({ where: { id: p.clinicianPlanId } });
      if (plan) {
        // اعتبار اشتراک از لحظه‌ی پرداخت محاسبه می‌شود، نه از لحظه‌ی ساخت سفارش
        const def = clinicianPlan(plan.kind);
        if (def?.durationDays) {
          await db.clinicianTestPlan.update({
            where: { id: plan.id },
            data: { expiresAt: new Date(Date.now() + def.durationDays * 24 * 60 * 60 * 1000) },
          });
        }
        notifyLater(p.userId, {
          title: "بسته‌ی تست شما فعال شد",
          body: `${planTitle(plan.kind)} با موفقیت به حساب متخصص شما اضافه شد. اکنون می‌توانید تستها را برای مراجعان خود اجرا کنید.`,
          url: "/panel/tests",
        });
      }
    }
    return;
  }
  if (!p.appointmentId) return;
  const a = await db.appointment.findUnique({ where: { id: p.appointmentId } });
  if (!a) return;
  if (a.status === "PENDING_PAYMENT") {
    await db.appointment.update({ where: { id: a.id }, data: { status: "CONFIRMED" } });
    await notifyAppointmentConfirmed(a.id);
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
    if (!clash) await notifyAppointmentConfirmed(a.id);
  }
}

/** صفحه‌ای که کاربر پس از پرداخت موفق به آن می‌رود */
export async function afterPaymentPath(payment: {
  appointmentId: string | null;
  enrollmentId: string | null;
  testPurchaseId?: string | null;
  clinicianPlanId?: string | null;
}) {
  if (payment.clinicianPlanId) return "/panel/tests?purchased=1";
  if (payment.testPurchaseId) {
    const t = await db.testPurchase.findUnique({ where: { id: payment.testPurchaseId } });
    return t ? `/tests/${t.testSlug}?paid=1` : "/tests";
  }
  if (payment.enrollmentId) {
    const e = await db.enrollment.findUnique({ where: { id: payment.enrollmentId }, include: { course: true } });
    if (e) return `/academy/${e.course.slug}?enrolled=1`;
    return "/my-courses";
  }
  return `/appointments?paid=${payment.appointmentId}`;
}
