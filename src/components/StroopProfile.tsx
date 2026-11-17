import type { PsychTest, ResultLevel } from "@/lib/types";
import type { Answers } from "@/lib/scoring";
import { toPersianDigits } from "@/lib/scoring";
import { buildStroopReport, type StroopCondition, type StroopModeView } from "@/lib/stroop-report";

const LEVEL_STYLE: Record<ResultLevel, string> = {
  normal: "bg-emerald-50 text-emerald-700",
  mild: "bg-amber-50 text-amber-700",
  moderate: "bg-orange-50 text-orange-700",
  high: "bg-rose-50 text-rose-700",
  severe: "bg-red-50 text-red-700",
};

function ConditionBar({ cond, tone }: { cond: StroopCondition; tone: string }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{cond.label}</span>
        <span dir="ltr">{toPersianDigits(cond.accuracy)}٪ · {toPersianDigits(cond.meanRt)} ms</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${cond.accuracy}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {toPersianDigits(cond.correct)} درست از {toPersianDigits(cond.total)}
      </p>
    </div>
  );
}

function ModeCard({ view }: { view: StroopModeView }) {
  return (
    <section data-testid={`stroop-${view.mode}`} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-800">{view.label}</h3>
          <p className="mt-1 text-xs text-slate-500">نام گذاری رنگ جوهر در {toPersianDigits(view.total)} کارت</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${LEVEL_STYLE[view.level]}`}>{view.title}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-brand-50 p-3">
          <p className="text-2xl font-extrabold text-brand-700">{toPersianDigits(view.accuracy)}٪</p>
          <p className="mt-1 text-[11px] text-slate-500">دقت</p>
        </div>
        <div className="rounded-xl bg-calm-50 p-3">
          <p className="text-2xl font-extrabold text-calm-700" dir="ltr">{toPersianDigits(view.meanRt)}</p>
          <p className="mt-1 text-[11px] text-slate-500">میانگین زمان (ms)</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-2xl font-extrabold text-amber-700" dir="ltr">{toPersianDigits(Math.abs(view.interference))}</p>
          <p className="mt-1 text-[11px] text-slate-500">تداخل (ms)</p>
          <p className="text-[10px] text-slate-400">{view.interference >= 0 ? "شرط چالش کندتر" : "شرط چالش سریعتر"}</p>
        </div>
      </div>

      <div className="mt-4">
        <ConditionBar cond={view.baseline} tone="bg-emerald-500" />
        <ConditionBar cond={view.challenge} tone="bg-rose-500" />
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">{view.note}</p>
    </section>
  );
}

export default function StroopProfile({ test, answers, print }: { test: PsychTest; answers: Answers; print?: boolean }) {
  const report = buildStroopReport(test, answers);

  return (
    <div className={print ? "space-y-3" : "space-y-5"}>
      <section data-testid="stroop-summary" className="rounded-2xl bg-gradient-to-l from-brand-50 to-calm-50 p-5">
        <h3 className="text-lg font-extrabold text-brand-700">{report.summaryTitle}</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-white px-3 py-1 text-slate-700">دقت کلی: {toPersianDigits(report.overall.accuracy)}٪</span>
          <span className="rounded-full bg-white px-3 py-1 text-slate-700">پاسخ درست: {toPersianDigits(report.overall.correct)} از {toPersianDigits(report.overall.total)}</span>
          <span className="rounded-full bg-white px-3 py-1 text-slate-700" dir="ltr">میانگین زمان: {toPersianDigits(report.overall.meanRt)} ms</span>
        </div>
      </section>

      <ModeCard view={report.classic} />
      <ModeCard view={report.emotional} />

      <section data-testid="stroop-details" className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-extrabold text-slate-800">تفسیر نتایج</h3>
        <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
          {report.summaryParagraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <p className="rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">
        در نمودارها، میزان تداخل برابر است با تفاوت میانگین زمان واکنش در شرط چالش و شرط زمینه. عدد مثبت یعنی شرط چالش کندتر پاسخ داده شده است.
      </p>
    </div>
  );
}
