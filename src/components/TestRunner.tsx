"use client";

import { useState } from "react";
import type { PsychTest } from "@/lib/types";
import { calculateScore, findResult, maxScore, optionsFor, toPersianDigits } from "@/lib/scoring";
import { saveResult } from "@/lib/history";
import ResultView from "./ResultView";

type Phase = "intro" | "questions" | "result";

export default function TestRunner({ test }: { test: PsychTest }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);

  const total = test.questions.length;
  const question = test.questions[index];

  function choose(value: number) {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    if (index < total - 1) {
      setIndex(index + 1);
      return;
    }
    const score = calculateScore(test, next);
    saveResult({
      testSlug: test.slug,
      testTitle: test.title,
      score,
      maxScore: maxScore(test),
      resultTitle: findResult(test, score)?.title ?? "",
      takenAt: Date.now(),
    });
    setPhase("result");
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setPhase("questions");
  }

  if (phase === "intro") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold">راهنمای تست</h2>
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
          شروع تست
        </button>
      </div>
    );
  }

  if (phase === "result") {
    return <ResultView test={test} score={calculateScore(test, answers)} onRestart={restart} />;
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
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <h2 className="mt-6 text-lg font-bold leading-8">{question.text}</h2>

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
                  : "border-slate-200 hover:border-brand-500 hover:bg-brand-50"
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
