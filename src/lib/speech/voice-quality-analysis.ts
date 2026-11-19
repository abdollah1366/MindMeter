/**
 * تحلیل آکوستیکی توصیفی کیفیت صوت — کاملاً مستقل از React و مرورگر.
 *
 * ورودیها همان فریمهای RMS/peak آزمون MPT و کپی نمونههای زمانیاند که
 * AudioCapture در حافظه frاهم میکند. هیچ نمونهای ذخیره، آپلود یا ارسال نمیشود.
 *
 * شاخصها فقط در صورتی که شرایط محاسبهشان معتبر باشد ارائه میشوند؛ در غیر این
 * صورت `null` همراه دلیل ثبت میشود. هیچ نمره کلی، هنجار تشخیصی، معادل GRBAS
 * یا تشخیص پزشکی در این ماژول تولید نمیشود.
 */
import { estimateF0 as estimateF0Nac } from "./sustained-vowel-analysis";
import type { SustainedVowelConfig } from "./sustained-vowel-config";
import { VOICE_QUALITY_CONFIG, type VoiceQualityConfig } from "./voice-quality-config";
import {
  VOICE_SAMPLE_KINDS,
  type VoicePoint,
  type VoiceQualityIssue,
  type VoiceQualitySummary,
  type VoiceSampleAttempt,
  type VoiceSampleKind,
  type VoiceSampleSummary,
  type VoiceUnmeasurable,
} from "./voice-quality-types";
import type { AudioFrame } from "./mpt-types";

const round = (value: number, digits: number) => Number(value.toFixed(digits));

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function finiteMean(values: Array<number | null>): number | null {
  const usable = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return usable.length ? mean(usable) : null;
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

function note(
  target: VoiceUnmeasurable[],
  metric: string,
  value: number | null,
  reason: string,
): void {
  if (value === null) target.push({ metric, reason });
}

function normalizeConfig(config: Partial<VoiceQualityConfig> = {}): VoiceQualityConfig {
  return { ...VOICE_QUALITY_CONFIG, ...config };
}

function svConfig(config: VoiceQualityConfig): Partial<SustainedVowelConfig> {
  return {
    minSampleRate: config.minSampleRate,
    maxSampleRate: config.maxSampleRate,
    minF0Hz: config.minF0Hz,
    maxF0Hz: config.maxF0Hz,
    f0VoicingThreshold: config.f0VoicingThreshold,
    analysisSamples: config.analysisSamples,
    pitchTargetRate: config.pitchTargetRate,
  };
}

/**
 * تخمین F0 با autocorrelation نرمالشده (همان الگوریتم آزمون واکه پایدار).
 * خروجی نامعتبر `null` است، نه صفر.
 */
export function estimateVoiceF0(
  samples: ArrayLike<number>,
  sampleRate: number,
  config: Partial<VoiceQualityConfig> = {},
): number | null {
  const cfg = normalizeConfig(config);
  return estimateF0Nac(samples, sampleRate, svConfig(cfg));
}

/**
 * همبستگی نرمالشده دقیقاً در تأخیر متناظر با F0. مقدار آن مبنای برآورد
 * نسبت هارمونیک به نویز است (رابطه کلاسیک 10log10(r/(1-r))).
 */
export function normalizedAutocorrelationAt(
  samples: ArrayLike<number>,
  sampleRate: number,
  hz: number,
  config: Partial<VoiceQualityConfig> = {},
): number | null {
  const cfg = normalizeConfig(config);
  if (
    !Number.isFinite(sampleRate) ||
    sampleRate < cfg.minSampleRate ||
    sampleRate > cfg.maxSampleRate ||
    !Number.isFinite(hz) ||
    hz < cfg.minF0Hz ||
    hz > cfg.maxF0Hz
  ) {
    return null;
  }
  const factor = Math.max(1, Math.round(sampleRate / cfg.pitchTargetRate));
  const usable = Math.min(samples.length, cfg.analysisSamples * factor);
  const length = Math.floor(usable / factor);
  if (length < 64) return null;

  const x = new Float64Array(length);
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
  const lag = Math.round(rate / hz);
  if (lag < 2 || lag >= Math.floor(length / 2)) return null;

  let numerator = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;
  for (let i = 0; i < length - lag; i++) {
    numerator += x[i] * x[i + lag];
    leftEnergy += x[i] * x[i];
    rightEnergy += x[i + lag] * x[i + lag];
  }
  const denominator = Math.sqrt(leftEnergy * rightEnergy);
  if (!(denominator > 1e-12)) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) && value > 0 && value <= 1 ? value : null;
}

