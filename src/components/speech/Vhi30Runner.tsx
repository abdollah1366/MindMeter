"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import { VHI_30_QUESTIONS } from "@/lib/speech/vhi-30-questions";
import { toVhi30Payload } from "@/lib/speech/vhi-30-payload";
import {
  isVhi30Complete,
  isValidVhiScore,
  scoreVhi30,
  setVhi30Answer,
  vhi30MissingQuestionIds,
  vhi30ScoreLabel,
  type Vhi30Answers,
} from "@/lib/speech/vhi-30-scoring";
import {
  VHI_DOMAIN_LABELS,
  VHI_ITEM_COUNT,
  VHI_RESPONSE_SCALE,
  VHI_VALIDATION_NOTICE,
  type VHIResult,
} from "@/lib/speech/vhi-30-types";
import { saveVhi30Result } from "@/server/speech-results";
import Vhi30Report from "./Vhi30Report";

type Phase = "intro" | "questions" | "result";
type SaveState =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved"; id: string }
  | { state: "error"; message: string };

/** اجرای پرسشنامه VHI-30: معرفی → ۳۰ گویه → نتیجه. کاملاً غیرآکوستیکی است. */
export default function Vhi30Runner({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Vhi30Answers>({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ state: "idle" });

  const question = VHI_30_QUESTIONS[index];
  const scores = useMemo(() => scoreVhi30(answers), [answers]);
  const answeredCount = useMemo(
    () => VHI_30_QUESTIONS.filter((item) => isValidVhiScore(answers[item.id])).length,
    [answers],
  );
  const result: VHIResult | null = completedAt ? { ...scores, completedAt } : null;
  const percent = Math.round(((index + 1) / VHI_ITEM_COUNT) * 100);

  function chooseScore(score: number) {
    if (!question) return;
    setAnswers((previous) => setVhi30Answer(previous, question.id, score));
    setError("");
  }

  function goNext() {
    if (!question) return;
    if (!isValidVhiScore(answers[question.id])) {
      setError("لطفاً به این سؤال پاسخ دهید.");
      return;
    }
    if (index + 1 < VHI_30_QUESTIONS.length) {
      setIndex(index + 1);
      setError("");
      return;
    }
    // پیش از ثبت نهایی، همه گویهها بررسی میشوند. چنانچه گویهای بیپاسخ مانده
    // باشد، کاربر به نخستین گویه ناقص هدایت میشود و هیچ پاسخی پاک نمیشود.
    if (!isVhi30Complete(answers)) {
      const firstMissing = vhi30MissingQuestionIds(answers)[0];
      const missingIndex = VHI_30_QUESTIONS.findIndex((item) => item.id === firstMissing);
      if (missingIndex >= 0) setIndex(missingIndex);
      setError("لطفاً به تمام ۳۰ سؤال پاسخ دهید.");
      return;
    }
    setError("");
    setCompletedAt(new Date());
    setPhase("result");
  }

  function goPrevious() {
    if (index === 0) return;
    setIndex(index - 1);
    setError("");
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setError("");
    setCompletedAt(null);
    setShowAnswers(false);
    setSaveState({ state: "idle" });
    setPhase("intro");
  }

  async function saveResult() {
    if (saveState.state === "saving" || saveState.state === "saved") return;
    setSaveState({ state: "saving" });
    try {
      const response = await saveVhi30Result(toVhi30Payload(answers));
      if (response.ok) setSaveState({ state: "saved", id: response.id });
      else {
        setSaveState({
          state: "error",
          message: response.reason === "auth" ? "برای ذخیره نتیجه باید وارد شوید." : "ذخیره نتیجه ناموفق بود.",
        });
      }
    } catch {
      setSaveState({ state: "error", message: "ذخیره نتیجه ناموفق بود. دوباره تلاش کنید." });
    }
  }

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-bl from-brand-600 via-brand-700 to-calm-700 px-6 py-8 text-white sm:px-9">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">پرسشنامه خودگزارشی</span>
          <span className="rounded-full bg-white/15 px-3 py-1">حدود ۵ تا ۱۰ دقیقه</span>
          <span className="rounded-full bg-white/15 px-3 py-1">{toPersianDigits(VHI_ITEM_COUNT)} گویه</span>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">شاخص ناتوانی صوتی</h1>
        <p dir="ltr" className="mt-1 text-right text-sm text-brand-100">
          Voice Handicap Index (VHI-30)
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-100/90">
          پرسشنامهای برای سنجش میزان تأثیری که مشکلات صوتی بر زندگی روزمره، ویژگیهای جسمانی صدا و وضعیت هیجانی فرد دارند.
        </p>
      </header>

      {phase === "intro" ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">درباره پرسشنامه</h2>
            <p className="mt-3 text-sm leading-8 text-slate-600">
              این پرسشنامه ۳۰ گویه دارد و در سه حوزه عملکردی، جسمانی و هیجانی قرار میگیرد. برای هر گویه تنها یک پاسخ انتخاب میشود
              و تمام گویهها باید پاسخ داده شوند. زمان تخمینی تکمیل، حدود ۵ تا ۱۰ دقیقه است.
            </p>
            <p className="mt-4 rounded-xl bg-calm-50 px-4 py-3 text-sm leading-7 text-calm-700">
              این ابزار یک پرسشنامه است و اندازهگیری صوت یا آزمون آکوستیکی نیست. هیچ مجوز میکروفونی درخواست نمیشود و هیچ صوتی ضبط،
              ذخیره یا ارسال نمیگردد.
            </p>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
            <h2 className="font-bold">وضعیت متون پرسشنامه</h2>
            <p className="mt-2">{VHI_VALIDATION_NOTICE}</p>
            <p className="mt-2">
              بنابراین نتیجهی نمایشدادهشده صرفاً حاصل جمع پاسخها است و نباید بهعنوان نتیجه بالینی یا طبقهبندی شدت مورد استناد قرار گیرد.
            </p>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPhase("questions")}
              className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              شروع آزمون
            </button>
            <Link href="/speech" className="text-sm text-slate-500 hover:text-brand-600">
              بازگشت به فهرست آزمونها
            </Link>
          </div>
        </div>
      ) : null}

      {phase === "questions" && question ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-bold text-slate-700">
                سؤال {toPersianDigits(index + 1)} از {toPersianDigits(VHI_ITEM_COUNT)}
              </span>
              <span className="text-xs text-slate-500">
                {toPersianDigits(answeredCount)} پاسخ ثبت شده
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={index + 1}
              aria-valuemin={1}
              aria-valuemax={VHI_ITEM_COUNT}
              aria-label="پیشرفت پرسشنامه"
            >
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              حوزه {VHI_DOMAIN_LABELS[question.domain]} — گویه {question.id}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold leading-8 text-slate-800">{question.text}</h2>
            {question.wordingStatus === "MISSING" ? (
              <p className="mt-2 text-xs leading-6 text-amber-700">
                متن تأییدشدهی این گویه وارد نشده است؛ لطفاً تا تکمیل منبع معتبر از نتیجه بهعنوان نتیجه بالینی استفاده نکنید.
              </p>
            ) : null}

            <fieldset className="mt-5 space-y-2">
              <legend className="sr-only">پاسخ خود را انتخاب کنید</legend>
              {VHI_RESPONSE_SCALE.map((option) => {
                const checked = answers[question.id] === option.score;
                return (
                  <label
                    key={option.score}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                      checked
                        ? "border-brand-500 bg-brand-50 font-bold text-brand-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`vhi-${question.id}`}
                      value={option.score}
                      checked={checked}
                      onChange={() => chooseScore(option.score)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </fieldset>

            {error ? (
              <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goPrevious}
              disabled={index === 0}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
            قبلی
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              {index + 1 === VHI_ITEM_COUNT ? "نمایش نتیجه" : "بعدی"}
            </button>
            <Link href="/speech" className="text-sm text-slate-500 hover:text-brand-600">
              خروج موقت
            </Link>
          </div>
        </div>
      ) : null}

      {phase === "result" && result ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
            <Vhi30Report result={result} createdAt={completedAt} />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              {isLoggedIn ? (
                saveState.state === "saved" ? (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-700">
                    <span>نتیجه در پروندهی شما ذخیره شد.</span>
                    <Link href={`/speech/vhi-30/result/${saveState.id}`} className="font-bold underline">
                      مشاهده گزارش ذخیرهشده
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={saveResult}
                    disabled={saveState.state === "saving"}
                    className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-wait disabled:bg-brand-300"
                  >
                    {saveState.state === "saving" ? "در حال ذخیره…" : "ذخیره نتیجه"}
                  </button>
                )
              ) : (
                <p className="text-sm leading-7 text-slate-600">
                  برای ذخیره نتیجه در پرونده خود،{" "}
                  <Link href="/login?next=/speech/vhi-30" className="font-bold text-brand-600 underline">
                    وارد شوید
                  </Link>
                  . نتیجه همین حالا در صفحه قابل مشاهده است.
                </p>
              )}
              <button
                type="button"
                onClick={() => setShowAnswers((value) => !value)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                {showAnswers ? "پنهان کردن پاسخها" : "مشاهده پاسخها"}
              </button>
              <Link
                href="/speech"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                بازگشت به فهرست آزمونها
              </Link>
              <button
                type="button"
                onClick={restart}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                پرسشنامه دوباره
              </button>
            </div>
            {saveState.state === "error" ? (
              <p className="mt-3 text-sm text-rose-700">{saveState.message}</p>
            ) : null}
          </section>

          {showAnswers ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-700">مروری بر پاسخها</h2>
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[34rem] text-right text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">گویه</th>
                      <th className="px-3 py-2 font-medium">متن گویه</th>
                      <th className="px-3 py-2 font-medium">پاسخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VHI_30_QUESTIONS.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2 text-xs text-slate-500">
                          {item.id} — {VHI_DOMAIN_LABELS[item.domain]}
                        </td>
                        <td className="px-3 py-2 text-xs leading-6 text-slate-500">{item.text}</td>
                        <td className="px-3 py-2 font-medium text-slate-700">
                          {vhi30ScoreLabel(answers[item.id])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
