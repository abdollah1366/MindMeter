"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { notifyLater } from "@/lib/notify";
import { audit } from "@/lib/audit";

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