/** برآورد نسبت هارمونیک به نویز بر حسب دسیبل؛ نامعتبر → `null`. */
export function computeHnrDb(
  samples: ArrayLike<number>,
  sampleRate: number,
  hz: number,
  config: Partial<VoiceQualityConfig> = {},
): number | null {
  const cfg = normalizeConfig(config);
  const r = normalizedAutocorrelationAt(samples, sampleRate, hz, config);
  if (r === null || r < cfg.minHnrAutocorrelation || r >= 0.995) return null;
  const db = 10 * Math.log10(r / (1 - r));
  return Number.isFinite(db) ? round(db, 2) : null;
}

export type VoiceCycle = { period: number; amplitude: number };

/**
 * استخراج دورههای آواسازی با نقاط عبور صفر صعودی روی سیگنال پایینگذر.
 * دورههایی که با دوره حاصل از F0 ناسازگاراند حذف میشوند تا crossings
 * ناشی از نویز بهعنوان دوره حساب نشوند.
 */
export function extractVoiceCycles(
  samples: ArrayLike<number>,
  sampleRate: number,
  hz: number,
  config: Partial<VoiceQualityConfig> = {},
): VoiceCycle[] {
  const cfg = normalizeConfig(config);
  if (
    !Number.isFinite(sampleRate) ||
    sampleRate < cfg.minSampleRate ||
    sampleRate > cfg.maxSampleRate ||
    !Number.isFinite(hz) ||
    hz < cfg.minF0Hz ||
    hz > cfg.maxF0Hz ||
    samples.length < 64
  ) {
    return [];
  }

  let dc = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    if (!Number.isFinite(value)) return [];
    dc += value;
  }
  dc /= samples.length;

  const alpha = Math.exp((-2 * Math.PI * cfg.cycleLowPassHz) / sampleRate);
  const filtered = new Float64Array(samples.length);
  let previous = 0;
  let peakFiltered = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = alpha * previous + (1 - alpha) * (samples[i] - dc);
    filtered[i] = value;
    previous = value;
    peakFiltered = Math.max(peakFiltered, Math.abs(value));
  }
  if (!(peakFiltered > 1e-9)) return [];

  const hysteresis = peakFiltered * 0.05;
  const crossings: number[] = [];
  let armed = true;
  for (let i = 1; i < filtered.length; i++) {
    if (armed && filtered[i - 1] <= 0 && filtered[i] > 0) {
      crossings.push(i);
      armed = false;
    } else if (filtered[i] < -hysteresis) {
      armed = true;
    }
  }
  if (crossings.length < 2) return [];

  const target = sampleRate / hz;
  const cycles: VoiceCycle[] = [];
  for (let i = 1; i < crossings.length; i++) {
    const start = crossings[i - 1];
    const end = crossings[i];
    const period = end - start;
    if (
      period < target * (1 - cfg.maxCycleDeviationRatio) ||
      period > target * (1 + cfg.maxCycleDeviationRatio)
    ) {
      continue;
    }
    let amplitude = 0;
    for (let j = start; j < end; j++) amplitude = Math.max(amplitude, Math.abs(samples[j]));
    if (amplitude >= cfg.cycleMinAmplitude) cycles.push({ period, amplitude });
  }
  return cycles;
}

/** ناپایداری نسبی دوره بهدرصد (RAP سهنقطهای). */
export function computeJitterPercent(cycles: VoiceCycle[], config: Partial<VoiceQualityConfig> = {}): number | null {
  const cfg = normalizeConfig(config);
  if (cycles.length < cfg.minCycles) return null;
  const periods = cycles.map((cycle) => cycle.period);
  const average = mean(periods);
  if (!(average > 0)) return null;
  let sum = 0;
  for (let i = 1; i < periods.length - 1; i++) {
    sum += Math.abs(periods[i] - (periods[i - 1] + periods[i] + periods[i + 1]) / 3);
  }
  return round((sum / (periods.length - 2) / average) * 100, 2);
}

