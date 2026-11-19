import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import {
  LIMITATION_TEXT,
  VOICE_DESCRIPTOR_GROUPS,
  VOICE_QUALITY_ISSUE_LABELS,
  VOICE_SAMPLE_LABELS,
  type VoicePoint,
  type VoiceQualityStoredResult,
  type VoiceSampleSummary,
} from "@/lib/speech/voice-quality-types";

/** مقدار نامعتبر هرگز بهصورت صفر یا عدد ساختگی نمایش داده نمیشود. */
function value(text: string | null, unit = ""): ReactNode {
  if (text === null) return <span className="text-slate-400">—</span>;
  return (
    <span dir="ltr">
      {toPersianDigits(text)}
      {unit ? (
        <span className="mr-1 text-sm font-medium" dir="rtl">
          {unit}
        </span>
      ) : null}
    </span>
  );
}

function number(value: number | null, digits: number): string | null {
  return value === null ? null : value.toFixed(digits);
}

/**
 * نمودار تنها از نقاط واقعی همان آزمون ساخته میشود. با کمتر از دو نقطه معتبر
 * هیچ نموداری نمایش داده نمیشود و هیچ مقدار جایگزینی ساخته نمیشود.
 */
function LineChart({
  series,
  title,
  description,
  color,
  fill,
  ariaLabel,
}: {
  series: VoicePoint[];
  title: string;
  description: string;
  color: string;
  fill: string;
  ariaLabel: string;
}) {
  if (series.length < 2) return null;
  const times = series.map((point) => point.t);
  const values = series.map((point) => point.v);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const padding = Math.max(0.0005, (vMax - vMin) * 0.15);
  const low = vMin - padding;
  const high = vMax + padding;
  const timeSpan = Math.max(1, tMax - tMin);
  const valueSpan = Math.max(1e-9, high - low);

  const width = 620;
  const height = 190;
  const left = 56;
  const right = 14;
  const top = 14;
  const bottom = 30;
  const x = (t: number) => left + ((t - tMin) / timeSpan) * (width - left - right);
  const y = (v: number) => top + (1 - (v - low) / valueSpan) * (height - top - bottom);
  const line = series
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(point.t).toFixed(1)},${y(point.v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(tMax).toFixed(1)},${(height - bottom).toFixed(1)} L${x(tMin).toFixed(1)},${(height - bottom).toFixed(1)} Z`;

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-3 overflow-x-auto" dir="ltr">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[26rem]"
          role="img"
          aria-label={ariaLabel}
        >
          <rect x={left} y={top} width={width - left - right} height={height - top - bottom} fill="#f8fafc" />
          {[0, 0.5, 1].map((fraction) => {
            const gridY = top + fraction * (height - top - bottom);
            const label = high - fraction * valueSpan;
            return (
              <g key={fraction}>
                <line x1={left} x2={width - right} y1={gridY} y2={gridY} stroke="#e2e8f0" strokeWidth="1" />
                <text x={left - 6} y={gridY + 4} textAnchor="end" fontSize="10" fill="#64748b">
                  {label.toFixed(Math.abs(label) >= 10 ? 0 : 2)}
                </text>
              </g>
            );
          })}
          <path d={area} fill={fill} opacity="0.6" />
          <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
          {series.map((point, index) => (
            <circle
              key={`${point.t}-${index}`}
              cx={x(point.t)}
              cy={y(point.v)}
              r="2.2"
              fill={color}
            />
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

const METRIC_ROWS = [
  { key: "f0MeanHz", label: "میانگین فرکانس پایه", digits: 1, unit: "Hz" },
  { key: "f0StdHz", label: "انحراف معیار فرکانس پایه", digits: 1, unit: "Hz" },
  { key: "f0SlopeHzPerSec", label: "روند تغییر فرکانس پایه", digits: 1, unit: "Hz/s" },
  { key: "amplitudeCv", label: "ضریب تغییرات دامنه", digits: 3, unit: "" },
  { key: "jitterPercent", label: "ناپایداری دوره (Jitter)", digits: 2, unit: "%" },
  { key: "shimmerPercent", label: "ناپایداری دامنه دوره (Shimmer)", digits: 2, unit: "%" },
  { key: "hnrDb", label: "نسبت هارمونیک به نویز (HNR)", digits: 1, unit: "dB" },
  { key: "spectralCentroidHz", label: "مرکز طیف", digits: 0, unit: "Hz" },
  { key: "highFrequencyRatio", label: "نسبت انرژی فرکانسهای بالا", digits: 3, unit: "" },
] as const;

function SampleSection({ sample }: { sample: VoiceSampleSummary }) {
  const representative =
    [...sample.attempts].filter((attempt) => attempt.valid).sort((a, b) => b.recordedMs - a.recordedMs)[0] ??
    sample.attempts[0];
  const unmeasurable = representative?.unmeasurable ?? [];
  const issues = Array.from(new Set(sample.attempts.flatMap((attempt) => attempt.issues)));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-slate-800">{VOICE_SAMPLE_LABELS[sample.kind]}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
          {toPersianDigits(sample.validCount)} تلاش معتبر از {toPersianDigits(sample.attempts.length)}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">مدت آواسازی معتبر</p>
          <p className="mt-1 font-bold text-slate-800">{value(number(sample.voicedMs, 0), "ms")}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">مدت ضبط تلاش نماینده</p>
          <p className="mt-1 font-bold text-slate-800">
            {representative ? value(number(representative.recordedMs, 0), "ms") : <span className="text-slate-400">—</span>}
          </p>
        </div>
      </div>

      {issues.length ? (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
          <p className="font-bold">مسائل کیفیت ضبط مشاهدهشده:</p>
          <ul className="mt-1 list-inside list-disc">
            {issues.map((issue) => (
              <li key={issue}>{VOICE_QUALITY_ISSUE_LABELS[issue]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[26rem] text-right text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-3 py-2 font-medium">شاخص</th>
              <th className="px-3 py-2 font-medium">مقدار اندازهگیریشده</th>
            </tr>
          </thead>
          <tbody>
            {METRIC_ROWS.map((row) => (
              <tr key={row.key} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-600">{row.label}</td>
                <td className="px-3 py-2 font-medium text-slate-800">
                  {value(number(sample[row.key], row.digits), row.unit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unmeasurable.length ? (
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
          <p className="font-bold text-slate-700">شاخصهای غیرقابل محاسبه و علت آن</p>
          <ul className="mt-1 space-y-1">
            {unmeasurable.map((item) => (
              <li key={item.metric}>
                <span className="font-medium">{item.metric}</span>: {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

type Props = {
  result: VoiceQualityStoredResult;
  createdAt?: Date | string | null;
  showHeader?: boolean;
};

export default function VoiceQualityReport({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt ? (createdAt instanceof Date ? formatJalali(createdAt) : createdAt) : null;
  const vowel = result.samples.find((sample) => sample.kind === "vowel");
  const recordingIssues = Array.from(
    new Set(result.samples.flatMap((sample) => sample.attempts.flatMap((attempt) => attempt.issues))),
  );

  return (
    <div className="space-y-5 text-sm leading-7 text-slate-700">
      {showHeader ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-bold text-brand-700">مایندمتر</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-800">گزارش ارزیابی توصیفی کیفیت صوت</h2>
            <p dir="ltr" className="mt-1 text-left text-xs text-slate-400">
              Voice Quality Assessment
            </p>
          </div>
          <div className="text-xs text-slate-500">
            <p dir="ltr">www.MindMeter.ir</p>
            {date ? <p className="mt-1">{date}</p> : null}
          </div>
        </header>
      ) : null}

      <section className="rounded-2xl bg-slate-50 p-4">
        <h3 className="font-bold text-slate-800">خلاصه کیفیت ضبط</h3>
        <p className="mt-1">
          {toPersianDigits(result.validSampleCount)} نمونه از {toPersianDigits(result.samples.length)} نمونه،
          دارای تلاش معتبر قابل تحلیلاند.
        </p>
        {recordingIssues.length ? (
          <ul className="mt-2 list-inside list-disc text-xs text-amber-800">
            {recordingIssues.map((issue) => (
              <li key={issue}>{VOICE_QUALITY_ISSUE_LABELS[issue]}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-emerald-700">
            هیچ مسئله کیفیت ضبط در تلاشهای معتبر ثبت نشد.
          </p>
        )}
      </section>

      {vowel ? (
        <>
          <LineChart
            series={vowel.f0Series}
            title="تغییرات فرکانس پایه در نمونه واکه"
            description="هر نقطه حاصل تخمین فرکانس پایه از همان لحظه ضبط است (محور افقی: ثانیه، محور عمودی: هرتز)."
            color="#15803d"
            fill="#dcfce7"
            ariaLabel="نمودار تغییرات فرکانس پایه بر اساس داده واقعی نمونه واکه"
          />
          <LineChart
            series={vowel.amplitudeSeries}
            title="تغییرات شدت صوت در نمونه واکه"
            description="هر نقطه برابر RMS همان فریم ضبط است (محور افقی: ثانیه، محور عمودی: RMS بدون بعد)."
            color="#1d4ed8"
            fill="#dbeafe"
            ariaLabel="نمودار تغییرات شدت صوت بر اساس داده واقعی نمونه واکه"
          />
        </>
      ) : null}

      <div className="space-y-4">
        <h3 className="text-base font-extrabold text-slate-800">تحلیل جداگانه هر نمونه</h3>
        {result.samples.map((sample) => (
          <SampleSection key={sample.kind} sample={sample} />
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-extrabold text-slate-800">شاخصهای آکوستیکی مرتبط با توصیف صوت</h3>
        <p className="mt-2 text-xs leading-6 text-slate-500">
          موارد زیر گروهبندی شاخصهای اندازهگیریشدهاند و فاقد نمره، رتبه یا معادل ادراکیاند. فقدان یک شاخص بهمعنای
          نبودن آن ویژگی در صدا نیست، بلکه بهمعنای قابل محاسبه نبودن آن از روی این سیگنال است.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {VOICE_DESCRIPTOR_GROUPS.map((group) => (
            <div key={group.key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-bold text-slate-700">{group.title}</p>
              <ul className="mt-2 list-inside list-disc text-xs leading-6 text-slate-600">
                {group.metrics.map((metric) => (
                  <li key={metric}>{metric}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-brand-50 p-5 text-xs leading-7 text-brand-900">
        <h3 className="text-sm font-bold">روش محاسبه و محدودیتها</h3>
        <p className="mt-2">
          فرکانس پایه با autocorrelation نرمالشده و تصحیح خطای اکتاو تخمین زده میشود. ناپایداری دوره و دامنه از
          دورههای آواسازی استخراجشده از نقاط عبور صفر و دامنه قله هر دوره محاسبه میشود. نسبت هارمونیک به نویز بر
          اساس همبستگی نرمالشده در دوره فرکانس پایه برآورد میشود و ویژگیهای طیفی با FFT و پنجره Hann بهدست میآیند.
          هر شاخص تنها در صورتی ارائه میشود که شرایط اعتبار آن برقرار باشد؛ در غیر این صورت مقدار آن نامشخص (
          <span dir="ltr">null</span>) است و دلیل آن در جدول هر نمونه ذکر شده است. از جایگزینی صفر برای داده نامعتبر
          خودداری شده است.
        </p>
        <p className="mt-3 font-medium">{LIMITATION_TEXT}</p>
        <p className="mt-3">
          ارزیابی ادراکی معتبر نیازمند شنیدن نمونه توسط ارزیاب متخصص و ابزار استانداردشده است؛ افزودن چنین
          قابلیتی (با رعایت ملاحظات حریم خصوصی و اخذ رضایت) از توسعههای آینده محسوب میشود.
        </p>
      </section>
    </div>
  );
}
