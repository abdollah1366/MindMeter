/**
 * تحلیل آکوستیکی واکه پایدار — کاملاً مستقل از React و مرورگر.
 *
 * ورودیها عبارتاند از فریمهای RMS/peak (همان ساختار MPT) و بهصورت اختیاری
 * کپی نمونههای زمانی خام همان فریم بههمراه نرخ نمونهبرداری. نمونهها تنها در
 * حافظه پردازش میشوند و ذخیره یا ارسال نمیشوند.
 *
 * تمام آستانهها آستانههای مهندسیاند و ادعای اعتبار بالینی یا هنجار تشخیصی
 * ندارند. شاخصهای Jitter / Shimmer / HNR عمداً پیادهای نشدهاند (توضیح در
 * کامنت مربوطه و در گزارش نهایی).
 */
import { SUSTAINED_VOWEL_CONFIG, type SustainedVowelConfig } from "./sustained-vowel-config";
import type {
  AmplitudeStats,
  F0Point,
  F0Stats,
  SustainedVowelAttempt,
  SustainedVowelIssue,
  SustainedVowelQuality,
  SustainedVowelSummary,
} from "./sustained-vowel-types";
import type { AudioFrame } from "./mpt-types";

const round = (value: number, digits: number) => Number(value.toFixed(digits));

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1));
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * تخمین فرکانس پایه با autocorrelation نرمالشده (NAC).
 *
 * مراحل: حذف DC، کاهش نرخ نمونهبرداری میانگینگیر به ~pitchTargetRate، جستوجو
 * در بازه تأخیر متناظر با محدوده F0، انتخاب بیشینه همبستگی و درونیابی سهمی
 * برای دقت زیردرجه. اگر نمونهها، نرخ نمونهبرداری یا انرژی معتبر نباشد، null
 * برگردانده میشود (هرگز صفر، چون صفر یعنی «F0 صرفاً اندازهگیری نشد»).
 */
export function estimateF0(
  samples: ArrayLike<number>,
  sampleRate: number,
  config: Partial<SustainedVowelConfig> = {},
): number | null {
  const cfg: SustainedVowelConfig = { ...SUSTAINED_VOWEL_CONFIG, ...config };
  if (!Number.isFinite(sampleRate) || sampleRate < cfg.minSampleRate || sampleRate > cfg.maxSampleRate) return null;

  const factor = Math.max(1, Math.round(sampleRate / cfg.pitchTargetRate));
  const usable = Math.min(samples.length, cfg.analysisSamples * factor);
  const length = Math.floor(usable / factor);
  if (length < 64) return null;

  const x = new Float32Array(length);
  let total = 0;
  for (let j = 0; j < length; j++) {
    let sum = 0;
    for (let k = 0; k < factor; k++) {
      const value = samples[j * factor + k];
      if (!Number.isFinite(value)) return null;
      sum += value;
    }
    x[j] = sum / factor;
    total += x[j];
  }
  const dc = total / length;
  let energy = 0;
  for (let j = 0; j < length; j++) {
    x[j] -= dc;
    energy += x[j] * x[j];
  }
  if (!(energy > 1e-10)) return null;

  const rate = sampleRate / factor;
  const minLag = Math.max(2, Math.floor(rate / cfg.maxF0Hz));
  const maxLag = Math.min(Math.floor(length / 2), Math.ceil(rate / cfg.minF0Hz));
  if (maxLag <= minLag) return null;

  const scores = new Float64Array(maxLag + 1);
  let bestLag = -1;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let numerator = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    const limit = length - lag;
    for (let i = 0; i < limit; i++) {
      const a = x[i];
      const b = x[i + lag];
      numerator += a * b;
      leftEnergy += a * a;
      rightEnergy += b * b;
    }
    const denominator = Math.sqrt(leftEnergy * rightEnergy);
    const score = denominator > 1e-12 ? numerator / denominator : 0;
    scores[lag] = score;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestScore < cfg.f0VoicingThreshold) return null;

  // تصحیح خطای رایج «اکتاو» در autocorrelation: برای سیگنال تکفرکانی، مضربهای
  // دوره واقعی نیز همبستگی تقریباً برابری دارند و ممکن است به اشتباه
  // بهعنوان دوره انتخاب شوند (مثلاً ۸۷٫۵ هرتز بهجای ۳۵۰ هرتز). در میان بیشینههای
  // محلی نزدیک به بهترین همبستگی، کوتاهترین تأخیر، دوره واقعی است.
  const tolerance = Math.max(cfg.f0VoicingThreshold, bestScore - 0.05);
  let selectedLag = bestLag;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (scores[lag] >= tolerance && scores[lag] >= scores[lag - 1] && scores[lag] > scores[lag + 1]) {
      selectedLag = lag;
      break;
    }
  }

  let offset = 0;
  if (selectedLag > minLag && selectedLag < maxLag) {
    const a = scores[selectedLag - 1];
    const b = scores[selectedLag];
    const c = scores[selectedLag + 1];
    const denominator = a - 2 * b + c;
    if (Math.abs(denominator) > 1e-12) {
      const candidate = (0.5 * (a - c)) / denominator;
      if (Number.isFinite(candidate) && Math.abs(candidate) <= 0.5) offset = candidate;
    }
  }

  const hz = rate / (selectedLag + offset);
  return Number.isFinite(hz) && hz >= cfg.minF0Hz && hz <= cfg.maxF0Hz ? round(hz, 1) : null;
}

