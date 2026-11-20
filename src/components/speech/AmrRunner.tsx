"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import { MPT_CONFIG } from "@/lib/speech/mpt-config";
import { MptAnalyzer } from "@/lib/speech/mpt-analysis";
import { toAmrPayload } from "@/lib/speech/amr-payload";
import { summarizeAmr } from "@/lib/speech/amr-analysis";
import { AMR_CONFIG } from "@/lib/speech/amr-config";
import { AMR_TASKS } from "@/lib/speech/amr-types";
import type { AmrTaskMetrics, AmrTaskKey, AmrTaskLabel } from "@/lib/speech/amr-types";
import { MIC_ERROR_LABELS, type MicError, type MicStatus } from "@/lib/speech/audio-recorder";
import { analyzeAmrTask } from "@/lib/speech/amr-analysis";
import { MPT_ISSUE_LABELS } from "@/lib/speech/mpt-types";
import type { AudioFrame } from "@/lib/speech/mpt-types";
import { saveAmrResult } from "@/server/speech-results";
import AudioRecorder from "./AudioRecorder";
import AmrReport from "./AmrReport";

type Phase = "intro" | "check" | "countdown" | "recording" | "review" | "result";
type SaveState = { state: "idle" } | { state: "saving" } | { state: "saved"; id: string } | { state: "error"; message: string };

const MAX_ATTEMPTS = 3;

const INSTRUCTIONS = [
  "در محیطی آرام بنشینید یا بایستید.",
  "میکروفون را در فاصله مناسب از دهان قرار دهید.",
  "پس از شروع ضبط، هجای نمایش‌داده‌شده را با سرعت و نظم مناسب، به‌صورت پیوسته و واضح تکرار کنید.",
  "تا پایان زمان آزمون، تلاش کنید ریتم گفتار خود را حفظ کنید.",
  "از فشار آوردن به حنجره یا حبس نفس خودداری کنید.",
];

/**
 * اجرای آزمون AMR: سه تکلیف مستقل /pa/، /ta/، /ka/.
 * هیچ تشخیص پزشکی یا نمره کلی تولید نمیشود.
 */
