"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import {
  FREE_SPEECH_PROMPT,
  READING_TEXT,
  VOICE_QUALITY_CONFIG,
} from "@/lib/speech/voice-quality-config";
import { summarizeVoiceSamples, VoiceQualityAnalyzer } from "@/lib/speech/voice-quality-analysis";
import { toVoiceQualityPayload } from "@/lib/speech/voice-quality-payload";
import { saveVoiceQualityResult } from "@/server/speech-results";
import {
  MIC_ERROR_LABELS,
  type MicError,
  type MicStatus,
} from "@/lib/speech/audio-recorder";
import type { AudioFrame } from "@/lib/speech/mpt-types";
import {
  VOICE_QUALITY_ISSUE_LABELS,
  VOICE_SAMPLE_INSTRUCTIONS,
  VOICE_SAMPLE_KINDS,
  VOICE_SAMPLE_LABELS,
  type VoiceSampleAttempt,
  type VoiceSampleKind,
} from "@/lib/speech/voice-quality-types";
import AudioRecorder from "./AudioRecorder";
import VoiceQualityReport from "./VoiceQualityReport";

type Phase = "intro" | "check" | "countdown" | "recording" | "review" | "result";
type SaveState =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved"; id: string }
  | { state: "error"; message: string };

const MAX_ATTEMPTS = 3;
const COUNTDOWN_SECONDS = 3;
const WAVE_BARS = 40;
const INSTRUCTIONS = [
  "در محیطی آرام بنشینید و میکروفون را حدود ۱۵ سانتیمتر از دهان قرار دهید.",
  "سه نمونه صوتی جداگانه ضبط میشود: واکه پایدار، گفتار پیوسته و گفتار آزاد.",
  "هر نمونه را میتوانید حداکثر سه بار تکرار کنید.",
  "با صدای طبیعی صحبت کنید و از فریاد زدن یا فشار آوردن به حنجره خودداری کنید.",
  "در صورت ناراحتی، سرگیجه یا تنگی نفس آزمون را متوقف کنید.",
];

function emptyAttempts(): Record<VoiceSampleKind, VoiceSampleAttempt[]> {
  return { vowel: [], reading: [], free: [] };
}

