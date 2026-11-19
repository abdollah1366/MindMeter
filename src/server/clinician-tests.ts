"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAccess } from "@/lib/auth/guards";
import { getVisibleTest } from "@/lib/tests-service";
import { alertsFor, isComplete, scoreTest, type Answers } from "@/lib/scoring";
import { planUsable, sortPlansForUse } from "@/lib/clinician-plans";
import { audit } from "@/lib/audit";
import { notifyLater } from "@/lib/notify";

export type ClinicianSaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: "auth" | "invalid" | "access" | "credit" };

/** متخصص تأییدشده با مراجع و تست مشخص، اجرای یک تست جدید را آغاز می‌کند */
export async function startClinicianTest(form: FormData) {
  const patientId = String(form.get("patientId") ?? "");
  const slug = String(form.get("testSlug") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/panel/tests");

  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.status !== "APPROVED") redirect("/clinician/apply");
  if (!(await hasAccess(profile.id, patientId))) redirect("/panel/tests");
  const test = await getVisibleTest(slug);
  if (!test) redirect("/panel/tests");

  const plans = await db.clinicianTestPlan.findMany({ where: { clinicianId: profile.id } });
  if (!sortPlansForUse(plans).some((p) => planUsable(p))) redirect("/panel/tests?nocredit=1");

  const run = await db.clinicianTestRun.create({ data: { clinicianId: profile.id, patientId, testSlug: slug } });
  redirect(`/panel/tests/run/${slug}?run=${run.id}`);
}

/**
 * ذخیره‌ی نتیجه در پرونده‌ی مراجع و مصرف اتمیک یک اعتبار.
 * اعتبار تنها زمانی مصرف می‌شود که تست کامل شده و نتیجه ثبت شود؛
 * در صورت هر شکست تراکنش، اعتبار برگردانده می‌شود.
 */
export async function saveClinicianTestResult(runId: string, slug: string, answers: Answers): Promise<ClinicianSaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "auth" };
  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.status !== "APPROVED") return { ok: false, reason: "auth" };

  const run = await db.clinicianTestRun.findUnique({ where: { id: runId } });
  if (!run || run.clinicianId !== profile.id || run.testSlug !== slug || run.resultId || run.status !== "PENDING") {
    return { ok: false, reason: "invalid" };
  }
  if (!(await hasAccess(profile.id, run.patientId))) return { ok: false, reason: "access" };

  const test = await getVisibleTest(slug);
  if (!test || !isComplete(test, answers)) return { ok: false, reason: "invalid" };

  // فقط پاسخ سؤال‌های همین تست و زمان واکنش استروب نگه داشته می‌شود
  const clean: Answers = {};
  for (const q of test.questions) {
    if (answers[q.id] !== undefined) clean[q.id] = answers[q.id];
    const rt = answers[`rt_${q.id}`];
    if (typeof rt === "number" && Number.isFinite(rt)) clean[`rt_${q.id}`] = rt;
  }
  const now = new Date();

  let resultId: string | null;
  try {
    resultId = await db.$transaction(async (tx) => {
      await tx.clinicianTestPlan.updateMany({
        where: { clinicianId: profile.id, status: "ACTIVE", expiresAt: { lt: now } },
        data: { status: "EXPIRED" },
      });
      const plans = sortPlansForUse(
        await tx.clinicianTestPlan.findMany({ where: { clinicianId: profile.id, status: "ACTIVE" } }),
      );
      for (const plan of plans) {
        if (!planUsable(plan, now)) continue;
        // قفل خوش‌بینانه: اگر اعتبار توسط اجرای دیگری مصرف شده باشد، سراغ بسته بعدی می‌رویم
        const claimed = await tx.clinicianTestPlan.updateMany({
          where: {
            id: plan.id,
            status: "ACTIVE",
            usedTests: plan.usedTests,
            ...(plan.expiresAt ? { expiresAt: { gt: now } } : { expiresAt: null }),
          },
          data: { usedTests: { increment: 1 } },
        });
        if (!claimed.count) continue;

        const result = await tx.testResult.create({
          data: {
            userId: run.patientId,
            testSlug: slug,
            answers: JSON.stringify(clean),
            scores: JSON.stringify(scoreTest(test, clean)),
            alerts: JSON.stringify(alertsFor(test, clean)),
          },
        });
        const linked = await tx.clinicianTestRun.updateMany({
          where: { id: run.id, resultId: null, status: "PENDING" },
          data: { resultId: result.id, planId: plan.id, status: "DONE", completedAt: now },
        });
        if (!linked.count) throw new Error("run-already-completed");
        if (plan.totalTests !== null && plan.usedTests + 1 >= plan.totalTests) {
          await tx.clinicianTestPlan.update({ where: { id: plan.id }, data: { status: "EXHAUSTED" } });
        }
        return result.id;
      }
      return null;
    });
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (!resultId) return { ok: false, reason: "credit" };

  await audit(user.id, "test.run", {
    targetType: "TestResult",
    targetId: resultId,
    patientId: run.patientId,
    meta: { test: slug },
  });
  notifyLater(run.patientId, {
    title: "نتیجه‌ی تست در پرونده‌ی شما ثبت شد",
    body: `${test.title} توسط متخصص شما اجرا و نتیجه‌ی آن در پرونده‌ی شما ذخیره شد.`,
    url: `/reports/${resultId}`,
  });
  revalidatePath("/panel/tests");
  revalidatePath(`/panel/patients/${run.patientId}`);
  revalidatePath(`/reports/${resultId}`);
  return { ok: true, id: resultId };
}

/** تفسیر کتبی متخصص بر نتیجه؛ در گزارش رسمی و برای مراجع نمایش داده می‌شود */
export async function saveResultInterpretation(form: FormData) {
  const resultId = String(form.get("resultId") ?? "");
  const body = String(form.get("body") ?? "").trim();
  const user = await getCurrentUser();
  if (!user || body.length < 1 || body.length > 5000) return;

  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.status !== "APPROVED") return;
  const result = await db.testResult.findUnique({ where: { id: resultId } });
  if (!result || !(await hasAccess(profile.id, result.userId))) return;

  // تفسیر ثبت‌شده توسط متخصص دیگر بازنویسی نمی‌شود
  const existing = await db.resultInterpretation.findUnique({ where: { resultId } });
  if (existing && existing.clinicianId !== profile.id) return;

  await db.resultInterpretation.upsert({
    where: { resultId },
    create: { resultId, clinicianId: profile.id, body },
    update: { body, clinicianId: profile.id },
  });
  await audit(user.id, "interpretation.save", { targetType: "TestResult", targetId: resultId, patientId: result.userId });
  notifyLater(result.userId, {
    title: "تفسیر متخصص بر نتیجه‌ی تست",
    body: "متخصص شما تفسیر نتیجه‌ی تست را در پرونده‌ی شما ثبت کرد.",
    url: `/reports/${resultId}`,
  });
  revalidatePath(`/reports/${resultId}`);
  revalidatePath(`/panel/patients/${result.userId}`);
}

/** حذف تفسیر توسط همان متخصصی که آن را نوشته است */
export async function removeResultInterpretation(form: FormData) {
  const resultId = String(form.get("resultId") ?? "");
  const user = await getCurrentUser();
  if (!user) return;
  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.status !== "APPROVED") return;
  const interpretation = await db.resultInterpretation.findUnique({ where: { resultId } });
  if (!interpretation || interpretation.clinicianId !== profile.id) return;
  await db.resultInterpretation.delete({ where: { resultId } });
  revalidatePath(`/reports/${resultId}`);
}
