import type { PsychTest } from "@/lib/types";
import type { Answers } from "@/lib/scoring";
import { toPersianDigits } from "@/lib/scoring";
import { buildD2Report, type D2Index, type D2Match } from "@/lib/d2";
import { D2_COLS } from "@/data/d2-content";
import { levelStyle } from "@/lib/levels";

type Props = {
  test: PsychTest;
  answers: Answers;
  /** در گزارش چاپی فاصله‌ها کمی فشرده‌تر می‌شود */
  print?: boolean;
};

const fa = (value: number | string) => toPersianDigits(value);

function IndexCard({ index }: { index: D2Index }) {
  const style = levelStyle(index.level);
  return (
    <div className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">{index.code}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${style.badge}`}>{index.band}</span>
      </div>
      <p className="mt-2 text-sm font-bold text-slate-800">{index.title}</p>
      <p className="mt-1 text-2xl font-extrabold text-brand-700">
        {index.display} <span className="text-xs font-normal text-slate-500">{index.unit}</span>
      </p>
      <p className="mt-2 text-xs leading-6 text-slate-500">{index.description}</p>
      <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs leading-6 text-slate-700">{index.note}</p>
    </div>
  );
}

function MatchRow({ match }: { match: D2Match }) {
  const style = levelStyle(match.level);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-800">{match.title}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${style.badge}`}>{match.label}</span>
      </div>
      <p className="mt-1 text-xs leading-6 text-slate-500">{match.note}</p>
    </div>
  );
}

