/**
 * انواع نتایج ارزیابی توصیفی کیفیت صوت.
 *
 * تمام شاخصهای عددی در صورت عدم اعتبار `null`اند. مقدار صفر هرگز بهجای
 * «اندازهگیری نشد» استفاده نمیشود. این نتایج توصیفکننده سیگنالاند و نمره
 * ادراکی GRBAS/CAPE-V، تشخیص پزشکی یا برچسب طبیعی/غیرطبیعی محسوب نمیشوند.
 */

export type VoiceSampleKind = "vowel" | "reading" | "free";

export const VOICE_SAMPLE_KINDS: readonly VoiceSampleKind[] = ["vowel", "reading", "free"];

export const VOICE_SAMPLE_LABELS: Record<VoiceSampleKind, string> = {
  vowel: "واکه پایدار",
  reading: "گفتار پیوسته",
  free: "گفتار آزاد کوتاه",
};

export const VOICE_SAMPLE_INSTRUCTIONS: Record<VoiceSampleKind, string> = {
  vowel: "واکه آآآ را با صدای طبیعی و پیوسته ادامه دهید.",
  reading: "متن نمایشدادهشده را با صدای طبیعی و بدون عجله بخوانید.",
  free: "یک جمله ساده دربارهی روز خودتان بگویید.",
};

export type VoiceQualityIssue =
  | "NO_SIGNAL"
  | "WEAK_SIGNAL"
  | "HIGH_NOISE"
  | "CLIPPING"
  | "TOO_SHORT"
  | "INVALID_SAMPLE_RATE"
  | "INCOMPLETE_DATA"
  | "NO_VOICED_FRAMES"
  | "F0_UNRELIABLE"
  | "INSUFFICIENT_CYCLES";

export const VOICE_QUALITY_ISSUE_LABELS: Record<VoiceQualityIssue, string> = {
  NO_SIGNAL: "سیگنال قابل تشخیصی دریافت نشد.",
  WEAK_SIGNAL: "سطح سیگنال بسیار پایین است و اندازهگیری قابل اعتماد نیست.",
  HIGH_NOISE: "سطح نویز پیشزمینه بالاست.",
  CLIPPING: "بخش قابل توجهی از نمونهها دچار اشباع شد.",
  TOO_SHORT: "مدت نمونه برای تحلیل کافی نیست.",
  INVALID_SAMPLE_RATE: "نرخ نمونهبرداری معتبری دریافت نشد.",
  INCOMPLETE_DATA: "داده نمونه کامل نیست.",
  NO_VOICED_FRAMES: "هیچ فریم آواداری شناسایی نشد.",
  F0_UNRELIABLE: "تعداد فریمهای آوادار برای تخمین فرکانس پایه کافی نیست.",
  INSUFFICIENT_CYCLES: "دورههای آواسازی کافی برای تحلیل ناپایداری دوره وجود ندارد.",
};

/** نقطه سری زمانی؛ `t` بر حسب میلیثانیه و `v` بسته به شاخص. */
export type VoicePoint = { t: number; v: number };

/** دلیل عدم محاسبه یک شاخص، همراه با نام آن شاخص. */
export type VoiceUnmeasurable = { metric: string; reason: string };

export type VoiceSampleAttempt = {
  kind: VoiceSampleKind;
  valid: boolean;
  issues: VoiceQualityIssue[];
  recordedMs: number;
  voicedMs: number | null;
  f0MeanHz: number | null;
  f0StdHz: number | null;
  f0SlopeHzPerSec: number | null;
  amplitudeCv: number | null;
  jitterPercent: number | null;
  shimmerPercent: number | null;
  hnrDb: number | null;
  spectralCentroidHz: number | null;
  highFrequencyRatio: number | null;
  f0Series: VoicePoint[];
  amplitudeSeries: VoicePoint[];
  unmeasurable: VoiceUnmeasurable[];
};

export type VoiceSampleSummary = {
  kind: VoiceSampleKind;
  attempts: VoiceSampleAttempt[];
  validCount: number;
  voicedMs: number | null;
  f0MeanHz: number | null;
  f0StdHz: number | null;
  f0SlopeHzPerSec: number | null;
  amplitudeCv: number | null;
  jitterPercent: number | null;
  shimmerPercent: number | null;
  hnrDb: number | null;
  spectralCentroidHz: number | null;
  highFrequencyRatio: number | null;
  /** سری نماینده، برگرفته از معتبرترین تلاش. */
  f0Series: VoicePoint[];
  amplitudeSeries: VoicePoint[];
};

export type VoiceQualitySummary = {
  /** همواره سه عنصر به ترتیب واکه، گفتار پیوسته و گفتار آزاد. */
  samples: VoiceSampleSummary[];
  validSampleCount: number;
};

export type VoiceQualityStoredResult = VoiceQualitySummary & {
  key: "voice-quality";
  version: 1;
};

/**
 * چهار گروه توصیفی صرفاً بر اساس شاخصهای اندازهگیریشده سیگنالاند.
 * هیچکدام معادل نمره ادراکی متخصص نیستند.
 */
export const VOICE_DESCRIPTOR_GROUPS = [
  {
    key: "roughness",
    title: "خشونت صوت (Roughness)",
    metrics: ["ناپایداری دوره (Jitter)", "انحراف معیار F0", "ناپایداری دامنه"] as const,
  },
  {
    key: "breathiness",
    title: "نفسآلودگی (Breathiness)",
    metrics: ["نسبت انرژی فرکانسهای بالا", "نسبت هارمونیک به نویز (HNR)"] as const,
  },
  {
    key: "strain",
    title: "فشار صوتی (Strain)",
    metrics: ["میانگین F0", "مرکز طیف", "روند تغییر F0"] as const,
  },
  {
    key: "instability",
    title: "ناپایداری (Instability)",
    metrics: ["انحراف معیار F0", "ناپایداری دوره (Jitter)", "ناپایداری دامنه (Shimmer)"] as const,
  },
] as const;

export const LIMITATION_TEXT =
  "شاخصهای این گزارش صرفاً توصیفکننده ویژگیهای قابل اندازهگیری سیگنالاند. " +
  "وجود یک ویژگی آکوستیکی بهتنهایی اثباتکننده وجود اختلال صوتی نیست. " +
  "این آزمون معادل نمره ادراکی GRBAS یا CAPE-V نیست، جایگزین ارزیابی شنیداری متخصص نمیشود، " +
  "تشخیص پزشکی ارائه نمیکند و برچسب «طبیعی» یا «غیرطبیعی» صدا را تعیین نمیکند.";
