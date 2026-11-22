import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import type { VerbalFluencyStoredResult } from "@/lib/speech/verbal-fluency-types";

type Props = { result: VerbalFluencyStoredResult; createdAt?: Date | string | null; showHeader?: boolean };

export default function VerbalFluencyReport({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt ? (createdAt instanceof Date ? formatJalali(createdAt) : createdAt) : null;
  return (
    <div className="space-y-5 font-sans">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایند‌متر</p>
          <p className="text-xs text-slate-400" dir="ltr">www.MindMeter.ir</p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">آزمون روانی کلامی</h1>
          <p dir="ltr" className="mt-0.5 text-right text-xs text-slate-400">Verbal Fluency</p>
        </header>
      ) : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">اطلاعات آزمون</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {date ? <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">تاریخ انجام</dt><dd className="mt-0.5 text-sm font-medium text-slate-700">{date}</dd></div> : null}
          <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">دسته</dt><dd className="mt-0.5 text-sm font-medium text-slate-700">{result.category}{result.letter ? ` — ${result.letter}` : ""}</dd></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">مدت (ثانیه)</dt><dd className="mt-0.5 text-sm font-medium text-slate-700" dir="ltr">{toPersianDigits(result.durationSec)}</dd></div>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">شاخص‌ها</h2>
        <div className="mt-3 space-y-1">
          {[
            ["کل کلمات", result.totalWords],
            ["کلمات یکتا", result.uniqueWords],
            ["تکرارها", result.repetitions],
            ["intrusions", result.intrusions],
            ["نرخ (کلمه/دقیقه)", result.wordsPerMinute],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 text-sm">
              <span className="text-slate-600">{label}</span>
              <span className="font-bold text-slate-800" dir="ltr">{toPersianDigits(value as number)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">فهرست کلمات</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600" dir="ltr">{result.wordList.join("، ")}</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-7 text-slate-500">
        <p>این آزمون صرفاً یک سنجه عملکردی است و تشخیص پزشکی نیست.</p>
      </section>
    </div>
  );
}
