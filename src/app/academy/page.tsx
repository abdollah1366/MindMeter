import type { Metadata } from "next";
import Link from "next/link";
import CourseCard from "@/components/academy/CourseCard";
import { courseCards, upcomingLiveLessons } from "@/lib/academy-server";
import { formatTehran } from "@/lib/tehran-time";
import { themeOf } from "@/lib/academy";

export const metadata: Metadata = {
  title: "آکادمی مایندمتر | دوره‌های آموزشی روانشناسی",
  description: "دوره‌های آموزشی روانشناسی با ویدیو، جزوه، کلاس زنده، آزمون پایانی و گواهی‌نامه‌ی قابل استعلام.",
};

export const dynamic = "force-dynamic";

export default async function AcademyPage() {
  const [courses, live] = await Promise.all([courseCards(), upcomingLiveLessons({ limit: 4 })]);
  return (
    <div>
      <section className="rounded-3xl bg-gradient-to-l from-calm-50 via-white to-brand-50 p-8">
        <p className="text-sm font-bold text-calm-600">آکادمی مایندمتر</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight">یادگیری روانشناسی، قدم به قدم</h1>
        <p className="mt-3 max-w-2xl leading-8 text-slate-600">
          دوره‌های کوتاه و کاربردی با ویدیو و جزوه، کلاس‌های زنده با مدرس، آزمون پایانی و گواهی‌نامه‌ای که با کد استعلام قابل بررسی است.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/my-courses" className="rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700">دوره‌های من</Link>
          <Link href="/academy/live" className="rounded-xl border border-calm-200 bg-white px-5 py-2.5 text-calm-700 hover:bg-calm-50">برنامه‌ی کلاس‌های زنده</Link>
          <Link href="/certificates" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-slate-600 hover:bg-slate-50">استعلام گواهی</Link>
        </div>
      </section>

      {live.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-extrabold">کلاس‌های زنده‌ی پیش رو</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {live.map((l) => (
              <Link key={l.id} href={`/academy/${l.course.slug}`} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-400">
                <p className={`text-xs font-bold ${themeOf(l.course.theme).ink}`}>{l.course.title}</p>
                <p className="mt-1 font-bold">{l.title}</p>
                <p className="mt-2 text-xs text-slate-500">{formatTehran(l.liveAt!)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-extrabold">همه‌ی دوره‌ها</h2>
        {courses.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-white p-6 text-slate-500">به‌زودی دوره‌های آکادمی منتشر می‌شوند.</p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c.slug} c={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
