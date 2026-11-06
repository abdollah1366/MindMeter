"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitQuiz, type QuizState } from "@/server/academy";
import { toPersianDigits } from "@/lib/scoring";

type Q = { id: string; text: string; options: { label: string; value: number }[] };

export default function QuizForm({ courseId, questions, passingScore, backHref }: { courseId: string; questions: Q[]; passingScore: number; backHref: string }) {
  const [state, action, pending] = useActionState<QuizState, FormData>(submitQuiz, {});

  if (state.score !== undefined) {
    return (
      <div className={`rounded-3xl p-8 text-center ${state.passed ? "bg-emerald-50" : "bg-amber-50"}`}>
        <p className="text-5xl font-black">{toPersianDigits(state.score)}٪</p>
        <p className="mt-2 text-sm text-slate-600">
          {toPersianDigits(state.correct ?? 0)} پاسخ درست از {toPersianDigits(state.total ?? 0)} سؤال · حد نصاب {toPersianDigits(passingScore)}٪
        </p>
        {state.passed ? (
          <>
            <p className="mt-4 font-bold text-emerald-700">تبریک! در آزمون پایانی قبول شدید.</p>
            {state.code ? (
              <Link href={`/certificates/${state.code}`} className="mt-5 inline-block rounded-xl bg-calm-600 px-6 py-3 font-bold text-white hover:bg-calm-700">
                مشاهده و چاپ گواهی
              </Link>
            ) : (
              <Link href={backHref} className="mt-5 inline-block rounded-xl bg-brand-600 px-6 py-3 font-bold text-white">بازگشت به کلاس</Link>
            )}
          </>
        ) : (
          <>
            <p className="mt-4 font-bold text-amber-800">این بار به حد نصاب نرسیدید. درس‌ها را مرور کنید و دوباره امتحان دهید.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href={backHref} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm">مرور درس‌ها</Link>
              <button onClick={() => window.location.reload()} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">آزمون دوباره</button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="courseId" value={courseId} />
      {questions.map((q, i) => (
        <fieldset key={q.id} className="rounded-3xl border border-slate-200 bg-white p-5">
          <legend className="sr-only">سؤال {i + 1}</legend>
          <p className="font-bold leading-8">
            {toPersianDigits(i + 1)}. {q.text}
          </p>
          <div className="mt-3 grid gap-2">
            {q.options.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input type="radio" name={`q_${q.id}`} value={o.value} required className="accent-brand-600" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {state.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-calm-600 py-3.5 font-bold text-white hover:bg-calm-700 disabled:opacity-60">
        {pending ? "در حال ثبت…" : "ثبت پاسخ‌ها و دیدن نتیجه"}
      </button>
    </form>
  );
}
