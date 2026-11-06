import "server-only";
import { db } from "@/lib/db";
import { getTest, tests } from "@/data/tests";

/** تنظیمات ادمین (فعال/غیرفعال، پرطرفدار) روی تست‌های تعریف‌شده در کد اعمال می‌شود */
async function settings() {
  const rows = await db.testSetting.findMany();
  return new Map(rows.map((r) => [r.slug, r]));
}

export async function getVisibleTests() {
  const s = await settings();
  // تست‌های محدود (مجوزدار) فقط با لینک مستقیم در دسترس‌اند
  return tests.filter((t) => !t.restricted && s.get(t.slug)?.enabled !== false);
}

export async function getFeaturedVisibleTests() {
  const s = await settings();
  return tests.filter((t) => {
    const row = s.get(t.slug);
    return !t.restricted && row?.enabled !== false && (row?.featured ?? t.featured);
  });
}

export async function getVisibleTest(slug: string) {
  const test = getTest(slug);
  if (!test) return undefined;
  const row = await db.testSetting.findUnique({ where: { slug } });
  return row?.enabled === false ? undefined : test;
}

export async function getTestSettingsMap() {
  return settings();
}
