import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { upcomingLiveLessons } from "@/lib/academy-server";
import { liveState } from "@/lib/academy";
import CourseCover from "@/components/academy/CourseCover";
import { formatTehran } from "@/lib/tehran-time";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "دوره‌های من", robots: { index: false } };

export default async function MyCoursesPage() {
  const user = await requireUser("/my-courses");
  const [enrollments, live] = await Promise.all([
    db.enrollment.findMany({
      where: { userId: user.id, status: { in: ["ACTIVE", "PENDING_PAYMENT"] } },
      include: { course: { include: { _count: { select: { lessons: true } } } }, certificate: true, payments: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { progress: true } } },
      orderBy: { createdAt: "desc" },
    }),
    upcomingLiveLessons({ userId: user.id, limit: 5 }),
  ]);
  const active = enrollments.filter((e) => e.status === "ACTIVE");
  const pending = enrollments.filter((e) => e.status === "PENDING_PAYMENT");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">دوره‌های من</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/my-results" className="rounded-xl border border-slate-200 bg-white px-4 py-2 hover:text-brand-600">پرونده‌ی تست‌ها</Link>
          <Link href="/academy" className="rounded-xl bg-brand-600 px-4 py-2 text-white hover:bg-brand-700">همه‌ی دوره‌ها</Link>
        </div>
      </div>

      {live.length > 0 && (
        <section className="mt-6 rounded-3xl border border-rose-100 bg-rose-50/50 p-5">
          <h2 className="font-extrabold text-rose-700">● کلاس‌های زنده‌ی شما</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {live.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3">
                <span>
                  <b>{l.title}</b> <span className="text-xs text-slate-500">({l.course.title}) · {formatTehran(l.liveAt!)}</span>
                </span>
                <Link href={`/academy/${l.course.slug}/lessons/${l.id}`} className="rounded-xl bg-rose-500 px-4 py-1.5 text-xs font-bold text-white">
                  {liveState(l.liveAt) === "open" ? "ورود به کلاس" : "جزئیات"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mt-6 space-y-2">
          {pending.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
              <span>پرداخت دوره‌ی «{e.course.title}» تکمیل نشده است.</span>
              <Link href={e.payments[0] ? `/pay/${e.payments[0].id}` : `/academy/${e.course.slug}`} className="rounded-xl bg-white px-4 py-1.5 font-bold">تکمیل پرداخت</Link>
            </div>
          ))}
        </section>
      )}

      {active.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-white p-8 text-center text-slate-500">
          هنوز در دوره‌ای ثبت‌نام نکرده‌اید.
          <Link href="/academy" className="mt-3 block font-bold text-brand-700">دیدن دوره‌های آکادمی</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((e) => {
            const total = e.course._count.lessons;
            const pct = total ? Math.round((Math.min(e._count.progress, total) / total) * 100) : 0;
            return (
              <div key={e.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <CourseCover title={e.course.title} theme={e.course.theme} className="h-24" />
                <div className="p-5">
                  <h2 className="font-extrabold">{e.course.title}</h2>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{toPersianDigits(pct)}٪ پیشرفت</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    <Link href={`/academy/${e.course.slug}/learn`} className="rounded-xl bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700">
                      {pct === 100 ? "مرور" : pct ? "ادامه" : "شروع"}
                    </Link>
                    {e.certificate && (
                      <Link href={`/certificates/${e.certificate.code}`} className="rounded-xl border border-calm-200 px-4 py-2 text-calm-700 hover:bg-calm-50">
                        گواهی ({formatJalali(e.certificate.issuedAt)})
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
