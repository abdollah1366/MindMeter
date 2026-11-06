import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import ArticleBody from "@/components/ArticleBody";
import CourseCover from "@/components/academy/CourseCover";
import EnrollForm from "@/components/academy/EnrollForm";
import { canManageCourse, instructorLabel, progressOf } from "@/lib/academy-server";
import { COURSE_LEVEL, LESSON_KIND, formatMinutes } from "@/lib/academy";
import { formatTehran, formatToman } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ enrolled?: string }> };

async function load(slug: string) {
  return db.course.findUnique({
    where: { slug: decodeURIComponent(slug) },
    include: {
      instructor: { include: { user: true } },
      lessons: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      _count: { select: { questions: true, enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c || c.status !== "PUBLISHED") return { title: "دوره" };
  return { title: c.title, description: c.summary, alternates: { canonical: `/academy/${c.slug}` } };
}

export default async function CoursePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { enrolled } = await searchParams;
  const course = await load(slug);
  if (!course) notFound();
  const user = await getCurrentUser();
  const manager = await canManageCourse(user, course);
  if (course.status !== "PUBLISHED" && !manager) notFound();

  const enrollment = user ? await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } }, include: { progress: true, certificate: true } }) : null;
  const active = enrollment?.status === "ACTIVE";
  const done = new Set(enrollment?.progress.map((p) => p.lessonId));
  const progress = active ? await progressOf(enrollment.id, course.id) : null;
  const minutes = course.lessons.reduce((s, l) => s + l.durationMin, 0);
  const base = `/academy/${course.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.summary,
    inLanguage: "fa",
    provider: { "@type": "Organization", name: "مایندمتر", sameAs: "https://www.mindmeter.ir" },
    offers: { "@type": "Offer", price: course.price * 10, priceCurrency: "IRR", category: course.price ? "Paid" : "Free" },
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {course.status !== "PUBLISHED" && (
        <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">این دوره پیش‌نویس است و فقط مدیر و مدرس آن را می‌بینند.</p>
      )}
      {enrolled && active && (
        <p className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">ثبت‌نام شما با موفقیت انجام شد. از همین صفحه یا «دوره‌های من» شروع کنید.</p>
      )}
      <Link href="/academy" className="text-sm text-slate-500 hover:text-brand-600">→ آکادمی</Link>

      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <CourseCover title={course.title} theme={course.theme} className="h-44" />
            <div className="p-6">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">سطح {COURSE_LEVEL[course.level]}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{toPersianDigits(course.lessons.length)} درس</span>
                {minutes > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{formatMinutes(minutes)}</span>}
                {course.certificate && <span className="rounded-full bg-calm-50 px-2.5 py-1 text-calm-700">گواهی پایان دوره</span>}
              </div>
              <h1 className="mt-3 text-2xl font-extrabold leading-snug">{course.title}</h1>
              <p className="mt-2 leading-8 text-slate-600">{course.summary}</p>
              <p className="mt-3 text-sm text-slate-500">
                مدرس:{" "}
                {course.instructor ? (
                  <Link href={`/clinicians/${course.instructor.id}`} className="font-medium text-brand-700 hover:underline">{instructorLabel(course)}</Link>
                ) : (
                  <span className="font-medium">{instructorLabel(course)}</span>
                )}
              </p>
            </div>
          </div>

          {(course.description || course.audience) && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
              {course.audience && (
                <p className="mb-4 rounded-2xl bg-surface p-4 text-sm leading-7"><b>مخاطبان دوره:</b> {course.audience}</p>
              )}
              {course.description && <ArticleBody body={course.description} />}
            </section>
          )}

          <section id="syllabus" className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-extrabold">سرفصل‌ها</h2>
            <ol className="mt-4 divide-y divide-slate-100">
              {course.lessons.map((l, i) => {
                const open = active || manager || l.freePreview;
                const k = LESSON_KIND[l.kind];
                const inner = (
                  <>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs ${done.has(l.id) ? "bg-emerald-100 text-emerald-700" : l.kind === "LIVE" ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-700"}`}>
                      {done.has(l.id) ? "✓" : toPersianDigits(i + 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{l.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {k.icon} {k.label}
                        {l.durationMin > 0 && ` · ${formatMinutes(l.durationMin)}`}
                        {l.kind === "LIVE" && l.liveAt && ` · ${formatTehran(l.liveAt)}`}
                      </span>
                    </span>
                    {l.freePreview && !active && <span className="rounded-full bg-warm-100 px-2 py-0.5 text-[11px] text-warm-600">پیش‌نمایش رایگان</span>}
                    {!open && <span className="text-slate-300" aria-label="قفل">🔒</span>}
                  </>
                );
                return (
                  <li key={l.id}>
                    {open ? (
                      <Link href={`${base}/lessons/${l.id}`} className="flex items-center gap-3 py-3 hover:text-brand-700">{inner}</Link>
                    ) : (
                      <div className="flex items-center gap-3 py-3 text-slate-600">{inner}</div>
                    )}
                  </li>
                );
              })}
              {course._count.questions > 0 && (
                <li className="flex items-center gap-3 py-3 text-slate-600">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-calm-50 text-xs text-calm-700">✎</span>
                  <span className="flex-1">
                    آزمون پایانی ({toPersianDigits(course._count.questions)} سؤال، حد نصاب {toPersianDigits(course.passingScore)}٪)
                  </span>
                </li>
              )}
            </ol>
          </section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            {active ? (
              <>
                <p className="text-sm text-slate-500">پیشرفت شما</p>
                <div className="mt-2 h-2.5 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress?.percent ?? 0}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {toPersianDigits(progress?.done ?? 0)} از {toPersianDigits(progress?.total ?? 0)} درس
                </p>
                <Link href={`${base}/learn`} className="mt-4 block rounded-xl bg-brand-600 py-3 text-center font-bold text-white hover:bg-brand-700">
                  {progress?.done ? "ادامه‌ی یادگیری" : "شروع دوره"}
                </Link>
                {enrollment?.certificate && (
                  <Link href={`/certificates/${enrollment.certificate.code}`} className="mt-2 block rounded-xl border border-calm-200 py-2.5 text-center text-sm text-calm-700 hover:bg-calm-50">
                    مشاهده‌ی گواهی
                  </Link>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">شهریه‌ی دوره</p>
                <p className="mt-1 text-2xl font-extrabold text-brand-700">{formatToman(course.price)}</p>
                <div className="mt-4">
                  <EnrollForm courseId={course.id} free={course.price === 0} label={course.price === 0 ? "ثبت‌نام رایگان" : "ثبت‌نام و پرداخت"} />
                </div>
                {!user && <p className="mt-3 text-center text-xs text-slate-400">برای ثبت‌نام ابتدا با شماره موبایل وارد می‌شوید.</p>}
              </>
            )}
            <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs leading-6 text-slate-500">
              <li>✓ دسترسی دائمی به درس‌ها و جزوه‌ها</li>
              {course.lessons.some((l) => l.kind === "LIVE") && <li>✓ شرکت در کلاس‌های زنده با مدرس</li>}
              {course.certificate && <li>✓ گواهی با کد استعلام آنلاین</li>}
              {course._count.enrollments > 0 && <li>✓ {toPersianDigits(course._count.enrollments)} نفر ثبت‌نام کرده‌اند</li>}
            </ul>
          </div>
          {manager && (
            <Link href={user?.role === "ADMIN" ? `/admin/courses/${course.id}` : `/panel/courses/${course.id}`} className="block rounded-2xl border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500 hover:text-brand-600">
              ویرایش دوره
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
