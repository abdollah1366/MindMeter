import { toPersianDigits } from "@/lib/scoring";
import { MPT_ISSUE_LABELS, type MptAttempt, type MptSummary } from "@/lib/speech/mpt-types";
import { formatJalali } from "@/lib/jalali";

const STOP_LABEL: Record<MptAttempt["stopReason"], string> = {
  OFFSET: "پایان طبیعی آواسازی",
  MANUAL: "توقف دستی",
  CAP: "رسیدن به سقف زمانی ایمن",
  NO_ONSET: "آواسازی آغاز نشد",
};

function seconds(ms: number | null): string {
  if (ms === null) return "—";
  return toPersianDigits((ms / 1000).toFixed(2));
}

type Props = {
  result: MptSummary;
  createdAt?: Date | string | null;
  showHeader?: boolean;
};

/** نمایش فارسی نتیجه MPT؛ صرفاً توصیف اندازهگیری و بدون هیچ ادعای تشخیصی. */
export default function MptReport({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt ? (createdAt instanceof Date ? formatJalali(createdAt) : createdAt) : null;

  return (
    <div className="space-y-5">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایندمتر</p>
          <p className="text-xs text-slate-400" dir="ltr">www.MindMeter.ir</p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">آزمون حداکثر زمان آواسازی</h1>
          <p dir="ltr" className="mt-0.5 text-right text-xs text-slate-400">Maximum Phonation Time (MPT)</p>
          {date ? <p className="mt-2 text-xs text-slate-500">تاریخ آزمون: {date}</p> : null}
        </header>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-brand-50 p-4">
          <p className="text-xs text-brand-700">بهترین زمان آواسازی</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-800">
            {seconds(result.bestMs)} <span className="text-sm font-medium">ثانیه</span>
          </p>
        </div>
        <div className="rounded-2xl bg-calm-50 p-4">
          <p className="text-xs text-calm-700">میانگین تلاشهای معتبر</p>
          <p className="mt-1 text-2xl font-extrabold text-calm-700">
            {seconds(result.averageMs)} <span className="text-sm font-medium">ثانیه</span>
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs text-slate-600">تعداد تلاشهای معتبر</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800">
            {toPersianDigits(result.validCount)} <span className="text-sm font-medium">از</span>{" "}
            {toPersianDigits(result.attempts.length)}
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-700">جزئیات تلاشها</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[32rem] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">تلاش</th>
                <th className="px-3 py-2 font-medium">مدت آواسازی</th>
                <th className="px-3 py-2 font-medium">کیفیت</th>
                <th className="px-3 py-2 font-medium">علت پایان</th>
              </tr>
            </thead>
            <tbody>
              {result.attempts.map((attempt, index) => (
                <tr key={index} className="border-t border-slate-100">
                  <td className="px-3 py-2">{toPersianDigits(index + 1)}</td>
                  <td className="px-3 py-2 font-medium" dir="ltr">
                    {seconds(attempt.durationMs)} s
                  </td>
                  <td className="px-3 py-2">
                    {attempt.quality.ok ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">قابل قبول</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">نامعتبر</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{STOP_LABEL[attempt.stopReason]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.attempts.some((attempt) => attempt.quality.issues.length > 0) ? (
          <ul className="mt-3 space-y-1 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">
            {[...new Set(result.attempts.flatMap((attempt) => attempt.quality.issues))].map((issue) => (
              <li key={issue}>• {MPT_ISSUE_LABELS[issue]}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-600">
        <h2 className="mb-2 text-sm font-bold text-slate-700">توضیح علمی</h2>
        <p>
          این عدد مدت زمانی را نشان میدهد که در شرایط ضبط این آزمون توانستهاید واکه /آ/ را بهصورت پیوسته تولید کنید.
          تفسیر آن به عواملی مانند سن، جنس، شرایط تنفسی، وضعیت حنجره، روش اجرا و کیفیت ضبط وابسته است.
        </p>
        <p className="mt-3">
          این آزمون یک اندازهگیری عملکردی ساده است و بهتنهایی برای تشخیص بیماری، تعیین شدت اختلال صوت یا تشخیص
          اختلالات حنجره کافی نیست. نتیجهی طبیعی یا غیرطبیعیای بر اساس هنجار تأییدنشده ارائه نمیشود.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm leading-7 text-brand-800">
        برای تفسیر بالینی و بررسی دقیقتر، با متخصص گفتاردرمانی یا پزشک مشورت کنید.
      </section>
    </div>
  );
}
