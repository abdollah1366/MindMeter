import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import type { Ssi4StoredResult } from "@/lib/speech/ssi-4-types";
import { SSI4_CONCOMITANTS, SSI4_SEVERITY_LABELS } from "@/lib/speech/ssi-4-types";

type Props = { result: Ssi4StoredResult; createdAt?: Date | string | null; showHeader?: boolean };

export default function Ssi4Report({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt ? (createdAt instanceof Date ? formatJalali(createdAt) : createdAt) : null;
  return (
    <div className="space-y-5 font-sans">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایند‌متر</p>
          <p className="text-xs text-slate-400" dir="ltr">www.MindMeter.ir</p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">ارزیابی لکنت (SSI-4)</h1>
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
        <h2 className="text-sm font-bold text-slate-700">شاخص‌ها</h2>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm"><span className="text-slate-600">فراوانی لکنت</span><span className="font-bold text-slate-800" dir="ltr">{toPersianDigits(result.frequencyPercent)}%</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-600">طولانی‌ترین لکنت</span><span className="font-bold text-slate-800" dir="ltr">{toPersianDigits(result.longestDurationSec)} s</span></div>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">رفتارهای همراه</h2>
        <div className="mt-3 space-y-1">
          {result.concomitants.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{c.label}</span>
              <span className="font-bold text-slate-800">{toPersianDigits(c.score)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">شدت (نظر ارزیاب)</h2>
        <div className="mt-3 rounded-xl bg-brand-50 p-4 text-center">
          <p className="text-4xl font-extrabold text-brand-700">{toPersianDigits(result.totalScore)}</p>
          <p className="mt-1 text-sm text-brand-800">{SSI4_SEVERITY_LABELS[result.severity]}</p>
        </div>
      </section>
      {result.notes ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-600">
          <h2 className="mb-2 text-sm font-bold text-slate-700">توضیحات ارزیاب</h2>
          <p className="whitespace-pre-line">{result.notes}</p>
        </section>
      ) : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-7 text-slate-500">
        <p>این ارزیابی ادراکی است و به‌تنهایی جایگزین ارزیابی جامع بالینی نیست. توضیحات فارسی این صفحه تعریف رسمی یا ترجمه‌ی اعتبارسنجی‌شده‌ی ابزار نیستند. SSI-4 یک ابزار دارای حق نشر است؛ این پیاده‌سازی یک ثبت‌کننده‌ی عمومی است.</p>
      </section>
    </div>
  );
}
