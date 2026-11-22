"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import { EAT10_ITEMS, EAT10_SCALE, EAT10_ITEM_COUNT, EAT10_MAX_TOTAL } from "@/lib/speech/eat-10-types";
import { isEat10Complete, scoreEat10, setEat10Answer } from "@/lib/speech/eat-10-scoring";
import { toEat10Payload } from "@/lib/speech/eat-10-payload";
import { saveEat10Result } from "@/server/speech-results";
import Eat10Report from "./Eat10Report";

type Phase = "intro" | "questions" | "result";
type SaveState = { state: "idle" } | { state: "saving" } | { state: "saved"; id: string } | { state: "error"; message: string };

export default function Eat10Runner({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ state: "idle" });

  const item = EAT10_ITEMS[index];
  const score = scoreEat10(answers);
  const answeredCount = EAT10_ITEMS.filter((i) => typeof answers[i.id] === "number").length;

  function choose(s: number) {
    setAnswers((p) => setEat10Answer(p, item.id, s));
    setError("");
  }
  function goNext() {
    if (typeof answers[item.id] !== "number") { setError("لطفاً به این سؤال پاسخ دهید."); return; }
    if (index + 1 < EAT10_ITEMS.length) { setIndex(index + 1); setError(""); return; }
    if (!isEat10Complete(answers)) { setError("لطفاً به تمام ۱۰ سؤال پاسخ دهید."); return; }
    setError(""); setCompletedAt(new Date()); setPhase("result");
  }
  function goPrev() { if (index > 0) { setIndex(index - 1); setError(""); } }
  function restart() { setAnswers({}); setIndex(0); setError(""); setCompletedAt(null); setSaveState({ state: "idle" }); setPhase("intro"); }

  async function save() {
    if (saveState.state === "saving" || saveState.state === "saved") return;
    setSaveState({ state: "saving" });
    try {
      const res = await saveEat10Result(toEat10Payload(answers));
      if (res.ok) setSaveState({ state: "saved", id: res.id });
      else setSaveState({ state: "error", message: res.reason === "auth" ? "برای ذخیره نتیجه باید وارد شوید." : "ذخیره نتیجه ناموفق بود." });
    } catch { setSaveState({ state: "error", message: "ذخیره نتیجه ناموفق بود." }); }
  }

  return (
    <div className="space-y-5 font-sans">
      <header className="rounded-3xl bg-gradient-to-bl from-brand-600 via-brand-700 to-calm-700 px-6 py-8 text-white sm:px-9">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">پرسشنامه خودگزارشی</span>
          <span className="rounded-full bg-white/15 px-3 py-1">حدود ۳ تا ۵ دقیقه</span>
          <span className="rounded-full bg-white/15 px-3 py-1">{toPersianDigits(EAT10_ITEM_COUNT)} گویه</span>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">پرسشنامه ارزیابی بلع (EAT-10)</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-100/90">
          پرسشنامه‌ای برای سنجش مشکلات بلع و تأثیر آن بر زندگی روزمره.
        </p>
      </header>

      {phase === "intro" ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">درباره پرسشنامه</h2>
            <p className="mt-3 text-sm leading-8 text-slate-600">
              این پرسشنامه ۱۰ گویه دارد. برای هر گویه تنها یک پاسخ انتخاب می‌شود و تمام گویه‌ها باید پاسخ داده شوند.
            </p>
            <p className="mt-4 rounded-xl bg-calm-50 px-4 py-3 text-sm leading-7 text-calm-700">
              این ابزار یک پرسشنامه است و اندازه‌گیری بلع یا آزمون بالینی نیست. نتیجه به‌تنهایی برای تشخیص پزشکی کافی نیست.
            </p>
          </section>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setPhase("questions")} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700">شروع آزمون</button>
            <Link href="/speech" className="text-sm text-slate-500 hover:text-brand-600">بازگشت به فهرست آزمون‌ها</Link>
          </div>
        </div>
      ) : null}

      {phase === "questions" && item ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-bold text-slate-700">سؤال {toPersianDigits(index + 1)} از {toPersianDigits(EAT10_ITEM_COUNT)}</span>
              <span className="text-xs text-slate-500">{toPersianDigits(answeredCount)} پاسخ ثبت شده</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={EAT10_ITEM_COUNT}>
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.round(((index + 1) / EAT10_ITEM_COUNT) * 100)}%` }} />
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold leading-8 text-slate-800">{item.text}</h2>
            <fieldset className="mt-5 space-y-2">
              <legend className="sr-only">پاسخ خود را انتخاب کنید</legend>
              {EAT10_SCALE.map((opt) => {
                const checked = answers[item.id] === opt.score;
                return (
                  <label key={opt.score} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${checked ? "border-brand-500 bg-brand-50 font-bold text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"}`}>
                    <input type="radio" name={`eat10-${item.id}`} value={opt.score} checked={checked} onChange={() => choose(opt.score)} className="h-4 w-4 accent-brand-600" />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </fieldset>
            {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          </section>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={goPrev} disabled={index === 0} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400">قبلی</button>
            <button type="button" onClick={goNext} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700">
              {index + 1 === EAT10_ITEM_COUNT ? "نمایش نتیجه" : "بعدی"}
            </button>
            <Link href="/speech" className="text-sm text-slate-500 hover:text-brand-600">خروج موقت</Link>
          </div>
        </div>
      ) : null}

      {phase === "result" && completedAt ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
            <Eat10Report result={{ totalScore: score, completedAt }} createdAt={completedAt} />
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            {isLoggedIn ? (
              saveState.state === "saved" ? (
                <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-700">
                  <span>نتیجه در پرونده‌ی شما ذخیره شد.</span>
                  <Link href={`/speech/eat-10/result/${saveState.id}`} className="font-bold underline">مشاهده گزارش ذخیره‌شده</Link>
                </div>
              ) : (
                <button type="button" onClick={save} disabled={saveState.state === "saving"} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-wait disabled:bg-brand-300">
                  {saveState.state === "saving" ? "در حال ذخیره…" : "ذخیره نتیجه"}
                </button>
              )
            ) : (
              <p className="text-sm leading-7 text-slate-600">برای ذخیره نتیجه در پرونده خود، <Link href="/login?next=/speech/eat-10" className="font-bold text-brand-600 underline">وارد شوید</Link>. نتیجه همین حالا در صفحه قابل مشاهده است.</p>
            )}
            {saveState.state === "error" ? <p className="mt-3 text-sm text-rose-700">{saveState.message}</p> : null}
          </section>
          <div className="flex flex-wrap gap-3">
            <Link href="/speech/results" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 hover:bg-slate-50">نتایج گفتار من</Link>
            <button type="button" onClick={restart} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 hover:bg-slate-50">آزمون دوباره</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
