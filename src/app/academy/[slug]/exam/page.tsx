import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { getCurrentUser, isProfileComplete } from "@/lib/auth/session";
import { loadClassroom } from "@/lib/academy-server";
import { toPersianDigits } from "@/lib/scoring";
import QuizForm from "@/components/academy/QuizForm";

export const metadata: Metadata = { title: "آزمون پایان دوره", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function shuffled<T>(a: T[]) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default async function ExamPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/academy/${slug}/exam`);
  const room = await loadClassroom(slug, user);
  if (!room) notFound();
  const { course, enrollment, allDone } = room;
  const base = `/academy/${course.slug}`;
  if (!enrollment) redirect(base);
  if (course.questions.length === 0) redirect(`${base}/learn`);

  const blocker = !allDone
    ? "برای شرکت در آزمون ابتدا همه‌ی درس‌ها را به پایان برسانید."
    : !isProfileComplete(user)
      ? "نام روی گواهی از پروفایل شما برداشته می‌شود؛ ابتدا پروفایل را کامل کنید."
      : null;

  // ترتیب سؤال‌ها و گزینه‌ها در هر بار نمایش تصادفی است
  const questions = shuffled(course.questions).map((q) => ({
    id: q.id,
    text: q.text,
    options: shuffled((JSON.parse(q.options) as string[]).map((label, value) => ({ label, value }))),
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`${base}/learn`} className="text-sm text-slate-500 hover:text-brand-600">→ کلاس درس</Link>
      <h1 className="mt-2 text-2xl font-extrabold">آزمون پایانی: {course.title}</h1>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        {toPersianDigits(course.questions.length)} سؤال چهارگزینه‌ای · حد نصاب قبولی {toPersianDigits(course.passingScore)}٪ · حداکثر سه بار در هر ۲۴ ساعت
      </p>
      {enrollment.certificate && (
        <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
          شما قبلاً قبول شده‌اید. <Link href={`/certificates/${enrollment.certificate.code}`} className="font-bold underline">مشاهده‌ی گواهی</Link>
        </p>
      )}
      <div className="mt-6">
        {blocker ? (
          <div className="rounded-3xl bg-amber-50 p-6 text-sm leading-7 text-amber-800">
            {blocker}
            <div className="mt-3">
              {allDone ? (
                <Link href={`/profile?next=${base}/exam`} className="font-bold underline">تکمیل پروفایل</Link>
              ) : (
                <Link href={`${base}/learn`} className="font-bold underline">بازگشت به کلاس</Link>
              )}
            </div>
          </div>
        ) : (
          <QuizForm courseId={course.id} questions={questions} passingScore={course.passingScore} backHref={`${base}/learn`} />
        )}
      </div>
    </div>
  );
}
