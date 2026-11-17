"use client";

import type { PsychTest, ScaleScore } from "@/lib/types";
import { toPersianDigits } from "@/lib/scoring";
import { levelStyle } from "@/lib/levels";
import { buildEnrichReport, type EnrichScaleView } from "@/lib/enrich-report";

const fa = (n: number | string) => toPersianDigits(n);

type Props = { test: PsychTest; scores: ScaleScore[]; print?: boolean };

export default function EnrichProfile({ test, scores, print }: Props) {
  const report = buildEnrichReport(scores);
  const growthKeys = new Set(report.growth.map((v) => v.content.key));
  const overall = report.overall;
  const overallPercent = overall
    ? Math.round(((overall.score - overall.min) / (overall.max - overall.min || 1)) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Overall index + four domain bars */}
      <section className="break-inside-avoid space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-500">نمودار رضایت زناشویی</h3>
            <p className="mt-1 text-lg font-extrabold text-slate-800">{report.summaryTitle}</p>
          </div>
          {overall?.result && (
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${levelStyle(overall.result.level).badge}`}>
                {fa(overall.result.title)}
              </span>
              <span className="font-mono text-sm text-slate-500" dir="ltr">
                {fa(overallPercent)}٪
              </span>
            </div>
          )}
        </div>

        {report.summaryParagraphs.map((p, i) => (
          <p key={i} className="text-sm leading-7 text-slate-600">{p}</p>
        ))}

        <div data-testid="enrich-groups" className="space-y-3 border-t border-slate-100 pt-4">
          {report.groups.map((g) => (
            <div key={g.group.key}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-slate-700">{g.group.title}</span>
                <span className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${levelStyle(g.score.result?.level).badge}`}>
                    {fa(g.score.result?.title ?? "—")}
                  </span>
                  <span className="font-mono text-xs text-slate-400" dir="ltr">{fa(g.percent)}٪</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${levelStyle(g.score.result?.level).bar}`}
                  style={{ width: `${g.percent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs leading-6 text-slate-500">{g.group.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* All 15 scales */}
      <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-500">نمره های مؤلفه ها</h3>
        <div data-testid="enrich-chart" className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {report.scales.map((v) => (
            <div key={v.content.key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="font-mono text-[11px] text-slate-400" dir="ltr">{v.content.code}</span>
                  <span className="truncate font-bold text-slate-700">{v.content.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${levelStyle(v.score.result?.level).badge}`}>
                    {fa(v.score.result?.title ?? "—")}
                  </span>
                  <span className="font-mono text-xs text-slate-400" dir="ltr">{fa(v.percent)}٪</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${levelStyle(v.score.result?.level).bar}`}
                  style={{ width: `${v.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Strengths & growth areas */}
      {(report.strengths.length > 0 || report.growth.length > 0) && (
        <section className="break-inside-avoid rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
          <h3 className="mb-4 text-sm font-bold text-brand-700">خلاصه تحلیل</h3>
          <div data-testid="enrich-focus" className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold text-emerald-700">نقاط قوت</p>
              <div className="flex flex-wrap gap-2">
                {report.strengths.length ? (
                  report.strengths.slice(0, 5).map((v) => (
                    <span key={v.content.key} className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700">
                      {v.content.title} · {fa(v.percent)}٪
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">مؤلفهای در سطح عالی دیده نشد.</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-rose-700">حوزه های نیازمند توجه</p>
              <div className="flex flex-wrap gap-2">
                {report.growth.length ? (
                  report.growth.slice(0, 5).map((v) => (
                    <span key={v.content.key} className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700">
                      {v.content.title} · {fa(v.percent)}٪
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">مؤلفهای نیازمند توجهی دیده نشد.</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Per-scale interpretation */}
      <section className="space-y-3">
        <h3 className="px-1 text-sm font-bold text-slate-500">تفسیر اختصاصی مؤلفه ها</h3>
        <div data-testid="enrich-details" className="space-y-3">
          {report.scales.map((v) => (
            <EnrichDetail
              key={v.content.key}
              view={v}
              open={print || growthKeys.has(v.content.key)}
            />
          ))}
        </div>
      </section>

      <p className="px-1 text-xs leading-6 text-slate-400">
        منبع: {test.source.citation}
      </p>
    </div>
  );
}

function EnrichDetail({ view, open }: { view: EnrichScaleView; open: boolean }) {
  const { content, score, percent } = view;
  return (
    <details
      open={open}
      className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs ${levelStyle(score.result?.level).badge}`}>
          {fa(score.result?.title ?? "—")}
        </span>
        <span className="font-extrabold text-slate-800">{content.title}</span>
        <span className="font-mono text-[11px] text-slate-400" dir="ltr">{content.code}</span>
        <span className="ms-auto font-mono text-xs text-slate-400" dir="ltr">{fa(percent)}٪</span>
      </summary>

      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
        <p>{content.description}</p>
        {score.result?.description && (
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">{score.result.description}</p>
        )}

        <div>
          <p className="mb-1 text-xs font-bold text-slate-500">ریشه های احتمالی</p>
          <p>{content.roots}</p>
        </div>

        <div>
          <p className="mb-1 text-xs font-bold text-emerald-700">راهکارهای عملی</p>
          <ul className="list-disc space-y-1 pe-5">
            {content.strategies.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>

        <div>
          <p className="mb-1 text-xs font-bold text-sky-700">تمرین پیشنهادی</p>
          <ul className="list-disc space-y-1 pe-5">
            {content.exercises.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>

        {content.books.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-bold text-amber-700">کتاب پیشنهادی</p>
            <ul className="space-y-1">
              {content.books.map((b, i) => (
                <li key={i} className="text-xs">
                  <span className="font-bold text-slate-700">«{b.title}»</span> — {b.author}؛ {b.note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.movies.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-bold text-violet-700">فیلم پیشنهادی</p>
            <ul className="space-y-1">
              {content.movies.map((m, i) => (
                <li key={i} className="text-xs">
                  <span className="font-bold text-slate-700" dir="ltr">{m.title}</span> — {m.note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
