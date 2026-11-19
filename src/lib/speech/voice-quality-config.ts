/**
 * آستانههای مهندسی تحلیل کیفیت صوت.
 *
 * تمام مقادیر، آستانههای فنی پردازش سیگنالاند و هیچ هنجار بالینی، نمره ادراکی
 * یا اعتبار تشخیصی را نمایانگر نیستند. تمرکز آنها در یک فایل، بازبینی بعدی
 * همراه با تستروی واقعی روی میکروفونها و گویشهای مختلف را ممکن میسازد.
 */
import type { VoiceSampleKind } from "./voice-quality-types";

export type VoiceQualityConfig = {
  /** بازه معتبر نرخ نمونهبرداری. */
  minSampleRate: number;
  maxSampleRate: number;
  /** بازه جستوجوی فرکانس پایه. */
  minF0Hz: number;
  maxF0Hz: number;
  /** کمترین همبستگی نرمالشده برای پذیرش یک تخمین F0. */
  f0VoicingThreshold: number;
  analysisSamples: number;
  pitchTargetRate: number;
  /** کمترین تعداد فریم آوادار برای ارائه آمار F0. */
  minVoicedFrames: number;
  weakSignalRms: number;
  highNoiseRms: number;
  clippingPeak: number;
  maxClippedRatio: number;
  /** کمترین مدت آواسازی قابل تحلیل. */
  minDurationMs: number;
  /** سقف ضبط هر نمونه. */
  maxDurationMs: Record<VoiceSampleKind, number>;
  /** مدت پیشزمینه برای تخمین کف نویز. */
  baselineMs: number;
  onsetThresholdRms: number;
  onsetRatioOverNoise: number;
  /** کمترین دورههای آواسازی لازم برای Jitter/Shimmer. */
  minCycles: number;
  /** حداکثر انحراف دوره استخراجشده از دوره حاصل از F0. */
  maxCycleDeviationRatio: number;
  /** بالاترین نسبت انحراف معیار F0 به میانگین که در آن تحلیل دوره معتبر است. */
  maxF0SdRatio: number;
  /** فرکانس قطع فیلتر پایینگذر پیش از یافتن نقاط صفر. */
  cycleLowPassHz: number;
  /** کمترین دامنه قابل قبول یک دوره. */
  cycleMinAmplitude: number;
  /** کمترین همبستگی نرمالشده لازم برای محاسبه HNR. */
  minHnrAutocorrelation: number;
  /** حداکثر اندازه FFT. */
  fftMaxPoints: number;
  /** باند فرکانسی پرانرژی مورد استفاده بهعنوان شاخص توصیفی. */
  highFrequencyLowHz: number;
  highFrequencyHighHz: number;
  spectralMinEnergy: number;
  /** حداکثر نقاط ذخیرهشده در هر سری نمودار. */
  maxSeriesPoints: number;
  frameIntervalMs: number;
  /** حداکثر بافرهای مورد استفاده برای تحلیل دوره و طیف. */
  maxAnalysisBuffers: number;
};

export const VOICE_QUALITY_CONFIG: VoiceQualityConfig = {
  minSampleRate: 8_000,
  maxSampleRate: 192_000,
  minF0Hz: 70,
  maxF0Hz: 400,
  f0VoicingThreshold: 0.6,
  analysisSamples: 1536,
  pitchTargetRate: 16_000,
  minVoicedFrames: 8,
  weakSignalRms: 0.012,
  highNoiseRms: 0.06,
  clippingPeak: 0.98,
  maxClippedRatio: 0.05,
  minDurationMs: 800,
  maxDurationMs: { vowel: 8_000, reading: 20_000, free: 10_000 },
  baselineMs: 400,
  onsetThresholdRms: 0.008,
  onsetRatioOverNoise: 3,
  minCycles: 12,
  maxCycleDeviationRatio: 0.18,
  maxF0SdRatio: 0.25,
  cycleLowPassHz: 1200,
  cycleMinAmplitude: 0.005,
  minHnrAutocorrelation: 0.5,
  fftMaxPoints: 2048,
  highFrequencyLowHz: 2_000,
  highFrequencyHighHz: 5_000,
  spectralMinEnergy: 1e-10,
  maxSeriesPoints: 24,
  frameIntervalMs: 25,
  maxAnalysisBuffers: 300,
};

/**
 * متن ثابت و تألیفی پروژه برای نمونه گفتار پیوسته.
 * دارای حق نشر بیرونی نیست و در تمام اجراها یکسان است.
 */
export const READING_TEXT =
  "در صبحی آرام، باد نرمی از پنجره میوزید و برگهای درخت را تکان میداد. " +
  "کودکی در حیاط با صدای بلند میخواند و مادرش پاسخ میداد.";

/** دستورالعمل ثابت نمونه گفتار آزاد. */
export const FREE_SPEECH_PROMPT = "یک جمله ساده دربارهی روز خودتان بگویید.";