/** ناپایداری نسبی دامنه دورههای متوالی بهدرصد (RAP سهنقطهای). */
export function computeShimmerPercent(cycles: VoiceCycle[], config: Partial<VoiceQualityConfig> = {}): number | null {
  const cfg = normalizeConfig(config);
  if (cycles.length < cfg.minCycles) return null;
  const amplitudes = cycles.map((cycle) => cycle.amplitude);
  const average = mean(amplitudes);
  if (!(average > 0)) return null;
  let sum = 0;
  for (let i = 1; i < amplitudes.length - 1; i++) {
    sum += Math.abs(amplitudes[i] - (amplitudes[i - 1] + amplitudes[i] + amplitudes[i + 1]) / 3);
  }
  return round((sum / (amplitudes.length - 2) / average) * 100, 2);
}

export type VoiceSpectralFeatures = { centroidHz: number | null; highFrequencyRatio: number | null };

/** FFT radix-2 با پنجره Hann، پیادهشده داخل ماژول بدون dependency جدید. */
function powerSpectrum(input: ArrayLike<number>, maxPoints: number): { power: Float64Array; n: number } | null {
  let n = 1;
  while (n < Math.min(input.length, maxPoints)) n <<= 1;
  if (n < 4 || n > maxPoints) return null;

  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const usable = Math.min(n, input.length);
  for (let i = 0; i < usable; i++) {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, usable - 1));
    re[i] = input[i] * window;
  }

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tempRe = re[i];
      re[i] = re[j];
      re[j] = tempRe;
      const tempIm = im[i];
      im[i] = im[j];
      im[j] = tempIm;
    }
  }

  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const stepRe = Math.cos(angle);
    const stepIm = Math.sin(angle);
    for (let offset = 0; offset < n; offset += length) {
      let currentRe = 1;
      let currentIm = 0;
      for (let k = 0; k < length / 2; k++) {
        const a = offset + k;
        const b = a + length / 2;
        const productRe = re[b] * currentRe - im[b] * currentIm;
        const productIm = re[b] * currentIm + im[b] * currentRe;
        re[b] = re[a] - productRe;
        im[b] = im[a] - productIm;
        re[a] += productRe;
        im[a] += productIm;
        const nextRe = currentRe * stepRe - currentIm * stepIm;
        currentIm = currentRe * stepIm + currentIm * stepRe;
        currentRe = nextRe;
      }
    }
  }

  const power = new Float64Array(n / 2);
  for (let i = 0; i < power.length; i++) power[i] = re[i] * re[i] + im[i] * im[i];
  return { power, n };
}

export function computeSpectralFeatures(
  samples: ArrayLike<number>,
  sampleRate: number,
  config: Partial<VoiceQualityConfig> = {},
): VoiceSpectralFeatures {
  const cfg = normalizeConfig(config);
  if (
    !Number.isFinite(sampleRate) ||
    sampleRate < cfg.minSampleRate ||
    sampleRate > cfg.maxSampleRate
  ) {
    return { centroidHz: null, highFrequencyRatio: null };
  }
  const spectrum = powerSpectrum(samples, cfg.fftMaxPoints);
  if (!spectrum) return { centroidHz: null, highFrequencyRatio: null };
  const binHz = sampleRate / spectrum.n;
  let total = 0;
  let weighted = 0;
  let high = 0;
  for (let i = 1; i < spectrum.power.length; i++) {
    const frequency = i * binHz;
    if (frequency > sampleRate / 2) break;
    const power = spectrum.power[i];
    total += power;
    weighted += power * frequency;
    if (frequency >= cfg.highFrequencyLowHz && frequency <= cfg.highFrequencyHighHz) high += power;
  }
  if (!(total > cfg.spectralMinEnergy)) return { centroidHz: null, highFrequencyRatio: null };
  return {
    centroidHz: round(weighted / total, 1),
    highFrequencyRatio:
      cfg.highFrequencyLowHz < sampleRate / 2 ? round(high / total, 4) : null,
  };
}

type StoredFrame = AudioFrame & { f0: number | null; sampleRateValid: boolean };
type StoredBuffer = { samples: Float32Array; sampleRate: number; f0: number | null };

function slopeHzPerSec(points: VoicePoint[]): number | null {
  if (points.length < 3) return null;
  const n = points.length;
  const meanT = mean(points.map((point) => point.t));
  const meanV = mean(points.map((point) => point.v));
  let numerator = 0;
  let denominator = 0;
  for (const point of points) {
    numerator += (point.t - meanT) * (point.v - meanV);
    denominator += (point.t - meanT) ** 2;
  }
  if (!(denominator > 0)) return null;
  return round((numerator / denominator) * 1000, 2);
}

