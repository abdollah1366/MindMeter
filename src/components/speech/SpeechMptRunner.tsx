"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import { MPT_CONFIG } from "@/lib/speech/mpt-config";
import { MptAnalyzer, summarizeAttempts } from "@/lib/speech/mpt-analysis";
import { toMptPayload } from "@/lib/speech/mpt-payload";
import { MIC_ERROR_LABELS, type MicError, type MicStatus } from "@/lib/speech/audio-recorder";
import { MPT_ISSUE_LABELS, type AudioFrame, type MptAttempt } from "@/lib/speech/mpt-types";
import { saveMptResult } from "@/server/speech-results";
import AudioRecorder from "./AudioRecorder";
import MptReport from "./MptReport";

type Phase = "intro" | "check" | "countdown" | "recording" | "review" | "result";
type SaveState =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved"; id: string }
  | { state: "error"; message: string };

const MAX_ATTEMPTS = 3;
const INSTRUCTIONS = [
  "در محیطی آرام بنشینید یا بایستید.",
  "تلفن همراه یا رایانه را در فاصله مناسب از دهان قرار دهید.",
  "یک نفس عمیق و راحت بکشید.",
  "با صدای طبیعی و یکنواخت، واکه آآآ را تا زمانی که برایتان راحت است ادامه دهید.",
  "از فشار آوردن به حنجره یا حبس نفس خودداری کنید.",
  "در صورت احساس ناراحتی، سرگیجه یا تنگی نفس آزمون را متوقف کنید.",
];

