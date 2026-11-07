"use server";

import { availablePurchase, testPrice } from "@/lib/test-pricing";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { getVisibleTest } from "@/lib/tests-service";
import { alertsFor, isComplete, scoreTest, type Answers } from "@/lib/scoring";

export type SaveResult = { ok: true; id: string } | { ok: false; reason: "auth" | "invalid" | "payment" };

/** ذخیره‌ی نتیجه در پرونده‌ی کاربر. امتیاز در سرور دوباره محاسبه می‌شود. */
export async function saveTestResult(slug: string, answers: Answers): Promise<SaveResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, reason: "auth" };

  const test = await getVisibleTest(slug);
  if (!test || !isComplete(test, answers)) return { ok: false, reason: "invalid" };

  // تست پولی: فقط با یک خرید پرداخت‌شده و استفاده‌نشده
  // خرید پیش از ذخیره «مصرف» می‌شود تا با یک پرداخت دو نتیجه ثبت نشود
  let purchaseId: string | null = null;
  if ((await testPrice(slug)) > 0) {
    const purchase = await availablePurchase(userId, slug);
    const claimed = purchase
      ? await db.testPurchase.updateMany({ where: { id: purchase.id, status: "PAID" }, data: { status: "USED", usedAt: new Date() } })
      : { count: 0 };
    if (!claimed.count) return { ok: false, reason: "payment" };
    purchaseId = purchase!.id;
  }

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
  if (purchaseId) await db.testPurchase.update({ where: { id: purchaseId }, data: { resultId: result.id } });
  return { ok: true, id: result.id };
}