/** گزارش اختصاصی آزمون d2: ده شاخص، نمودار و جدول ردیف‌ها و تفسیر جامع فارسی */
export default function D2Profile({ test, answers, print }: Props) {
  const report = buildD2Report(test, answers);
  const best = new Set(report.bestRows);
  const weak = new Set(report.weakRows);
  const overallStyle = levelStyle(report.overall.level);
  const totals = report.totals;

  const highlights = [
    { label: "تعداد کل پردازش (TN)", value: fa(totals.tn), unit: "خانه" },
    { label: "نمره‌ی تمرکز (CP)", value: fa(totals.cp), unit: "امتیاز" },
    { label: "دقت (ACC)", value: `${fa(Math.round(totals.acc))}٪`, unit: "درصد" },
    { label: "سرعت پردازش (IPS)", value: fa(totals.ips.toFixed(2)), unit: "محرک در ثانیه" },
  ];

  return (
    <div className={print ? "space-y-4" : "space-y-5"}>
      {/* خلاصه‌ی کلی */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-gradient-to-l from-brand-50 to-calm-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">جمع‌بندی آزمون توجه و تمرکز d2</p>
            <h2 className="mt-1 text-xl font-extrabold text-brand-800">{report.overall.title}</h2>
          </div>
          <span className={`rounded-full border px-3 py-1 text-sm ${overallStyle.badge}`}>{report.overall.band ?? overallStyle.label}</span>
        </div>
        <p className="mt-3 text-sm leading-8 text-slate-700">{report.overall.paragraphs[0]}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.label} className="rounded-xl border border-white/70 bg-white/80 p-3 text-center">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-extrabold text-brand-700">{item.value}</p>
              <p className="text-[11px] text-slate-400">{item.unit}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ده شاخص */}
      <section className="break-inside-avoid">
        <h3 className="mb-3 font-bold text-slate-800">۱۰ شاخص آزمون d2</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {report.indices.map((index) => (
            <IndexCard key={index.key} index={index} />
          ))}
        </div>
      </section>

      {/* نمودار ردیف‌ها */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-800">نمودار تعداد پردازش در هر ردیف</h3>
          <p className="text-xs text-slate-500">
            بیشترین: {fa(totals.maxTn)} · کمترین: {fa(totals.minTn)} · نوسان (FR): {fa(totals.fr)}
          </p>
        </div>
        <div className="mt-4 flex items-end gap-1.5" dir="ltr">
          {report.rows.map((row) => {
            const tone = best.has(row.row) ? "bg-emerald-500" : weak.has(row.row) ? "bg-amber-500" : "bg-brand-500";
            const height = Math.max(2, Math.round((row.tn / D2_COLS) * 100));
            return (
              <div key={row.row} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500">{fa(row.tn)}</span>
                <div className="flex h-32 w-full items-end rounded bg-slate-100">
                  <div className={`w-full rounded-t ${tone}`} style={{ height: `${height}%` }} />
                </div>
                <span className="text-[10px] text-slate-400">{fa(row.row)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          ستون‌های سبز بهترین ردیف‌ها و ستون‌های نارنجی ضعیف‌ترین ردیف‌ها را نشان می‌دهند. ارتفاع هر ستون نسبت به ۴۷ محرک
          همان ردیف است.
        </p>
      </section>

      {/* جدول ردیف‌ها */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-800">جزئیات عملکرد در ۱۴ ردیف</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 text-start">ردیف</th>
                <th className="py-2 text-center">TN</th>
                <th className="py-2 text-center">TP</th>
                <th className="py-2 text-center">E1</th>
                <th className="py-2 text-center">E2</th>
                <th className="py-2 text-center">E</th>
                <th className="py-2 text-center">CP</th>
                <th className="py-2 text-center">دقت</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr
                  key={row.row}
                  className={`border-b border-slate-100 ${
                    best.has(row.row) ? "bg-emerald-50/60" : weak.has(row.row) ? "bg-amber-50/60" : ""
                  }`}
                >
                  <td className="py-1.5 font-bold text-slate-600">{fa(row.row)}</td>
                  <td className="py-1.5 text-center">{fa(row.tn)}</td>
                  <td className="py-1.5 text-center text-emerald-700">{fa(row.tp)}</td>
                  <td className="py-1.5 text-center text-amber-700">{fa(row.e1)}</td>
                  <td className="py-1.5 text-center text-rose-700">{fa(row.e2)}</td>
                  <td className="py-1.5 text-center">{fa(row.e)}</td>
                  <td className="py-1.5 text-center font-bold">{fa(row.cp)}</td>
                  <td className="py-1.5 text-center">{row.tn > 0 ? `${fa(row.accuracy)}٪` : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold text-slate-700">
                <td className="pt-2">مجموع</td>
                <td className="pt-2 text-center">{fa(totals.tn)}</td>
                <td className="pt-2 text-center">{fa(totals.tp)}</td>
                <td className="pt-2 text-center">{fa(totals.e1)}</td>
                <td className="pt-2 text-center">{fa(totals.e2)}</td>
                <td className="pt-2 text-center">{fa(totals.e)}</td>
                <td className="pt-2 text-center">{fa(totals.cp)}</td>
                <td className="pt-2 text-center">{fa(Math.round(totals.acc))}٪</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          TN تعداد محرک‌های پردازش‌شده، TP پاسخ‌های صحیح، E1 خطای حذف، E2 خطای ارتکاب، E مجموع خطاها و CP نمره‌ی تمرکز
          هر ردیف است.
        </p>
      </section>

      {/* تفسیر ده‌بخشی */}
      <section className="break-inside-avoid space-y-3">
        <h3 className="font-bold text-slate-800">تفسیر تفصیلی نتیجه</h3>
        {report.sections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h4 className="font-bold text-brand-700">{section.title}</h4>
            <div className="mt-2 space-y-2">
              {section.paragraphs.map((paragraph, i) => (
                <p key={i} className="text-sm leading-8 text-slate-700">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* تناسب تحصیلی */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-800">تناسب با رشته‌های تحصیلی</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          این بخش بر پایه‌ی نیاز رشته‌ها به توجه پایدار، دقت و کنترل خطا تنظیم شده است و توصیه‌ی قطعی انتخاب رشته نیست.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {report.academic.map((match) => (
            <MatchRow key={match.title} match={match} />
          ))}
        </div>
      </section>

      {/* تناسب شغلی */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-800">تناسب با محیط‌های کاری</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          توجه و تمرکز یکی از عوامل مؤثر در بسیاری از مشاغل است؛ این تحلیل جایگزین ارزیابی تخصصی و تجربه‌ی کاری نیست.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {report.jobs.map((match) => (
            <MatchRow key={match.title} match={match} />
          ))}
        </div>
      </section>

      {/* زندگی روزمره */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-800">کاربرد نتیجه در زندگی روزمره</h3>
        <ul className="mt-3 list-disc space-y-2 pe-5 text-sm leading-8 text-slate-700">
          {report.dailyLife.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      {/* برنامه‌ی بهبود */}
      <section className="break-inside-avoid rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
        <h3 className="font-bold text-emerald-800">برنامه‌ی پیشنهادی برای تقویت توجه و تمرکز</h3>
        <ol className="mt-3 list-decimal space-y-2 pe-5 text-sm leading-8 text-emerald-900">
          {report.plan.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      </section>

      {/* نکات نظری */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-bold text-slate-800">درباره‌ی آزمون و شاخص‌ها</h3>
        <div className="mt-2 space-y-2">
          {report.theory.map((paragraph, i) => (
            <p key={i} className="text-xs leading-7 text-slate-600">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <p className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
        این گزارش یک توصیف عملکردی از توجه و تمرکز در لحظه‌ی آزمون است و تشخیص بالینی محسوب نمی‌شود. نسخه‌ی فارسی این
        آزمون در مایندمتر هنجار رسمی جمعیت ایران ندارد و مقایسه با گروه‌های هنجاری معتبر نیازمند جدول‌های سنی و پژوهشی
        است. برای تفسیر نهایی، نتیجه را در کنار مصاحبه و سایر ارزیابی‌ها توسط روان‌شناس یا روان‌پزشک بررسی کنید.
      </p>
    </div>
  );
}
