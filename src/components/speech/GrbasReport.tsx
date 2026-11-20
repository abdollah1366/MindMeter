import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import type { GrbasStoredResult } from "@/lib/speech/grbas-payload";
import {
  GRBAS_CLINICAL_NOTE,
  GRBAS_COMPONENTS,
  GRBAS_EVALUATOR_KIND_LABELS,
  GRBAS_MAX_SCORE,
  GRBAS_NO_AUDIO_NOTE,
  GRBAS_NO_TOTAL_NOTE,
  GRBAS_SAMPLE_SOURCE_LABELS,
  GRBAS_UI_NOTE,
} from "@/lib/speech/grbas-types";
import { formatGrbasSummary, grbasLevelLabel } from "@/lib/speech/grbas-scoring";

const COMPONENT_BAR: Record<string, string> = {
  G: "bg-brand-600",
  R: "bg-rose-500",
  B: "bg-sky-500",
  A: "bg-amber-500",
  S: "bg-violet-500",
};

function InfoItem({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-700">{value}</dd>
    </div>
  );
}

type Props = {
  result: GrbasStoredResult;
  createdAt?: Date | string | null;
  patientName?: string;
  evaluatorName?: string;
  showHeader?: boolean;
};

/**
 * گزارش فارسی ارزیابی ادراکی GRBAS.
 * پنج مؤلفه جداگانه نمایش داده می‌شوند؛ هیچ نمره‌ی کلی یا تفسیر خودکار تولید
 * نمی‌شود و هیچ فایل صوتی در گزارش وجود ندارد.
 */
export default function GrbasReport({
  result,
  createdAt,
  patientName,
  evaluatorName,
  showHeader = true,
}: Props) {
  const date = createdAt
    ? createdAt instanceof Date
      ? formatJalali(createdAt)
      : createdAt
    : null;
  const evaluatorKind = GRBAS_EVALUATOR_KIND_LABELS[result.evaluator.kind];

  return (
    <div className="space-y-5 font-sans">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایند‌متر</p>
          <p className="text-xs text-slate-400" dir="ltr">
            www.MindMeter.ir
          </p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">
            مقیاس ارزیابی کیفیت صوت GRBAS
          </h1>
          <p dir="ltr" className="mt-0.5 text-right text-xs text-slate-400">
            GRBAS — Perceptual Voice Quality Scale
          </p>
        </header>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">اطلاعات ارزیابی</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {date ? <InfoItem label="تاریخ ارزیابی" value={date} /> : null}
          {patientName ? <InfoItem label="مراجع" value={patientName} /> : null}
          {evaluatorName ? (
            <InfoItem label="ارزیاب" value={`${evaluatorName} — ${evaluatorKind}`} />
          ) : null}
          <InfoItem
            label="منبع نمونه‌ی شنیداری"
            value={GRBAS_SAMPLE_SOURCE_LABELS[result.sampleSource]}
          />
        </dl>
        {result.sampleNote ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-600">
            توضیح منبع نمونه: {result.sampleNote}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-slate-500" dir="ltr">
          {formatGrbasSummary(result.scores)}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-700">امتیاز پنج مؤلفه</h2>
          <span className="text-[11px] text-slate-400">بازه‌ی هر مؤلفه: ۰ تا ۳</span>
        </div>

        {GRBAS_COMPONENTS.map((component) => {
          const score = result.scores[component.key];
          const level = grbasLevelLabel(component, score);
          const percent = Math.round((score / GRBAS_MAX_SCORE) * 100);
          return (
            <div key={component.key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-sm font-extrabold text-slate-700" dir="ltr">
                    {component.key}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{component.title}</p>
                    <p dir="ltr" className="text-right text-[10px] text-slate-400">
                      {component.titleEn}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {toPersianDigits(score)} از {toPersianDigits(GRBAS_MAX_SCORE)}
                </span>
              </div>
              <div
                className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100"
                role="img"
                aria-label={`${component.title}: ${toPersianDigits(score)} از ${toPersianDigits(GRBAS_MAX_SCORE)} — ${level ?? "نامشخص"}`}
              >
                <div
                  className={`h-full rounded-full ${COMPONENT_BAR[component.key]}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{level ?? "سطح نامشخص"}</p>
            </div>
          );
        })}

        <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
          {GRBAS_NO_TOTAL_NOTE}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-600">
        <h2 className="mb-2 text-sm font-bold text-slate-700">توضیحات ارزیاب</h2>
        {result.notes ? (
          <p className="whitespace-pre-line">{result.notes}</p>
        ) : (
          <p className="text-slate-400">توضیحی ثبت نشده است.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-7 text-slate-500">
        <h2 className="mb-2 text-sm font-bold text-slate-700">یادداشت‌های تفسیر</h2>
        <p>{GRBAS_CLINICAL_NOTE}</p>
        <p className="mt-2">{GRBAS_UI_NOTE}</p>
        <p className="mt-2">{GRBAS_NO_AUDIO_NOTE}</p>
      </section>
    </div>
  );
}