function downsampleSeries(points: VoicePoint[], limit: number): VoicePoint[] {
  if (points.length <= limit) return points;
  const step = Math.ceil(points.length / limit);
  const result: VoicePoint[] = [];
  for (let i = 0; i < points.length; i += step) result.push(points[i]);
  return result;
}

/** تحلیلگر تک نمونه. هر نمونه با تحلیلگر مستقل خود پردازش میشود. */
export class VoiceQualityAnalyzer {
  private readonly cfg: VoiceQualityConfig;
  private readonly kind: VoiceSampleKind;
  private readonly baseline: AudioFrame[];
  private readonly frames: StoredFrame[] = [];
  private readonly buffers: StoredBuffer[] = [];
  private lastBufferT = -Infinity;
  private finished = false;

  constructor(
    config: Partial<VoiceQualityConfig> = {},
    kind: VoiceSampleKind = "vowel",
    baseline: AudioFrame[] = [],
  ) {
    this.cfg = normalizeConfig(config);
    this.kind = kind;
    this.baseline = baseline;
  }

  push(frame: AudioFrame, samples?: Float32Array | null, sampleRate = 0): void {
    if (this.finished) return;
    const sampleRateValid =
      Number.isFinite(sampleRate) && sampleRate >= this.cfg.minSampleRate && sampleRate <= this.cfg.maxSampleRate;
    const hasSamples = Boolean(samples && samples.length >= Math.min(this.cfg.analysisSamples, 256));
    const f0 = sampleRateValid && hasSamples ? estimateVoiceF0(samples as Float32Array, sampleRate, this.cfg) : null;
    this.frames.push({ ...frame, f0, sampleRateValid });

    if (sampleRateValid && samples && this.buffers.length < this.cfg.maxAnalysisBuffers) {
      const bufferMs = (samples.length / sampleRate) * 1000;
      // بافرها همپوشانی دارند؛ فقط بافری که تقریباً کاملاً جدیده ذخیره میشود.
      if (frame.t - this.lastBufferT >= bufferMs * 0.9) {
        this.buffers.push({ samples: new Float32Array(samples), sampleRate, f0 });
        this.lastBufferT = frame.t;
      }
    }
  }

  finish(): void {
    this.finished = true;
  }

