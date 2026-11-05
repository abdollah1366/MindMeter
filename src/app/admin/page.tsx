import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTest } from "@/data/tests";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "داشبورد مدیریت" };

const DAY = 24 * 60 * 60 * 1000;

export default async function AdminDashboard() {
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY);
  const since30 = new Date(now - 30 * DAY);

  const [users, users7, results, results7, pending, approved, articles, alerts, byTest, recent] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since7 } } }),
    db.testResult.count(),
    db.testResult.count({ where: { createdAt: { gte: since7 } } }),
    db.clinicianProfile.count({ where: { status: "PENDING" } }),
    db.clinicianProfile.count({ where: { status: "APPROVED" } }),
    db.article.count({ where: { status: "PUBLISHED" } }),
    db.testResult.count({ where: { alerts: { not: "[]" }, createdAt: { gte: since30 } } }),
    db.testResult.groupBy({ by: ["testSlug"], _count: { _all: true }, orderBy: { _count: { testSlug: "desc" } } }),
    db.testResult.findMany({ where: { createdAt: { gte: new Date(now - 14 * DAY) } }, select: { createdAt: true } }),
  ]);

  // تست‌های انجام‌شده در ۱۴ روز اخیر به تفکیک روز
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * DAY);
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString("fa-IR", { day: "numeric", month: "short" }), count: 0 };
  });
  for (const r of recent) {
    const day = days.find((d) => d.key === r.createdAt.toISOString().slice(0, 10));
    if (day) day.count++;
  }
  const peak = Math.max(1, ...days.map((d) => d.count));
  const topMax = Math.max(1, ...byTest.map((t) => t._count._all));

  const cards = [
    { label: "کاربران", value: users, sub: `${toPersianDigits(users7)} نفر در ۷ روز اخیر` },
    { label: "تست‌های انجام‌شده", value: results, sub: `${toPersianDigits(results7)} مورد در ۷ روز اخیر` },
    { label: "متخصصان تأییدشده", value: approved, sub: pending ? `${toPersianDigits(pending)} درخواست در انتظار` : "درخواست جدیدی نیست", href: "/admin/clinicians" },
    { label: "مقاله‌های منتشرشده", value: articles, sub: "مدیریت وبلاگ", href: "/admin/blog" },
  ];

  return (
    <>
      <h1 className="text-2xl font-extrabold">داشبورد</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const inner = (
            <>
              <p className="text-sm text-slate-500">{c.label}</p>
              <p className="mt-1 text-3xl font-extrabold text-brand-700">{toPersianDigits(c.value)}</p>
              <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-400">{inner}</Link>
          ) : (
            <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">{inner}</div>
          );
        })}
      </div>

      {alerts > 0 && (
        <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
          ⚠ در ۳۰ روز اخیر {toPersianDigits(alerts)} نتیجه با هشدار ایمنی (افکار آسیب به خود) ثبت شده است.
        </p>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">تست‌های انجام‌شده در ۱۴ روز اخیر</h2>
          <div className="mt-5 flex h-40 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.key} className="group flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100">{toPersianDigits(d.count)}</span>
                <div className="w-full rounded-t-md bg-brand-400" style={{ height: `${(d.count / peak) * 120}px`, minHeight: d.count ? 4 : 1 }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>{days[0].label}</span>
            <span>{days.at(-1)!.label}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">پرطرفدارترین تست‌ها</h2>
          {byTest.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">هنوز تستی انجام نشده است.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {byTest.slice(0, 8).map((t) => (
                <li key={t.testSlug} className="text-sm">
                  <div className="flex justify-between">
                    <span>{getTest(t.testSlug)?.code ?? t.testSlug}</span>
                    <span className="text-slate-500">{toPersianDigits(t._count._all)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-calm-500" style={{ width: `${(t._count._all / topMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
