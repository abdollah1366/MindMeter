import type { PsychTest, ScaleScore, TestAlert } from "@/lib/types";
import type { NormComparison, NormReport } from "@/lib/norms";
import { optionsFor, toPersianDigits, type Answers } from "@/lib/scoring";
import { levelStyle } from "@/lib/levels";
import { VALIDITY_LABEL, elevatedScales, hasValidityGroup, matchPattern, percentOf, validityStatus } from "@/lib/inventory";

const fa = (n: number) => toPersianDigits(n);
/** حداقل اندازه‌ی گروه شرکت‌کنندگان برای نمایش نمره‌ی T */
const MIN_T_GROUP = 30;
/** مرز نمره‌ی T که بالاتر از آن «برجسته» در نظر گرفته می‌شود */
const T_CUT = 65;

type Props = {
  test: PsychTest;
  scores: ScaleScore[];
  alerts: TestAlert[];
  answers?: Answers;
  norm?: NormReport | null;
  /** نسخه‌ی چاپی: همه‌ی بخش‌ها باز */
  print?: boolean;
  /** فهرست پاسخ‌های نیازمند پیگیری (برای گزارش متخصص) */
  showCritical?: boolean;
};

/** گزارش سه‌سطحی پرسشنامه‌های چندمقیاسی: خلاصه، نیم‌رخ، تفسیر کامل */
export default function InventoryProfile({ test, scores, alerts, answers, norm, print, showCritical }: Props) {
  const byKey = new Map(scores.map((s) => [s.key, s]));
  const groups = test.scaleGroups ?? [];
  const scalesIn = (g: string) => test.scales.filter((s) => s.group === g).map((s) => byKey.get(s.key)).filter((s): s is ScaleScore => !!s);

  const comparison: NormComparison | null = norm?.official ?? (norm?.participants && norm.participants.n >= MIN_T_GROUP ? norm.participants : null);
  // شاخص‌های اعتبار با نمره‌ی خام و بازه‌ی ثابت خودشان تفسیر می‌شوند، نه با T
  const validityKeys = new Set(test.scales.filter((s) => groups.find((g) => g.key === s.group)?.validity).map((s) => s.key));
  const tOf = (key: string) =>
    comparison?.metric === "T" && !validityKeys.has(key) ? comparison.scales.find((s) => s.key === key)?.standard ?? null : null;

  const validity = validityStatus(test, scores);
  const v = VALIDITY_LABEL[validity.level];
  const pattern = matchPattern(test, scores);
  const higher = groups.find((g) => g.key === "higher");
  const elevated = elevatedScales(test, scores).filter((s) => test.scales.find((x) => x.key === s.key)?.group !== "higher");

  const critical =
    showCritical && answers
      ? test.questions.filter((q) => {
          if (!q.critical || answers[q.id] === undefined) return false;
          const values = optionsFor(test, q).map((o) => o.value);
          // پاسخ در نیمه‌ی بالای طیف (مثلاً «درست» یا «گاهی» و بیشتر) کلیدی است
          const lo = Math.min(...values);
          const hi = Math.max(...values);
          return answers[q.id] > lo && answers[q.id] >= (lo + hi) / 2;
        })
      : [];

  return (
    <div className="space-y-5">
      {alerts.filter((a, i) => alerts.findIndex((b) => b.message === a.message) === i).map((a) => (
        <div key={a.questionId} role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-800">
          <b>توجه مهم: </b>
          {a.message}
        </div>
      ))}

      {/* ─── سطح ۱: خلاصه ─── */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-extrabold">خلاصه‌ی نتیجه</h3>

        {pattern && (
          <div className={`mt-4 rounded-xl border p-4 text-sm leading-7 ${levelStyle(pattern.level).badge}`} data-testid="pattern">
            <p className="text-xs opacity-80">الگوی غالب</p>
            <p className="font-extrabold">{pattern.title}</p>
            <p className="mt-1">{pattern.description}</p>
          </div>
        )}

        {hasValidityGroup(test) && <div className={`mt-4 rounded-xl border p-4 text-sm leading-7 ${v.tone}`} data-testid="validity">
          <p className="font-bold">{v.title}</p>
          {validity.flagged.length === 0 ? (
            <p>به سؤال‌های کنترلی پاسخ هماهنگ و واقع‌بینانه داده‌اید.</p>
          ) : (
            <ul className="mt-1 list-disc space-y-1 ps-5">
              {validity.flagged.map((s) => (
                <li key={s.key}>
                  <b>{s.title}:</b> {s.result?.description}
                </li>
              ))}
            </ul>
          )}
        </div>}

        {higher && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {scalesIn("higher").map((s) => {
              const st = levelStyle(s.result?.level);
              const t = tOf(s.key);
              return (
                <div key={s.key} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{s.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${st.badge}`}>{s.result?.title}</span>
                    <span className="text-xs text-slate-500">{t != null ? `T=${fa(t)}` : `${fa(percentOf(s))}٪`}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${percentOf(s)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <h4 className="mt-5 text-sm font-bold">یافته‌های برجسته</h4>
        {elevated.length === 0 ? (
          <p className="mt-2 text-sm leading-7 text-slate-600">هیچ‌کدام از مقیاس‌های محتوایی در محدوده‌ی بالا نیست.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {elevated.slice(0, print ? elevated.length : 6).map((s) => (
              <li key={s.key} className="rounded-xl border border-slate-100 p-3 text-sm leading-7">
                <span className={`me-2 rounded-full border px-2 py-0.5 text-xs font-bold ${levelStyle(s.result?.level).badge}`}>{s.result?.title}</span>
                <b>{s.title}</b>
                <p className="mt-1 text-slate-600">{s.result?.description}</p>
              </li>
            ))}
            {!print && elevated.length > 6 && (
              <li className="text-xs text-slate-500">و {fa(elevated.length - 6)} مقیاس دیگر؛ در نیم‌رخ زیر ببینید.</li>
            )}
          </ul>
        )}
      </section>

      {/* ─── سطح ۲: نیم‌رخ ─── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="profile">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-extrabold">نیم‌رخ مقیاس‌ها</h3>
          <p className="text-xs text-slate-500">
            {comparison?.metric === "T"
              ? `نمره‌ی T در مقایسه با ${toPersianDigits(comparison.groupLabel)} (${fa(comparison.n)} نفر)؛ خط‌چین = T ${fa(T_CUT)}`
              : "درصد پاسخ‌های کلیدی در هر مقیاس"}
          </p>
        </div>
        {groups.map((g) => {
          const rows = scalesIn(g.key);
          if (!rows.length) return null;
          return (
            <div key={g.key} className="mt-5 break-inside-avoid">
              <h4 className="text-sm font-bold text-brand-700">{g.title}</h4>
              {g.description && <p className="text-xs text-slate-500">{g.description}</p>}
              <div className="mt-2 space-y-1.5">
                {rows.map((s) => {
                  const scale = test.scales.find((x) => x.key === s.key);
                  const st = levelStyle(s.result?.level);
                  const t = tOf(s.key);
                  const width = t != null ? Math.max(0, Math.min(100, ((t - 20) / 80) * 100)) : percentOf(s);
                  return (
                    <div key={s.key} className="grid grid-cols-[3.4rem_minmax(0,9rem)_1fr_auto] items-center gap-2 text-xs sm:grid-cols-[3.6rem_13rem_1fr_7.5rem]">
                      <span dir="ltr" className="font-mono text-[11px] text-slate-400">
                        {scale?.code ?? s.key}
                      </span>
                      <span className="truncate" title={s.title}>
                        {s.title}
                      </span>
                      <div className="relative h-2.5 rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${width}%` }} />
                        {t != null && <span className="absolute inset-y-[-3px] border-s border-dashed border-slate-500" style={{ right: `${((T_CUT - 20) / 80) * 100}%` }} />}
                      </div>
                      <span className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <span className="text-slate-500">{t != null ? fa(t) : `${fa(s.score)}/${fa(s.max)}`}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${st.badge}`}>{s.result?.title}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {comparison?.metric !== "T" && (
          <p className="mt-5 rounded-xl bg-calm-50 p-3 text-xs leading-6 text-calm-700">
            بازه‌های پایین/متوسط/بالا موقت هستند و بر اساس درصد پاسخ‌های کلیدی تعیین شده‌اند. وقتی دست‌کم {fa(MIN_T_GROUP)} نفر هم‌گروه شما (سن و جنس)
            آزمون را انجام دهند، نمره‌ی T (میانگین ۵۰، انحراف معیار ۱۰) هم نمایش داده می‌شود.
          </p>
        )}
      </section>

      {/* ─── سطح ۳: تفسیر کامل ─── */}
      <details open={print} className="group rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer font-extrabold">تفسیر کامل همه‌ی مقیاس‌ها</summary>
        {groups.map((g) => (
          <div key={g.key} className="mt-4">
            <h4 className="text-sm font-bold text-brand-700">{g.title}</h4>
            <dl className="mt-2 space-y-2">
              {scalesIn(g.key).map((s) => {
                const scale = test.scales.find((x) => x.key === s.key);
                return (
                  <div key={s.key} className="break-inside-avoid rounded-xl bg-slate-50 p-3 text-sm leading-7">
                    <dt>
                      <b>{s.title}</b> <span className={`ms-1 rounded-full border px-2 py-0.5 text-[11px] ${levelStyle(s.result?.level).badge}`}>{s.result?.title}</span>
                      {scale?.description && <span className="block text-xs text-slate-500">{scale.description}</span>}
                    </dt>
                    <dd className="text-slate-700">{s.result?.description}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </details>

      {critical.length > 0 && (
        <section className="break-inside-avoid rounded-2xl border border-amber-200 bg-amber-50 p-5" data-testid="critical">
          <h3 className="font-extrabold text-amber-900">پاسخ‌های نیازمند پیگیری</h3>
          <p className="mt-1 text-xs text-amber-800">این جمله‌ها را مراجع «درست» دانسته است و بهتر است در مصاحبه‌ی بالینی بررسی شوند.</p>
          <ul className="mt-3 list-disc space-y-1 ps-5 text-sm leading-7 text-amber-900">
            {critical.map((q) => (
              <li key={q.id}>{q.text}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
