import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import type { ArticulationStoredResult } from "@/lib/speech/articulation-types";
import { ARTICULATION_ERROR_LABELS, ARTICULATION_ERROR_TYPES } from "@/lib/speech/articulation-types";

type Props = { result: ArticulationStoredResult; createdAt?: Date | string | null; showHeader?: boolean };

export default function ArticulationReport({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt ? (createdAt instanceof Date ? formatJalali(createdAt) : createdAt) : null;
  const summary = result.summary;
  return (
    <div className="space-y-5 font-sans">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایند‌متر</p>
          <p className="text-xs text-slate-400" dir="ltr">www.MindMeter.ir</p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">ارزیابی تلفظ و تولید واج‌ها</h1>
          <p dir="ltr" className="mt-0.5 text-right text-xs text-slate-400">Articulation Assessment</p>
        </header>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">اطلاعات ارزیابی</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {date ? <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">تاریخ ارزیابی</dt><dd className="mt-0.5 text-sm font-medium text-slate-700">{date}</dd></div> : null}
          <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">ارزیاب</dt><dd className="mt-0.5 text-sm font-medium text-slate-700">{result.evaluator.kind === "PHYSICIAN" ? "پزشک" : "روان‌شناس"}</dd></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">خلاصه</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-500">کل واج‌ها</p>
            <p className="text-xl font-extrabold text-slate-800">{toPersianDigits(summary.totalItems)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-xs text-emerald-700">صحیح</p>
            <p className="text-xl font-extrabold text-emerald-700">{toPersianDigits(summary.correctCount)}</p>
          </div>
          <div className="rounded-xl bg-rose-50 p-3 text-center">
            <p className="text-xs text-rose-700">نادرست</p>
            <p className="text-xl font-extrabold text-rose-700">{toPersianDigits(summary.incorrectCount)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-500">ارزیابی نشد</p>
            <p className="text-xl font-extrabold text-slate-600">{toPersianDigits(summary.notTestedCount)}</p>
          </div>
        </div>
        {summary.percentCorrect !== null ? (
          <p className="mt-3 text-sm text-slate-600">درصد صحیح (از واج‌های آزموده‌شده): {toPersianDigits(summary.percentCorrect)}%</p>
        ) : null}
        <div className="mt-3 space-y-1">
          {ARTICULATION_ERROR_TYPES.map((t) => (
            t === "CORRECT" || t === "NOT_TESTED" ? null : (
              <div key={t} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{ARTICULATION_ERROR_LABELS[t]}</span>
                <span className="font-bold text-slate-800">{toPersianDigits(summary.errorCounts[t])}</span>
              </div>
            )
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">جزئیات واج‌ها</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-2 text-start">واج</th>
                <th className="p-2 text-start">واژه</th>
                <th className="p-2 text-start">موقعیت</th>
                <th className="p-2 text-start">نتیجه</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-2 font-bold">{item.phoneme}</td>
                  <td className="p-2">{item.word}</td>
                  <td className="p-2 text-xs text-slate-500">{item.position}</td>
                  <td className="p-2">{ARTICULATION_ERROR_LABELS[item.result]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {result.notes ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-600">
          <h2 className="mb-2 text-sm font-bold text-slate-700">توضیحات ارزیاب</h2>
          <p className="whitespace-pre-line">{result.notes}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-7 text-slate-500">
        <p>این ارزیابی ادراکی است و به‌تنهایی جایگزین ارزیابی جامع بالینی، تشخیص پزشکی یا توصیه‌ی درمانی نمی‌شود. توضیحات فارسی این صفحه تعریف رسمی یا ترجمه‌ی اعتبارسنجی‌شده‌ی ابزار نیستند.</p>
      </section>
    </div>
  );
}
