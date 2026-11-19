import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import { SUSTAINED_VOWEL_ISSUE_LABELS } from "@/lib/speech/sustained-vowel-types";
import type {
  F0Point,
  SustainedVowelAttempt,
  SustainedVowelStoredResult,
} from "@/lib/speech/sustained-vowel-types";

/** مقدار نامعتبر هرگز بهصورت عدد ساختگی یا صفر نمایش داده نمیشود. */
function value(text: string | null, unit = ""): ReactNode {
  if (text === null) return <span className="text-slate-400">—</span>;
  return (
    <span dir="ltr">
      {toPersianDigits(text)}
      {unit ? <span className="mr-1 text-sm font-medium" dir="rtl">{unit}</span> : null}
    </span>
  );
}

function seconds(ms: number | null): string | null {
  return ms === null ? null : (ms / 1000).toFixed(2);
}

/**
 * نمودار فقط از نقاط واقعی همان آزمون ساخته میشود. در صورت نبود دستکم دو نقطه
 * معتبر، هیچ نموداری نمایش داده نمیشود و هیچ مقدار جایگزینی ساخته نمیشود.
 */
function F0Chart({ series }: { series: F0Point[] }) {
  if (series.length < 2) return null;

  const times = series.map((point) => point.t);
  const values = series.map((point) => point.hz);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const padding = Math.max(2, (vMax - vMin) * 0.15);
  const low = vMin - padding;
  const high = vMax + padding;
  const timeSpan = Math.max(1, tMax - tMin);
  const valueSpan = Math.max(1e-6, high - low);

  const width = 620;
  const height = 190;
  const left = 46;
  const right = 14;
  const top = 14;
  const bottom = 30;
  const x = (t: number) => left + ((t - tMin) / timeSpan) * (width - left - right);
  const y = (hz: number) => top + (1 - (hz - low) / valueSpan) * (height - top - bottom);
  const line = series
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(point.t).toFixed(1)},${y(point.hz).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(tMax).toFixed(1)},${(height - bottom).toFixed(1)} L${x(tMin).toFixed(1)},${(height - bottom).toFixed(1)} Z`;

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-700">روند فرکانس پایه در بازه پایدار</p>
      <p className="mt-1 text-xs text-slate-500">
        هر نقطه، میانگین فرکانس پایهی بهدستآمده از همان لحظهی ضبط است (محور افقی: ثانیه، محور عمودی: هرتز).
      </p>
      <div className="mt-3 overflow-x-auto" dir="ltr">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[26rem]"
          role="img"
          aria-label="نمودار تغییرات فرکانس پایه بر حسب زمان بر اساس داده واقعی آزمون"
        >
          <rect x={left} y={top} width={width - left - right} height={height - top - bottom} fill="#f8fafc" />
          {[0, 0.5, 1].map((fraction) => {
            const gridY = top + fraction * (height - top - bottom);
            const hz = high - fraction * valueSpan;
            return (
              <g key={fraction}>
                <line x1={left} x2={width - right} y1={gridY} y2={gridY} stroke="#e2e8f0" strokeWidth="1" />
                <text x={left - 6} y={gridY + 4} textAnchor="end" fontSize="11" fill="#64748b">
                  {Math.round(hz)}
                </text>
              </g>
            );
          })}
          <path d={area} fill="#dcfce7" opacity="0.6" />
          <path d={line} fill="none" stroke="#15803d" strokeWidth="2.2" strokeLinejoin="round" />
          {series.map((point, index) => (
            <circle key={`${point.t}-${index}`} cx={x(point.t)} cy={y(point.hz)} r="2.4" fill="#166534" />
          ))}
          <text x={left} y={height - 8} fontSize="11" fill="#64748b">
            {(tMin / 1000).toFixed(1)} s
          </text>
          <text x={width - right} y={height - 8} textAnchor="end" fontSize="11" fill="#64748b">
            {(tMax / 1000).toFixed(1)} s
          </text>
        </svg>
      </div>
    </div>
  );
}

function AttemptRow({ attempt, index }: { attempt: SustainedVowelAttempt; index: number }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2">{toPersianDigits(index + 1)}</td>
      <td className="px-3 py-2 font-medium" dir="ltr">
        {seconds(attempt.recordedMs) ?? "—"} s
      </td>
      <td className="px-3 py-2 font-medium" dir="ltr">
        {seconds(attempt.stableMs) ?? "—"} s
      </td>
      <td className="px-3 py-2" dir="ltr">
        {attempt.f0 ? toPersianDigits(attempt.f0.meanHz.toFixed(1)) : "—"}
      </td>
      <td className="px-3 py-2">
        {attempt.valid ? (
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">قابل قبول</span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">نامعتبر</span>
        )}
      </td>
    </tr>
  );
}

type Props = {
  result: SustainedVowelStoredResult;
  createdAt?: Date | string | null;
  showHeader?: boolean;
};

/** نمایش فارسی نتیجهی تحلیل واکه پایدار، بدون هیچگونه ادعای تشخیصی یا هنجار جعلی. */
export default function SustainedVowelReport({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt ? (createdAt instanceof Date ? formatJalali(createdAt) : createdAt) : null;
  const bestSeries = result.attempts.find((attempt) => attempt.valid && attempt.f0 && attempt.f0.series.length >= 2);
  const allIssues = [...new Set(result.attempts.flatMap((attempt) => attempt.issues))];

  return (
    <div className="space-y-5">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایندمتر</p>
          <p className="text-xs text-slate-400" dir="ltr">www.MindMeter.ir</p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">تحلیل آکوستیکی واکه پایدار</h1>
          <p dir="ltr" className="mt-0.5 text-right text-xs text-slate-400">Sustained Vowel Analysis</p>
          {date ? <p className="mt-2 text-xs text-slate-500">تاریخ آزمون: {date}</p> : null}
        </header>
      ) : null}

      {result.validCount === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          هیچیک از تلاشها بازه پایدار قابل قبولی نداشتند. مقادیر زیر بدون تلاش معتبر، نامشخص نمایش داده میشوند.
          میتوانید آزمون را در محیطی آرامتر تکرار کنید.
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-brand-50 p-4">
          <p className="text-xs text-brand-700">میانگین فرکانس پایه</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-800">
            {value(result.f0MeanHz === null ? null : result.f0MeanHz.toFixed(2), "Hz")}
          </p>
        </div>
        <div className="rounded-2xl bg-calm-50 p-4">
          <p className="text-xs text-calm-700">انحراف معیار فرکانس پایه</p>
          <p className="mt-1 text-2xl font-extrabold text-calm-700">
            {value(result.f0StdHz === null ? null : result.f0StdHz.toFixed(2), "Hz")}
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700">طول بازه پایدار</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-800">
            {value(seconds(result.stableMs), "s")}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs text-slate-600">ضریب تغییرات دامنه</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800">
            {value(result.amplitudeCv === null ? null : result.amplitudeCv.toFixed(3))}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600">
        <p>
          تلاشهای معتبر: {toPersianDigits(result.validCount)} از {toPersianDigits(result.attempts.length)}. تنها
          تلاشهای دارای بازه پایدار قابل قبول در میانگینها وارد شدهاند.
        </p>
        <p className="mt-2">
          ضریب تغییرات دامنه و انحراف معیار فرکانس، توصیفکنندهی میزان تغییرات لحظهای سیگنال در بازه انتخابشدهاند
          و هیچ برچسب طبیعی یا غیرطبیعی به آنها داده نمیشود.
        </p>
      </section>

      {bestSeries?.f0 ? <F0Chart series={bestSeries.f0.series} /> : null}

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-700">جزئیات تلاشها</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[34rem] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">تلاش</th>
                <th className="px-3 py-2 font-medium">مدت ضبط</th>
                <th className="px-3 py-2 font-medium">بازه پایدار</th>
                <th className="px-3 py-2 font-medium">F0 (Hz)</th>
                <th className="px-3 py-2 font-medium">کیفیت</th>
              </tr>
            </thead>
            <tbody>
              {result.attempts.map((attempt, index) => (
                <AttemptRow key={index} attempt={attempt} index={index} />
              ))}
            </tbody>
          </table>
        </div>
        {allIssues.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">
            {allIssues.map((issue) => (
              <li key={issue}>• {SUSTAINED_VOWEL_ISSUE_LABELS[issue]}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-600">
        <h2 className="mb-2 text-sm font-bold text-slate-700">روش محاسبه و شاخصهای ارائهنشده</h2>
        <p>
          فرکانس پایه با همبستگی متقاطع نرمالشده (NAC) روی کپی نمونههای صوتی و در محدوده ۷۰ تا ۴۰۰ هرتز تخمین زده
          شد. تنها بازهای که پیش از آن آغاز و پایان آواسازی حذف شده و شدت آن پایدار بود، مبنای محاسبه قرار گرفت.
          مقادیر نامعتبر بهصورت «—» نمایش داده میشوند و هرگز با صفر جایگزین نمیشوند.
        </p>
        <p className="mt-3">
          شاخصهای Jitter، Shimmer و Harmonics-to-Noise Ratio (HNR) در این نسخه ارائه نمیشوند. دلیل آن این است که
          تخمین فرکانس پایهی حاضر در سطح فریمهای زمانی (حدود ۴۰ فریم در ثانیه) انجام میشود، نه در سطح تک تک چرخههای
          آواسازی؛ بنابراین محاسبهی Jitter یا Shimmer از روی اختلاف فریمها، اندازهای غلط نامیده میشود. محاسبهی سادهی
          همچنین محاسبهی سادهای HNR فاقد دقت لازم برای معرفی بهعنوان اندازهگیری معتبر در مرورگر است. بهجای آنها،
          پایداری فریمی
          فرکانس و ضریب تغییرات دامنه با برچسب صرفاً توصیفی ارائه شدهاند.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm leading-8 text-brand-800">
        <p>
          این گزارش ویژگیهای آکوستیکی سیگنال صوتی ثبت‌شده را توصیف میکند. مقادیر به دست آمده تحت تأثیر میکروفون،
          فاصله از دستگاه، محیط ضبط، شدت صدا، شرایط فرد و الگوریتم تحلیل قرار دارند. این آزمون به تنهایی برای تشخیص
          بیماری یا تعیین شدت اختلال صوت کافی نیست.
        </p>
        <p className="mt-2 text-xs leading-6 text-brand-700/80">
          این گزارش شامل تشخیص پزشکی، برچسب طبیعی یا غیرطبیعی، مقایسه با هنجار تأییدنشده، توصیه درمانی یا ادعای
          اعتبارسنجی بالینی نیست.
        </p>
      </section>
    </div>
  );
}
