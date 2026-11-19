/**
 * انواع مربوط به آزمون حداکثر زمان آواسازی (MPT).
 * هیچ نمونه صوتی خامی در این انواع نگهداری نمیشود؛ تنها اعداد و برچسبهای کیفیت.
 */

/** مشکلات کیفیتی که میتوانند یک تلاش را نامعتبر کنند. */
export type MptQualityIssue =
  | "NO_SIGNAL"
  | "WEAK_SIGNAL"
  | "HIGH_NOISE"
  | "CLIPPING"
  | "LONG_INTERNAL_SILENCE"
  | "TOO_SHORT"
  | "TRUNCATED";

/** برچسب فارسی ساده برای نمایش به کاربر (غیرتشخیصی). */
export const MPT_ISSUE_LABELS: Record<MptQualityIssue, string> = {
  NO_SIGNAL: "صدای قابل تشخیصی دریافت نشد.",
  WEAK_SIGNAL: "سطح صدا خیلی پایین بود. نزدیکتر به میکروفون صحبت کنید.",
  HIGH_NOISE: "نویز محیط بالا بود. در مکانی آرامتر آزمون را تکرار کنید.",
  CLIPPING: "صدای ضبطشده اشباع شد. با صدای طبیعیتر آزمون را تکرار کنید.",
  LONG_INTERNAL_SILENCE: "در میانه آواسازی وقفهی طولانی ایجاد شد.",
  TOO_SHORT: "آواسازی خیلی کوتاه بود و نمیتوان آن را اندازهگیری معتبری دانست.",
  TRUNCATED: "ضبط پیش از پایان طبیعی آواسازی متوقف شد.",
};

export type MptStopReason = "OFFSET" | "MANUAL" | "CAP" | "NO_ONSET";

/** یک فریم تحلیلشده؛ t بر حسب میلیثانیه و rms/peak بدون بعد (دامنه ۰ تا ۱). */
export type AudioFrame = { t: number; rms: number; peak: number };

export type MptQuality = {
  ok: boolean;
  issues: MptQualityIssue[];
  /** میانگین/میانه سطح نویز پیشزمینه بر اساس فریمهای پیش از آواسازی. */
  noiseFloorRms: number;
  /** بالاترین سطح RMS در بازه آواسازی. */
  peakRms: number;
  /** نسبت فریمهای اشباعشده به کل فریمهای آواسازی. */
  clippedRatio: number;
  /** طولانیترین سکوت درون آواسازی بر حسب میلیثانیه. */
  internalSilenceMs: number;
};

export type MptAttempt = {
  valid: boolean;
  durationMs: number | null;
  onsetMs: number | null;
  offsetMs: number | null;
  stopReason: MptStopReason;
  quality: MptQuality;
};

export type MptSummary = {
  attempts: MptAttempt[];
  validCount: number;
  bestMs: number | null;
  averageMs: number | null;
};

/** نتیجهای که مجاز به ذخیره در پایگاه داده است (فقط اعداد و متادیتا). */
export type MptStoredResult = MptSummary & {
  key: "mpt";
  version: 1;
};
