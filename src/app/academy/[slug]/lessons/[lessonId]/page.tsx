import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { loadClassroom } from "@/lib/academy-server";
import { LESSON_KIND, LIVE_OPEN_BEFORE_MIN, formatMinutes, liveState } from "@/lib/academy";
import { formatTehran } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";
import ArticleBody from "@/components/ArticleBody";
import LessonNav from "@/components/academy/LessonNav";
import VideoPlayer from "@/components/academy/VideoPlayer";
import { completeLesson } from "@/server/academy";

export const metadata: Metadata = { title: "درس", robots: { index: false } };

type Props = { params: Promise<{ slug: string; lessonId: string }> };

export default async function LessonPage({ params }: Props) {
  const { slug, lessonId } = await params;
  const user = await getCurrentUser();
  const room = await loadClassroom(slug, user);
  if (!room) notFound();
  const { course, enrollment, manager, done } = room;
  const base = `/academy/${course.slug}`;
  const idx = course.lessons.findIndex((l) => l.id === lessonId);
  if (idx < 0) notFound();
  const lesson = course.lessons[idx];
  const canOpenAll = Boolean(enrollment) || manager;
  if (!canOpenAll && !lesson.freePreview) redirect(user ? base : `/login?next=${base}/lessons/${lessonId}`);

  const prev = course.lessons[idx - 1];
  const next = course.lessons[idx + 1];
  const live = lesson.kind === "LIVE" ? liveState(lesson.liveAt) : "none";
  const k = LESSON_KIND[lesson.kind];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="order-2 lg:order-1">
        <LessonNav base={base} lessons={course.lessons} done={done} current={lesson.id} canOpenAll={canOpenAll} hasExam={course.questions.length > 0 && canOpenAll} />
      </aside>
      <article className="order-1 min-w-0 lg:order-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs text-slate-500">
            <Link href={canOpenAll ? `${base}/learn` : base} className="hover:text-brand-600">{course.title}</Link> · درس {toPersianDigits(idx + 1)} · {k.icon} {k.label}
            {lesson.durationMin > 0 && ` · ${formatMinutes(lesson.durationMin)}`}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">{lesson.title}</h1>

          {lesson.kind === "LIVE" && (
            <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/60 p-5 text-sm leading-7">
              <p className="font-bold text-rose-700">● کلاس زنده: {lesson.liveAt ? formatTehran(lesson.liveAt) : "زمان اعلام می‌شود"}</p>
              {!canOpenAll ? (
                <p className="mt-2">برای شرکت در کلاس زنده در دوره ثبت‌نام کنید.</p>
              ) : live === "open" && lesson.liveUrl ? (
                <a href={lesson.liveUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-xl bg-rose-500 px-6 py-2.5 font-bold text-white hover:bg-rose-600">
                  ورود به کلاس زنده ↗
                </a>
              ) : live === "open" ? (
                <p className="mt-2">لینک کلاس هنوز توسط مدرس ثبت نشده است. چند دقیقه‌ی دیگر این صفحه را دوباره باز کنید.</p>
              ) : live === "upcoming" ? (
                <p className="mt-2">لینک ورود از {toPersianDigits(LIVE_OPEN_BEFORE_MIN)} دقیقه پیش از شروع کلاس در همین صفحه نمایش داده می‌شود.</p>
              ) : (
                <p className="mt-2">این کلاس برگزار شده است.{lesson.videoUrl ? " ضبط کلاس را در پایین ببینید." : ""}</p>
              )}
            </div>
          )}

          {lesson.videoUrl && (lesson.kind !== "LIVE" || live === "past") && (
            <div className="mt-5">
              <VideoPlayer url={lesson.videoUrl} title={lesson.title} />
            </div>
          )}

          {lesson.body && (
            <div className="mt-6">
              <ArticleBody body={lesson.body} />
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            {prev ? (
              <Link href={`${base}/lessons/${prev.id}`} className="text-sm text-slate-500 hover:text-brand-600">→ درس قبلی</Link>
            ) : (
              <span />
            )}
            {enrollment ? (
              done.has(lesson.id) ? (
                next ? (
                  <Link href={`${base}/lessons/${next.id}`} className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700">درس بعدی ←</Link>
                ) : (
                  <Link href={`${base}/learn`} className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700">بازگشت به کلاس ←</Link>
                )
              ) : live === "upcoming" ? (
                <span className="text-xs text-slate-400">پس از برگزاری کلاس می‌توانید آن را تمام‌شده علامت بزنید.</span>
              ) : (
                <form action={completeLesson}>
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <button className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700">
                    ✓ این درس را تمام کردم{next ? " و درس بعدی" : ""}
                  </button>
                </form>
              )
            ) : !manager ? (
              <Link href={base} className="rounded-xl bg-warm-500 px-6 py-2.5 font-bold text-white hover:bg-warm-600">ثبت‌نام در دوره</Link>
            ) : next ? (
              <Link href={`${base}/lessons/${next.id}`} className="text-sm text-brand-700">درس بعدی ←</Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
