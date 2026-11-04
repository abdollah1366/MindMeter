"use client";

import { useState } from "react";
import type { PsychTest } from "@/lib/types";
import { optionsFor, scoreTest, toPersianDigits, type Answers } from "@/lib/scoring";
import { saveResult, setPending } from "@/lib/history";
import { saveTestResult } from "@/server/results";
import ResultView from "./ResultView";

type Phase = "intro" | "questions" | "result";
type Saved = { state: "saving" } | { state: "saved"; id: string } | { state: "guest" } | { state: "error" };

export default function TestRunner({ test }: { test: PsychTest }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState<Saved>({ state: "saving" });

  const total = test.questions.length;
  const question = test.questions[index];

  async function finish(final: Answers) {
    setPhase("result");
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
          <li>در محیطی آرام و بدون عجله پاسخ دهید.</li>
          <li>اولین پاسخی که به ذهنتان می‌رسد معمولاً دقیق‌ترین است.</li>
          <li>هر زمان خواستید می‌توانید به سؤال قبلی برگردید.</li>
        </ul>
        <button
          onClick={() => setPhase("questions")}
          className="mt-6 w-full rounded-xl bg-brand-600 py-3 font-bold text-white hover:bg-brand-700 sm:w-auto sm:px-10"
        >
          شروع تست ({toPersianDigits(total)} سؤال)
        </button>
      </div>
    );
  }

  if (phase === "result") {
    return <ResultView test={test} answers={answers} saved={saved} onRestart={restart} />;
  }

  const progress = Math.round((index / total) * 100);

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

      <p className="mt-6 text-xs text-slate-400">{test.instructions}</p>
      <h2 className="mt-2 min-h-16 text-lg font-bold leading-8">{question.text}</h2>

      <div className="mt-5 grid gap-2">
        {optionsFor(test, question).map((opt) => {
          const selected = answers[question.id] === opt.value;
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

      {index > 0 && (
        <button onClick={() => setIndex(index - 1)} className="mt-5 text-sm text-slate-500 hover:text-brand-600">
          → سؤال قبلی
        </button>
      )}
    </div>
  );
}