/** اجرای آزمون کیفیت صوت: معرفی → میکروفون → سه نمونه → گزارش. */
export default function VoiceQualityRunner({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [sampleIndex, setSampleIndex] = useState(0);
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [micSignal, setMicSignal] = useState(false);
  const [micError, setMicError] = useState<MicError | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [wave, setWave] = useState<number[]>([]);
  const [attemptsByKind, setAttemptsByKind] = useState<Record<VoiceSampleKind, VoiceSampleAttempt[]>>(emptyAttempts);
  const [lastAttempt, setLastAttempt] = useState<VoiceSampleAttempt | null>(null);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ state: "idle" });

  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;
  const kind = VOICE_SAMPLE_KINDS[sampleIndex];
  const kindRef = useRef<VoiceSampleKind>(kind);
  kindRef.current = kind;

  const analyzerRef = useRef<VoiceQualityAnalyzer | null>(null);
  const baselineRef = useRef<AudioFrame[]>([]);
  const countdownStartRef = useRef<number | null>(null);
  const recordStartRef = useRef<number | null>(null);
  const pendingFrameRef = useRef<AudioFrame | null>(null);
  const tickRef = useRef(0);
  const completeRef = useRef<() => void>(() => {});
  const startRecordingRef = useRef<() => void>(() => {});
  const savingRef = useRef(false);
  const micSignalRef = useRef(false);

  const allAttempts = useMemo(
    () => VOICE_SAMPLE_KINDS.flatMap((item) => attemptsByKind[item]),
    [attemptsByKind],
  );
  const summary = useMemo(() => summarizeVoiceSamples(allAttempts), [allAttempts]);
  const microphoneActive = phase === "check" || phase === "countdown" || phase === "recording" || phase === "review";
  const micReady = micStatus === "ready" || (micStatus === "requesting" && micSignal);

  function resetCaptureState() {
    analyzerRef.current = null;
    baselineRef.current = [];
    countdownStartRef.current = null;
    recordStartRef.current = null;
    pendingFrameRef.current = null;
    tickRef.current = 0;
    setElapsedMs(0);
    setWave([]);
  }

  function beginCountdown() {
    if (!micReady) return;
    resetCaptureState();
    setCountdown(COUNTDOWN_SECONDS);
    setPhase("countdown");
  }

  function beginRecording() {
    if (phaseRef.current !== "countdown") return;
    analyzerRef.current = new VoiceQualityAnalyzer({}, kindRef.current, baselineRef.current);
    recordStartRef.current = null;
    pendingFrameRef.current = null;
    tickRef.current = 0;
    setElapsedMs(0);
    setWave([]);
    setPhase("recording");
  }

  function completeAttempt() {
    const analyzer = analyzerRef.current;
    if (!analyzer || phaseRef.current !== "recording") return;
    analyzer.finish();
    const result = analyzer.result();
    const currentKind = kindRef.current;
    setAttemptsByKind((previous) => ({ ...previous, [currentKind]: [...previous[currentKind], result] }));
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
    pendingFrameRef.current = { ...frame, t: relative };

    tickRef.current += 1;
    if (tickRef.current % 4 === 0) {
      setElapsedMs(relative);
      setWave((previous) => [...previous.slice(-(WAVE_BARS - 1)), frame.rms]);
    }
    if (relative >= VOICE_QUALITY_CONFIG.maxDurationMs[kindRef.current]) completeRef.current();
  }

  function handleSamples(samples: Float32Array, sampleRate: number) {
    if (phaseRef.current !== "recording") {
      pendingFrameRef.current = null;
      return;
    }
    const frame = pendingFrameRef.current;
    pendingFrameRef.current = null;
    if (frame) analyzerRef.current?.push(frame, samples, sampleRate);
  }

  function handleMicError(error: MicError) {
    setMicError(error);
    const current = phaseRef.current;
    if (current === "recording") completeRef.current();
    else if (current === "countdown") setPhase("check");
  }

  function retryAttempt() {
    if (attemptsByKind[kind].length >= MAX_ATTEMPTS) return;
    resetCaptureState();
    setLastAttempt(null);
    setCountdown(COUNTDOWN_SECONDS);
    setPhase("countdown");
  }

  function nextSample() {
    setLastAttempt(null);
    if (sampleIndex + 1 < VOICE_SAMPLE_KINDS.length) {
      setSampleIndex(sampleIndex + 1);
      setPhase("check");
    } else {
      setPhase("result");
    }
  }

  function restart() {
    resetCaptureState();
    setAttemptsByKind(emptyAttempts());
    setLastAttempt(null);
    setCompletedAt(null);
    setMicError(null);
    setSampleIndex(0);
    micSignalRef.current = false;
    setMicSignal(false);
    setSaveState({ state: "idle" });
    setPhase("intro");
  }

  async function saveResult() {
    if (savingRef.current || saveState.state === "saved" || summary.validSampleCount < 1) return;
    savingRef.current = true;
    setSaveState({ state: "saving" });
    try {
      const response = await saveVoiceQualityResult(toVoiceQualityPayload(summary));
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

  useEffect(() => {
    if (phase !== "countdown") return;
    let value = COUNTDOWN_SECONDS;
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
          <span className="rounded-full bg-white/15 px-3 py-1">حدود ۲ تا ۳ دقیقه</span>
          <span className="rounded-full bg-white/15 px-3 py-1">حداکثر {toPersianDigits(MAX_ATTEMPTS)} تلاش برای هر نمونه</span>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">ارزیابی کیفیت صوت</h1>
        <p dir="ltr" className="mt-1 text-right text-sm text-brand-100">
          Voice Quality Assessment
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-100/90">
          ویژگیهای قابل اندازهگیری سیگنال صوت در سه نمونه جداگانه بررسی میشود. هدف، توصیف آکوستیکی است، نه تشخیص
          پزشکی و نه جایگزینی ارزیابی شنیداری متخصص.
        </p>
      </header>

      {microphoneActive ? (
        <AudioRecorder
          active
          onFrame={handleFrame}
          onSamples={handleSamples}
          onError={handleMicError}
          onStatusChange={setMicStatus}
          frameIntervalMs={VOICE_QUALITY_CONFIG.frameIntervalMs}
        />
      ) : null}

      {phase === "intro" ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">دستورالعمل آزمون</h2>
            <p className="mt-3 text-sm leading-8 text-slate-600">
              در این آزمون، ویژگیهای صوت شما با استفاده از ضبط کوتاه گفتار و آواسازی بررسی میشود. لطفاً در محیطی آرام
              و با صدای طبیعی صحبت کنید. از فریاد زدن یا فشار آوردن به حنجره خودداری کنید.
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
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
            <h2 className="font-bold">شرایط و هشدارهای ایمنی</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>ضبط تنها در محیطی آرام و با میکروفون سالم انجام شود.</li>
              <li>مجوز میکروفون تنها پس از اقدام صریح شما درخواست میشود.</li>
              <li>هیچ فایل صوتی ذخیره یا به سرویس خارجی ارسال نمیشود.</li>
              <li>این آزمون تشخیص پزشکی نیست و جایگزین ارزیابی متخصص نمیشود.</li>
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
            <p className="text-xs font-bold text-brand-700">
              نمونه {toPersianDigits(sampleIndex + 1)} از {toPersianDigits(VOICE_SAMPLE_KINDS.length)}
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-800">{VOICE_SAMPLE_LABELS[kind]}</h2>
            <p className="mt-2">{VOICE_SAMPLE_INSTRUCTIONS[kind]}</p>
            {kind === "vowel" ? (
              <p className="mt-2 text-xs text-slate-500">
                مدت پیشنهادی: {toPersianDigits(5)} تا {toPersianDigits(8)} ثانیه. سقف ضبط{" "}
                {toPersianDigits(VOICE_QUALITY_CONFIG.maxDurationMs.vowel / 1000)} ثانیه است.
              </p>
            ) : null}
            {kind === "reading" ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-base leading-9 text-slate-800" dir="rtl">
                {READING_TEXT}
              </div>
            ) : null}
            {kind === "free" ? (
              <div className="mt-3 rounded-xl bg-brand-50 p-4 text-brand-800">{FREE_SPEECH_PROMPT}</div>
            ) : null}
            <p className="mt-3 text-xs text-slate-500">
              سطح ورودی صدا را در کادر میکروفون بررسی کنید. پس از آماده شدن، دکمه آغاز اندازهگیری را بفشارید.
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
              onClick={() => setPhase(sampleIndex === 0 ? "intro" : "result")}
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
            <p className="text-xs font-bold text-brand-700">{VOICE_SAMPLE_LABELS[kind]}</p>
            {phase === "countdown" ? (
              <>
                <p className="mt-3 text-sm text-slate-500">آماده شوید؛ سپس نمونه را آغاز کنید</p>
                <p className="mt-3 text-7xl font-extrabold text-brand-700" aria-live="assertive">
                  {toPersianDigits(countdown)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-slate-500">{VOICE_SAMPLE_INSTRUCTIONS[kind]}</p>
                <p className="mt-3 text-5xl font-extrabold text-brand-700" dir="ltr" aria-live="off">
                  {toPersianDigits((elapsedMs / 1000).toFixed(1))} s
                </p>
                <div
                  className="mt-6 flex h-20 items-end justify-center gap-1 overflow-hidden rounded-xl bg-slate-50 px-3"
                  dir="ltr"
                >
                  {wave.length === 0 ? (
                    <span className="text-xs text-slate-400" dir="rtl">
                      در انتظار نمونه صوت…
                    </span>
                  ) : (
                    wave.map((level, index) => (
                      <span
                        key={index}
                        className="w-1.5 min-w-[3px] rounded-t bg-brand-500"
                        style={{ height: `${Math.max(3, Math.min(100, level * 900))}%` }}
                      />
                    ))
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  سقف ایمن: {toPersianDigits(VOICE_QUALITY_CONFIG.maxDurationMs[kind] / 1000)} ثانیه
                </p>
                <button
                  type="button"
                  onClick={completeAttempt}
                  className="mt-6 rounded-xl bg-warm-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-warm-500"
                >
                  توقف دستی و پردازش
                </button>
              </>
            )}
          </section>
        </div>
      ) : null}

      {phase === "review" && lastAttempt ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">
            تلاش {toPersianDigits(attemptsByKind[kind].length)} — {VOICE_SAMPLE_LABELS[kind]}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">مدت ضبطشده</p>
              <p className="mt-1 font-bold text-slate-800" dir="ltr">
                {(lastAttempt.recordedMs / 1000).toFixed(2)} s
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">مدت آواسازی</p>
              <p className="mt-1 font-bold text-emerald-800" dir="ltr">
                {lastAttempt.voicedMs === null ? "—" : `${(lastAttempt.voicedMs / 1000).toFixed(2)} s`}
              </p>
            </div>
            <div className="rounded-xl bg-brand-50 p-3">
              <p className="text-xs text-brand-700">میانگین F0</p>
              <p className="mt-1 font-bold text-brand-800" dir="ltr">
                {lastAttempt.f0MeanHz === null ? "—" : `${lastAttempt.f0MeanHz.toFixed(1)} Hz`}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-7">
            {lastAttempt.valid ? (
              <p className="text-emerald-700">کیفیت ضبط این تلاش قابل تحلیل است.</p>
            ) : (
              <ul className="space-y-1 text-amber-800">
                {lastAttempt.issues.map((issue) => (
                  <li key={issue}>• {VOICE_QUALITY_ISSUE_LABELS[issue]}</li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            تلاشهای نامعتبر در خلاصه وارد نمیشوند. برای هر نمونه حداکثر {toPersianDigits(MAX_ATTEMPTS)} تلاش مجاز است.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {attemptsByKind[kind].length < MAX_ATTEMPTS ? (
              <button
                type="button"
                onClick={retryAttempt}
                className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"
              >
                تکرار این نمونه
              </button>
            ) : null}
            <button
              type="button"
              onClick={nextSample}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {sampleIndex + 1 < VOICE_SAMPLE_KINDS.length ? "نمونه بعدی" : "نمایش نتیجه نهایی"}
            </button>
          </div>
        </section>
      ) : null}

      {phase === "result" ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
            <VoiceQualityReport result={toVoiceQualityPayload(summary)} createdAt={completedAt} />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            {isLoggedIn ? (
              saveState.state === "saved" ? (
                <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-700">
                  <span>نتیجه در پروندهی شما ذخیره شد.</span>
                  <Link href={`/speech/voice-quality/result/${saveState.id}`} className="font-bold underline">
                    مشاهده گزارش ذخیرهشده
                  </Link>
                </div>
              ) : summary.validSampleCount < 1 ? (
                <p className="text-sm leading-7 text-amber-800">
                  هیچ نمونه معتبری برای ذخیره وجود ندارد. لطفاً آزمون را دوباره اجرا کنید.
                </p>
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
                <Link href="/login?next=/speech/voice-quality" className="font-bold text-brand-600 underline">
                  وارد شوید
                </Link>
                . نتیجه همین حالا در صفحه قابل مشاهده است و نیازی به ورود برای دیدن آن نیست.
              </p>
            )}
            {saveState.state === "error" ? <p className="mt-3 text-sm text-rose-700">{saveState.message}</p> : null}
            <p className="mt-3 text-xs text-slate-500">
              هیچ فایل صوتی ذخیره یا ارسال نمیشود؛ تنها شاخصهای عددی محاسبهشده نگهداری میشوند.
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
