"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAccess } from "@/lib/auth/guards";

export type ReferralState = { error?: string };

/** درخواست مشاوره توسط بیمار (معمولاً بعد از یک تست) */
export async function requestReferral(_: ReferralState, form: FormData): Promise<ReferralState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/referral/new");
  const reason = String(form.get("reason") ?? "").trim();
  const preferredKind = String(form.get("preferredKind") ?? "ANY");
  const resultId = String(form.get("resultId") ?? "") || null;
  const toClinicianId = String(form.get("toClinicianId") ?? "") || null;

  if (reason.length < 10) return { error: "لطفاً کمی بیشتر درباره‌ی دلیل مراجعه بنویسید (حداقل ۱۰ حرف)." };
  if (!["ANY", "PSYCHOLOGIST", "PHYSICIAN"].includes(preferredKind)) return { error: "نوع متخصص معتبر نیست." };
  if (resultId) {
    const r = await db.testResult.findUnique({ where: { id: resultId } });
    if (!r || r.userId !== user.id) return { error: "نتیجه‌ی تست معتبر نیست." };
  }
  if (toClinicianId) {
    const c = await db.clinicianProfile.findUnique({ where: { id: toClinicianId } });
    if (!c || c.status !== "APPROVED") return { error: "متخصص انتخاب‌شده معتبر نیست." };
  }

  await db.referral.create({
    data: { patientId: user.id, reason: reason.slice(0, 2000), preferredKind, resultId, toClinicianId },
  });
  redirect("/appointments?referral=1");
}

/** ارجاع بیمار توسط یک متخصص به متخصص دیگر */
export async function referToClinician(form: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const from = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  const patientId = String(form.get("patientId") ?? "");
  const toClinicianId = String(form.get("toClinicianId") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  if (!from || from.status !== "APPROVED" || !(await hasAccess(from.id, patientId))) return;
  if (toClinicianId === from.id || reason.length < 5) return;
  const to = await db.clinicianProfile.findUnique({ where: { id: toClinicianId } });
  if (!to || to.status !== "APPROVED") return;

  await db.referral.create({
    data: { patientId, fromClinicianId: from.id, toClinicianId, reason: reason.slice(0, 2000), preferredKind: to.kind },
  });
  revalidatePath(`/panel/patients/${patientId}`);
}

/** پذیرش یا رد ارجاع توسط متخصص. با پذیرش، متخصص به پرونده‌ی بیمار دسترسی پیدا می‌کند. */
export async function respondReferral(form: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const me = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (!me || me.status !== "APPROVED") return;

  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;
  const ref = await db.referral.findUnique({ where: { id } });
  if (!ref || ref.status !== "NEW") return;
  // ارجاع عمومی را هر متخصصی می‌تواند بپذیرد؛ ارجاع مستقیم فقط توسط متخصص مقصد
  if (ref.toClinicianId && ref.toClinicianId !== me.id) return;
  if (!ref.toClinicianId && decision === "DECLINED") return;

  if (decision === "ACCEPTED") {
    await db.$transaction([
      db.referral.update({ where: { id }, data: { status: "ACCEPTED", toClinicianId: me.id, responseNote: note } }),
      db.accessGrant.upsert({
        where: { patientId_clinicianId: { patientId: ref.patientId, clinicianId: me.id } },
        create: { patientId: ref.patientId, clinicianId: me.id },
        update: { revokedAt: null },
      }),
    ]);
  } else if (decision === "DECLINED") {
    await db.referral.update({ where: { id }, data: { status: "DECLINED", responseNote: note } });
  }
  revalidatePath("/panel/referrals");
}

/** بستن درخواست توسط بیمار */
export async function closeReferral(form: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.referral.updateMany({
    where: { id: String(form.get("id") ?? ""), patientId: user.id, status: { in: ["NEW", "ACCEPTED"] } },
    data: { status: "CLOSED" },
  });
  revalidatePath("/appointments");
}
