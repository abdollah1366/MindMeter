import type { Metadata } from "next";
import Link from "next/link";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import { requireUser } from "@/lib/auth/guards";
import { listSpeechResultsForUser, type SpeechResultView } from "@/lib/speech-result-service";
import { formatGrbasSummary } from "@/lib/speech/grbas-scoring";

export const metadata: Metadata = {
  title: "نتایج ارزیابی گفتار من",
  robots: { index: false },
};

function ResultCard({ row }: { row: SpeechResultView }) {
  let href: string;
  let title: string;
  let detail: string;
  let validCount: number;
  let countLabel: string;
  if (row.kind === "voice-quality") {
    countLabel = "نمونه معتبر";
    href = `/speech/voice-quality/result/${row.id}`;
    title = "ارزیابی کیفیت صوت";
    const vowel = row.result.samples.find((sample) => sample.kind === "vowel");
    detail =
      vowel?.f0MeanHz === null || vowel?.f0MeanHz === undefined
        ? "شاخص F0 نامشخص"
        : `F0: ${toPersianDigits(vowel.f0MeanHz.toFixed(1))} Hz`;
    validCount = row.result.validSampleCount;
  } else if (row.kind === "sustained-vowel") {
    countLabel = "تلاش معتبر";
    href = `/speech/sustained-vowel/result/${row.id}`;
    title = "تحلیل آکوستیکی واکه پایدار";
    detail =
      row.result.f0MeanHz === null
        ? "F0 نامشخص"
        : `F0: ${toPersianDigits(row.result.f0MeanHz.toFixed(1))} Hz`;
    validCount = row.result.validCount;
  } else if (row.kind === "vhi-30") {
    countLabel = "گویه پاسخشده";
    href = `/speech/vhi-30/result/${row.id}`;
    title = "پرسشنامه شاخص ناتوانی صوتی (VHI-30)";
    detail = `نمره کل: ${toPersianDigits(row.result.totalScore)} از ۱۲۰`;
    validCount = row.result.answers.length;
  } else if (row.kind === "grbas") {
    countLabel = "مؤلفه";
    href = `/speech/grbas/result/${row.id}`;
    title = "ارزیابی ادراکی GRBAS";
    detail = formatGrbasSummary(row.result.scores);
    validCount = 5;
  } else if (row.kind === "amr") {
    countLabel = "تکلیف";
    href = `/speech/amr/result/${row.id}`;
    title = "آزمون نرخ حرکت تناوبی (AMR)";
    const lowest = row.result.lowestRateTask ? row.result.lowestRateTask.toUpperCase() : "—";
    detail = `کمترین نرخ: ${lowest}`;
    validCount = row.result.tasks.length;
  } else if (row.kind === "smr") {
    countLabel = "چرخه";
    href = `/speech/smr/result/${row.id}`;
    title = "آزمون توالی حرکات گفتاری (SMR)";
    detail = `چرخه: ${toPersianDigits(row.result.task.cycleCount)}`;
    validCount = row.result.task.cycleCount;
  } else if (row.kind === "articulation") {
    countLabel = "واج";
    href = `/speech/articulation/result/${row.id}`;
    title = "ارزیابی تلفظ و تولید واج‌ها";
    detail = `صحیح: ${toPersianDigits(row.result.summary.correctCount)} از ${toPersianDigits(row.result.summary.totalItems)}`;
    validCount = row.result.summary.totalItems;
  } else if (row.kind === "eat-10") {
    countLabel = "گویه";
    href = `/speech/eat-10/result/${row.id}`;
    title = "پرسشنامه ارزیابی بلع (EAT-10)";
    detail = `نمره کل: ${toPersianDigits(row.result.totalScore)} از ۴۰`;
    validCount = row.result.answers.length;
  } else {
    countLabel = "تلاش معتبر";
    href = `/speech/mpt/result/${row.id}`;
    title = "آزمون حداکثر زمان آواسازی";
    detail = `بهترین: ${toPersianDigits(((row.result.bestMs ?? 0) / 1000).toFixed(2))} ثانیه`;
    validCount = row.result.validCount;
  }

  return (
    <li>
      <Link
        href={href}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-400"
      >
        <span>
          <span className="block font-bold text-slate-800">{title}</span>
          <span className="mt-1 block text-xs text-slate-400">{formatJalali(row.createdAt)}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2 text-xs">
          <span dir="ltr" className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">{detail}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
            {toPersianDigits(validCount)} {countLabel}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function SpeechResultsPage() {
  const user = await requireUser("/speech/results");
  const rows = await listSpeechResultsForUser(user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">نتایج ارزیابی گفتار من</h1>
          <p className="mt-1 text-sm text-slate-500">فقط نتایج ذخیرهشدهی این حساب نمایش داده میشود.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/speech/mpt" className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
            آزمون MPT
          </Link>
          <Link
            href="/speech/sustained-vowel"
            className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm text-brand-700 hover:bg-brand-50"
          >
            تحلیل واکه پایدار
          </Link>
          <Link
            href="/speech/voice-quality"
            className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm text-brand-700 hover:bg-brand-50"
          >
            ارزیابی کیفیت صوت
          </Link>
          <Link
            href="/speech/vhi-30"
            className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm text-brand-700 hover:bg-brand-50"
          >
            پرسشنامه VHI-30
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          هنوز نتیجهای از آزمونهای گفتار در پروندهی شما ذخیره نشده است.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <ResultCard key={row.id} row={row} />
          ))}
        </ul>
      )}

      <p className="text-xs leading-6 text-slate-500">
        نتایج فقط برای صاحب پرونده قابل مشاهدهاند و هیچ فایل صوتی خامی در آنها ذخیره نمیشود.
      </p>
    </div>
  );
}
