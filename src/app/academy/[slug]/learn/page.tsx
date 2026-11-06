import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, isProfileComplete } from "@/lib/auth/session";
import { loadClassroom } from "@/lib/academy-server";
import { liveState, LESSON_KIND } from "@/lib/academy";
import { formatTehran } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";
import LessonNav from "@/components/academy/LessonNav";
import { claimCertificate } from "@/server/academy";

export const metadata: Metadata = { title: "کلاس درس", robots: { index: false } };

type Props = { params: Promise<{ slug: string }> };

export default async function LearnPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/academy/${slug}/learn`);
  const room = await loadClassroom(slug, user);
  if (!room) notFound();
  const { course, enrollment, manager, done, allDone } = room;
  const base = `/academy/${course.slug}`;
  if (!enrollment && !manager) redirect(base);

  const next = course.lessons.find((l) => !done.has(l.id)) ?? course.lessons[0];
  const lives = course.lessons.filter((l) => l.kind === "LIVE" && liveState(l.liveAt) !== "past");
  const cert = enrollment?.certificate;
  const best = enrollment?.attempts.reduce((m, a) => Math.max(m, a.score), -1) ?? -1;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="order-2 lg:order-1">
        <LessonNav base={base} lessons={course.lessons} done={done} canOpenAll hasExam={course.questions.length > 0} />
      </aside>
      <div className="order-1 min-w-0 space-y-5 lg:order-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <Link href={base} className="text-xs text-slate-500 hover:text-brand-600">→ صفحه‌ی دوره</Link>
          <h1 className="mt-1 text-2xl font-extrabold">{course.title}</h1>
          {manager && !enrollment && <p className="mt-2 text-xs text-amber-700">شما مدیر یا مدرس این دوره هستید؛ پیشرفت برای شما ثبت نمی‌شود.</p>}
          <p className="mt-3 text-sm text-slate-500">
            {toPersianDigits(done.size)} از {toPersianDigits(course.lessons.length)} درس تمام شده است.
          </p>
          {next && !allDone && (
            <Link href={`${base}/lessons/${next.id}`} className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">
              {done.size ? "ادامه" : "شروع"}: {next.title}
            </Link>
          )}
        </div>

        {lives.length > 0 && (
          <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-6">
            <h2 className="font-extrabold text-rose-700">● کلاس‌های زنده</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {lives.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3">
                  <span>
                    <b>{l.title}</b>
                    <span className="ms-2 text-xs text-slate-500">{formatTehran(l.liveAt!)}</span>
                  </span>
                  <Link href={`${base}/lessons/${l.id}`} className="rounded-xl bg-rose-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-600">
                    {liveState(l.liveAt) === "open" ? "ورود به کلاس" : "جزئیات"}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="font-extrabold">پایان دوره و گواهی</h2>
          {cert ? (
            <div className="mt-3 text-sm leading-7">
              <p className="text-emerald-700">تبریک! دوره را با موفقیت به پایان رساندید.</p>
              <Link href={`/certificates/${cert.code}`} className="mt-3 inline-block rounded-xl bg-calm-600 px-5 py-2.5 font-bold text-white hover:bg-calm-700">
                مشاهده و چاپ گواهی
              </Link>
            </div>
          ) : !course.certificate ? (
            <p className="mt-3 text-sm text-slate-500">{allDone ? "همه‌ی درس‌ها را به پایان رساندید." : "این دوره گواهی ندارد."}</p>
          ) : !allDone ? (
            <p className="mt-3 text-sm leading-7 text-slate-500">
              پس از تمام کردن همه‌ی درس‌ها{course.questions.length ? " و قبولی در آزمون پایانی" : ""}، گواهی پایان دوره با کد استعلام برای شما صادر می‌شود.
            </p>
          ) : !isProfileComplete(user) ? (
            <p className="mt-3 text-sm leading-7">
              نام روی گواهی از پروفایل شما برداشته می‌شود.{" "}
              <Link href={`/profile?next=${base}/learn`} className="font-bold text-brand-700 underline">پروفایل را کامل کنید</Link>.
            </p>
          ) : course.questions.length ? (
            <div className="mt-3 text-sm leading-7">
              <p>
                همه‌ی درس‌ها تمام شد. حالا در آزمون پایانی شرکت کنید (حد نصاب {toPersianDigits(course.passingScore)}٪).
                {best >= 0 && ` بهترین نمره‌ی شما تا الان ${toPersianDigits(best)}٪ است.`}
              </p>
              <Link href={`${base}/exam`} className="mt-3 inline-block rounded-xl bg-calm-600 px-5 py-2.5 font-bold text-white hover:bg-calm-700">
                شروع آزمون پایانی
              </Link>
            </div>
          ) : enrollment ? (
            <form action={claimCertificate} className="mt-3">
              <input type="hidden" name="courseId" value={course.id} />
              <button className="rounded-xl bg-calm-600 px-5 py-2.5 font-bold text-white hover:bg-calm-700">دریافت گواهی</button>
            </form>
          ) : null}
        </div>

        <p className="text-xs text-slate-400">
          انواع درس: {Object.values(LESSON_KIND).map((k) => `${k.icon} ${k.label}`).join(" · ")}
        </p>
      </div>
    </div>
  );
}