type StoredFrame = AudioFrame & { f0: number | null; sampleRateValid: boolean };

function isValidFrame(frame: AudioFrame): boolean {
  return (
    Boolean(frame) &&
    Number.isFinite(frame.t) &&
    Number.isFinite(frame.rms) &&
    Number.isFinite(frame.peak) &&
    frame.rms >= 0 &&
    frame.peak >= 0
  );
}

/** طولانیترین سکوت پیایی درون بازه؛ سکوت نسبت به آستانه پایان آواسازی سنجیده میشود. */
function internalSilence(frames: AudioFrame[], quietThreshold: number, frameIntervalMs: number): number {
  let longest = 0;
  let start = -1;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].rms < quietThreshold) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      longest = Math.max(longest, frames[i - 1].t - frames[start].t + frameIntervalMs);
      start = -1;
    }
  }
  if (start >= 0 && frames.length) {
    longest = Math.max(longest, frames[frames.length - 1].t - frames[start].t + frameIntervalMs);
  }
  return Math.round(longest);
}

function slopeHzPerSec(points: F0Point[]): number {
  if (points.length < 2) return 0;
  const times = points.map((point) => point.t);
  const values = points.map((point) => point.hz);
  const meanTime = mean(times);
  const meanValue = mean(values);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < points.length; i++) {
    numerator += (times[i] - meanTime) * (values[i] - meanValue);
    denominator += (times[i] - meanTime) ** 2;
  }
  return denominator > 0 ? round((numerator / denominator) * 1000, 1) : 0;
}

/** میانگین شاخصها فقط روی تلاشهای معتبر؛ در سرور دوباره محاسبه میشود. */
export function summarizeSustainedAttempts(attempts: SustainedVowelAttempt[]): SustainedVowelSummary {
  const valid = attempts.filter((attempt) => attempt.valid);
  const numbers = (pick: (attempt: SustainedVowelAttempt) => number | null | undefined) =>
    valid.map(pick).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const average = (values: number[], digits: number) =>
    values.length ? round(mean(values), digits) : null;

  return {
    attempts,
    validCount: valid.length,
    f0MeanHz: average(numbers((attempt) => attempt.f0?.meanHz), 2),
    f0StdHz: average(numbers((attempt) => attempt.f0?.stdHz), 2),
    amplitudeCv: average(numbers((attempt) => attempt.amplitude?.cv), 4),
    stableMs: average(numbers((attempt) => attempt.stableMs), 0),
  };
}

/**
 * نگهدارنده وضعیت تحلیل یک تلاش. برخلاف MPT，نتیجه نهایی، مدت آواسازی نیست؛
 * مدت تنها برای تعیین بازه پایدار استفاده میشود.
 */
export class SustainedVowelAnalyzer {
  private readonly config: SustainedVowelConfig;
  private readonly initialBaseline: AudioFrame[];
  private readonly frames: StoredFrame[] = [];
  private finishedFlag = false;

