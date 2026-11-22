import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import type { PictureNamingStoredResult } from "@/lib/speech/picture-naming-types";
import { PICTURE_NAMING_RESULT_LABELS } from "@/lib/speech/picture-naming-types";

type Props = { result: PictureNamingStoredResult; createdAt?: Date | string | null; showHeader?: boolean };

export default function PictureNamingReport({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt ? (createdAt instanceof Date ? formatJalali(createdAt) : createdAt) : null;
  const s = result.summary;
  return (
    <div className="space-y-5 font-sans">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایند‌متر</p>
          <p className="text-xs text-slate-400" dir="ltr">www.MindMeter.ir</p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">ارزیابی نامیدن تصاویر</h1>
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
          <div className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xs text-slate-500">کل</p><p className="text-xl font-extrabold text-slate-800">{toPersianDigits(s.totalItems)}</p></div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center"><p className="text-xs text-emerald-700">صحیح</p><p className="text-xl font-extrabold text-emerald-700">{toPersianDigits(s.correctCount)}</p></div>
          <div className="rounded-xl bg-rose-50 p-3 text-center"><p className="text-xs text-rose-700">نادرست</p><p className="text-xl font-extrabold text-rose-700">{toPersianDigits(s.incorrectCount)}</p></div>
          <div className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xs text-slate-500">بدون پاسخ</p><p className="text-xl font-extrabold text-slate-600">{toPersianDigits(s.noResponseCount)}</p></div>
        </div>
        {s.percentCorrect !== null ? <p className="mt-3 text-sm text-slate-600">درصد صحیح: {toPersianDigits(s.percentCorrect)}%</p> : null}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">جزئیات</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr><th className="p-2 text-start">هدف</th><th className="p-2 text-start">دسته</th><th className="p-2 text-start">نتیجه</th></tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-2 font-bold">{item.target}</td>
                  <td className="p-2 text-xs text-slate-500">{item.category}</td>
                  <td className="p-2">{PICTURE_NAMING_RESULT_LABELS[item.result]}</td>
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
        <p>این ارزیابی به‌تنهایی جایگزین ارزیابی جامع بالینی نیست.</p>
      </section>
    </div>
  );
}
