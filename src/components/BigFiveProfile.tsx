import type { PsychTest, ScaleScore } from "@/lib/types";
import { toPersianDigits } from "@/lib/scoring";
import { LEVEL_TITLE, LEVEL_TONE, band3, bigFiveScores, type TraitScore } from "@/lib/bigfive";

const fa = (n: number | string) => toPersianDigits(n);
const pos = (t: number) => ((Math.max(20, Math.min(80, t)) - 20) / 60) * 100;

type Props = {
  test: PsychTest;
  scores: ScaleScore[];
  age?: number | null;
  sex?: string | null;
  /** نسخه‌ی چاپی: همه‌ی بخش‌ها باز */
  print?: boolean;
};

/** نوار T از ۲۰ تا ۸۰ با محدوده‌ی میانگین (۴۵ تا ۵۵) */
function TBar({ t, bar }: { t: number; bar: string }) {
  return (
    <div className="relative h-2.5 rounded-full bg-slate-100" dir="ltr">
      <span className="absolute inset-y-0 rounded-full bg-slate-200" style={{ left: `${pos(45)}%`, width: `${pos(55) - pos(45)}%` }} />
      <span className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${bar}`} style={{ left: `${pos(t)}%` }} />
    </div>
  );
}

const resultText = (test: PsychTest, s: TraitScore) => {
  const scale = test.scales.find((x) => x.key === s.key);
  const i = { low: 0, mid: 1, high: 2 }[band3(s.level)];
  return scale?.results[i]?.description ?? "";
};

/** گزارش پنج عامل بزرگ و ۳۰ جنبه با نمره‌ی T بر اساس هنجار سنی و جنسی */
export default function BigFiveProfile({ test, scores, age, sex, print }: Props) {
  const { norm, traits } = bigFiveScores(test, scores, sex, age);
  const domains = traits.filter((s) => s.group === "domains");
  const facets = traits.filter((s) => s.group !== "domains");
  const groups = (test.scaleGroups ?? []).filter((g) => g.key !== "domains");
  const standout = [...facets].sort((a, b) => Math.abs(b.t - 50) - Math.abs(a.t - 50)).filter((s) => s.level !== "mid").slice(0, 6);
  const titleOf = (key: string) => test.scales.find((x) => x.key === key)?.title ?? key;

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-calm-50 p-3 text-xs leading-6 text-calm-700" data-testid="norm-group">
        نمره‌ها در مقایسه با <b>{norm?.label}</b> ({test.builtInNorms?.source}) به نمره‌ی T تبدیل شده‌اند؛ میانگین ۵۰ و بازه‌ی ۴۵ تا ۵۵ «متوسط» است.
        {norm && norm.missing.length > 0 && <> برای مقایسه‌ی دقیق‌تر، {norm.missing.join(" و ")} را در پروفایل خود وارد کنید.</>}
      </p>

      {/* ─── پنج عامل ─── */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5" data-testid="domains">
        <h3 className="font-extrabold">پنج عامل بزرگ شخصیت شما</h3>
        <div className="mt-4 space-y-4">
          {domains.map((s) => {
            const tone = LEVEL_TONE[s.level];
            return (
              <div key={s.key} className="break-inside-avoid rounded-xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <b>{s.title}</b>
                  <span dir="ltr" className="font-mono text-[11px] text-slate-400">
                    {s.key}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${tone.badge}`}>{LEVEL_TITLE[s.level]}</span>
                  <span className="ms-auto text-xs text-slate-500">
                    T={fa(s.t)} · صدک {fa(s.percentile)}
                  </span>
                </div>
                <div className="mt-3">
                  <TBar t={s.t} bar={tone.bar} />
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{resultText(test, s)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── ویژگی‌های برجسته ─── */}
      {standout.length > 0 && (
        <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5" data-testid="standout">
          <h3 className="font-extrabold">برجسته‌ترین ویژگی‌های شما</h3>
          <p className="mt-1 text-xs text-slate-500">جنبه‌هایی که بیشترین فاصله را با میانگین دارند.</p>
          <ul className="mt-3 space-y-2">
            {standout.map((s) => (
              <li key={s.key} className="rounded-xl bg-slate-50 p-3 text-sm leading-7">
                <b>{s.title}</b> <span className="text-xs text-slate-400">({titleOf(s.group)})</span>{" "}
                <span className={`ms-1 rounded-full border px-2 py-0.5 text-[11px] ${LEVEL_TONE[s.level].badge}`}>{LEVEL_TITLE[s.level]}</span>
                <p className="text-slate-600">{resultText(test, s)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── ۳۰ جنبه ─── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="facets">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-extrabold">نیم‌رخ {fa(facets.length)} جنبه</h3>
          <p className="text-xs text-slate-500">نوار خاکستری = محدوده‌ی متوسط (T ۴۵ تا ۵۵)</p>
        </div>
        {groups.map((g) => {
          const rows = facets.filter((s) => s.group === g.key);
          const dom = domains.find((d) => d.key === g.key);
          return (
            <div key={g.key} className="mt-5 break-inside-avoid">
              <h4 className="text-sm font-bold text-brand-700">
                {titleOf(g.key)} {dom && <span className="text-xs font-normal text-slate-500">(T={fa(dom.t)})</span>}
              </h4>
              <div className="mt-2 space-y-2">
                {rows.map((s) => (
                  <div key={s.key} className="grid grid-cols-[minmax(0,7rem)_1fr_1.8rem] items-center gap-2 text-xs sm:grid-cols-[11rem_1fr_6rem]">
                    <span className="truncate" title={s.title}>
                      <span dir="ltr" className="me-1 font-mono text-[10px] text-slate-400">
                        {s.key}
                      </span>
                      {s.title}
                    </span>
                    <TBar t={s.t} bar={LEVEL_TONE[s.level].bar} />
                    <span className="flex items-center justify-end gap-1 whitespace-nowrap">
                      <span className="text-slate-500">{fa(s.t)}</span>
                      <span className={`hidden rounded-full border px-1.5 py-0.5 text-[10px] sm:inline ${LEVEL_TONE[s.level].badge}`}>{LEVEL_TITLE[s.level]}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* ─── تفسیر کامل ─── */}
      <details open={print} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="interpretation">
        <summary className="cursor-pointer font-extrabold">تفسیر همه‌ی جنبه‌ها</summary>
        {groups.map((g) => (
          <div key={g.key} className="mt-4">
            <h4 className="text-sm font-bold text-brand-700">{titleOf(g.key)}</h4>
            <dl className="mt-2 space-y-2">
              {facets
                .filter((s) => s.group === g.key)
                .map((s) => (
                  <div key={s.key} className="break-inside-avoid rounded-xl bg-slate-50 p-3 text-sm leading-7">
                    <dt>
                      <b>{s.title}</b>{" "}
                      <span className={`ms-1 rounded-full border px-2 py-0.5 text-[11px] ${LEVEL_TONE[s.level].badge}`}>
                        {LEVEL_TITLE[s.level]} · T={fa(s.t)}
                      </span>
                      <span className="block text-xs text-slate-500">{test.scales.find((x) => x.key === s.key)?.description}</span>
                    </dt>
                    <dd className="text-slate-700">{resultText(test, s)}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </details>

      <p className="text-xs leading-6 text-slate-500">
        هیچ نمره‌ای «خوب» یا «بد» نیست؛ هر سطح از هر ویژگی در موقعیت‌هایی مزیت و در موقعیت‌هایی چالش است. {test.source.persianNote}
      </p>
    </div>
  );
}
