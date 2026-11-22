import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import {
  READING_ALOUD_DOMAINS,
  READING_ALOUD_SEVERITY_LABELS,
  type ReadingAloudStoredResult,
} from "@/lib/speech/reading-aloud-types";

type Props = {
  result: ReadingAloudStoredResult;
  createdAt?: Date | string | null;
  showHeader?: boolean;
};

const PERFORMANCE_ROWS: { key: keyof ReadingAloudStoredResult["performance"]; label: string }[] = [
  { key: "durationSeconds", label: "مدت خواندن (ثانیه)" },
  { key: "wordsRead", label: "واژههای خواندهشده" },
  { key: "misreadWords", label: "واژههای اشتباه" },
  { key: "omissions", label: "واژههای حذفشده" },
  { key: "additions", label: "واژههای اضافه" },
  { key: "selfCorrections", label: "تصحیحات خودبهخود" },
];

export default function ReadingAloudReport({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt
    ? createdAt instanceof Date
      ? formatJalali(createdAt)
      : createdAt
    : null;

  return (
    <div className="space-y-5 font-sans">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایندمتر</p>
          <p className="text-xs text-slate-400" dir="ltr">
            www.MindMeter.ir
          </p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">
            آزمون خواندن متن با صدای بلند
          </h1>
        </header>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">اطلاعات ارزیابی</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {date ? (
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="text-[11px] text-slate-500">تاریخ ارزیابی</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-700">{date}</dd>
            </div>
          ) : null}
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">متن</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-700">
              {result.passage.title} — {toPersianDigits(result.passage.wordCount)} واژه
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">ارزیاب</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-700">
              {result.evaluator.kind === "PHYSICIAN" ? "پزشک" : "روانشناس"}
            </dd>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">خلاصهی عملکرد (محاسبهشده از مشاهدات)</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <dt className="text-[11px] text-brand-700">مجموع خطاها</dt>
            <dd className="mt-1 text-lg font-extrabold text-brand-800">
              {toPersianDigits(result.summary.errorCount)}
            </dd>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <dt className="text-[11px] text-brand-700">واژههای صحیح</dt>
            <dd className="mt-1 text-lg font-extrabold text-brand-800">
              {toPersianDigits(result.summary.wordsCorrect)}
            </dd>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <dt className="text-[11px] text-brand-700">درصد دقت</dt>
            <dd className="mt-1 text-lg font-extrabold text-brand-800">
              {toPersianDigits(result.summary.accuracyPercent)}٪
            </dd>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <dt className="text-[11px] text-brand-700">واژه صحیح در دقیقه</dt>
            <dd className="mt-1 text-lg font-extrabold text-brand-800">
              {toPersianDigits(result.summary.wordsCorrectPerMinute)}
            </dd>
          </div>
        </div>
        <p className="mt-2 text-xs leading-6 text-slate-500">
          این اعداد صرفاً توصیف مشاهدات ثبتشدهاند و نرم یا آستانهی تشخیصی محسوب نمیشوند.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">مشاهدات خام</h2>
        <div className="mt-3 space-y-2">
          {PERFORMANCE_ROWS.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 text-sm"
            >
              <span className="text-slate-600">{row.label}</span>
              <span className="shrink-0 font-bold text-slate-800">
                {toPersianDigits(result.performance[row.key])}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">امتیازدهی کیفی</h2>
        <div className="mt-3 space-y-2">
          {result.ratings.map((rating) => (
            <div
              key={rating.id}
              className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 text-sm"
            >
              <span className="text-slate-600">
                {rating.label}
                <span className="mr-2 text-xs text-slate-400">
                  {READING_ALOUD_DOMAINS.find((domain) => domain.id === rating.id)?.description}
                </span>
              </span>
              <span className="shrink-0 font-bold text-slate-800">
                {toPersianDigits(rating.score)} — {READING_ALOUD_SEVERITY_LABELS[rating.score]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">شدت کلی (نظر ارزیاب)</h2>
        <div className="mt-3 rounded-xl bg-brand-50 p-4 text-center">
          <p className="text-4xl font-extrabold text-brand-700">
            {toPersianDigits(result.overallSeverity)}
          </p>
          <p className="mt-1 text-sm text-brand-800">
            {READING_ALOUD_SEVERITY_LABELS[result.overallSeverity]}
          </p>
        </div>
        <p className="mt-2 text-xs leading-6 text-slate-500">
          این مقدار یک قضاوت بالینی است و از جمع امتیازها محاسبه نمیشود.
        </p>
      </section>

      {result.notes ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-600">
          <h2 className="mb-2 text-sm font-bold text-slate-700">توضیحات ارزیاب</h2>
          <p className="whitespace-pre-line">{result.notes}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-7 text-slate-500">
        <p>
          متنهای این آزمون Original و برای ساختاردهی تکلیف نوشته شدهاند. این ابزار
          مجموعهی استاندارد یا نرممرجع ندارد و بهتنهایی جایگزین ارزیابی جامع
          گفتاردرمانی نیست.
        </p>
      </section>
    </div>
  );
}
