/**
 * آستانههای مهندسی تحلیل واکه پایدار.
 *
 * تمام مقادیر RMS بدون بعد و نسبت به دامنه کامل ۱.۰ هستند. F0 بر حسب هرتز و
 * زمانها بر حسب میلیثانیهاند. اینها آستانههای فنی پردازش سیگنالاند، نه هنجار
 * بالینی و نه اعتبار تشخیصی. تمرکز آنها در یک فایل، بازبینی بعدی با تستروی
 * واقعی روی میکروفونهای مختلف را ممکن میسازد.
 */
export type SustainedVowelConfig = {
  /** مدت پیشزمینه برای تخمین کف نویز. */
  baselineMs: number;
  onsetThresholdRms: number;
  onsetRatioOverNoise: number;
  offsetRatioOverNoise: number;
  onsetConfirmMs: number;
  offsetConfirmMs: number;
  /** حذف این مقدار از ابتدا و انتهای آواسازی پیش از انتخاب بازه پایدار. */
  edgeTrimMs: number;
  /** طول پنجره جستوجوی بازه پایدار. */
  stableWindowMs: number;
  /** گام حرکت پنجره پایدار. */
  windowStepMs: number;
  /** کمترین طول قابل قبول بازه پایدار. */
  minStableMs: number;
  /** کمترین نسبت فریمهای آوادار در بازه پایدار. */
  minVoicedRatio: number;
  /** بالاترین ضریب تغییرات دامنه قابل قبول در بازه پایدار. */
  maxAmplitudeCv: number;
  maxInternalSilenceMs: number;
  /** محدوده جستوجوی فرکانس پایه. */
  minF0Hz: number;
  maxF0Hz: number;
  /** کمترین همبستگی نرمالشده برای پذیرش F0. */
  f0VoicingThreshold: number;
  /** حداکثر نمونههای ورودی برای autocorrelation. */
  analysisSamples: number;
  /** هدف داخلی کاهش نرخ نمونهبرداری پیش از تخمین F0. */
  pitchTargetRate: number;
  minSampleRate: number;
  maxSampleRate: number;
  clippingPeak: number;
  maxClippedRatio: number;
  weakSignalRms: number;
  highNoiseRms: number;
  /** کمترین SNR تقریبی قابل قبول بر حسب دسیبل. */
  snrMinDb: number;
  /** مدت هدف ضبط و سقف ایمن آن. */
  targetMs: number;
  maxDurationMs: number;
  countdownMs: number;
  frameIntervalMs: number;
  /** حداکثر نقاط سری زمانی F0 ذخیرهشده برای نمودار. */
  maxSeriesPoints: number;
};

export const SUSTAINED_VOWEL_CONFIG: SustainedVowelConfig = {
  baselineMs: 400,
  onsetThresholdRms: 0.008,
  onsetRatioOverNoise: 3,
  offsetRatioOverNoise: 1.8,
  onsetConfirmMs: 120,
  offsetConfirmMs: 400,
  edgeTrimMs: 200,
  stableWindowMs: 1500,
  windowStepMs: 100,
  minStableMs: 1000,
  minVoicedRatio: 0.7,
  maxAmplitudeCv: 0.35,
  maxInternalSilenceMs: 200,
  minF0Hz: 70,
  maxF0Hz: 400,
  f0VoicingThreshold: 0.6,
  analysisSamples: 1536,
  pitchTargetRate: 16_000,
  minSampleRate: 8_000,
  maxSampleRate: 192_000,
  clippingPeak: 0.98,
  maxClippedRatio: 0.05,
  weakSignalRms: 0.012,
  highNoiseRms: 0.06,
  snrMinDb: 6,
  targetMs: 6_000,
  maxDurationMs: 8_000,
  countdownMs: 3_000,
  frameIntervalMs: 25,
  maxSeriesPoints: 48,
};