  result(): VoiceSampleAttempt {
    const cfg = this.cfg;
    const unmeasurable: VoiceUnmeasurable[] = [];
    const issues: VoiceQualityIssue[] = [];

    if (this.frames.length === 0) {
      return {
        kind: this.kind,
        valid: false,
        issues: ["NO_SIGNAL", "INCOMPLETE_DATA", "NO_VOICED_FRAMES"],
        recordedMs: 0,
        voicedMs: null,
        f0MeanHz: null,
        f0StdHz: null,
        f0SlopeHzPerSec: null,
        amplitudeCv: null,
        jitterPercent: null,
        shimmerPercent: null,
        hnrDb: null,
        spectralCentroidHz: null,
        highFrequencyRatio: null,
        f0Series: [],
        amplitudeSeries: [],
        unmeasurable: [
          { metric: "همه شاخصها", reason: "هیچ فریمی دریافت نشد." },
        ],
      };
    }

    const firstT = this.frames[0].t;
    const lastT = this.frames[this.frames.length - 1].t;
    const recordedMs = Math.max(0, round(lastT - firstT + cfg.frameIntervalMs, 0));
    const rmsValues = this.frames.map((frame) => frame.rms);
    const meanRms = mean(rmsValues);
    const noiseFloor = median(
      this.baseline.filter((frame) => frame.rms > 0).map((frame) => frame.rms),
    );
    const clippedRatio =
      this.frames.filter((frame) => frame.peak >= cfg.clippingPeak).length / this.frames.length;

    const voicedFrames = this.frames.filter((frame) => frame.f0 !== null && frame.rms >= cfg.weakSignalRms);
    const voicedMs = voicedFrames.length ? round(voicedFrames.length * cfg.frameIntervalMs, 0) : null;

    const f0Values = voicedFrames.map((frame) => frame.f0 as number);
    const f0MeanHz = f0Values.length ? round(mean(f0Values), 2) : null;
    const f0StdHz = f0Values.length > 1 ? round(stdDev(f0Values), 2) : null;
    const f0Points: VoicePoint[] = voicedFrames.map((frame) => ({
      t: round(frame.t - firstT, 1),
      v: frame.f0 as number,
    }));
    const f0Slope = slopeHzPerSec(f0Points);

    const amplitudeValues = voicedFrames.map((frame) => frame.rms);
    const amplitudeCvRaw = amplitudeValues.length ? stdDev(amplitudeValues) / mean(amplitudeValues) : null;
    const amplitudeCv =
      amplitudeCvRaw !== null && Number.isFinite(amplitudeCvRaw) ? round(amplitudeCvRaw, 4) : null;
    const amplitudeSeries = downsampleSeries(
      this.frames.map((frame) => ({ t: round(frame.t - firstT, 1), v: round(frame.rms, 5) })),
      cfg.maxSeriesPoints,
    );

    const f0Reliable = voicedFrames.length >= cfg.minVoicedFrames && f0MeanHz !== null;
    const sdRatio =
      f0MeanHz !== null && f0MeanHz > 0 && f0StdHz !== null ? f0StdHz / f0MeanHz : Infinity;
    const cyclesStable = sdRatio <= cfg.maxF0SdRatio;
    const allCycles: VoiceCycle[] = [];
    const hnrValues: number[] = [];
    const centroidValues: number[] = [];
    const highRatioValues: number[] = [];
    for (const buffer of this.buffers) {
      if (buffer.f0 !== null) {
        allCycles.push(...extractVoiceCycles(buffer.samples, buffer.sampleRate, buffer.f0, cfg));
        const hnr = computeHnrDb(buffer.samples, buffer.sampleRate, buffer.f0, cfg);
        if (hnr !== null) hnrValues.push(hnr);
      }
      const spectral = computeSpectralFeatures(buffer.samples, buffer.sampleRate, cfg);
      if (spectral.centroidHz !== null) centroidValues.push(spectral.centroidHz);
      if (spectral.highFrequencyRatio !== null) highRatioValues.push(spectral.highFrequencyRatio);
    }

    const cycleMetricsAllowed = f0Reliable && cyclesStable;
    const jitterPercent = cycleMetricsAllowed ? computeJitterPercent(allCycles, cfg) : null;
    const shimmerPercent = cycleMetricsAllowed ? computeShimmerPercent(allCycles, cfg) : null;
    const hnrDb = hnrValues.length >= 3 ? round(mean(hnrValues), 2) : null;
    const spectralCentroidHz = centroidValues.length ? round(mean(centroidValues), 1) : null;
    const highFrequencyRatio = highRatioValues.length ? round(mean(highRatioValues), 4) : null;

    note(unmeasurable, "میانگین F0", f0MeanHz, "فریم آوادار معتبری برای تخمین F0 وجود ندارد.");
    note(unmeasurable, "انحراف معیار F0", f0StdHz, "تعداد فریم آوادار برای محاسبه پراکندگی کافی نیست.");
    note(unmeasurable, "روند F0", f0Slope, "داده زمانی کافی برای برازش روند وجود ندارد.");
    note(unmeasurable, "ناپایداری دامنه", amplitudeCv, "دامنه آوادار معتبری دریافت نشد.");
    note(
      unmeasurable,
      "ناپایداری دوره (Jitter)",
      jitterPercent,
      cycleMetricsAllowed
        ? "دورههای آواسازی کافی برای محاسبه وجود ندارد."
        : "F0 برای استخراج دورههای متوالی معتبر یا پایدار نیست.",
    );
    note(
      unmeasurable,
      "ناپایداری دامنه دوره (Shimmer)",
      shimmerPercent,
      cycleMetricsAllowed
        ? "دورههای آواسازی کافی برای محاسبه وجود ندارد."
        : "F0 برای استخراج دورههای متوالی معتبر یا پایدار نیست.",
    );
    note(unmeasurable, "نسبت هارمونیک به نویز (HNR)", hnrDb, "همبستگی دوره معتبری بهدست نیامد.");
    note(unmeasurable, "مرکز طیف", spectralCentroidHz, "انرژی طیفی معتبری دریافت نشد.");
    note(
      unmeasurable,
      "نسبت انرژی فرکانسهای بالا",
      highFrequencyRatio,
      "باند فرکانسی مورد نظر در نرخ نمونهبرداری جاری قابل محاسبه نیست.",
    );

    const addIssue = (issue: VoiceQualityIssue) => {
      if (!issues.includes(issue)) issues.push(issue);
    };
    if (meanRms < cfg.weakSignalRms * 0.5) addIssue("NO_SIGNAL");
    if (meanRms < cfg.weakSignalRms) addIssue("WEAK_SIGNAL");
    if (noiseFloor > cfg.highNoiseRms) addIssue("HIGH_NOISE");
    if (clippedRatio > cfg.maxClippedRatio) addIssue("CLIPPING");
    if (recordedMs < cfg.minDurationMs) addIssue("TOO_SHORT");
    if (!this.frames.some((frame) => frame.sampleRateValid)) addIssue("INVALID_SAMPLE_RATE");
    if (voicedFrames.length === 0) addIssue("NO_VOICED_FRAMES");
    if (voicedFrames.length > 0 && voicedFrames.length < cfg.minVoicedFrames) addIssue("F0_UNRELIABLE");
    if (f0Reliable && allCycles.length < cfg.minCycles) addIssue("INSUFFICIENT_CYCLES");

    return {
      kind: this.kind,
      valid: issues.length === 0,
      issues,
      recordedMs,
      voicedMs,
      f0MeanHz,
      f0StdHz,
      f0SlopeHzPerSec: f0Slope,
      amplitudeCv,
      jitterPercent,
      shimmerPercent,
      hnrDb,
      spectralCentroidHz,
      highFrequencyRatio,
      f0Series: downsampleSeries(f0Points, cfg.maxSeriesPoints),
      amplitudeSeries,
      unmeasurable,
    };
  }
}

