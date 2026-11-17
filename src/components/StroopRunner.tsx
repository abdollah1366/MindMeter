"use client";

import { useEffect, useRef, useState } from "react";
import type { PsychTest } from "@/lib/types";
import type { Answers } from "@/lib/scoring";
import { scoreTest, toPersianDigits } from "@/lib/scoring";
import { STROOP_OPTIONS, STROOP_PRACTICE, type StroopMode, type StroopSpec } from "@/data/stroop-content";
import { saveResult, setPending } from "@/lib/history";
import { saveTestResult } from "@/server/results";
import { inventorySummary } from "@/lib/inventory";
import { track } from "@/lib/track-client";
import ResultView from "./ResultView";

type Block = { kind: "practice" | "main"; mode: StroopMode };
type Phase = "intro" | "ready" | "cards" | "result";
type Ready = { block: Block; title: string; text: string };
type Feedback = { correct: boolean; rt: number };
type Saved = { state: "saving" } | { state: "saved"; id: string } | { state: "guest" } | { state: "error" };

const DIGIT_KEYS: Record<string, number> = {
  "1": 1, "2": 2, "3": 3, "4": 4,
  "۱": 1, "۲": 2, "۳": 3, "۴": 4,
};

const MODE_TITLE: Record<StroopMode, string> = {
  classic: "رنگ واژه (کلاسیک)",
  emotional: "واژه های هیجانی",
};

function nextReady(block: Block): Ready | null {
  if (block.kind === "practice" && block.mode === "classic")
    return {
      block: { kind: "main", mode: "classic" },
      title: "پایان تمرین کلاسیک",
      text: "اکنون ۳۰ کارت اصلی حالت رنگ واژه نمایش داده می شود. همانطور که تمرین کردید، رنگ جوهر را نام ببرید.",
    };
  if (block.kind === "main" && block.mode === "classic")
    return {
      block: { kind: "practice", mode: "emotional" },
      title: "پایان حالت کلاسیک",
      text: "بخش بعدی شامل واژه های هیجانی و خنثی است. ابتدا ۱۵ کارت تمرینی نمایش داده می شود.",
    };
  if (block.kind === "practice" && block.mode === "emotional")
    return {
      block: { kind: "main", mode: "emotional" },
      title: "پایان تمرین هیجانی",
      text: "اکنون ۳۰ کارت اصلی حالت واژه های هیجانی آغاز می شود. باز هم رنگ جوهر را نام ببرید.",
    };
  return null;
}

