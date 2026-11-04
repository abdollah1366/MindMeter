"use server";

import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { getVisibleTest } from "@/lib/tests-service";
import { alertsFor, isComplete, scoreTest, type Answers } from "@/lib/scoring";

export type SaveResult = { ok: true; id: string } | { ok: false; reason: "auth" | "invalid" };

/** ذخیره‌ی نتیجه در پرونده‌ی کاربر. امتیاز در سرور دوباره محاسبه می‌شود. */
export async function saveTestResult(slug: string, answers: Answers): Promise<SaveResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, reason: "auth" };

  const test = await getVisibleTest(slug);
  if (!test || !isComplete(test, answers)) return { ok: false, reason: "invalid" };

  // فقط پاسخ سؤال‌های همین تست ذخیره شود
  const clean: Answers = Object.fromEntries(test.questions.map((q) => [q.id, answers[q.id]]));
  const result = await db.testResult.create({
    data: {
      userId,
      testSlug: slug,
      answers: JSON.stringify(clean),
      scores: JSON.stringify(scoreTest(test, clean)),
      alerts: JSON.stringify(alertsFor(test, clean)),
    },
  });
  return { ok: true, id: result.id };
}
