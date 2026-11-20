export type AmrConfig = {
  /** حداقل فاصله زمانی بین دو هجای متوالی (ms). */
  minSyllableGapMs: number;
  /** آستانه RMS برای تشخیص هجا (نسبت به نویز پیشزمینه). */
  syllableOnsetRatio: number;
  /** آستانه مطلق حداقل RMS. */
  minSyllableRms: number;
  /** آستانه تشخیص مکث غیرمنتظره (ms). */
  unexpectedPauseMs: number;
  /** حداقل تعداد هجا برای نتیجه معتبر. */
  minSyllablesForValid: number;
  /** آستانه CV (درصد) برای علامتگذاری نامنظم. */
  highCvThresholdPercent: number;
  /** آستانه confidence برای نیاز به بررسی دستی. */
  manualReviewThreshold: number;
  /** نسخه الگوریتم. */
  algorithmVersion: string;
  /** مدت پیشنهادی ضبط هر تکلیف (ms)؛ قابل توقف دستی. */
  targetDurationMs: number;
};

export const AMR_CONFIG: AmrConfig = {
  minSyllableGapMs: 110,
  syllableOnsetRatio: 2.2,
  minSyllableRms: 0.012,
  unexpectedPauseMs: 300,
  minSyllablesForValid: 3,
  highCvThresholdPercent: 25,
  manualReviewThreshold: 45,
  algorithmVersion: "amr-energy-onset-v1",
  targetDurationMs: 5000,
};