export default function StroopRunner({ test }: { test: PsychTest }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [block, setBlock] = useState<Block | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [mainIndex, setMainIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [saved, setSaved] = useState<Saved>({ state: "saving" });
  const [cardSeq, setCardSeq] = useState(0);

  const answersRef = useRef<Answers>({});
  const shownAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerRef = useRef<(value: number) => void>(() => {});

  const classicMain = test.questions.filter((q) => q.stroop?.mode === "classic");
  const emotionalMain = test.questions.filter((q) => q.stroop?.mode === "emotional");

  // هر بار که کارت جدیدی نمایش داده می شود، زمان شروع نمایش آن ثبت می شود
  useEffect(() => {
    shownAt.current = performance.now();
    setFeedback(null);
  }, [cardSeq]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function start(nextBlock: Block) {
    setReady(null);
    setBlock(nextBlock);
    setPracticeIndex(0);
    setMainIndex(0);
    setFeedback(null);
    setPhase("cards");
    setCardSeq((n) => n + 1);
  }

  function begin() {
    setAnswers({});
    answersRef.current = {};
    track("test_start", { ref: test.slug });
    start({ kind: "practice", mode: "classic" });
  }

  function restart() {
    setSaved({ state: "saving" });
    setPhase("intro");
    setBlock(null);
    setReady(null);
    setAnswers({});
    answersRef.current = {};
    setPracticeIndex(0);
    setMainIndex(0);
    setFeedback(null);
  }

  async function finish(final: Answers) {
    setPhase("result");
    track("test_complete", { ref: test.slug });
    setSaved({ state: "saving" });
    const scores = scoreTest(test, final);
    saveResult({
      testSlug: test.slug,
      testTitle: test.title,
      summary: inventorySummary(test, scores),
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

  function advance() {
    if (!block) return;
    if (block.kind === "practice") {
      const count = STROOP_PRACTICE.filter((s) => s.mode === block.mode).length;
      if (practiceIndex + 1 < count) {
        setPracticeIndex(practiceIndex + 1);
        setCardSeq((n) => n + 1);
      } else {
        const next = nextReady(block);
        if (next) {
          setReady(next);
          setPhase("ready");
        }
      }
      return;
    }
    const list = block.mode === "classic" ? classicMain : emotionalMain;
    if (mainIndex + 1 < list.length) {
      setMainIndex(mainIndex + 1);
      setCardSeq((n) => n + 1);
    } else if (block.mode === "classic") {
      const next = nextReady(block);
      if (next) {
        setReady(next);
        setPhase("ready");
      }
    } else {
      void finish(answersRef.current);
    }
  }

  function answer(value: number) {
    if (phase !== "cards" || !block || feedback) return;
    const rt = Math.max(1, Math.round(performance.now() - shownAt.current));

    if (block.kind === "practice") {
      const spec = STROOP_PRACTICE.filter((s) => s.mode === block.mode)[practiceIndex];
      setFeedback({ correct: value === spec.answer, rt });
      timer.current = setTimeout(() => advance(), 900);
      return;
    }

    const list = block.mode === "classic" ? classicMain : emotionalMain;
    const q = list[mainIndex];
    const next = { ...answersRef.current, [q.id]: value, [`rt_${q.id}`]: rt };
    answersRef.current = next;
    setAnswers(next);
    advance();
  }

  answerRef.current = answer;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (phase !== "cards" || feedback) return;
      const value = DIGIT_KEYS[event.key];
      if (value) {
        event.preventDefault();
        answerRef.current(value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, feedback]);

  if (phase === "result") {
    return <ResultView test={test} answers={answers} saved={saved} onRestart={restart} />;
  }

  if (phase === "intro") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-brand-700">آزمون استروب فارسی</h2>
        <p className="mt-3 leading-8 text-slate-600">{test.instructions}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-bold">بخش اول: رنگ واژه</h3>
            <p className="mt-1 text-sm leading-7 text-slate-600">
              نام رنگی را انتخاب کنید که واژه با آن نوشته شده است، حتی اگر معنای واژه رنگ دیگری باشد.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-bold">بخش دوم: واژه های هیجانی</h3>
            <p className="mt-1 text-sm leading-7 text-slate-600">
              باز هم رنگ جوهر را نام ببرید؛ برخی واژه ها هیجانی و برخی خنثی اند.
            </p>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">
          هر بخش با ۱۵ کارت تمرینی آغاز می شود تا با وظیفه آشنا شوید. کارت های تمرینی نمره ندارند. سپس ۳۰ کارت اصلی همان بخش اجرا می شود.
        </p>
        <button onClick={begin} className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">
          شروع آزمون
        </button>
      </div>
    );
  }

  if (phase === "ready" && ready) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-extrabold text-brand-700">{ready.title}</h2>
        <p className="mx-auto mt-3 max-w-lg leading-8 text-slate-600">{ready.text}</p>
        <button onClick={() => start(ready.block)} className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">
          شروع {ready.block.kind === "practice" ? "تمرین" : "کارت های اصلی"}
        </button>
      </div>
    );
  }

  if (!block) return null;

  const practiceCards: StroopSpec[] = STROOP_PRACTICE.filter((s) => s.mode === block!.mode);
  const mainList = block.mode === "classic" ? classicMain : emotionalMain;
  const isPractice = block.kind === "practice";
  const spec = isPractice ? practiceCards[practiceIndex] : null;
  const question = isPractice ? null : mainList[mainIndex];
  const word = spec ? spec.word : question!.stroop!.word;
  const inkHex = spec ? spec.inkHex : question!.stroop!.inkHex;
  const inkLabel = spec ? spec.ink : question!.stroop!.ink;
  const current = isPractice ? practiceIndex + 1 : mainIndex + 1;
  const total = isPractice ? practiceCards.length : mainList.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-bold text-slate-700">
          {MODE_TITLE[block.mode]} · {isPractice ? "کارت های تمرینی" : "کارت های اصلی"}
        </span>
        <span className="text-slate-500">کارت {toPersianDigits(current)} از {toPersianDigits(total)}</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${(current / total) * 100}%` }} />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">رنگ جوهر این واژه را انتخاب کنید</p>
      <div className="mt-3 flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <span className="px-6 text-center text-6xl font-black leading-tight sm:text-7xl" style={{ color: inkHex }} dir="rtl">
          {word}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STROOP_OPTIONS.map((opt, i) => (
          <button
            key={opt.value}
            onClick={() => answer(opt.value)}
            disabled={!!feedback}
            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-lg font-bold text-slate-700 transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-default disabled:opacity-60"
          >
            <span>{opt.label}</span>
            <span className="text-xs font-normal text-slate-400">{toPersianDigits(i + 1)}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mt-4 rounded-xl p-3 text-center text-sm ${feedback.correct ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {feedback.correct ? "✓ درست" : `✗ نادرست؛ رنگ جوهر «${inkLabel}» بود.`}
          <span className="ms-2" dir="ltr">{toPersianDigits(feedback.rt)} ms</span>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-slate-400">
        میتوانید از کلیدهای ۱ تا ۴ صفحه کلید هم استفاده کنید.
      </p>
    </div>
  );
}
