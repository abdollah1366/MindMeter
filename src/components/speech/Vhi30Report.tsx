import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import { VHI_30_MISSING_COUNT } from "@/lib/speech/vhi-30-questions";
import {
  VHI_DOMAIN_LABELS,
  VHI_MAX_DOMAIN_SCORE,
  VHI_MAX_TOTAL_SCORE,
  VHI_NEUTRAL_NOTE,
  VHI_RESULT_EXPLANATION,
  VHI_VALIDATION_NOTICE,
  VHI_WORDING_VALIDATED,
  type Vhi30Scores,
  type VhiDomain,
} from "@/lib/speech/vhi-30-types";

const DOMAIN_ROWS: { domain: VhiDomain; key: keyof Vhi30Scores; bar: string }[] = [
  { domain: "functional", key: "functionalScore", bar: "bg-brand-600" },
  { domain: "physical", key: "physicalScore", bar: "bg-calm-600" },
  { domain: "emotional", key: "emotionalScore", bar: "bg-warm-600" },
];

function DomainBar({
  label,
  score,
  bar,
}: {
  label: string;
  score: number;
  bar: string;
}): ReactNode {
  const percent = Math.round((score / VHI_MAX_DOMAIN_SCORE) * 100);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-medium text-slate-600" dir="ltr">
          {toPersianDigits(score)} / {toPersianDigits(VHI_MAX_DOMAIN_SCORE)}
        </span>
      </div>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${label}: ${toPersianDigits(score)} از ${toPersianDigits(VHI_MAX_DOMAIN_SCORE)}`}
      >
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

type Props = {
  result: Vhi30Scores;
  createdAt?: Date | string | null;
  showHeader?: boolean;
};

/**
 * نمایش فارسی نتیجه VHI-30 بدون هیچ برچسب شدت، آستانه یا ادعای تشخیصی.
 * نتیجهی پرسشنامه جدا از اندازهگیریهای آکوستیکی ارائه میشود.
 */
export default function Vhi30Report({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt
    ? createdAt instanceof Date
      ? formatJalali(createdAt)
      : createdAt
    : null;

  return (
    <div className="space-y-5">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایندمتر</p>
          <p className="text-xs text-slate-400" dir="ltr">
            www.MindMeter.ir
          </p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">شاخص ناتوانی صوتی</h1>
          <p dir="ltr" className="mt-0.5 text-right text-xs text-slate-400">
            Voice Handicap Index (VHI-30)
          </p>
          {date ? <p className="mt-2 text-xs text-slate-500">تاریخ پرسشنامه: {date}</p> : null}
        </header>
      ) : null}

      <section className="rounded-2xl bg-gradient-to-bl from-brand-600 to-calm-700 p-5 text-white">
        <p className="text-sm text-brand-100">نمره کل پرسشنامه</p>
        <p className="mt-1 text-4xl font-extrabold" dir="ltr">
          {toPersianDigits(result.totalScore)} <span className="text-lg font-medium">/ {toPersianDigits(VHI_MAX_TOTAL_SCORE)}</span>
        </p>
        <p className="mt-2 text-xs leading-6 text-brand-100">
          نمره بالاتر به معنای تأثیر ادراکشده بیشتر مشکلات صوتی روی زندگی روزمره است؛ هیچ برچسب شدتی برای آن تعریف نشده است.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-700">نمرهی دامنهها</h2>
        {DOMAIN_ROWS.map((row) => {
          const score = result[row.key];
          return (
            <DomainBar
              key={row.domain}
              label={VHI_DOMAIN_LABELS[row.domain]}
              score={typeof score === "number" ? score : 0}
              bar={row.bar}
            />
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-600">
        <h2 className="mb-2 text-sm font-bold text-slate-700">توضیح نمرهها</h2>
        <p>{VHI_RESULT_EXPLANATION}</p>
        <p className="mt-3">{VHI_NEUTRAL_NOTE}</p>
        <p className="mt-3 text-xs text-slate-500">
          این نتایج از یک پرسشنامه خودگزارشی بهدست آمدهاند و با نتایج آزمونهای اندازهگیری آکوستیکی صوت متفاوتاند.
        </p>
      </section>

      {!VHI_WORDING_VALIDATED || VHI_30_MISSING_COUNT > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          <h2 className="font-bold">وضعیت تأیید ابزار</h2>
          <p className="mt-2">{VHI_VALIDATION_NOTICE}</p>
          <p className="mt-2 text-xs">
            تعداد گویههای فاقد متن تأییدشده: {toPersianDigits(VHI_30_MISSING_COUNT)} از{" "}
            {toPersianDigits(30)}.
          </p>
        </section>
      ) : null}
    </div>
  );
}
