import type { PsychTest } from "@/lib/types";
import { LEVEL_LABEL, SKIP_VALUE, toPersianDigits, type Answers } from "@/lib/scoring";

const LEVELS = ["easy", "medium", "hard"] as const;

/** تعداد پاسخ درست، نادرست و «نمی‌دانم» در هر سطح دشواری */
export default function LevelBreakdown({ test, answers }: { test: PsychTest; answers: Answers }) {
  const rows = LEVELS.map((lv) => {
    const qs = test.questions.filter((q) => q.level === lv && q.answer !== undefined);
    const correct = qs.filter((q) => answers[q.id] === q.answer).length;
    const skipped = qs.filter((q) => answers[q.id] === SKIP_VALUE).length;
    return { lv, total: qs.length, correct, skipped, wrong: qs.length - correct - skipped };
  }).filter((r) => r.total);
  if (!rows.length) return null;
  return (
    <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold">عملکرد در سطح‌های دشواری</h3>
      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.lv}>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span className="font-medium text-ink">سطح {LEVEL_LABEL[r.lv]}</span>
              <span>
                درست {toPersianDigits(r.correct)} · نادرست {toPersianDigits(r.wrong)} · نمی‌دانم {toPersianDigits(r.skipped)} (از {toPersianDigits(r.total)})
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="bg-emerald-400" style={{ width: `${(r.correct / r.total) * 100}%` }} />
              <div className="bg-rose-300" style={{ width: `${(r.wrong / r.total) * 100}%` }} />
              <div className="bg-slate-300" style={{ width: `${(r.skipped / r.total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
