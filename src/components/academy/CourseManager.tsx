import Link from "next/link";
import { db } from "@/lib/db";
import { displayName } from "@/lib/clinicians";
import { LESSON_KIND, formatMinutes } from "@/lib/academy";
import { formatTehran, formatToman } from "@/lib/tehran-time";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import StateForm from "./StateForm";
import CourseFields from "./CourseFields";
import LessonFields, { emptyLesson } from "./LessonFields";
import QuestionFields from "./QuestionFields";
import {
  saveCourse,
  saveLesson,
  deleteLesson,
  moveLesson,
  saveQuestion,
  deleteQuestion,
  deleteCourse,
  enrollManually,
  toggleCertificate,
} from "@/server/academy-admin";

const ENROLL_STATUS: Record<string, string> = { ACTIVE: "فعال", PENDING_PAYMENT: "در انتظار پرداخت", CANCELLED: "لغوشده" };

/** مدیریت کامل یک دوره؛ مشترک بین پنل ادمین و پنل مدرس */
export default async function CourseManager({ courseId, isAdmin, error }: { courseId: string; isAdmin: boolean; error?: string }) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      questions: { orderBy: { order: "asc" } },
      enrollments: { include: { user: true, certificate: true, _count: { select: { progress: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!course) return <p>دوره پیدا نشد.</p>;
  const instructors = isAdmin
    ? (await db.clinicianProfile.findMany({ where: { status: "APPROVED" }, include: { user: true } })).map((p) => ({ id: p.id, label: `${p.title} ${displayName(p.user)}` }))
    : [];
  const active = course.enrollments.filter((e) => e.status === "ACTIVE");
  const revenue = active.reduce((s, e) => s + e.price, 0);
  const box = "rounded-3xl border border-slate-200 bg-white p-6";
  const smallBtn = "rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{course.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {course.status === "PUBLISHED" ? "منتشرشده" : "پیش‌نویس"} · {formatToman(course.price)} · {toPersianDigits(active.length)} دانشجو
            {isAdmin && ` · فروش ${formatToman(revenue)}`}
          </p>
        </div>
        <Link href={`/academy/${course.slug}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:text-brand-600">مشاهده‌ی صفحه‌ی دوره</Link>
      </div>
      {error === "has-students" && <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">این دوره دانشجوی فعال دارد و حذف نمی‌شود؛ آن را پیش‌نویس کنید.</p>}

      <section className={box}>
        <h2 className="mb-4 font-extrabold">مشخصات دوره</h2>
        <StateForm action={saveCourse}>
          <CourseFields course={course} isAdmin={isAdmin} instructors={instructors} />
        </StateForm>
        {!isAdmin && <p className="mt-3 text-xs text-slate-400">تغییر شهریه، مدرس و انتشار دوره با مدیر سایت است.</p>}
      </section>

      <section id="lessons" className={box}>
        <h2 className="font-extrabold">درس‌ها ({toPersianDigits(course.lessons.length)})</h2>
        <ol className="mt-4 space-y-2">
          {course.lessons.map((l, i) => (
            <li key={l.id} className="rounded-2xl border border-slate-100">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-xs text-brand-700">{toPersianDigits(i + 1)}</span>
                  <span className="flex-1 font-medium">{l.title}</span>
                  <span className="text-xs text-slate-400">
                    {LESSON_KIND[l.kind].label}
                    {l.durationMin > 0 && ` · ${formatMinutes(l.durationMin)}`}
                    {l.liveAt && ` · ${formatTehran(l.liveAt, { dateStyle: "medium", timeStyle: "short" })}`}
                    {l.freePreview && " · پیش‌نمایش"}
                  </span>
                </summary>
                <div className="border-t border-slate-100 p-4">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <form action={moveLesson}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="dir" value="up" />
                      <button disabled={i === 0} className={smallBtn + " disabled:opacity-40"}>▲ بالا</button>
                    </form>
                    <form action={moveLesson}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="dir" value="down" />
                      <button disabled={i === course.lessons.length - 1} className={smallBtn + " disabled:opacity-40"}>▼ پایین</button>
                    </form>
                    <form action={deleteLesson}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="id" value={l.id} />
                      <button className={smallBtn + " text-rose-600"}>حذف درس</button>
                    </form>
                  </div>
                  <StateForm action={saveLesson} className="grid gap-3">
                    <LessonFields courseId={course.id} lesson={l} />
                  </StateForm>
                </div>
              </details>
            </li>
          ))}
        </ol>
        <details className="mt-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50/40">
          <summary className="cursor-pointer p-3 text-sm font-bold text-brand-700">+ افزودن درس</summary>
          <div className="p-4 pt-0">
            <StateForm action={saveLesson} className="grid gap-3" submit="افزودن درس">
              <LessonFields courseId={course.id} lesson={emptyLesson} />
            </StateForm>
          </div>
        </details>
      </section>

      <section id="quiz" className={box}>
        <h2 className="font-extrabold">آزمون پایانی ({toPersianDigits(course.questions.length)} سؤال)</h2>
        <p className="mt-1 text-xs text-slate-500">اگر سؤالی ثبت نشود، گواهی پس از تمام کردن درس‌ها صادر می‌شود.</p>
        <ol className="mt-4 space-y-2">
          {course.questions.map((q, i) => {
            const options = JSON.parse(q.options) as string[];
            return (
              <li key={q.id} className="rounded-2xl border border-slate-100">
                <details>
                  <summary className="cursor-pointer p-3 text-sm">
                    {toPersianDigits(i + 1)}. {q.text} <span className="text-xs text-emerald-600">(پاسخ: {options[q.answer]})</span>
                  </summary>
                  <div className="border-t border-slate-100 p-4">
                    <StateForm action={saveQuestion} className="grid gap-3">
                      <QuestionFields courseId={course.id} q={{ id: q.id, text: q.text, options, answer: q.answer }} />
                    </StateForm>
                    <form action={deleteQuestion} className="mt-3">
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="id" value={q.id} />
                      <button className={smallBtn + " text-rose-600"}>حذف سؤال</button>
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
        <details className="mt-4 rounded-2xl border border-dashed border-calm-200 bg-calm-50/40">
          <summary className="cursor-pointer p-3 text-sm font-bold text-calm-700">+ افزودن سؤال</summary>
          <div className="p-4 pt-0">
            <StateForm action={saveQuestion} className="grid gap-3" submit="افزودن سؤال">
              <QuestionFields courseId={course.id} q={{ text: "", options: [], answer: 0 }} />
            </StateForm>
          </div>
        </details>
      </section>

      <section className={box}>
        <h2 className="font-extrabold">دانشجویان</h2>
        {course.enrollments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">هنوز کسی ثبت‌نام نکرده است.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 text-start">نام</th>
                  {isAdmin && <th className="py-2 text-start">موبایل</th>}
                  <th className="py-2 text-start">وضعیت</th>
                  <th className="py-2 text-start">پیشرفت</th>
                  <th className="py-2 text-start">گواهی</th>
                </tr>
              </thead>
              <tbody>
                {course.enrollments.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100">
                    <td className="py-2">{displayName(e.user)}</td>
                    {isAdmin && <td className="py-2" dir="ltr">{toPersianDigits(e.user.phone)}</td>}
                    <td className="py-2">
                      {ENROLL_STATUS[e.status] ?? e.status}
                      {isAdmin && e.status === "ACTIVE" && e.price > 0 && <span className="text-xs text-slate-400"> ({formatToman(e.price)})</span>}
                    </td>
                    <td className="py-2">
                      {toPersianDigits(Math.min(e._count.progress, course.lessons.length))}/{toPersianDigits(course.lessons.length)}
                    </td>
                    <td className="py-2">
                      {e.certificate ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <Link href={`/certificates/${e.certificate.code}`} className={`font-mono text-xs ${e.certificate.revokedAt ? "text-rose-500 line-through" : "text-brand-700"}`} dir="ltr">
                            {e.certificate.code}
                          </Link>
                          <span className="text-xs text-slate-400">{formatJalali(e.certificate.issuedAt)}</span>
                          {isAdmin && (
                            <form action={toggleCertificate}>
                              <input type="hidden" name="id" value={e.certificate.id} />
                              <button className="text-xs text-rose-600 hover:underline">{e.certificate.revokedAt ? "بازگرداندن" : "ابطال"}</button>
                            </form>
                          )}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isAdmin && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-sm font-bold">ثبت‌نام دستی (مثلاً پرداخت حضوری یا بورسیه)</p>
            <StateForm action={enrollManually} className="mt-2 flex flex-wrap items-end gap-3" submit="ثبت‌نام" okText="ثبت‌نام انجام شد.">
              <input type="hidden" name="courseId" value={course.id} />
              <input name="phone" dir="ltr" required placeholder="09xxxxxxxxx" className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-500" />
            </StateForm>
          </div>
        )}
      </section>

      {isAdmin && (
        <form action={deleteCourse} className="text-left">
          <input type="hidden" name="id" value={course.id} />
          <button className="text-sm text-rose-600 hover:underline">حذف دوره</button>
        </form>
      )}
    </div>
  );
}
