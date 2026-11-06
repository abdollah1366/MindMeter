import type { Metadata } from "next";
import Link from "next/link";
import { upcomingLiveLessons } from "@/lib/academy-server";
import { liveState, themeOf, formatMinutes } from "@/lib/academy";
import { formatTehran } from "@/lib/tehran-time";

export const metadata: Metadata = { title: "برنامه‌ی کلاس‌های زنده", description: "زمان‌بندی کلاس‌های زنده‌ی آکادمی مایندمتر به وقت تهران." };
export const dynamic = "force-dynamic";

export default async function LiveSchedulePage() {
  const lessons = await upcomingLiveLessons();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/academy" className="text-sm text-slate-500 hover:text-brand-600">→ آکادمی</Link>
      <h1 className="mt-2 text-2xl font-extrabold">برنامه‌ی کلاس‌های زنده</h1>
      <p className="mt-2 text-sm text-slate-500">همه‌ی زمان‌ها به وقت تهران است. لینک ورود از نیم ساعت پیش از شروع، برای ثبت‌نام‌کنندگان دوره نمایش داده می‌شود.</p>
      {lessons.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-slate-500">فعلاً کلاس زنده‌ای برنامه‌ریزی نشده است.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {lessons.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <p className={`text-xs font-bold ${themeOf(l.course.theme).ink}`}>{l.course.title}</p>
                <p className="mt-0.5 font-bold">{l.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatTehran(l.liveAt!)}
                  {l.durationMin > 0 && ` · ${formatMinutes(l.durationMin)}`}
                </p>
              </div>
              <Link href={`/academy/${l.course.slug}/lessons/${l.id}`} className={`rounded-xl px-4 py-2 text-sm font-bold ${liveState(l.liveAt) === "open" ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                {liveState(l.liveAt) === "open" ? "در حال برگزاری" : "جزئیات"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
