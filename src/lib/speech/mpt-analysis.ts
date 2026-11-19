/**
 * تحلیل سیگنال آزمون MPT —完全 مستقل از React و مرورگر.
 * ورودی تنها فریمهای عددی RMS/peak است؛ هیچ نمونه صوتی خامی در اینجا ذخیره نمیشود.
 *
 * آستانهها آستانههای مهندسیاند و ادعای اعتبار بالینی یا هنجار تشخیصی ندارند.
 */
import { MPT_CONFIG, type MptConfig } from "./mpt-config";
import type { AudioFrame, MptAttempt, MptQuality, MptQualityIssue, MptStopReason } from "./mpt-types";

/** RMS یک پنجره نمونه (دامنه ورودی معمولاً ۱- تا ۱+). */
export function frameRms(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    sum += value * value;
  }
  return Math.sqrt(sum / samples.length);
}

export function framePeak(samples: ArrayLike<number>): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const absolute = Math.abs(samples[i]);
    if (absolute > peak) peak = absolute;
  }
  return peak;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export class MptAnalyzer {
  private readonly config: MptConfig;
  private baseline: AudioFrame[] = [];
  private readonly frames: AudioFrame[] = [];

  private onsetIndex = -1;
  private offsetIndex = -1;
  private naturalOffset = false;
  private forcedReason: "MANUAL" | "CAP" | null = null;
  private isFinished = false;

  constructor(config: Partial<MptConfig> = {}, baseline: AudioFrame[] = []) {
    this.config = { ...MPT_CONFIG, ...config };
    for (const frame of baseline) {
      if (this.isValidFrame(frame) && frame.t < this.config.baselineMs) this.baseline.push({ ...frame });
    }
  }

  private isValidFrame(frame: AudioFrame): boolean {
    return (
      Boolean(frame) &&
      Number.isFinite(frame.t) &&
      Number.isFinite(frame.rms) &&
      Number.isFinite(frame.peak) &&
      frame.rms >= 0 &&
      frame.peak >= 0
    );
  }

  /** فریمهای pre-roll که پس از شروع تحلیل رسیدهاند را نیز به پیشزمینه اضافه میکند. */
  push(frame: AudioFrame): void {
    if (this.isFinished || !this.isValidFrame(frame)) return;
    this.frames.push({ ...frame });
    if (frame.t < this.config.baselineMs) this.baseline.push({ ...frame });
    this.recompute();
    const last = this.frames[this.frames.length - 1];
    if (this.onsetIndex >= 0 && !this.naturalOffset && last.t >= this.config.maxDurationMs) {
      this.finish("CAP");
    }
  }

  /** بستن تحلیل؛ در صورت توقف دستی، انتهای آواسازی را آخرین فریم در نظر میگیرد. */
  finish(reason: "MANUAL" | "CAP" = "MANUAL"): void {
    if (this.isFinished) return;
    this.recompute();
    this.forcedReason = reason;
    this.isFinished = true;
  }

  get offsetDetected(): boolean {
    return this.naturalOffset;
  }

  get finished(): boolean {
    return this.isFinished;
  }

  get lastFrameTime(): number {
    return this.frames.length ? this.frames[this.frames.length - 1].t : 0;
  }

  private get noiseFloor(): number {
    const values = this.baseline.map((frame) => frame.rms).filter((value) => value > 0);
    return median(values);
  }

  private get onsetThreshold(): number {
    return Math.max(this.config.onsetThresholdRms, this.noiseFloor * this.config.onsetRatioOverNoise);
  }

  private get offsetThreshold(): number {
    return Math.max(this.config.onsetThresholdRms * 0.5, this.noiseFloor * this.config.offsetRatioOverNoise);
  }

  /** بازبینی کامل فریمها؛ تعداد فریمها حداکثر ~۲۴۰۰ است و هزینه آن ناچیز است. */
  private recompute(): void {
    const frames = this.frames;
    const loudThreshold = this.onsetThreshold;
    const quietThreshold = this.offsetThreshold;

    // شروع: نخستین دوندهای پیایی که به مدت حداقل onsetConfirmMs بالای آستانه بماند.
    let onset = -1;
    let runStart = -1;
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].rms >= loudThreshold) {
        if (runStart < 0) runStart = i;
        if (frames[i].t - frames[runStart].t >= this.config.onsetConfirmMs) {
          onset = runStart;
          break;
        }
      } else {
        runStart = -1;
      }
    }
    if (onset < 0) {
      this.onsetIndex = -1;
      this.offsetIndex = -1;
      this.naturalOffset = false;
      return;
    }
    this.onsetIndex = onset;

    // پایان: نخستین دوندهای سکوت پیایی به سطح کافی پس از آغاز آواسازی.
    let offset = -1;
    let quietStart = -1;
    for (let i = onset + 1; i < frames.length; i++) {
      if (frames[i].rms < quietThreshold) {
        if (quietStart < 0) quietStart = i;
        if (frames[i].t - frames[quietStart].t >= this.config.offsetConfirmMs - this.config.frameIntervalMs) {
          offset = Math.max(onset, quietStart - 1);
          break;
        }
      } else {
        quietStart = -1;
      }
    }

    if (offset >= 0) {
      this.offsetIndex = offset;
      this.naturalOffset = true;
    } else {
      this.offsetIndex = -1;
      this.naturalOffset = false;
    }
  }

  private quality(): MptQuality {
    const frames = this.frames;
    const start = Math.max(0, this.onsetIndex);
    const end = this.naturalOffset && this.offsetIndex >= 0 ? this.offsetIndex : frames.length - 1;
    const quietThreshold = this.offsetThreshold;

    let peakRms = 0;
    let clipped = 0;
    let counted = 0;
    let internalSilence = 0;
    let silenceStart = -1;

    for (let i = start; i <= end; i++) {
      const frame = frames[i];
      if (!frame) continue;
      counted++;
      if (frame.peak >= this.config.clippingPeak) clipped++;
      if (frame.rms > peakRms) peakRms = frame.rms;

      const quiet = frame.rms < quietThreshold;
      if (quiet) {
        if (silenceStart < 0) silenceStart = i;
      } else if (silenceStart >= 0) {
        internalSilence = Math.max(
          internalSilence,
          frames[i - 1].t - frames[silenceStart].t + this.config.frameIntervalMs,
        );
        silenceStart = -1;
      }
    }
    if (silenceStart >= 0 && end >= silenceStart) {
      internalSilence = Math.max(
        internalSilence,
        frames[end].t - frames[silenceStart].t + this.config.frameIntervalMs,
      );
    }

    const clippedRatio = counted ? clipped / counted : 0;
    const issues: MptQualityIssue[] = [];
    const noise = this.noiseFloor;

    if (this.onsetIndex < 0) {
      issues.push("NO_SIGNAL");
    } else {
      const duration = this.durationMs();
      if (duration !== null && duration < this.config.minDurationMs) issues.push("TOO_SHORT");
      if (peakRms < this.config.weakSignalRms) issues.push("WEAK_SIGNAL");
      if (internalSilence >= this.config.maxInternalSilenceMs) issues.push("LONG_INTERNAL_SILENCE");
      if (clippedRatio > this.config.maxClippedRatio) issues.push("CLIPPING");
      if (
        this.forcedReason === "MANUAL" &&
        !this.naturalOffset &&
        frames.length > 0 &&
        frames[frames.length - 1].rms >= quietThreshold
      ) {
        issues.push("TRUNCATED");
      }
    }
    if (noise > this.config.highNoiseRms) issues.push("HIGH_NOISE");

    return {
      ok: issues.length === 0,
      issues,
      noiseFloorRms: Number(noise.toFixed(5)),
      peakRms: Number(peakRms.toFixed(5)),
      clippedRatio: Number(clippedRatio.toFixed(4)),
      internalSilenceMs: Math.round(internalSilence),
    };
  }

  private durationMs(): number | null {
    if (this.onsetIndex < 0) return null;
    const frames = this.frames;
    const start = frames[this.onsetIndex]?.t;
    if (start === undefined) return null;

    let end: number | undefined;
    if (this.naturalOffset && this.offsetIndex >= 0) {
      end = frames[this.offsetIndex]?.t;
    } else if (this.forcedReason) {
      end = frames[frames.length - 1]?.t;
    }
    if (end === undefined) return null;
    return Math.max(0, Math.round(end - start));
  }

  result(): MptAttempt {
    this.recompute();
    const quality = this.quality();
    const durationMs = this.durationMs();
    let reason: MptStopReason = "NO_ONSET";
    if (this.naturalOffset) reason = "OFFSET";
    else if (this.forcedReason) reason = this.forcedReason;

    return {
      valid: quality.ok && durationMs !== null,
      durationMs,
      onsetMs: this.onsetIndex >= 0 ? Math.round(this.frames[this.onsetIndex].t) : null,
      offsetMs: this.naturalOffset && this.offsetIndex >= 0 ? Math.round(this.frames[this.offsetIndex].t) : null,
      stopReason: reason,
      quality,
    };
  }
}

/** تلاشهای نامعتبر حذف میشوند؛ میانگین روی تلاشهای معتبر محاسبه میشود. */
export function summarizeAttempts(attempts: MptAttempt[]) {
  const validDurations = attempts
    .filter((attempt) => attempt.valid && typeof attempt.durationMs === "number")
    .map((attempt) => attempt.durationMs as number);

  return {
    attempts,
    validCount: validDurations.length,
    bestMs: validDurations.length ? Math.max(...validDurations) : null,
    averageMs: validDurations.length
      ? Math.round(validDurations.reduce((sum, value) => sum + value, 0) / validDurations.length)
      : null,
  };
}
