/**
 * انواع مربوط به آزمون تحلیل آکوستیکی واکه پایدار (Sustained Vowel Analysis).
 * هیچ نمونه صوتی خامی در این انواع ذخیره نمیشود؛ تنها اعداد، برچسبهای کیفیت
 * و (در صورت معتبر بودن) یک سری زمانی کوتاه از F0 واقعی همان آزمون.
 */

export type SustainedVowelIssue =
  | "NO_SIGNAL"
  | "WEAK_SIGNAL"
  | "HIGH_NOISE"
  | "CLIPPING"
  | "LONG_INTERNAL_SILENCE"
  | "TOO_SHORT"
  | "NO_STABLE_SEGMENT"
  | "F0_UNRELIABLE"
  | "INVALID_SAMPLE_RATE"
  | "TRUNCATED";

/** برچسب فارسی غیرتشخیصی برای نمایش به کاربر. */
export const SUSTAINED_VOWEL_ISSUE_LABELS: Record<SustainedVowelIssue, string> = {
  NO_SIGNAL: "آواسازی قابل تشخیصی دریافت نشد.",
  WEAK_SIGNAL: "سطح صدا خیلی پایین بود. نزدیکتر به میکروفون صحبت کنید.",
  HIGH_NOISE: "نویز محیط بالا بود. در مکانی آرامتر آزمون را تکرار کنید.",
  CLIPPING: "سیگنال اشباع شد. با صدای طبیعیتر آزمون را تکرار کنید.",
  LONG_INTERNAL_SILENCE: "در میانه آواسازی وقفهی طولانی ایجاد شد.",
  TOO_SHORT: "بخش پایدار آواسازی برای تحلیل کافی نبود.",
  NO_STABLE_SEGMENT: "بازهای با شدت و فرکانس پایدار پیدا نشد.",
  F0_UNRELIABLE: "فرکانس پایه در بخش پایدار به اندازه کافی قابل تشخیص نبود.",
  INVALID_SAMPLE_RATE: "نرخ نمونهبرداری میکروفون برای تخمین فرکانس معتبر نبود.",
  TRUNCATED: "ضبط پیش از پایان طبیعی آواسازی متوقف شد.",
};

/** یک نقطه واقعی از سری زمانی F0؛ t بر حسب میلیثانیه و hz بر حسب هرتز. */
export type F0Point = { t: number; hz: number };

export type F0Stats = {
  meanHz: number;
  minHz: number;
  maxHz: number;
  stdHz: number;
  /** شیب خطی تغییر F0 بر حسب هرتز در ثانیه (صرفاً توصیف روند، نه شاخص بالینی). */
  slopeHzPerSec: number;
  /** حداکثر تعداد نقاط واقعی؛ در صورت نبود داده معتبر، خالی میماند. */
  series: F0Point[];
};

export type AmplitudeStats = {
  meanRms: number;
  stdRms: number;
  /** ضریب تغییرات = انحراف معیار / میانگین؛ شاخص توصیفی پایداری دامنه. */
  cv: number;
  peakRms: number;
};

export type SustainedVowelQuality = {
  noiseFloorRms: number;
  /** تخمین تقریبی SNR بر حسب دسیبل؛ در صورت نبود کف نویز معتبر null. */
  snrDb: number | null;
  clippedRatio: number;
  internalSilenceMs: number;
  /** نسبت فریمهای دارای F0 معتبر در بازه پایدار. */
  voicedRatio: number;
  /** آیا نرخ نمونهبرداری حداقل یک فریم، معتبر تشخیص داده شد. */
  sampleRateValid: boolean;
};

export type SustainedVowelAttempt = {
  valid: boolean;
  issues: SustainedVowelIssue[];
  /** مدت کل سیگنال ضبطشده بر حسب میلیثانیه. */
  recordedMs: number;
  /** مدت بازه پایدار انتخابشده بر حسب میلیثانیه. */
  stableMs: number;
  onsetMs: number | null;
  offsetMs: number | null;
  stableStartMs: number | null;
  stableEndMs: number | null;
  /** در صورت عدم اطمینان، null است و هرگز با صفر جایگزین نمیشود. */
  f0: F0Stats | null;
  amplitude: AmplitudeStats | null;
  quality: SustainedVowelQuality;
};

export type SustainedVowelSummary = {
  attempts: SustainedVowelAttempt[];
  validCount: number;
  f0MeanHz: number | null;
  f0StdHz: number | null;
  amplitudeCv: number | null;
  stableMs: number | null;
};

/** نتیجهای که مجاز به ذخیره در پایگاه داده است (فقط اعداد و متادیتا). */
export type SustainedVowelStoredResult = SustainedVowelSummary & {
  key: "sustained-vowel";
  version: 1;
};