  constructor(config: Partial<SustainedVowelConfig> = {}, baseline: AudioFrame[] = []) {
    this.config = { ...SUSTAINED_VOWEL_CONFIG, ...config };
    this.initialBaseline = baseline.filter(isValidFrame).map((frame) => ({ ...frame }));
  }

  /** کپی نمونهها اختیاری است؛ MPT بدون آن کار میکند و رفتارش تغییری نمیکند. */
  push(frame: AudioFrame, samples?: Float32Array | null, sampleRate = 0): void {
    if (this.finishedFlag || !isValidFrame(frame)) return;
    const sampleRateValid =
      Number.isFinite(sampleRate) && sampleRate >= this.config.minSampleRate && sampleRate <= this.config.maxSampleRate;
    const f0 =
      sampleRateValid && samples && samples.length > 0
        ? estimateF0(samples, sampleRate, this.config)
        : null;
    this.frames.push({ ...frame, f0, sampleRateValid });
    if (frame.t < this.config.baselineMs) this.initialBaseline.push({ ...frame });
  }

  finish(): void {
    this.finishedFlag = true;
  }

  result(): SustainedVowelAttempt {
    const cfg = this.config;
    const frames = this.frames;
    const baseline = this.initialBaseline;
    const noiseFloor = median(baseline.map((frame) => frame.rms).filter((value) => value > 0));
    const onsetThreshold = Math.max(cfg.onsetThresholdRms, noiseFloor * cfg.onsetRatioOverNoise);
    const offsetThreshold = Math.max(cfg.onsetThresholdRms * 0.5, noiseFloor * cfg.offsetRatioOverNoise);

    let onsetIndex = -1;
    let loudStart = -1;
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].rms >= onsetThreshold) {
        if (loudStart < 0) loudStart = i;
        if (frames[i].t - frames[loudStart].t >= cfg.onsetConfirmMs) {
          onsetIndex = loudStart;
          break;
        }
      } else {
        loudStart = -1;
      }
    }

    let offsetIndex = frames.length - 1;
    if (onsetIndex >= 0) {
      let quietStart = -1;
      for (let i = onsetIndex + 1; i < frames.length; i++) {
        if (frames[i].rms < offsetThreshold) {
          if (quietStart < 0) quietStart = i;
          if (frames[i].t - frames[quietStart].t >= cfg.offsetConfirmMs - cfg.frameIntervalMs) {
            offsetIndex = Math.max(onsetIndex, quietStart - 1);
            break;
          }
        } else {
          quietStart = -1;
        }
      }
    }

    const onsetMs = onsetIndex >= 0 ? Math.round(frames[onsetIndex].t) : null;
    const offsetMs = onsetIndex >= 0 ? Math.round(frames[offsetIndex].t) : null;
    const recordedMs = onsetMs !== null && offsetMs !== null ? Math.max(0, offsetMs - onsetMs) : 0;

    // حذف لبههای شروع و پایان آواسازی پیش از جستوجوی بازه پایدار.
    const trimStart = onsetIndex >= 0 ? frames[onsetIndex].t + cfg.edgeTrimMs : 0;
    const trimEnd = onsetIndex >= 0 ? frames[offsetIndex].t - cfg.edgeTrimMs : 0;

    let best: { start: number; end: number; frames: StoredFrame[]; score: number } | null = null;
    for (let start = trimStart; start <= trimEnd - cfg.minStableMs; start += cfg.windowStepMs) {
      const end = Math.min(start + cfg.stableWindowMs, trimEnd);
      if (end - start < cfg.minStableMs) break;
      const window = frames.filter((frame) => frame.t >= start && frame.t <= end);
      if (window.length < 5) continue;
      const rmsValues = window.map((frame) => frame.rms);
      const averageRms = mean(rmsValues);
      const cv = averageRms > 0 ? stdDev(rmsValues) / averageRms : Infinity;
      if (!Number.isFinite(cv) || cv > cfg.maxAmplitudeCv) continue;
      // وقفه طولانی، پنجره را نامطلوب میکند ولی آن را حذف نمیکند تا بتوان علت
      // دقیق رد شدن (LONG_INTERNAL_SILENCE) را در نتیجه گزارش کرد.
      const silence = internalSilence(window, offsetThreshold, cfg.frameIntervalMs);
      const score = cv + (silence / cfg.maxInternalSilenceMs) * 0.5;
      if (!best || score < best.score) best = { start, end, frames: window, score };
    }

    const analysisFrames = best?.frames ?? [];
    let amplitude: AmplitudeStats | null = null;
    if (analysisFrames.length) {
      const rmsValues = analysisFrames.map((frame) => frame.rms);
      const averageRms = mean(rmsValues);
      if (averageRms > 0 && Number.isFinite(averageRms)) {
        amplitude = {
          meanRms: round(averageRms, 5),
          stdRms: round(stdDev(rmsValues), 5),
          cv: round(stdDev(rmsValues) / averageRms, 4),
          peakRms: round(Math.max(...rmsValues), 5),
        };
      }
    }

    const voiced = analysisFrames.filter((frame): frame is StoredFrame & { f0: number } => frame.f0 !== null);
    const voicedRatio = analysisFrames.length ? voiced.length / analysisFrames.length : 0;
    let f0: F0Stats | null = null;
    if (voiced.length >= 3 && voicedRatio >= cfg.minVoicedRatio) {
      const values = voiced.map((frame) => frame.f0);
      const step = Math.max(1, Math.ceil(voiced.length / cfg.maxSeriesPoints));
      const series: F0Point[] = voiced
        .filter((_, index) => index % step === 0)
        .slice(0, cfg.maxSeriesPoints)
        .map((frame) => ({ t: Math.round(frame.t), hz: frame.f0 }));
      f0 = {
        meanHz: round(mean(values), 2),
        minHz: round(Math.min(...values), 2),
        maxHz: round(Math.max(...values), 2),
        stdHz: round(stdDev(values), 2),
        slopeHzPerSec: slopeHzPerSec(series),
        series,
      };
    }

    const clippedRatio = analysisFrames.length
      ? analysisFrames.filter((frame) => frame.peak >= cfg.clippingPeak).length / analysisFrames.length
      : 0;
    // سکوت طولانی باید روی کل بازه آواسازی سنجیده شود، نه فقط پنجره پایدار؛
    // در غیر این صورت الگوریتم با انتخاب یک پنجره تمیز، وقفه میانه را نادیده میگیرد.
    const vowelFrames = onsetIndex >= 0 ? frames.slice(onsetIndex, offsetIndex + 1) : analysisFrames;
    const silenceMs = internalSilence(vowelFrames, offsetThreshold, cfg.frameIntervalMs);
    const sampleRateValid = frames.some((frame) => frame.sampleRateValid);
    const snrDb =
      noiseFloor > 0 && amplitude ? round(20 * Math.log10(amplitude.meanRms / noiseFloor), 1) : null;

    const quality: SustainedVowelQuality = {
      noiseFloorRms: round(noiseFloor, 5),
      snrDb,
      clippedRatio: round(clippedRatio, 4),
      internalSilenceMs: silenceMs,
      voicedRatio: round(voicedRatio, 3),
      sampleRateValid,
    };

    const issues: SustainedVowelIssue[] = [];
    if (onsetIndex < 0) issues.push("NO_SIGNAL");
    if (!best) {
      issues.push("NO_STABLE_SEGMENT");
      if (recordedMs < cfg.minStableMs + 2 * cfg.edgeTrimMs) issues.push("TOO_SHORT");
    }
    if (amplitude && amplitude.peakRms < cfg.weakSignalRms) issues.push("WEAK_SIGNAL");
    if (noiseFloor > cfg.highNoiseRms || (snrDb !== null && snrDb < cfg.snrMinDb)) issues.push("HIGH_NOISE");
    if (clippedRatio > cfg.maxClippedRatio) issues.push("CLIPPING");
    if (silenceMs >= cfg.maxInternalSilenceMs) issues.push("LONG_INTERNAL_SILENCE");
    if (best) {
      if (!sampleRateValid) issues.push("INVALID_SAMPLE_RATE");
      else if (!f0) issues.push("F0_UNRELIABLE");
    }

    return {
      valid: issues.length === 0,
      issues,
      recordedMs: Math.round(recordedMs),
      stableMs: best ? Math.round(best.end - best.start) : 0,
      onsetMs,
      offsetMs,
      stableStartMs: best ? Math.round(best.start) : null,
      stableEndMs: best ? Math.round(best.end) : null,
      f0,
      amplitude,
      quality,
    };
  }
}