export default function AmrRunner({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [micSignal, setMicSignal] = useState(false);
  const [micError, setMicError] = useState<MicError | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [taskIndex, setTaskIndex] = useState(0);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [taskResults, setTaskResults] = useState<(AmrTaskMetrics | null)[]>([null, null, null]);
  const [currentMetrics, setCurrentMetrics] = useState<AmrTaskMetrics | null>(null);
  const [manualCountInput, setManualCountInput] = useState("");
  const [manualMessage, setManualMessage] = useState("");
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
  const framesRef = useRef<AudioFrame[]>([]);
  const onsetIndexRef = useRef<number>(-1);
  const offsetIndexRef = useRef<number | null>(null);
  const qualityRef = useRef<AmrTaskMetrics["quality"] | null>(null);

  const task = AMR_TASKS[taskIndex];
  const microphoneActive = phase === "check" || phase === "countdown" || phase === "recording";

  const micReady = micStatus === "ready" || (micStatus === "requesting" && micSignal);

  const summary = useMemo(() => {
    const results = taskResults.filter((r): r is AmrTaskMetrics => r !== null);
    if (results.length < 3) return null;
    return summarizeAmr(results);
  }, [taskResults]);

  function resetCaptureState() {
    analyzerRef.current = null;
    baselineRef.current = [];
    countdownStartRef.current = null;
    recordStartRef.current = null;
    tickRef.current = 0;
    framesRef.current = [];
    onsetIndexRef.current = -1;
    offsetIndexRef.current = null;
    qualityRef.current = null;
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
    framesRef.current = [];
    setElapsedMs(0);
    setPhase("recording");
  }

  function indexOfTime(frames: AudioFrame[], targetMs: number | null): number {
    if (targetMs === null) return -1;
    let best = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < frames.length; i++) {
      const diff = Math.abs(frames[i].t - targetMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return bestDiff <= 40 ? best : -1;
  }

  function completeAttempt() {
    const analyzer = analyzerRef.current;
    if (!analyzer || phaseRef.current !== "recording") return;
    analyzer.finish("MANUAL");
    const result = analyzer.result();
    const frames = framesRef.current;
    const onsetIndex = indexOfTime(frames, result.onsetMs);
    const offsetIndex = result.offsetMs !== null ? indexOfTime(frames, result.offsetMs) : null;

    onsetIndexRef.current = onsetIndex;
    offsetIndexRef.current = offsetIndex;
    qualityRef.current = result.quality;

    const metrics = analyzeAmrTask(
      frames,
      result.quality,
      onsetIndex,
      offsetIndex,
      task.key,
      task.label,
      attemptNumber,
      null,
    );
    setCurrentMetrics(metrics);
    setManualCountInput("");
    setManualMessage("");
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
    const pushed = { ...frame, t: relative };
    analyzer.push(pushed);
    framesRef.current.push(pushed);

    tickRef.current += 1;
    if (tickRef.current % 4 === 0) setElapsedMs(relative);
    if (relative >= AMR_CONFIG.targetDurationMs) completeRef.current();
    else if (analyzer.offsetDetected || analyzer.finished) completeRef.current();
  }

  function handleMicError(error: MicError) {
    setMicError(error);
    const current = phaseRef.current;
    if (current === "recording") completeRef.current();
    else if (current === "countdown") setPhase("check");
  }

  function retryAttempt() {
    if (attemptNumber >= MAX_ATTEMPTS && currentMetrics?.valid) {
      // اجازه تکرار حتی پس از سه تلاش نیست.
    }
    if (attemptNumber >= MAX_ATTEMPTS) return;
    setAttemptNumber((n) => n + 1);
    resetCaptureState();
    setCurrentMetrics(null);
    setCountdown(3);
    setPhase("countdown");
  }

  function applyManualCount() {
    const parsed = Number(manualCountInput.trim());
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 500) {
      setManualMessage("تعداد هجا باید عدد صحیح بین ۰ و ۵۰۰ باشد.");
      return;
    }
    if (!framesRef.current.length || onsetIndexRef.current < 0 || !qualityRef.current) {
      setManualMessage("داده‌ی ضبط برای بازبینی موجود نیست.");
      return;
    }
    const recomputed = analyzeAmrTask(
      framesRef.current,
      qualityRef.current,
      onsetIndexRef.current,
      offsetIndexRef.current,
      task.key,
      task.label,
      attemptNumber,
      parsed,
    );
    setCurrentMetrics(recomputed);
    setManualMessage("تعداد هجا به‌صورت دستی بازبینی شد.");
  }

  function acceptTask() {
    if (!currentMetrics) return;
    const next = [...taskResults];
    next[taskIndex] = currentMetrics;
    setTaskResults(next);
    setCurrentMetrics(null);
    setManualCountInput("");
    setManualMessage("");
    if (taskIndex + 1 < AMR_TASKS.length) {
      setTaskIndex(taskIndex + 1);
      setAttemptNumber(1);
      resetCaptureState();
      setPhase("countdown");
    } else {
      setCompletedAt(new Date());
      setPhase("result");
    }
  }

  function restart() {
    resetCaptureState();
    setTaskResults([null, null, null]);
    setTaskIndex(0);
    setAttemptNumber(1);
    setCurrentMetrics(null);
    setManualCountInput("");
    setManualMessage("");
    setCompletedAt(null);
    setMicError(null);
    micSignalRef.current = false;
    setMicSignal(false);
    setSaveState({ state: "idle" });
    setPhase("intro");
  }

  async function saveResult() {
    if (savingRef.current || saveState.state === "saved" || !summary) return;
    savingRef.current = true;
    setSaveState({ state: "saving" });
    try {
      const response = await saveAmrResult(toAmrPayload({
        tasks: summary.tasks,
        lowestRateTask: summary.lowestRateTask,
        highestCvTask: summary.highestCvTask,
        overallQuality: summary.overallQuality,
        algorithmVersion: summary.algorithmVersion,
        completedAt: (completedAt ?? new Date()).toISOString(),
      }));
      if (response.ok) setSaveState({ state: "saved", id: response.id });
      else setSaveState({ state: "error", message: response.reason === "auth" ? "برای ذخیره نتیجه باید وارد شوید." : "ذخیره نتیجه ناموفق بود." });
    } catch {
      setSaveState({ state: "error", message: "ذخیره نتیجه ناموفق بود. دوباره تلاش کنید." });
    } finally {
      savingRef.current = false;
    }
  }

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

  const taskResultsDone = taskResults.filter(Boolean).length;

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-bl from-brand-600 via-brand-700 to-calm-700 px-6 py-8 text-white sm:px-9">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">سنجه عملکردی</span>
          <span className="rounded-full bg-white/15 px-3 py-1">سه تکلیف مستقل</span>
          <span className="rounded-full bg-white/15 px-3 py-1">حدود ۲ تا ۳ دقیقه</span>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">آزمون نرخ حرکت تناوبی</h1>
        <p dir="ltr" className="mt-1 text-right text-sm text-brand-100">Alternating Motion Rate (AMR)</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-100/90">
          سنجش توانایی تکرار سریع و پیوسته هجاهای /pa/، /ta/ و /ka/ برای بررسی ریتم و نظم گفتار.
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
              در این آزمون، هر یک از هجاهای /pa/، /ta/ و /ka/ را به‌صورت پیوسته و با ریتم منظم تکرار می‌کنید.
              پس از شروع ضبط، هجای نمایش‌داده‌شده را با سرعت و نظم مناسب، به‌صورت پیوسته و واضح تکرار کنید.
              تا پایان زمان آزمون، تلاش کنید ریتم گفتار خود را حفظ کنید.
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
              هدف، تولید صدای طبیعی و پیوسته با ریتم منظم است. برای ثبت رکورد به خود فشار وارد نکنید.
            </p>
          </section>
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
            <h2 className="font-bold">شرایط و هشدارها</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>در محیطی آرام و بدون سر و صدای زیاد باشید.</li>
              <li>میکروفون در فاصله مناسبی از دهان قرار گیرد (حدود ۱۵ سانتیمتر).</li>
              <li>در صورت ناراحتی، سرگیجه یا تنگی نفس، آزمون را متوقف کنید.</li>
              <li>این آزمون تشخیص پزشکی نیست و نتیجه آن جایگزین ارزیابی متخصص نمیشود.</li>
              <li>تحلیل خودکار ممکن است در حضور نویز، لهجه یا کیفیت پایین میکروفون دچار خطای شمارش شود.</li>
            </ul>
          </section>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setPhase("check")} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700">
              شروع آزمون
            </button>
            <Link href="/speech" className="text-sm text-slate-500 hover:text-brand-600">بازگشت به فهرست ارزیابیها</Link>
          </div>
        </div>
      ) : null}

      {phase === "check" ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
            <h2 className="font-bold text-slate-800">آمادگی برای آزمون</h2>
            <p className="mt-2">
              ابتدا دکمه «فعال کردن میکروفون» را بفشارید و اجازه را بدهید. سپس صدای خود را در سطح معمولی تولید کنید.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              تکلیف جاری: <span dir="ltr" className="font-bold">{task.label}</span> — تلاش {toPersianDigits(attemptNumber)} از {toPersianDigits(MAX_ATTEMPTS)}
            </p>
          </section>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={beginCountdown} disabled={!micReady} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
              آغاز ضبط
            </button>
            <button type="button" onClick={() => setPhase("intro")} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-600 hover:bg-slate-50">
              بازگشت
            </button>
          </div>
          {micError ? <p className="text-sm text-rose-700">{MIC_ERROR_LABELS[micError]}</p> : null}
        </div>
      ) : null}

      {phase === "countdown" || phase === "recording" ? (
        <div className="space-y-5">
          <section className="rounded-3xl border border-brand-100 bg-white px-6 py-10 text-center">
            <p className="text-sm text-slate-500">تکلیف: <span dir="ltr" className="font-bold">{task.label}</span></p>
            {phase === "countdown" ? (
              <>
                <p className="mt-3 text-sm text-slate-500">یک نفس عمیق و راحت بکشید و آماده شوید</p>
                <p className="mt-3 text-7xl font-extrabold text-brand-700" aria-live="assertive">{toPersianDigits(countdown)}</p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-slate-500">هجای {task.label} را پیوسته و با ریتم منظم تکرار کنید</p>
                <p className="mt-3 text-5xl font-extrabold text-brand-700" dir="ltr" aria-live="off">
                  {toPersianDigits((elapsedMs / 1000).toFixed(1))} s
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  مدت پیشنهادی: {toPersianDigits(AMR_CONFIG.targetDurationMs / 1000)} ثانیه — توقف خودکار پس از پایان زمان
                </p>
                <button type="button" onClick={completeAttempt} className="mt-6 rounded-xl bg-warm-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-warm-500">
                  توقف دستی
                </button>
              </>
            )}
          </section>
        </div>
      ) : null}

      {phase === "review" && currentMetrics ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
          <h2 className="text-lg font-extrabold">
            تلاش {toPersianDigits(attemptNumber)} — تکلیف <span dir="ltr">{task.label}</span>
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">تعداد هجای تشخیص‌داده‌شده</p>
              <p className="text-2xl font-extrabold text-brand-700">{toPersianDigits(currentMetrics.detectedSyllableCount)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">نرخ تکرار (هجا/ثانیه)</p>
              <p className="text-2xl font-extrabold text-brand-700" dir="ltr">
                {currentMetrics.ratePerSecond !== null ? toPersianDigits(currentMetrics.ratePerSecond) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">میانگین فاصله (ms)</p>
              <p className="text-2xl font-extrabold text-brand-700" dir="ltr">
                {currentMetrics.meanIntervalMs !== null ? toPersianDigits(currentMetrics.meanIntervalMs) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">ضریب تغییرات (CV %)</p>
              <p className="text-2xl font-extrabold text-brand-700" dir="ltr">
                {currentMetrics.cvPercent !== null ? toPersianDigits(currentMetrics.cvPercent) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">مدت گفتار فعال (ms)</p>
              <p className="text-2xl font-extrabold text-brand-700" dir="ltr">
                {currentMetrics.activeDurationMs !== null ? toPersianDigits(currentMetrics.activeDurationMs) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">مکث‌های غیرمنتظره</p>
              <p className="text-2xl font-extrabold text-brand-700">{toPersianDigits(currentMetrics.pauseCount)}</p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-7">
            {currentMetrics.quality.ok ? (
              <p className="text-emerald-700">کیفیت ضبط قابل قبول است.</p>
            ) : (
              <ul className="space-y-1 text-amber-800">
                {currentMetrics.quality.issues.map((issue) => (
                  <li key={issue}>• {MPT_ISSUE_LABELS[issue]}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-slate-500">
              امتیاز اطمینان الگوریتم: {toPersianDigits(currentMetrics.confidence)} / ۱۰۰ ({currentMetrics.confidenceLevel === "high" ? "بالا" : currentMetrics.confidenceLevel === "medium" ? "متوسط" : "پایین"})
            </p>
            {currentMetrics.needsManualReview ? (
              <p className="mt-1 text-xs text-amber-700">
                این نتیجه نیازمند بررسی دستی است. در صورت نیاز، تعداد هجا را بازبینی کنید.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <label className="text-sm font-bold text-slate-700">بازبینی دستی تعداد هجا (اختیاری)</label>
            <p className="mt-1 text-xs text-slate-500">
              اگر شمارش خودکار اشتباه بود، تعداد صحیح را وارد کنید. نرخ تکرار بر اساس این مقدار بازمحاسبه می‌شود.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                max={500}
                value={manualCountInput}
                onChange={(e) => setManualCountInput(e.target.value)}
                className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <button type="button" onClick={applyManualCount} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                اعمال
              </button>
              {manualMessage ? <span className="text-xs text-slate-500">{manualMessage}</span> : null}
            </div>
          </div>

          {currentMetrics.limitations.length > 0 ? (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
              <p className="font-bold">محدودیت‌های این ضبط:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {currentMetrics.limitations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {attemptNumber < MAX_ATTEMPTS ? (
              <button type="button" onClick={retryAttempt} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
                تلاش دوباره
              </button>
            ) : null}
            <button type="button" onClick={acceptTask} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
              {taskIndex + 1 < AMR_TASKS.length ? "تکلیف بعدی" : "نمایش نتیجه نهایی"}
            </button>
          </div>
        </section>
      ) : null}

      {phase === "result" && summary ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
            <AmrReport result={summary} createdAt={completedAt} />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            {isLoggedIn ? (
              saveState.state === "saved" ? (
                <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-700">
                  <span>نتیجه در پرونده‌ی شما ذخیره شد.</span>
                  <Link href={`/speech/amr/result/${saveState.id}`} className="font-bold underline">
                    مشاهده گزارش ذخیره‌شده
                  </Link>
                </div>
              ) : (
                <button type="button" onClick={saveResult} disabled={saveState.state === "saving"} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-wait disabled:bg-brand-300">
                  {saveState.state === "saving" ? "در حال ذخیره…" : "ذخیره نتیجه در پرونده"}
                </button>
              )
            ) : (
              <p className="text-sm leading-7 text-slate-600">
                برای ذخیره نتیجه در پرونده خود،{" "}
                <Link href="/login?next=/speech/amr" className="font-bold text-brand-600 underline">وارد شوید</Link>.
                نتیجه همین حالا در صفحه قابل مشاهده است.
              </p>
            )}
            {saveState.state === "error" ? <p className="mt-3 text-sm text-rose-700">{saveState.message}</p> : null}
            <p className="mt-3 text-xs text-slate-500">
              هیچ فایل صوتی ذخیره یا ارسال نمیشود؛ تنها شاخصهای عددی و کیفیت ضبط نگهداری میشوند.
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/speech/results" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 hover:bg-slate-50">
              نتایج گفتار من
            </Link>
            <button type="button" onClick={restart} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 hover:bg-slate-50">
              آزمون دوباره
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
