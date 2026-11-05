import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTest } from "@/data/tests";
import { sourceLabel } from "@/lib/analytics";
import { formatToman, tehranMidnight } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "آمار سایت" };
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;
const DAY = 86400_000;
const DEVICE: Record<string, string> = { mobile: "موبایل", desktop: "دسکتاپ", tablet: "تبلت" };

type Props = { searchParams: Promise<{ days?: string }> };

function pct(a: number, b: number) {
  return b ? `${toPersianDigits(Math.round((a / b) * 100))}٪` : "-";
}

function Bars({ rows, color = "bg-brand-500" }: { rows: { label: string; value: number; sub?: string }[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="mt-3 text-sm text-slate-400">داده‌ای ثبت نشده است.</p>;
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="truncate" dir="auto">{r.label}</span>
            <span className="shrink-0 text-slate-500">
              {toPersianDigits(r.value)}
              {r.sub && <span className="ms-1 text-xs text-slate-400">{r.sub}</span>}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const raw = Number((await searchParams).days);
  const days = (RANGES as readonly number[]).includes(raw) ? raw : 30;
  const since = tehranMidnight(new Date(), -(days - 1));
  const prevSince = new Date(since.getTime() - days * DAY);
  const inRange = { gte: since };

  const [views, prevViews, visitors, prevVisitors, daily, pages, refs, devices, sources, funnel, users, results, enrolls, payments] = await Promise.all([
    db.pageView.count({ where: { kind: "view", createdAt: inRange } }),
    db.pageView.count({ where: { kind: "view", createdAt: { gte: prevSince, lt: since } } }),
    db.pageView.groupBy({ by: ["visitor"], where: { kind: "view", createdAt: inRange } }),
    db.pageView.groupBy({ by: ["visitor"], where: { kind: "view", createdAt: { gte: prevSince, lt: since } } }),
    db.pageView.findMany({ where: { kind: "view", createdAt: inRange }, select: { createdAt: true, visitor: true } }),
    db.pageView.groupBy({ by: ["path"], where: { kind: "view", createdAt: inRange }, _count: { _all: true }, orderBy: { _count: { path: "desc" } }, take: 15 }),
    db.pageView.groupBy({ by: ["referrer"], where: { kind: "view", createdAt: inRange }, _count: { _all: true }, orderBy: { _count: { referrer: "desc" } }, take: 10 }),
    db.pageView.groupBy({ by: ["device"], where: { kind: "view", createdAt: inRange }, _count: { _all: true } }),
    db.pageView.groupBy({ by: ["source"], where: { kind: "view", createdAt: inRange, source: { not: null } }, _count: { _all: true }, orderBy: { _count: { source: "desc" } }, take: 8 }),
    db.pageView.groupBy({ by: ["kind", "ref"], where: { kind: { in: ["test_start", "test_complete"] }, createdAt: inRange }, _count: { _all: true } }),
    db.user.count({ where: { createdAt: inRange } }),
    db.testResult.count({ where: { createdAt: inRange } }),
    db.enrollment.count({ where: { status: "ACTIVE", activatedAt: inRange } }),
    db.payment.findMany({ where: { status: "PAID", paidAt: inRange }, select: { amount: true, enrollmentId: true } }),
  ]);

  // نمودار روزانه به وقت تهران
  const buckets = Array.from({ length: days }, (_, i) => {
    const start = new Date(since.getTime() + i * DAY);
    return { start: start.getTime(), label: start.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", month: "short", day: "numeric" }), views: 0, visitors: new Set<string>() };
  });
  for (const v of daily) {
    const b = buckets[Math.floor((v.createdAt.getTime() - since.getTime()) / DAY)];
    if (b) {
      b.views++;
      b.visitors.add(v.visitor);
    }
  }
  const peak = Math.max(1, ...buckets.map((b) => b.views));

  const tests = new Map<string, { start: number; done: number }>();
  for (const f of funnel) {
    if (!f.ref) continue;
    const t = tests.get(f.ref) ?? { start: 0, done: 0 };
    if (f.kind === "test_start") t.start += f._count._all;
    else t.done += f._count._all;
    tests.set(f.ref, t);
  }
  const testRows = [...tests.entries()].sort((a, b) => b[1].start - a[1].start).slice(0, 12);
  const starts = testRows.reduce((s, [, t]) => s + t.start, 0);
  const completes = testRows.reduce((s, [, t]) => s + t.done, 0);

  const revenueVisits = payments.filter((p) => !p.enrollmentId).reduce((s, p) => s + p.amount, 0);
  const revenueAcademy = payments.filter((p) => p.enrollmentId).reduce((s, p) => s + p.amount, 0);
  const trend = (a: number, b: number) => (b ? `${a >= b ? "▲" : "▼"} ${toPersianDigits(Math.abs(Math.round(((a - b) / b) * 100)))}٪ نسبت به دوره‌ی قبل` : "دوره‌ی قبل داده‌ای ندارد");

  const cards = [
    { label: "بازدید صفحه", value: toPersianDigits(views), sub: trend(views, prevViews) },
    { label: "بازدیدکننده (یکتای روزانه)", value: toPersianDigits(visitors.length), sub: trend(visitors.length, prevVisitors.length) },
    { label: "صفحه به ازای هر بازدیدکننده", value: visitors.length ? (views / visitors.length).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) : "-", sub: "میانگین" },
    { label: "نرخ تکمیل تست‌ها", value: pct(completes, starts), sub: `${toPersianDigits(completes)} تکمیل از ${toPersianDigits(starts)} شروع` },
    { label: "ثبت‌نام کاربر جدید", value: toPersianDigits(users), sub: users <= visitors.length ? `نرخ تبدیل ${pct(users, visitors.length)} از بازدیدکنندگان` : "کاربران جدید در این بازه" },
    { label: "نتیجه‌ی ذخیره‌شده در پرونده", value: toPersianDigits(results), sub: "کاربران واردشده" },
    { label: "ثبت‌نام در آکادمی", value: toPersianDigits(enrolls), sub: `فروش ${formatToman(revenueAcademy)}` },
    { label: "درآمد ویزیت", value: formatToman(revenueVisits), sub: `کل درآمد ${formatToman(revenueVisits + revenueAcademy)}` },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">آمار سایت</h1>
          <p className="mt-1 text-xs text-slate-500">بدون کوکی و بدون ذخیره‌ی IP؛ ربات‌ها، صفحه‌های مدیریت و درخواست‌های «Do Not Track» شمرده نمی‌شوند.</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-white p-1 text-sm">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin/analytics?days=${r}`} className={`rounded-lg px-3 py-1.5 ${r === days ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              {toPersianDigits(r)} روز
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-700">{c.value}</p>
            <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">بازدید روزانه</h2>
        <div className="mt-5 flex h-44 items-end gap-[3px]">
          {buckets.map((b) => (
            <div key={b.start} className="group relative flex flex-1 flex-col items-center justify-end" title={`${b.label}: ${b.views} بازدید، ${b.visitors.size} بازدیدکننده`}>
              <div className="w-full rounded-t bg-brand-300" style={{ height: `${(b.views / peak) * 150}px`, minHeight: b.views ? 3 : 1 }}>
                <div className="w-full rounded-t bg-brand-600" style={{ height: `${b.views ? (b.visitors.size / b.views) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>{buckets[0].label}</span>
          <span>{buckets.at(-1)!.label}</span>
        </div>
        <p className="mt-2 flex gap-4 text-xs text-slate-500">
          <span><span className="inline-block h-2 w-2 rounded-sm bg-brand-300" /> بازدید</span>
          <span><span className="inline-block h-2 w-2 rounded-sm bg-brand-600" /> بازدیدکننده</span>
        </p>
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">پربازدیدترین صفحه‌ها</h2>
          <Bars rows={pages.map((p) => ({ label: decodeURIComponent(p.path), value: p._count._all }))} />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">منبع ورود</h2>
          <Bars color="bg-calm-500" rows={refs.map((r) => ({ label: sourceLabel(r.referrer), value: r._count._all }))} />
          {sources.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-bold text-slate-600">کمپین‌ها (utm_source)</h3>
              <Bars color="bg-warm-500" rows={sources.map((s) => ({ label: s.source ?? "-", value: s._count._all }))} />
            </>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">شروع و تکمیل تست‌ها</h2>
          <Bars
            color="bg-emerald-500"
            rows={testRows.map(([slug, t]) => ({ label: getTest(slug)?.title ?? slug, value: t.start, sub: `(تکمیل ${pct(t.done, t.start)})` }))}
          />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">دستگاه</h2>
          <Bars color="bg-sky-500" rows={devices.sort((a, b) => b._count._all - a._count._all).map((d) => ({ label: DEVICE[d.device] ?? d.device, value: d._count._all, sub: `(${pct(d._count._all, views)})` }))} />
        </section>
      </div>
    </>
  );
}
