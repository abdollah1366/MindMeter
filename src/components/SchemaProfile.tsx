import type { PsychTest, ScaleScore } from "@/lib/types";
import { toPersianDigits } from "@/lib/scoring";
import { levelStyle } from "@/lib/levels";
import { buildSchemaReport, type SchemaScoreView } from "@/lib/schema-report";

const fa = (n: number | string) => toPersianDigits(n);

type Props = {
  test: PsychTest;
  scores: ScaleScore[];
  /** نسخه‌ی چاپی: همه‌ی بخشها بازاند */
  print?: boolean;
};

/** گزارش تست طرحوارههای ناسازگار: نمودار ۱۸ طرحواره و ۵ حوزه، تفسیر اختصاصی و شاخص اکتشافی شخصیت */
export default function SchemaProfile({ test, scores, print }: Props) {
  const report = buildSchemaReport(scores);
  const leadingDomain = [...report.domains].sort((a, b) => b.percent - a.percent)[0];

  return (
    <div className="space-y-5">
      {/* ─── خلاصهی ۵ حوزه ─── */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5" data-testid="schema-domains">
        <h3 className="font-extrabold">خلاصهی ۵ حوزهی طرحواره</h3>
        {leadingDomain && (
          <p className="mt-1 text-sm leading-7 text-slate-600">
            حوزهای که بیشترین فعالیت را در نتیجهی شما دارد: <b>{leadingDomain.domain.title}</b>.
          </p>
        )}
        <div className="mt-4 space-y-3">
          {report.domains.map((d) => (
            <div key={d.domain.key}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{d.domain.title}</span>
                <span className="text-xs text-slate-500">
                  {fa(d.score.result?.title ?? "-")} · {fa(d.percent)}٪
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${levelStyle(d.score.result?.level).bar}`} style={{ width: `${d.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── نمودار ۱۸ طرحواره ─── */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5" data-testid="schema-chart">
        <h3 className="font-extrabold">نمودار ۱۸ طرحوارهی ناسازگار</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          میزان مطابقت هر عبارت با زندگی معمولی شما؛ هرچه نوار بلندتر باشد، الگوی مربوطه فعالتر است.
        </p>
        <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {report.schemas.map((v) => {
            const style = levelStyle(v.score.result?.level);
            return (
              <div key={v.schema.key}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span title={v.schema.description}>
                    <span className="font-mono text-slate-400">{v.schema.code}</span> {v.schema.title}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 ${style.badge}`}>{fa(v.percent)}٪</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${v.percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── طرحوارههای غالب ─── */}
      {report.dominant.length > 0 && (
        <section className="break-inside-avoid rounded-2xl border border-brand-200 bg-brand-50/60 p-5" data-testid="schema-dominant">
          <h3 className="font-extrabold text-brand-700">طرحوارههای غالب شما</h3>
          <p className="mt-1 text-xs leading-6 text-slate-600">
            این طرحوارهها دست کم در سطح متوسط قرار دارند و احتمالاً الگوی تکرارشوندهای در زندگی شما می سازند.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {report.dominant.map((v) => (
              <li key={v.schema.key} className={`rounded-full border bg-white px-3 py-1.5 text-xs ${levelStyle(v.score.result?.level).badge}`}>
                <b>{v.schema.title}</b> · {fa(v.score.result?.title ?? "-")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── شاخص اکتشافی الگوهای شخصیتی ─── */}
      {report.pd.length > 0 && (
        <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5" data-testid="schema-pd">
          <h3 className="font-extrabold">پیش بینی اکتشافی الگوهای شخصیتی</h3>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            شاخصی بر اساس الگوی نمرهها در طرحوارههای مرتبط. این عدد <b>احتمال ابتلا به اختلال شخصیت نیست</b> و تنها زمینهای برای گفتگو با متخصص است.
          </p>
          <div className="mt-4 space-y-3">
            {report.pd.slice(0, 5).map((row) => (
              <div key={row.code}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-xs text-slate-500">{fa(row.percent)}٪</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-400" style={{ width: `${row.percent}%` }} />
                </div>
                {row.drivers.length > 0 && (
                  <p className="mt-1 text-[11px] text-slate-400">سهم اصلی: {row.drivers.join("، ")}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── تفسیر اختصاصی تک تک طرحوارهها ─── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="schema-details">
        <h3 className="font-extrabold">تفسیر اختصاصی هر طرحواره</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          برای هر طرحواره، توضیح، ریشهی تحولی، راهکار، تمرین عملی و پیشنهاد منابع حمایتی آورده شده است.
        </p>
        <div className="mt-4 space-y-3">
          {report.schemas.map((v) => (
            <SchemaDetail key={v.schema.key} view={v} open={print || v.severity >= 2} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SchemaDetail({ view, open }: { view: SchemaScoreView; open: boolean }) {
  const { schema, score, percent } = view;
  const style = levelStyle(score.result?.level);
  return (
    <details open={open} className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${style.badge}`}>{fa(score.result?.title ?? "-")}</span>
        <b>{schema.title}</b>
        <span className="font-mono text-[11px] text-slate-400">{schema.code}</span>
        <span className="ms-auto text-xs text-slate-500">{fa(percent)}٪</span>
      </summary>

      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
        <p>{schema.description}</p>
        {score.result && <p className="text-slate-600">{score.result.description}</p>}

        <div>
          <h4 className="text-xs font-bold text-slate-500">ریشهی تحولی</h4>
          <p>{schema.roots}</p>
        </div>

        <div>
          <h4 className="text-xs font-bold text-emerald-700">راهکارهای عملی</h4>
          <ul className="list-disc space-y-1 pe-5 text-emerald-900">
            {schema.strategies.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold text-sky-700">تمرین پیشنهادی</h4>
          <ul className="list-disc space-y-1 pe-5 text-sky-900">
            {schema.exercises.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>

        {schema.movies.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-amber-700">منبع حمایتی (فیلم)</h4>
            <ul className="space-y-1">
              {schema.movies.map((m) => (
                <li key={m.title} className="text-amber-900">
                  <i>{m.title}</i> — {m.note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
