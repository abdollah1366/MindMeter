"use client";

import { useState } from "react";
import Link from "next/link";
import type { PsychTest } from "@/lib/types";
import { calculateScore, findResult, maxScore, optionsFor, toPersianDigits } from "@/lib/scoring";

export default function TestRunner({ test }: { test: PsychTest }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = test.questions.length;
  const question = test.questions[index];

  function choose(value: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    if (index < total - 1) setIndex(index + 1);
    else setFinished(true);
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setFinished(false);
  }

  if (finished) {
    const score = calculateScore(test, answers);
    const result = findResult(test, score);
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-500">امتیاز شما</p>
        <p className="mt-1 text-4xl font-extrabold text-brand-600">
          {toPersianDigits(score)}
          <span className="text-lg font-normal text-slate-400"> از {toPersianDigits(maxScore(test))}</span>
        </p>
        {result && (
          <>
            <h2 className="mt-5 text-xl font-bold">{result.title}</h2>
            <p className="mt-3 leading-8 text-slate-600">{result.description}</p>
          </>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={restart}
            className="rounded-xl bg-brand-600 px-5 py-2 text-white hover:bg-brand-700"
          >
            انجام دوباره
          </button>
          <Link href="/" className="rounded-xl border border-slate-300 px-5 py-2 hover:bg-slate-50">
            تست‌های دیگر
          </Link>
        </div>
      </div>
    );
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
        <button
          onClick={() => setIndex(index - 1)}
          className="mt-5 text-sm text-slate-500 hover:text-brand-600"
        >
          → سؤال قبلی
        </button>
      )}
    </div>
  );
}
