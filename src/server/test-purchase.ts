"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getVisibleTest } from "@/lib/tests-service";
import { paymentProvider } from "@/lib/zarinpal";
import { availablePurchase, testPrice } from "@/lib/test-pricing";

/** خرید یک بار اجرای تست پولی: ساخت خرید و پرداخت و رفتن به صفحه‌ی پرداخت */
export async function buyTest(form: FormData) {
  const slug = String(form.get("slug") ?? "");
  const back = `/tests/${slug}`;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);
  const test = await getVisibleTest(slug);
  if (!test) redirect("/tests");
  const price = await testPrice(slug);
  if (price <= 0 || (await availablePurchase(user.id, slug))) redirect(back);

  // پرداخت نیمه‌کاره‌ی قبلی با همین مبلغ دوباره استفاده شود
  const pending = await db.payment.findFirst({
    where: { userId: user.id, status: "PENDING", amount: price, testPurchase: { testSlug: slug, status: "PENDING_PAYMENT" } },
  });
  if (pending) redirect(`/pay/${pending.id}`);

  const purchase = await db.testPurchase.create({ data: { userId: user.id, testSlug: slug, amount: price } });
  const payment = await db.payment.create({
    data: {
      userId: user.id,
      testPurchaseId: purchase.id,
      amount: price,
      provider: paymentProvider(),
      description: `آزمون ${test.code} - ${test.title}`.slice(0, 250),
    },
  });
  redirect(`/pay/${payment.id}`);
}
