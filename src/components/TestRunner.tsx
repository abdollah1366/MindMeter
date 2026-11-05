"use client";

import { useEffect, useState } from "react";
import type { PsychTest } from "@/lib/types";
import { LEVEL_LABEL, SKIP_VALUE, optionsFor, scoreTest, toPersianDigits, type Answers } from "@/lib/scoring";

const LEVEL_STYLE = { easy: "bg-emerald-50 text-emerald-700", medium: "bg-amber-50 text-amber-700", hard: "bg-rose-50 text-rose-700" };
const progressKey = (slug: string) => `mm-progress-${slug}`;
import { saveResult, setPending } from "@/lib/history";
import { saveTestResult } from "@/server/results";
import ResultView from "./ResultView";
import { GlyphCell, Matrix } from "./Figure";

type Phase = "intro" | "questions" | "result";
type Saved = { state: "saving" } | { state: "saved"; id: string } | { state: "guest" } | { state: "error" };

export default function TestRunner({ test }: { test: PsychTest }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState<Saved>({ state: "saving" });

  const total = test.questions.length;
  const [resume, setResume] = useState<{ answers: Answers; index: number } | null>(null);

  // پیشرفت آزمون‌های طولانی در مرورگر نگه داشته می‌شود تا با بستن صفحه از دست نرود
  useEffect(() => {
    try {
      const raw = localStorage.getItem(progressKey(test.slug));
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved.index === "number" && saved.index > 0 && saved.index < total) setResume(saved);
      }
    } catch {}
  }, [test.slug, total]);

  useEffect(() => {
    if (phase !== "questions" || index === 0) return;
    try {
      localStorage.setItem(progressKey(test.slug), JSON.stringify({ answers, index }));
    } catch {}
  }, [phase, answers, index, test.slug]);
  const question = test.questions[index];

  async function finish(final: Answers) {
    setPhase("result");
    try {
      localStorage.removeItem(progressKey(test.slug));
    } catch {}
    setSaved({ state: "saving" });
    const scores = scoreTest(test, final);
    saveResult({
      testSlug: test.slug,
      testTitle: test.title,
      summary: scores.map((s) => (scores.length > 1 ? `${s.title}: ${s.result?.title}` : s.result?.title)).join("، "),
      takenAt: Date.now(),
    });
    try {
      const res = await saveTestResult(test.slug, final);
      if (res.ok) setSaved({ state: "saved", id: res.id });
      else if (res.reason === "auth") {
        setPending({ slug: test.slug, answers: final });
        setSaved({ state: "guest" });
      } else setSaved({ state: "error" });
    } catch {
      setSaved({ state: "error" });
    }
  }

  function choose(value: number) {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    if (index < total - 1) setIndex(index + 1);
    else finish(next);
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setPhase("questions");
  }

  if (phase === "intro") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold">راهنمای پاسخ‌دهی</h2>
        <p className="mt-3 leading-8 text-slate-600">{test.instructions}</p>
        <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-500">
          {test.kind === "ability" ? (
            <>
              <li>در محیطی آرام و بدون مزاحمت، در یک نوبت پاسخ دهید.</li>
              <li>از ماشین‌حساب، کاغذ یادداشت یا کمک دیگران استفاده نکنید.</li>
              <li>سؤال‌ها به‌تدریج سخت‌تر می‌شوند؛ اگر جوابی را نمی‌دانید، بهترین حدس خود را انتخاب کنید.</li>
            </>
          ) : (
            <>
              <li>در محیطی آرام و بدون عجله پاسخ دهید.</li>
              <li>اولین پاسخی که به ذهنتان می‌رسد معمولاً دقیق‌ترین است.</li>
            </>
          )}
          <li>هر زمان خواستید می‌توانید به سؤال قبلی برگردید.</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          {resume && (
            <button
              onClick={() => {
                setAnswers(resume.answers);
                setIndex(resume.index);
                setPhase("questions");
              }}
              className="w-full rounded-xl bg-calm-600 py-3 font-bold text-white hover:bg-calm-700 sm:w-auto sm:px-8"
            >
              ادامه از سؤال {toPersianDigits(resume.index + 1)}
            </button>
          )}
          <button
            onClick={() => {
              setAnswers({});
              setIndex(0);
              setPhase("questions");
            }}
            className={`w-full rounded-xl py-3 font-bold sm:w-auto sm:px-10 ${
              resume ? "border border-slate-300 bg-white text-slate-700" : "bg-brand-600 text-white hover:bg-brand-700"
            }`}
          >
            {resume ? "شروع از اول" : `شروع تست (${toPersianDigits(total)} سؤال)`}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return <ResultView test={test} answers={answers} saved={saved} onRestart={restart} />;
  }

  const progress = Math.round((index / total) * 100);
  const allOptions = optionsFor(test, question);
  const skipOption = allOptions.find((o) => o.value === SKIP_VALUE);
  const mainOptions = allOptions.filter((o) => o.value !== SKIP_VALUE);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-2 flex justify-between text-xs text-slate-500">
        <span>
          سؤال {toPersianDigits(index + 1)} از {toPersianDigits(total)}
        </span>
        <span>{toPersianDigits(progress)}٪</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-gradient-to-l from-brand-400 to-calm-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {question.level && (
          <span className={`rounded-full px-2 py-0.5 font-medium ${LEVEL_STYLE[question.level]}`}>سطح {LEVEL_LABEL[question.level]}</span>
        )}
        <span>{test.instructions}</span>
      </div>
      <h2 className="mt-2 min-h-16 text-lg font-bold leading-8">{question.text}</h2>

      {question.figure && (
        <div className="mt-4">
          <Matrix figure={question.figure} id={question.id} />
        </div>
      )}

      <div
        className={`mt-5 grid gap-2 ${
          mainOptions.some((o) => o.figure) ? "grid-cols-3 sm:grid-cols-5" : test.kind === "ability" ? "sm:grid-cols-2" : ""
        }`}
      >
        {mainOptions.map((opt) => {
          const selected = answers[question.id] === opt.value;
          if (opt.figure)
            return (
              <button
                key={opt.value}
                onClick={() => choose(opt.value)}
                aria-label={`گزینه‌ی ${opt.label}`}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition ${
                  selected ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-400 hover:bg-brand-50"
                }`}
              >
                <GlyphCell glyph={opt.figure} id={`${question.id}-o${opt.value}`} size={64} />
                <span className="text-xs text-slate-500">{opt.label}</span>
              </button>
            );
          return (
            <button
              key={opt.value}
              onClick={() => choose(opt.value)}
              className={`rounded-xl border px-4 py-3 text-start transition ${
                selected
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 hover:border-brand-400 hover:bg-brand-50"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {skipOption && (
        <button
          onClick={() => choose(skipOption.value)}
          className={`mt-3 w-full rounded-xl border border-dashed px-4 py-2.5 text-sm transition ${
            answers[question.id] === skipOption.value
              ? "border-slate-400 bg-slate-100 text-slate-700"
              : "border-slate-300 text-slate-500 hover:bg-slate-50"
          }`}
        >
          {skipOption.label}
        </button>
      )}

      {index > 0 && (
        <button onClick={() => setIndex(index - 1)} className="mt-5 text-sm text-slate-500 hover:text-brand-600">
          → سؤال قبلی
        </button>
      )}
    </div>
  );
}
