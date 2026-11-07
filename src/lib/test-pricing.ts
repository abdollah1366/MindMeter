import "server-only";
import { db } from "@/lib/db";

/** قیمت فعلی هر بار اجرای تست به تومان (۰ = رایگان) */
export async function testPrice(slug: string) {
  const row = await db.testSetting.findUnique({ where: { slug }, select: { price: true } });
  return row?.price ?? 0;
}

/** قیمت همه‌ی تست‌هایی که قیمت دارند */
export async function testPrices(): Promise<Record<string, number>> {
  const rows = await db.testSetting.findMany({ where: { price: { gt: 0 } }, select: { slug: true, price: true } });
  return Object.fromEntries(rows.map((r) => [r.slug, r.price]));
}

/** خرید پرداخت‌شده و استفاده‌نشده‌ی کاربر برای این تست */
export function availablePurchase(userId: string, slug: string) {
  return db.testPurchase.findFirst({ where: { userId, testSlug: slug, status: "PAID" }, orderBy: { paidAt: "asc" } });
}
