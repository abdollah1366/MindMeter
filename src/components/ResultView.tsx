import Link from "next/link";
import type { PsychTest } from "@/lib/types";
import { findResult, maxScore, toPersianDigits } from "@/lib/scoring";

type Props = { test: PsychTest; score: number; onRestart: () => void };

export default function ResultView({ test, score, onRestart }: Props) {
  const max = maxScore(test);
  const min = Math.min(...test.results.map((r) => r.min));
  const result = findResult(test, score);
  const percent = Math.round(((score - min) / (max - min || 1)) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">نتیجه‌ی تست شما</p>
      <h2 className="mt-1 text-2xl font-extrabold text-brand-600">{result?.title ?? "-"}</h2>
      <p className="mt-3 leading-8 text-slate-600">{result?.description}</p>

      {/* نمودار امتیاز */}
      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm">
          <span>امتیاز شما: <b>{toPersianDigits(score)}</b> از {toPersianDigits(max)}</span>
          <span className="text-slate-500">{toPersianDigits(percent)}٪</span>
        </div>
        <div className="relative h-3 rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* همه‌ی سطح‌ها */}
      <div className="mt-6 grid gap-2">
        {test.results.map((r) => {
          const active = r === result;
          return (
            <div
              key={r.title}
              className={`flex items-center justify-between rounded-xl border px-4 py-2 text-sm ${
                active ? "border-brand-500 bg-brand-50 font-bold text-brand-700" : "border-slate-100 text-slate-500"
              }`}
            >
              <span>{r.title}</span>
              <span>
                {toPersianDigits(r.min)} تا {toPersianDigits(r.max)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
        این نتیجه فقط جنبه‌ی آگاهی‌بخشی دارد و تشخیص بالینی نیست. برای ارزیابی دقیق با روانشناس مشورت کنید.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onRestart} className="rounded-xl bg-brand-600 px-5 py-2 text-white hover:bg-brand-700">
          انجام دوباره
        </button>
        <Link href="/my-results" className="rounded-xl border border-slate-300 px-5 py-2 hover:bg-slate-50">
          نتایج من
        </Link>
        <Link href="/tests" className="rounded-xl border border-slate-300 px-5 py-2 hover:bg-slate-50">
          تست‌های دیگر
        </Link>
      </div>
    </div>
  );
}
