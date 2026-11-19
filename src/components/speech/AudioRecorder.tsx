"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioCapture, MIC_ERROR_LABELS, type MicError, type MicStatus } from "@/lib/speech/audio-recorder";
import { MPT_CONFIG } from "@/lib/speech/mpt-config";
import type { AudioFrame } from "@/lib/speech/mpt-types";

type Props = {
  /** در تمام مراحلی که میکروفون باید فعال باشد true باشد. */
  active: boolean;
  onFrame: (frame: AudioFrame) => void;
  onError?: (error: MicError) => void;
  onStatusChange?: (status: MicStatus) => void;
  /** اختیاری؛ تنها تحلیل واکه پایدار برای تخمین F0 به نمونهها نیاز دارد. */
  onSamples?: (samples: Float32Array, sampleRate: number) => void;
  /** فاصله نمونهبرداری؛ پیشفرض همان مقدار MPT است. */
  frameIntervalMs?: number;
};

const STATUS_LABEL: Record<MicStatus, string> = {
  idle: "میکروفون فعال نشده است",
  requesting: "درخواست دسترسی به میکروفون…",
  ready: "میکروفون آماده است",
  denied: "دسترسی رد شد",
  unsupported: "مرورگر پشتیبانی نمیکند",
  error: "خطای میکروفون",
};

const PERMISSION_HELP_DELAY_MS = 4000;

/**
 * رابط کاربری و چرخه حیات میکروفون. مجوز تنها پس از اقدام صریح کاربر ( active )
 * درخواست میشود و منابع در خروج از صفحه آزاد میشوند.
 */
export default function AudioRecorder({
  active,
  onFrame,
  onError,
  onStatusChange,
  onSamples,
  frameIntervalMs = MPT_CONFIG.frameIntervalMs,
}: Props) {
  const captureRef = useRef<AudioCapture | null>(null);
  const frameRef = useRef(onFrame);
  const errorRef = useRef(onError);
  const statusRef = useRef(onStatusChange);
  const samplesRef = useRef(onSamples);
  const frameCount = useRef(0);
  /** تلاشهای قدیمی نباید وضعیت یا فریمهای تلاش جدید را تحت تأثیر قرار دهند. */
  const generationRef = useRef(0);

  const [status, setStatus] = useState<MicStatus>("idle");
  const [error, setError] = useState<MicError | null>(null);
  const [level, setLevel] = useState(0);
  const [showWaitingHelp, setShowWaitingHelp] = useState(false);

  frameRef.current = onFrame;
  errorRef.current = onError;
  statusRef.current = onStatusChange;
  samplesRef.current = onSamples;

  /**
   * وضعیت را همزمان هم در همین کامپوننت و هم در والد بهروز میکنیم. اتکا به
   * effect جداگانه میتواند در برخی مرورگرها باعث شود والد «آماده» را دریافت
   * نکند، در حالی که نشانگر داخلی میکروفون آماده است و دکمه شروع خاموش میماند.
   */
  const updateStatus = useCallback((next: MicStatus) => {
    setStatus(next);
    statusRef.current?.(next);
  }, []);

  /**
   * درخواست مجوز را هم هنگام ورود به فاز بررسی و هم مستقیماً از روی دکمه «تلاش
   * دوباره» فراخوانی میکنیم. حالت دوم درون اقدام کاربر است و برای مرورگرهایی
   * که مجوز را تنها در پاسخ به کلیک صریح میپذیرند ضروری است.
   */
  const startCapture = useCallback(() => {
    if (!captureRef.current) captureRef.current = new AudioCapture();
    const capture = captureRef.current;
    const generation = ++generationRef.current;

    capture.stop();
    setError(null);
    setLevel(0);
    setShowWaitingHelp(false);
    updateStatus("requesting");

    void capture
      .start(
        (frame) => {
          if (generationRef.current !== generation) return;
          frameCount.current += 1;
          if (frameCount.current % 2 === 0) setLevel(frame.rms);
          frameRef.current(frame);
        },
        (nextError) => {
          if (generationRef.current !== generation) return;
          setError(nextError);
          updateStatus(nextError === "DENIED" ? "denied" : nextError === "UNSUPPORTED" ? "unsupported" : "error");
          errorRef.current?.(nextError);
        },
        frameIntervalMs,
        (samples, sampleRate) => {
          if (generationRef.current === generation) samplesRef.current?.(samples, sampleRate);
        },
      )
      .then(() => {
        if (generationRef.current !== generation || !capture.running) return;
        updateStatus("ready");
      });
  }, [frameIntervalMs, updateStatus]);

  useEffect(() => {
    if (!active) {
      generationRef.current += 1;
      captureRef.current?.stop();
      updateStatus("idle");
      setLevel(0);
      setShowWaitingHelp(false);
      return;
    }
    startCapture();
    return () => {
      generationRef.current += 1;
      captureRef.current?.stop();
    };
  }, [active, startCapture, updateStatus]);

  // اگر پنجره مجوز ظاهر نشد، بهجای ماندن بیپایان در حالت «درخواست دسترسی»،
  // راهنما و دکمه تلاش دوباره را نشان میدهیم.
  useEffect(() => {
    if (status !== "requesting") {
      setShowWaitingHelp(false);
      return;
    }
    const id = setTimeout(() => setShowWaitingHelp(true), PERMISSION_HELP_DELAY_MS);
    return () => clearTimeout(id);
  }, [status]);

  const retry = useCallback(() => startCapture(), [startCapture]);

  const levelPercent = Math.min(100, Math.round(level * 500));
  const showMeter = status === "ready";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-slate-700">بررسی میکروفون</p>
        <span
          className={`rounded-full px-2.5 py-1 text-xs ${
            status === "ready"
              ? "bg-emerald-50 text-emerald-700"
              : status === "denied" || status === "error" || status === "unsupported"
                ? "bg-rose-50 text-rose-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-800">
          <p>{MIC_ERROR_LABELS[error]}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-rose-700/90">
            <li>اجازه میکروفون را در نوار آدرس مرورگر بررسی کنید.</li>
            <li>میکروفون دیگری را وصل کنید یا دستگاه پیشفرض صدا را تغییر دهید.</li>
            <li>از اتصال امن HTTPS استفاده کنید (آدرس سایت باید با https آغاز شود).</li>
          </ul>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-xs font-medium text-white hover:bg-rose-800"
          >
            تلاش دوباره
          </button>
        </div>
      ) : null}

      {status === "requesting" && showWaitingHelp ? (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900">
          <p>پنجره اجازه میکروفون مرورگر را نمیدبینید؟ اجازه میکروفون را در نوار آدرس بررسی کنید و دوباره تلاش کنید.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded-lg bg-amber-700 px-4 py-2 text-xs font-medium text-white hover:bg-amber-800"
          >
            تلاش دوباره
          </button>
        </div>
      ) : null}

      {showMeter ? (
        <div className="mt-4" aria-live="off">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>سطح ورودی صدا</span>
            <span dir="ltr">{levelPercent}%</span>
          </div>
          <div
            role="meter"
            aria-label="سطح ورودی میکروفون"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={levelPercent}
            className="h-3 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-100"
              style={{ width: `${levelPercent}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-6 text-slate-500">
            هنگام صحبت کنید تا بومی ببیند میکروفون صدا را دریافت میکند. نیازی به بلند صحبت کردن نیست.
          </p>
        </div>
      ) : null}
    </div>
  );
}