/** اجرای کامل آزمون MPT: معرفی → بررسی میکروفون → شمارش → ضبط → کیفیت → تکرار → نتیجه. */
export default function SpeechMptRunner({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [micSignal, setMicSignal] = useState(false);
  const [micError, setMicError] = useState<MicError | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [attempts, setAttempts] = useState<MptAttempt[]>([]);
  const [lastAttempt, setLastAttempt] = useState<MptAttempt | null>(null);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ state: "idle" });

  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;
  const analyzerRef = useRef<MptAnalyzer | null>(null);
  const baselineRef = useRef<AudioFrame[]>([]);
  const countdownStartRef = useRef<number | null>(null);
  const recordStartRef = useRef<number | null>(null);
  const tickRef = useRef(0);
  const completeRef = useRef<() => void>(() => {});
  const startRecordingRef = useRef<() => void>(() => {});
  const savingRef = useRef(false);
  const micSignalRef = useRef(false);

  const summary = useMemo(() => summarizeAttempts(attempts), [attempts]);
  const microphoneActive = phase === "check" || phase === "countdown" || phase === "recording";
  // پشتیبان: اگر انتقال وضعیت «آماده» به والد به دلیلی صورت نگیرد، دریافت فریم واقعی
  // از میکروفون نشان میدهد که ضبط کار میکند و دکمه شروع باید فعال شود.
  const micReady = micStatus === "ready" || (micStatus === "requesting" && micSignal);

  function resetCaptureState() {
    analyzerRef.current = null;
    baselineRef.current = [];
    countdownStartRef.current = null;
    recordStartRef.current = null;
    tickRef.current = 0;
    setElapsedMs(0);
  }

  function beginCountdown() {
    if (!micReady) return;
    resetCaptureState();
    setCountdown(3);
    setPhase("countdown");
  }

  function beginRecording() {
    if (phaseRef.current !== "countdown") return;
    analyzerRef.current = new MptAnalyzer({}, baselineRef.current);
    recordStartRef.current = null;
    tickRef.current = 0;
    setElapsedMs(0);
    setPhase("recording");
  }

  function completeAttempt() {
    const analyzer = analyzerRef.current;
    if (!analyzer || phaseRef.current !== "recording") return;
    analyzer.finish("MANUAL");
    const result = analyzer.result();
    setAttempts((previous) => [...previous, result]);
    setLastAttempt(result);
    setCompletedAt(new Date());
    setPhase("review");
  }
  completeRef.current = completeAttempt;
  startRecordingRef.current = beginRecording;

  function handleFrame(frame: AudioFrame) {
    if (!micSignalRef.current && frame.rms > 0) {
      micSignalRef.current = true;
      setMicSignal(true);
    }
    const current = phaseRef.current;
    if (current === "countdown") {
      if (countdownStartRef.current === null) countdownStartRef.current = frame.t;
      baselineRef.current.push({ ...frame, t: frame.t - countdownStartRef.current });
      return;
    }
    if (current !== "recording") return;

    if (recordStartRef.current === null) recordStartRef.current = frame.t;
    const relative = frame.t - recordStartRef.current;
    const analyzer = analyzerRef.current;
    if (!analyzer) return;
    analyzer.push({ ...frame, t: relative });

    tickRef.current += 1;
    if (tickRef.current % 4 === 0) setElapsedMs(relative);
    if (analyzer.offsetDetected || analyzer.finished) completeRef.current();
  }

  function handleMicError(error: MicError) {
    setMicError(error);
    const current = phaseRef.current;
    if (current === "recording") completeRef.current();
    else if (current === "countdown") setPhase("check");
  }

  function retryAttempt() {
    if (attempts.length >= MAX_ATTEMPTS) return;
    resetCaptureState();
    setLastAttempt(null);
    setCountdown(3);
    setPhase("countdown");
  }

  function restart() {
    resetCaptureState();
    setAttempts([]);
    setLastAttempt(null);
    setCompletedAt(null);
    setMicError(null);
    micSignalRef.current = false;
    setMicSignal(false);
    setSaveState({ state: "idle" });
    setPhase("intro");
  }

  async function saveResult() {
    if (savingRef.current || saveState.state === "saved") return;
    savingRef.current = true;
    setSaveState({ state: "saving" });
    try {
      const response = await saveMptResult(toMptPayload(summary));
      if (response.ok) setSaveState({ state: "saved", id: response.id });
      else {
        setSaveState({
          state: "error",
          message: response.reason === "auth" ? "برای ذخیره نتیجه باید وارد شوید." : "ذخیره نتیجه ناموفق بود.",
        });
      }
    } catch {
      setSaveState({ state: "error", message: "ذخیره نتیجه ناموفق بود. دوباره تلاش کنید." });
    } finally {
      savingRef.current = false;
    }
  }

  // شمارش معکوس تنها در فاز مربوطه اجرا میشود و هنگام خروج تایمر پاک میشود.
  useEffect(() => {
    if (phase !== "countdown") return;
    let value = 3;
    const id = setInterval(() => {
      value -= 1;
      if (value <= 0) {
        clearInterval(id);
        startRecordingRef.current();
      } else {
        setCountdown(value);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-bl from-brand-600 via-brand-700 to-calm-700 px-6 py-8 text-white sm:px-9">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">سنجه عملکردی</span>
          <span className="rounded-full bg-white/15 px-3 py-1">حدود ۱ تا ۲ دقیقه</span>
          <span className="rounded-full bg-white/15 px-3 py-1">حداکثر {toPersianDigits(MAX_ATTEMPTS)} تلاش</span>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">آزمون حداکثر زمان آواسازی</h1>
        <p dir="ltr" className="mt-1 text-right text-sm text-brand-100">Maximum Phonation Time (MPT)</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-100/90">
          اندازهگیری مدت زمانی که میتوانید پس از یک دم مناسب، واکه /آ/ را بهصورت پیوسته و قابل قبول آواسازی کنید.
        </p>
      </header>

      {microphoneActive ? (
        <AudioRecorder active onFrame={handleFrame} onError={handleMicError} onStatusChange={setMicStatus} />
      ) : null}

      {phase === "intro" ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">دستورالعمل آزمون</h2>
            <p className="mt-3 text-sm leading-8 text-slate-600">
              در این آزمون، مدت زمانی که میتوانید صدای آآآ را بهصورت پیوسته و بدون قطع شدن تولید کنید اندازهگیری میشود.
            </p>
            <ol className="mt-4 space-y-2 text-sm leading-8 text-slate-700">
              {INSTRUCTIONS.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                    {toPersianDigits(index + 1)}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-xl bg-calm-50 px-4 py-3 text-sm leading-7 text-calm-700">
              هدف، تولید صدای طبیعی و پیوسته است، نه بلندترین صدای ممکن. برای ثبت رکورد به خود فشار وارد نکنید.
            </p>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
            <h2 className="font-bold">شرایط و هشدارهای ایمنی</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>در محیطی آرام و بدون سر و صدای زیاد باشید.</li>
              <li>میکروفون در فاصله مناسبی از دهان قرار گیرد (حدود ۱۵ سانتیمتر).</li>
              <li>در صورت ناراحتی، سرگیجه یا تنگی نفس، آزمون را متوقف کنید.</li>
              <li>این آزمون تشخیص پزشکی نیست و نتیجه آن جایگزین ارزیابی متخصص نمیشود.</li>
            </ul>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPhase("check")}
              className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              شروع آزمون
            </button>
            <Link href="/speech" className="text-sm text-slate-500 hover:text-brand-600">
              بازگشت به فهرست ارزیابیها
            </Link>
          </div>
        </div>
      ) : null}

      {phase === "check" ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
            <h2 className="font-bold text-slate-800">آمادگی برای آزمون</h2>
            <p className="mt-2">
              اجازه میکروفون تنها پس از کلیک شما درخواست شد. صدای خود را در سطح معمولی تولید کنید تا بوم سطح ورودی
              را ببینید. پس از آماده شدن میکروفون، دکمه زیر را بفشارید.
            </p>
          </section>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={beginCountdown}
              disabled={!micReady}
              className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              آغاز اندازهگیری
            </button>
            <button
              type="button"
              onClick={() => setPhase("intro")}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-600 hover:bg-slate-50"
            >
              بازگشت
            </button>
          </div>
          {micError ? <p className="text-sm text-rose-700">{MIC_ERROR_LABELS[micError]}</p> : null}
        </div>
      ) : null}

      {phase === "countdown" || phase === "recording" ? (
        <div className="space-y-5">
          <section className="rounded-3xl border border-brand-100 bg-white px-6 py-10 text-center">
            {phase === "countdown" ? (
              <>
                <p className="text-sm text-slate-500">یک نفس عمیق و راحت بکشید و آماده شوید</p>
                <p className="mt-3 text-7xl font-extrabold text-brand-700" aria-live="assertive">
                  {toPersianDigits(countdown)}
                </p>

              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">واکه آآآ را بهصورت پیوسته و طبیعی ادامه دهید</p>
                <p className="mt-3 text-5xl font-extrabold text-brand-700" dir="ltr" aria-live="off">
                  {toPersianDigits((elapsedMs / 1000).toFixed(1))} s
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  سقف ایمن: {toPersianDigits(MPT_CONFIG.maxDurationMs / 1000)} ثانیه — توقف خودکار پس از پایان آواسازی
                </p>
                <button
                  type="button"
                  onClick={completeAttempt}
                  className="mt-6 rounded-xl bg-warm-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-warm-500"
                >
                  توقف دستی
                </button>
              </>
            )}
          </section>
        </div>
      ) : null}

      {phase === "review" && lastAttempt ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">تلاش {toPersianDigits(attempts.length)}</h2>
          <p className="mt-2 text-sm text-slate-600">مدت آواسازی:</p>
          <p className="text-3xl font-extrabold text-brand-700" dir="ltr">
            {toPersianDigits(((lastAttempt.durationMs ?? 0) / 1000).toFixed(2))} s
          </p>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-7">
            {lastAttempt.quality.ok ? (
              <p className="text-emerald-700">کیفیت ضبط قابل قبول است.</p>
            ) : (
              <ul className="space-y-1 text-amber-800">
                {lastAttempt.quality.issues.map((issue) => (
                  <li key={issue}>• {MPT_ISSUE_LABELS[issue]}</li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            تلاشهای نامعتبر در محاسبه میانگین وارد نمیشوند. میتوانید تا {toPersianDigits(MAX_ATTEMPTS)} تلاش انجام دهید.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {attempts.length < MAX_ATTEMPTS ? (
              <button
                type="button"
                onClick={retryAttempt}
                className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"
              >
                تلاش دوباره
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPhase("result")}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              نمایش نتیجه نهایی
            </button>
          </div>
        </section>
      ) : null}

      {phase === "result" ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
            <MptReport result={summary} createdAt={completedAt} />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            {isLoggedIn ? (
              saveState.state === "saved" ? (
                <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-700">
                  <span>نتیجه در پروندهی شما ذخیره شد.</span>
                  <Link href={`/speech/mpt/result/${saveState.id}`} className="font-bold underline">
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
                  {saveState.state === "saving" ? "در حال ذخیره…" : "ذخیره نتیجه در پرونده"}
                </button>
              )
            ) : (
              <p className="text-sm leading-7 text-slate-600">
                برای ذخیره نتیجه در پرونده خود،{" "}
                <Link href="/login?next=/speech/mpt" className="font-bold text-brand-600 underline">
                  وارد شوید
                </Link>
                . نتیجه همین حالا در صفحه قابل مشاهده است و نیازی به ورود برای دیدن آن نیست.
              </p>
            )}
            {saveState.state === "error" ? <p className="mt-3 text-sm text-rose-700">{saveState.message}</p> : null}
            <p className="mt-3 text-xs text-slate-500">
              هیچ فایل صوتی ذخیره یا ارسال نمیشود؛ تنها اعداد مربوط به مدتزمان و کیفیت ضبط نگهداری میشوند.
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/speech/results"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              نتایج گفتار من
            </Link>
            <button
              type="button"
              onClick={restart}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              آزمون دوباره
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
