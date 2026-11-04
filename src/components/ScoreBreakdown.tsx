import type { PsychTest, ScaleScore, TestAlert } from "@/lib/types";
import { toPersianDigits } from "@/lib/scoring";
import { levelStyle } from "@/lib/levels";

type Props = { test: PsychTest; scores: ScaleScore[]; alerts: TestAlert[]; compact?: boolean };

/** نمایش امتیاز همه‌ی مقیاس‌های یک تست؛ هم در صفحه‌ی نتیجه و هم در گزارش چاپی */
export default function ScoreBreakdown({ test, scores, alerts, compact }: Props) {
  return (
    <div className="space-y-4">
      {alerts.map((a) => (
        <div key={a.questionId} role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-800">
          <b>توجه مهم: </b>
          {a.message}
        </div>
      ))}

      {scores.map((s) => {
        const scale = test.scales.find((x) => x.key === s.key);
        const style = levelStyle(s.result?.level);
        const percent = Math.round(((s.score - s.min) / (s.max - s.min || 1)) * 100);
        return (
          <section key={s.key} className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-bold">{s.title}</h3>
                {scale?.description && <p className="mt-1 text-xs text-slate-500">{scale.description}</p>}
              </div>
              <span className={`rounded-full border px-3 py-1 text-sm font-bold ${style.badge}`}>{s.result?.title ?? "-"}</span>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                <span>
                  امتیاز: <b className="text-ink">{toPersianDigits(s.score)}</b> از {toPersianDigits(s.max)}
                </span>
                <span>{toPersianDigits(percent)}٪</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${percent}%` }} />
              </div>
            </div>

            {s.result && <p className="mt-3 text-sm leading-7 text-slate-600">{s.result.description}</p>}

            {!compact && scale && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {scale.results.map((r) => {
                  const active = r === s.result || (s.result && r.min === s.result.min && r.title === s.result.title);
                  return (
                    <span
                      key={r.title + r.min}
                      className={`rounded-lg border px-2 py-1 text-[11px] ${
                        active ? levelStyle(r.level).badge + " font-bold" : "border-slate-100 text-slate-400"
                      }`}
                    >
                      {r.title}: {toPersianDigits(r.min)}–{toPersianDigits(r.max)}
                    </span>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
