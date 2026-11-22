import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import type { SmrSummary } from "@/lib/speech/smr-types";
import { SMR_CONFIG } from "@/lib/speech/smr-config";

type Props = { result: SmrSummary; createdAt?: Date | string | null; showHeader?: boolean };

export default function SmrReport({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt ? (createdAt instanceof Date ? formatJalali(createdAt) : createdAt) : null;
  const t = result.task;
  const overallLabel = result.overallQuality === "acceptable" ? "قابل قبول" : result.overallQuality === "mixed" ? "مختلط" : "ضعیف";

  function row(label: string, value: string | number | null): ReactNode {
    return (
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold text-slate-800" dir="ltr">
          {value === null ? "—" : typeof value === "number" ? toPersianDigits(value) : value}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5 font-sans">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایند‌متر</p>
          <p className="text-xs text-slate-400" dir="ltr">www.MindMeter.ir</p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">آزمون توالی حرکات گفتاری</h1>
          <p dir="ltr" className="mt-0.5 text-right text-xs text-slate-400">Sequential Motion Rate (SMR)</p>
        </header>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">اطلاعات آزمون</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {date ? <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">تاریخ انجام</dt><dd className="mt-0.5 text-sm font-medium text-slate-700">{date}</dd></div> : null}
          <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">نسخه الگوریتم</dt><dd className="mt-0.5 text-sm font-medium text-slate-700">{result.algorithmVersion}</dd></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[11px] text-slate-500">کیفیت کلی داده‌ها</dt><dd className="mt-0.5 text-sm font-medium text-slate-700">{overallLabel}</dd></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">شاخص‌های توالی /pa-ta-ka/</h2>
        <div className="mt-3">
          {row("تعداد هجا (تشخیص خودکار)", t.detectedSyllableCount)}
          {t.manualSyllableCount !== null ? row("تعداد هجا (بازبینی دستی)", t.manualSyllableCount) : null}
          {row("تعداد هجا (نهایی)", t.syllableCount)}
          {row("تعداد چرخه (pa-ta-ka)", t.cycleCount)}
          {row("نرخ چرخه (چرخه/ثانیه)", t.ratePerSecond)}
          {row("میانگین فاصله (ms)", t.meanIntervalMs)}
          {row("انحراف معیار فاصله (ms)", t.sdIntervalMs)}
          {row("ضریب تغییرات (CV %)", t.cvPercent)}
          {row("مدت گفتار فعال (ms)", t.activeDurationMs)}
          {row("مکث‌های غیرمنتظره", t.pauseCount)}
          {row("نسبت اشباع (clipping)", t.clippedRatio)}
          {row("امتیاز اطمینان", `${toPersianDigits(t.confidence)} / ۱۰۰`)}
        </div>
        {t.limitations.length > 0 ? (
          <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
            <ul className="list-inside list-disc space-y-0.5">{t.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-600">
        <p>
          این نتایج صرفاً توصیفی‌اند و به‌تنهایی برای تشخیص پزشکی، تعیین شدت بیماری یا جایگزینی ارزیابی متخصص
          گفتار کافی نیستند. تشخیص هجا بر اساس قلههای انرژی صوت انجام شده و در حضور نویز یا کیفیت پایین میکروفون
          ممکن است دچار خطای شمارش شود.
        </p>
        <p className="mt-2 text-xs text-slate-500">نسخه الگوریتم: {result.algorithmVersion}</p>
      </section>
    </div>
  );
}
