"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { clinicianPlan } from "@/lib/clinician-plans";
import { paymentProvider } from "@/lib/zarinpal";

/** خرید بسته‌ی اعتبار تست توسط متخصص تأییدشده. مبلغ همیشه از ثابت سرور خوانده میشود. */
export async function buyClinicianPlan(form: FormData) {
  const kind = String(form.get("kind") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/panel/tests`);

  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.status !== "APPROVED") redirect("/clinician/apply");

  const def = clinicianPlan(kind);
  if (!def) redirect("/panel/tests");

  // سفارش ناتمام همان بسته دوباره 사용 شود تا سفارشهای متروک انباشته نشود
  const pending = await db.clinicianTestPlan.findFirst({
    where: { clinicianId: profile.id, kind, status: "PENDING_PAYMENT" },
    include: { payments: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  if (pending?.payments[0]) redirect(`/pay/${pending.payments[0].id}`);

  const expiresAt = def.durationDays ? new Date(Date.now() + def.durationDays * 24 * 60 * 60 * 1000) : null;
  const currentUser = await db.user.findUnique({ where: { id: user.id }, select: { creditBalance: true } });
  if (currentUser && currentUser.creditBalance >= def.amount) {
    const plan = await db.clinicianTestPlan.create({
      data: {
        clinicianId: profile.id,
        kind: def.kind,
        totalTests: def.totalTests,
        amount: def.amount,
        expiresAt,
        status: "ACTIVE",
      },
    });
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { creditBalance: { decrement: def.amount } } }),
      db.creditTransaction.create({ data: { userId: user.id, amount: -def.amount, kind: "SPEND_PLAN", sourceId: plan.id, note: `خرید بسته ${def.title}` } }),
    ]);
    revalidatePath("/panel/tests");
    redirect("/panel/tests");
  }

  const plan = await db.clinicianTestPlan.create({
    data: {
      clinicianId: profile.id,
      kind: def.kind,
      totalTests: def.totalTests,
      amount: def.amount,
      expiresAt,
      status: "PENDING_PAYMENT",
    },
  });
  const payment = await db.payment.create({
    data: {
      userId: user.id,
      clinicianPlanId: plan.id,
      amount: def.amount,
      provider: "MANUAL",
      description: `بسته تست متخصص - ${def.title}`.slice(0, 250),
    },
  });

  redirect(`/pay/${payment.id}`);
}
