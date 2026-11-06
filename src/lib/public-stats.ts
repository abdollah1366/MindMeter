import "server-only";
import { db } from "./db";

/**
 * آمار عمومی سایت (تعداد انجام هر تست، کاربران، متخصصان).
 * نتیجه برای چند دقیقه در حافظه نگه داشته می‌شود تا هر بازدید یک کوئری گروهی نزند.
 */
const TTL_MS = 5 * 60 * 1000;

export type SiteStats = {
  /** تعداد انجام هر تست بر اساس slug (شامل مهمان‌ها) */
  byTest: Record<string, number>;
  totalCompleted: number;
  users: number;
  clinicians: number;
};

const g = globalThis as unknown as { __siteStats?: { at: number; data: Promise<SiteStats> } };

async function load(): Promise<SiteStats> {
  const [events, results, users, clinicians] = await Promise.all([
    db.pageView.groupBy({ by: ["ref"], where: { kind: "test_complete", ref: { not: null } }, _count: { _all: true } }),
    db.testResult.groupBy({ by: ["testSlug"], _count: { _all: true } }),
    db.user.count(),
    db.clinicianProfile.count({ where: { status: "APPROVED" } }),
  ]);
  const byTest: Record<string, number> = {};
  // رویداد «اتمام تست» مهمان‌ها را هم می‌شمارد؛ نتایج ذخیره‌شده پیش از راه‌اندازی آمار هم ثبت شده‌اند. بیشینه‌ی این دو گزارش می‌شود.
  for (const e of events) if (e.ref) byTest[e.ref] = e._count._all;
  for (const r of results) byTest[r.testSlug] = Math.max(byTest[r.testSlug] ?? 0, r._count._all);
  const totalCompleted = Object.values(byTest).reduce((s, n) => s + n, 0);
  return { byTest, totalCompleted, users, clinicians };
}

export function getSiteStats(): Promise<SiteStats> {
  const c = g.__siteStats;
  if (c && Date.now() - c.at < TTL_MS) return c.data;
  const data = load().catch(() => ({ byTest: {}, totalCompleted: 0, users: 0, clinicians: 0 }));
  g.__siteStats = { at: Date.now(), data };
  return data;
}