const AVERAGED_METRICS = [
  "voicedMs",
  "f0MeanHz",
  "f0StdHz",
  "f0SlopeHzPerSec",
  "amplitudeCv",
  "jitterPercent",
  "shimmerPercent",
  "hnrDb",
  "spectralCentroidHz",
  "highFrequencyRatio",
] as const;

/** خلاصه جداگانه هر نمونه؛ تلاشهای نامعتبر وارد میانگین نمیشوند. */
export function summarizeVoiceSamples(
  attempts: VoiceSampleAttempt[],
  config: Partial<VoiceQualityConfig> = {},
): VoiceQualitySummary {
  const cfg = normalizeConfig(config);
  const samples: VoiceSampleSummary[] = VOICE_SAMPLE_KINDS.map((kind) => {
    const own = attempts.filter((attempt) => attempt.kind === kind);
    const usable = own.filter((attempt) => attempt.valid);
    const averaged: Record<(typeof AVERAGED_METRICS)[number], number | null> = {
      voicedMs: null,
      f0MeanHz: null,
      f0StdHz: null,
      f0SlopeHzPerSec: null,
      amplitudeCv: null,
      jitterPercent: null,
      shimmerPercent: null,
      hnrDb: null,
      spectralCentroidHz: null,
      highFrequencyRatio: null,
    };
    for (const metric of AVERAGED_METRICS) {
      const value = finiteMean(usable.map((attempt) => attempt[metric]));
      const digits = metric === "voicedMs" ? 0 : metric === "amplitudeCv" || metric === "highFrequencyRatio" ? 4 : 2;
      averaged[metric] = value === null ? null : round(value, digits);
    }
    const representative = [...usable].sort((a, b) => b.f0Series.length - a.f0Series.length)[0];
    return {
      kind,
      attempts: own,
      validCount: usable.length,
      ...averaged,
      f0Series: representative ? downsampleSeries(representative.f0Series, cfg.maxSeriesPoints) : [],
      amplitudeSeries: representative
        ? downsampleSeries(representative.amplitudeSeries, cfg.maxSeriesPoints)
        : [],
    };
  });
  return {
    samples,
    validSampleCount: samples.filter((sample) => sample.validCount > 0).length,
  };
}

/** پیشزمینه کوتاه برای تخمین کف نویز، برگرفته از همان ساختار فریم MPT. */
export function baselineNoiseFloor(frames: AudioFrame[]): number {
  return median(frames.filter((frame) => frame.rms > 0).map((frame) => frame.rms));
}
