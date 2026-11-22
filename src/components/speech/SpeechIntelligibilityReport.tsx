import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import type { SpeechIntelligibilityStoredResult } from "@/lib/speech/speech-intelligibility-types";
import { SPEECH_INTELLIGIBILITY_CONTEXTS, SI_SCALE } from "@/lib/speech/speech-intelligibility-types";

type Props = { result: SpeechIntelligibilityStoredResult; createdAt?: Date | string | null; showHeader?: boolean };

export default function SpeechIntelligibilityReport({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt ? (createdAt instanceof Date ? formatJalali(createdAt) : createdAt) : null;
  return (
    <div className="space-y-5 font-sans">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایند‌متر</p>
          <p className="text-xs text-slate-400" dir="ltr">www.MindMeter.ir</p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">ارزیابی وضوح گفتار</h1>
        </header>
      ) : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">اطلاعات ارزیابی</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {date ? <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">تاریخ ارزیابی</dt><dd className="mt-0.5 text-sm font-medium text-slate-700">{date}</dd></div> : null}
          <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">ارزیاب</dt><dd className="mt-0.5 text-sm font-medium text-slate-700">{result.evaluator.kind === "PHYSICIAN" ? "پزشک" : "روان‌شناس"}</dd></div>
          {result.overallPercent !== null ? <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">درصد کلی وضوح</dt><dd className="mt-0.5 text-sm font-medium text-slate-700" dir="ltr">{toPersianDigits(result.overallPercent)}%</dd></div> : null}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">امتیاز بافت‌ها</h2>
        <div className="mt-3 space-y-2">
          {result.ratings.map((r) => {
            const label = SI_SCALE.find((s) => s.score === r.score)?.label ?? "—";
            return (
              <div key={r.id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 text-sm">
                <span className="text-slate-600">{r.context}</span>
                <span className="font-bold text-slate-800">{toPersianDigits(r.score)} — {label}</span>
              </div>
            );
          })}
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
