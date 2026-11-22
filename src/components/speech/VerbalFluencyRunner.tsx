"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import { VERBAL_FLUENCY_CATEGORIES, VERBAL_FLUENCY_DURATION_SEC } from "@/lib/speech/verbal-fluency-types";
import { analyzeVerbalFluency } from "@/lib/speech/verbal-fluency-analysis";
import { toVerbalFluencyPayload } from "@/lib/speech/verbal-fluency-payload";
import { saveVerbalFluencyResult } from "@/server/speech-results";
import VerbalFluencyReport from "./VerbalFluencyReport";

type Phase = "intro" | "task" | "result";
type SaveState = { state: "idle" } | { state: "saving" } | { state: "saved"; id: string } | { state: "error"; message: string };

export default function VerbalFluencyRunner({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [category, setCategory] = useState<typeof VERBAL_FLUENCY_CATEGORIES[number]>("حیوانات");
  const [letter, setLetter] = useState("");
  const [text, setText] = useState("");
  const [timeLeft, setTimeLeft] = useState(VERBAL_FLUENCY_DURATION_SEC);
  const [running, setRunning] = useState(false);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ state: "idle" });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef<number | null>(null);

  const analysis = analyzeVerbalFluency(text, VERBAL_FLUENCY_DURATION_SEC - timeLeft || VERBAL_FLUENCY_DURATION_SEC);

  function start() {
    setText(""); setTimeLeft(VERBAL_FLUENCY_DURATION_SEC); setRunning(true); startedRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setRunning(false);
          setCompletedAt(new Date());
          setPhase("result");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function finishEarly() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setCompletedAt(new Date());
    setPhase("result");
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function save() {
    if (saveState.state === "saving" || saveState.state === "saved") return;
    setSaveState({ state: "saving" });
    try {
      const duration = VERBAL_FLUENCY_DURATION_SEC - timeLeft;
      const a = analyzeVerbalFluency(text, duration > 0 ? duration : VERBAL_FLUENCY_DURATION_SEC);
      const res = await saveVerbalFluencyResult(toVerbalFluencyPayload({
        category, letter: category === "حرف (با حرف مشخص)" ? letter : null,
        durationSec: duration > 0 ? duration : VERBAL_FLUENCY_DURATION_SEC,
        totalWords: a.totalWords, uniqueWords: a.uniqueWords, repetitions: a.repetitions, intrusions: a.intrusions,
        wordsPerMinute: a.wordsPerMinute, wordList: a.wordList,
        completedAt: (completedAt ?? new Date()).toISOString(),
      } as any));
      if (res.ok) setSaveState({ state: "saved", id: res.id });
      else setSaveState({ state: "error", message: res.reason === "auth" ? "برای ذخیره نتیجه باید وارد شوید." : "ذخیره نتیجه ناموفق بود." });
    } catch { setSaveState({ state: "error", message: "ذخیره نتیجه ناموفق بود." }); }
  }

  return (
    <div className="space-y-5 font-sans">
      <header className="rounded-3xl bg-gradient-to-bl from-brand-600 via-brand-700 to-calm-700 px-6 py-8 text-white sm:px-9">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">سنجه عملکردی</span>
          <span className="rounded-full bg-white/15 px-3 py-1">حدود ۱ دقیقه</span>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">آزمون روانی کلامی</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-100/90">
          در ۶۰ ثانیه، هر چه بیشتر کلمه از دسته‌ی انتخاب‌شده بگویید. کلمات را با فاصله یا خط جدید جدا کنید.
        </p>
      </header>

      {phase === "intro" ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">دستورالعمل</h2>
            <p className="mt-3 text-sm leading-8 text-slate-600">
              دسته‌ی کلمات را انتخاب کنید و پس از شروع، در ۶۰ ثانیه هر چه بیشتر کلمه از آن دسته بگویید. کلمات را در کادر زیر بنویسید.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">دسته</span>
                <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  {VERBAL_FLUENCY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              {category === "حرف (با حرف مشخص)" ? (
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">حرف</span>
                  <input value={letter} onChange={(e) => setLetter(e.target.value)} maxLength={1} className="mt-2 w-16 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                </label>
              ) : null}
            </div>
          </section>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setPhase("task")} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700">شروع آزمون</button>
            <Link href="/speech" className="text-sm text-slate-500 hover:text-brand-600">بازگشت</Link>
          </div>
        </div>
      ) : null}

      {phase === "task" ? (
        <div className="space-y-5">
          <section className="rounded-3xl border border-brand-100 bg-white px-6 py-6 text-center">
            <p className="text-sm text-slate-500">دسته: {category}{letter ? ` — حرف ${letter}` : ""}</p>
            <p className="mt-3 text-5xl font-extrabold text-brand-700" dir="ltr" aria-live="off">{toPersianDigits(timeLeft)} s</p>
            {!running ? (
              <button type="button" onClick={start} className="mt-4 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700">شروع تایمر</button>
            ) : (
              <button type="button" onClick={finishEarly} className="mt-4 rounded-xl bg-warm-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-warm-500">پایان زودهنگام</button>
            )}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <label className="text-sm font-bold text-slate-700">کلمات (با فاصله یا خط جدید جدا کنید)</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500" placeholder="گربه سگ اسب ..." />
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
              <span>کل: {toPersianDigits(analysis.totalWords)}</span>
              <span>یکتا: {toPersianDigits(analysis.uniqueWords)}</span>
              <span>تکرار: {toPersianDigits(analysis.repetitions)}</span>
              <span>نرخ: {toPersianDigits(analysis.wordsPerMinute)} کلمه/دقیقه</span>
            </div>
          </section>
        </div>
      ) : null}

      {phase === "result" ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
            <VerbalFluencyReport result={{ category, letter: category === "حرف (با حرف مشخص)" ? letter : null, durationSec: VERBAL_FLUENCY_DURATION_SEC - timeLeft || VERBAL_FLUENCY_DURATION_SEC, ...analysis, completedAt: (completedAt ?? new Date()).toISOString() } as any} createdAt={completedAt} />
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            {isLoggedIn ? (
              saveState.state === "saved" ? (
                <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-700">
                  <span>نتیجه در پرونده‌ی شما ذخیره شد.</span>
                  <Link href={`/speech/verbal-fluency/result/${saveState.id}`} className="font-bold underline">مشاهده گزارش ذخیره‌شده</Link>
                </div>
              ) : (
                <button type="button" onClick={save} disabled={saveState.state === "saving"} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-wait disabled:bg-brand-300">
                  {saveState.state === "saving" ? "در حال ذخیره…" : "ذخیره نتیجه"}
                </button>
              )
            ) : (
              <p className="text-sm leading-7 text-slate-600">برای ذخیره نتیجه در پرونده خود، <Link href="/login?next=/speech/verbal-fluency" className="font-bold text-brand-600 underline">وارد شوید</Link>. نتیجه همین حالا در صفحه قابل مشاهده است.</p>
            )}
            {saveState.state === "error" ? <p className="mt-3 text-sm text-rose-700">{saveState.message}</p> : null}
          </section>
          <div className="flex flex-wrap gap-3">
            <Link href="/speech/results" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 hover:bg-slate-50">نتایج گفتار من</Link>
            <button type="button" onClick={() => { setPhase("intro"); setText(""); setTimeLeft(VERBAL_FLUENCY_DURATION_SEC); setRunning(false); }} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 hover:bg-slate-50">آزمون دوباره</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
