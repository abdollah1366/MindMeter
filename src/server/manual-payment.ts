"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { notifyLater } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { activateEnrollment } from "@/lib/academy-server";

export type ManualPaymentState = { error?: string; ok?: boolean };

export async function submitManualPaymentTicket(
  _: ManualPaymentState,
  form: FormData,
): Promise<ManualPaymentState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const paymentId = String(form.get("paymentId") ?? "").trim();
  const reference = String(form.get("reference") ?? "").trim().slice(0, 60);
  const body = String(form.get("body") ?? "").trim();

  const payment = paymentId ? await db.payment.findUnique({ where: { id: paymentId } }) : null;
  if (payment && payment.userId !== user.id) return { error: "پرداخت معتبر نیست." };

  const amount = payment ? payment.amount : 0;
  const subject = payment
    ? `پرداخت دستی - ${payment.id.slice(0, 8)}`
    : "پرداخت دستی";
  const message =
    `پرداخت به شماره کارت 6037997595607244 به نام عبدالله براتی انجام شد.\n` +
    (payment ? `مبلغ: ${amount.toLocaleString("fa-IR")} تومان\nشناسه پرداخت: ${payment.id}\n` : "") +
    (reference ? `شماره پیگیری/رسید: ${reference}\n` : "") +
    (body ? `\nتوضیحات: ${body}` : "");

  const ticket = await db.ticket.create({
    data: {
      topic: "customers",
      subject: subject.slice(0, 150),
      priority: "NORMAL",
      userId: user.id,
      paymentId: payment?.id ?? null,
      messages: { create: { userId: user.id, body: message.slice(0, 4000), isStaff: false } },
    },
  });

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const a of admins) notifyLater(a.id, { title: "درخواست پرداخت دستی", body: subject, url: `/admin/tickets/${ticket.id}` });

  await audit(user.id, "payment.manual_request", { targetType: "Ticket", targetId: ticket.id, meta: { paymentId } });
  revalidatePath("/tickets");
  revalidatePath("/admin/tickets");
  redirect(`/tickets/${ticket.id}?created=1`);
}

export type ConfirmPaymentState = { error?: string; ok?: boolean };

export async function confirmManualPayment(
  _: ConfirmPaymentState,
  form: FormData,
): Promise<ConfirmPaymentState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return { error: "دسترسی ندارید." };

  const ticketId = String(form.get("ticketId") ?? "");
  const ticket = await db.ticket.findUnique({ where: { id: ticketId }, include: { user: true } });
  if (!ticket || !ticket.paymentId) return { error: "پرداخت مرتبط یافت نشد." };

  const payment = await db.payment.findUnique({
    where: { id: ticket.paymentId },
    include: { testPurchase: true, clinicianPlan: true, enrollment: true, appointment: true },
  });
  if (!payment) return { error: "پرداخت یافت نشد." };
  if (payment.status === "PAID") return { error: "این پرداخت قبلاً تأیید شده است." };

  // فعال‌سازی مرتبط
  await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: new Date() } });

    if (payment.testPurchase) {
      await tx.testPurchase.update({ where: { id: payment.testPurchase.id }, data: { status: "PAID", paidAt: new Date() } });
    }
    if (payment.clinicianPlan) {
      await tx.clinicianTestPlan.update({ where: { id: payment.clinicianPlan.id }, data: { status: "ACTIVE" } });
    }
    if (payment.enrollment) {
      // activateEnrollment خارج از tx است؛ اینجا مستقیم
      await tx.enrollment.update({ where: { id: payment.enrollment.id }, data: { status: "ACTIVE" } });
    }
    if (payment.appointment) {
      await tx.appointment.update({ where: { id: payment.appointment.id }, data: { status: "CONFIRMED" } });
    }

    await tx.ticketMessage.create({
      data: { ticketId: ticket.id, userId: admin.id, body: "پرداخت دستی تأیید شد و مراحل بعدی فعال گردید.", isStaff: true },
    });
    await tx.ticket.update({ where: { id: ticket.id }, data: { status: "ANSWERED" } });
  });

  // activateEnrollment side effects (certificate etc.) — call if enrollment
  if (payment.enrollment) {
    try { await activateEnrollment(payment.enrollment.id); } catch { /* ignore */ }
  }

  notifyLater(ticket.userId, { title: "پرداخت تأیید شد", body: "پرداخت شما تأیید شد و حساب/خرید شما فعال گردید.", url: `/tickets/${ticket.id}`, sms: true });
  await audit(admin.id, "payment.manual_confirm", { targetType: "Payment", targetId: payment.id, meta: { ticketId } });

  revalidatePath(`/admin/tickets/${ticket.id}`);
  revalidatePath("/admin/tickets");
  return { ok: true };
}
