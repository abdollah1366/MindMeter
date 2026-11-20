import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import type { AmrSummary } from "@/lib/speech/amr-types";
import { AMR_TASKS } from "@/lib/speech/amr-types";
import { AMR_CONFIG } from "@/lib/speech/amr-config";

const TASK_COLORS: Record<string, string> = {
  pa: "bg-brand-600",
  ta: "bg-calm-600",
  ka: "bg-warm-600",
};

function InfoItem({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function metricRow(label: string, value: string | number | null): ReactNode {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-bold text-slate-800" dir="ltr">
        {value === null ? "—" : typeof value === "number" ? toPersianDigits(value) : value}
      </span>
    </div>
  );
}

type Props = {
  result: AmrSummary;
  createdAt?: Date | string | null;
  showHeader?: boolean;
};

/**
 * گزارش فارسی آزمون AMR.
 * سه تکلیف به‌صورت مستقل نمایش داده می‌شوند؛ هیچ تشخیص پزشکی یا نمره کلی
 * تولید نمی‌شود و محدودیت‌های تحلیل خودکار صریحاً ذکر می‌شوند.
 */
export default function AmrReport({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt ? (createdAt instanceof Date ? formatJalali(createdAt) : createdAt) : null;

  const overallLabel =
    result.overallQuality === "acceptable"
      ? "قابل قبول"
      : result.overallQuality === "mixed"
        ? "مختلط"
        : "ضعیف";

  const lowest = result.lowestRateTask
    ? AMR_TASKS.find((t) => t.key === result.lowestRateTask)?.label
    : null;
  const highestCv = result.highestCvTask
    ? AMR_TASKS.find((t) => t.key === result.highestCvTask)?.label
    : null;

  return (
    <div className="space-y-5 font-sans">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایند‌متر</p>
          <p className="text-xs text-slate-400" dir="ltr">
            www.MindMeter.ir
          </p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">آزمون نرخ حرکت تناوبی</h1>
          <p dir="ltr" className="mt-0.5 text-right text-xs text-slate-400">
            Alternating Motion Rate (AMR)
          </p>
        </header>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">اطلاعات آزمون</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {date ? <InfoItem label="تاریخ انجام" value={date} /> : null}
          <InfoItem label="نسخه الگوریتم" value={result.algorithmVersion} />
          <InfoItem label="کیفیت کلی داده‌ها" value={overallLabel} />
        </dl>
      </section>

      {result.tasks.map((task: (typeof result.tasks)[number]) => {
        const taskMeta = AMR_TASKS.find((t) => t.key === task.task);
        return (
          <section key={task.task} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-extrabold text-white ${TASK_COLORS[task.task]}`}>
                  {task.label}
                </span>
                <h2 className="text-sm font-bold text-slate-800">{taskMeta?.label}</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${task.valid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {task.valid ? "معتبر" : "نیازمند بررسی"}
              </span>
            </div>

            <div className="mt-3">
              {metricRow("تعداد هجا (تشخیص خودکار)", task.detectedSyllableCount)}
              {task.manualSyllableCount !== null
                ? metricRow("تعداد هجا (بازبینی دستی)", task.manualSyllableCount)
                : null}
              {metricRow("تعداد هجا (نهایی)", task.syllableCount)}
              {metricRow("نرخ تکرار (هجا/ثانیه)", task.ratePerSecond)}
              {metricRow("میانگین فاصله (ms)", task.meanIntervalMs)}
              {metricRow("انحراف معیار فاصله (ms)", task.sdIntervalMs)}
              {metricRow("ضریب تغییرات (CV %)", task.cvPercent)}
              {metricRow("مدت گفتار فعال (ms)", task.activeDurationMs)}
              {metricRow("مکث‌های غیرمنتظره", task.pauseCount)}
              {metricRow("مدت مکث‌ها (ms)", task.pauseDurationMs)}
              {metricRow("میانگین شدت (RMS)", task.meanRms)}
              {metricRow("دامنه شدت", task.rmsRange)}
              {metricRow("نسبت اشباع (clipping)", task.clippedRatio)}
              {metricRow("سطح نویز پیشزمینه", task.noiseFloorRms)}
              {metricRow("امتیاز اطمینان", `${toPersianDigits(task.confidence)} / ۱۰۰`)}
            </div>

            {task.limitations.length > 0 ? (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
                <ul className="list-inside list-disc space-y-0.5">
                  {task.limitations.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        );
      })}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-600">
        <h2 className="mb-2 text-sm font-bold text-slate-700">جمع‌بندی توصیفی</h2>
        {lowest ? <p>کمترین نرخ تکرار در تکلیف <span dir="ltr">{lowest}</span> مشاهده شد.</p> : null}
        {highestCv ? <p>بیشترین تغییرپذیری زمانی در تکلیف <span dir="ltr">{highestCv}</span> مشاهده شد.</p> : null}
        <p className="mt-2">
          این نتایج صرفاً توصیفی‌اند و به‌تنهایی برای تشخیص پزشکی، تعیین شدت بیماری یا
          جایگزینی ارزیابی متخصص گفتار کافی نیستند. تشخیص هجا بر اساس قلههای انرژی صوت انجام
          شده و در حضور نویز، لهجه یا کیفیت پایین میکروفون ممکن است دچار خطای شمارش شود.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          نسخه الگوریتم: {result.algorithmVersion} — مدت پیشنهادی هر تکلیف {toPersianDigits(AMR_CONFIG.targetDurationMs / 1000)} ثانیه.
        </p>
      </section>
    </div>
  );
}
