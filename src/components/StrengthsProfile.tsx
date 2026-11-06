import type { PsychTest, ScaleScore } from "@/lib/types";
import { toPersianDigits } from "@/lib/scoring";
import { domainBalance, domainStyle, rankTalents, suggestedCareers } from "@/lib/strengths";

const fa = (n: number | string) => toPersianDigits(n);

type Props = {
  test: PsychTest;
  scores: ScaleScore[];
  /** نسخه‌ی چاپی: همه‌ی بخش‌ها باز */
  print?: boolean;
};

/** گزارش تست استعدادیابی: ۵ استعداد برتر، توازن حوزه‌ها، استعدادهای فرعی، رتبه‌بندی کامل و شغل‌های پیشنهادی */
export default function StrengthsProfile({ test, scores, print }: Props) {
  const ranked = rankTalents(test, scores);
  const top5 = ranked.slice(0, 5);
  const secondary = ranked.slice(5, 10);
  const bottom = ranked.slice(-5);
  const domains = domainBalance(test, ranked);
  const careers = suggestedCareers(ranked);
  const leading = domains[0];

  return (
    <div className="space-y-5">
      {/* ─── ۵ استعداد برتر ─── */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5" data-testid="top5">
        <h3 className="font-extrabold">۵ استعداد برتر شما</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          این‌ها الگوهایی هستند که بیش از بقیه به‌طور طبیعی در فکر و رفتار شما دیده می‌شوند. با تمرین و سرمایه‌گذاری روی آن‌ها، به نقطه‌ی قوت تبدیل می‌شوند.
        </p>
        <ol className="mt-4 space-y-3">
          {top5.map((t) => {
            const st = domainStyle(t.domain);
            return (
              <li key={t.key} className={`break-inside-avoid rounded-xl border p-4 ${st.card}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-extrabold text-slate-700 shadow-sm">{fa(t.rank)}</span>
                  <b className="text-base">{t.title}</b>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${st.chip}`}>{t.domainTitle}</span>
                  <span className="ms-auto text-xs text-slate-500">{fa(t.percent)}٪</span>
                </div>
                {t.description && <p className="mt-2 text-xs text-slate-500">{t.description}</p>}
                <p className="mt-2 text-sm leading-7 text-slate-700">{t.result?.description}</p>
                {t.careers.length > 0 && (
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    <b>زمینه‌های مناسب: </b>
                    {t.careers.join("، ")}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ─── حوزه‌ها ─── */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5" data-testid="domains">
        <h3 className="font-extrabold">چهار حوزه‌ی استعداد</h3>
        {leading && (
          <p className="mt-1 text-sm leading-7 text-slate-600">
            حوزه‌ی غالب شما <b>{leading.title}</b> است{leading.description ? ` (${leading.description})` : ""}.
          </p>
        )}
        <div className="mt-4 space-y-3">
          {domains.map((d) => {
            const st = domainStyle(d.key);
            return (
              <div key={d.key}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${st.chip}`}>{d.title}</span>
                  <span className="text-xs text-slate-500">
                    {fa(d.inTop5)} از ۵ برتر · {fa(d.inTop10)} از ۱۰ برتر · میانگین {fa(d.percent)}٪
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${d.percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── شغل‌های پیشنهادی ─── */}
      {careers.length > 0 && (
        <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5" data-testid="careers">
          <h3 className="font-extrabold">شغل‌ها و رشته‌های پیشنهادی</h3>
          <p className="mt-1 text-xs leading-6 text-slate-500">بر اساس ۵ استعداد برتر شما؛ هرچه بالاتر، با استعدادهای بیشتری هماهنگ است.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {careers.map((c) => (
              <li key={c.title} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-700" title={c.from.join("، ")}>
                {c.title}
                {c.from.length > 1 && <span className="ms-1 text-[10px] text-brand-500">×{fa(c.from.length)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── استعدادهای فرعی ─── */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5" data-testid="secondary">
        <h3 className="font-extrabold">استعدادهای پشتیبان (رتبه‌ی ۶ تا ۱۰)</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">این استعدادها در کنار ۵ استعداد برتر، به شما کمک می‌کنند و در موقعیت‌های مناسب فعال می‌شوند.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {secondary.map((t) => (
            <li key={t.key} className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{fa(t.rank)}</span>
                <b>{t.title}</b>
                <span className={`ms-auto rounded-full border px-2 py-0.5 text-[11px] ${domainStyle(t.domain).chip}`}>{t.domainTitle}</span>
              </div>
              {t.description && <p className="mt-1 text-xs leading-6 text-slate-500">{t.description}</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* ─── رتبه‌بندی کامل ─── */}
      <details open={print} className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="ranking">
        <summary className="cursor-pointer font-extrabold">رتبه‌بندی کامل {fa(ranked.length)} استعداد</summary>
        <div className="mt-4 space-y-1.5">
          {ranked.map((t) => {
            const st = domainStyle(t.domain);
            return (
              <div key={t.key} className="grid grid-cols-[1.6rem_minmax(0,8rem)_1fr_2.6rem] items-center gap-2 text-xs sm:grid-cols-[1.8rem_10rem_1fr_3rem]">
                <span className="text-slate-400">{fa(t.rank)}</span>
                <span className="truncate" title={t.title}>
                  {t.title}
                </span>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${t.percent}%` }} />
                </div>
                <span className="text-end text-slate-500">{fa(t.percent)}٪</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          {(test.scaleGroups ?? []).map((g) => (
            <span key={g.key} className={`rounded-full border px-2 py-0.5 ${domainStyle(g.key).chip}`}>
              {g.title}
            </span>
          ))}
        </div>
      </details>

      {/* ─── کمتر غالب ─── */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5" data-testid="bottom">
        <h3 className="font-extrabold">استعدادهای کمتر غالب</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          این‌ها ضعف شما نیستند؛ فقط به‌طور طبیعی کمتر به سراغشان می‌روید. در این زمینه‌ها می‌توانید از همکارانی کمک بگیرید که این استعدادها را دارند.
        </p>
        <ul className="mt-3 space-y-2">
          {bottom.map((t) => (
            <li key={t.key} className="rounded-xl bg-slate-50 p-3 text-sm leading-7">
              <b>{t.title}</b> <span className="text-xs text-slate-400">(رتبه‌ی {fa(t.rank)})</span>
              <p className="text-xs text-slate-600">{test.scales.find((x) => x.key === t.key)?.results[0]?.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-xl bg-calm-50 p-3 text-xs leading-6 text-calm-700">
        نمره‌ها درون‌فردی‌اند: استعدادهای شما نسبت به یکدیگر رتبه‌بندی شده‌اند، نه در مقایسه با دیگران. نتیجه را با تجربه‌های واقعی خود بسنجید و برای
        انتخاب رشته یا شغل، با یک مشاور هم گفت‌وگو کنید.
      </p>
    </div>
  );
}
