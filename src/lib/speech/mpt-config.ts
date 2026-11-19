/**
 * آستانههای مهندسی تحلیل MPT.
 *
 * تمام مقادیر RMS بدون بعد و نسبت به دامنه کامل ۱.۰ هستند. این اعداد،
 * آستانههای فنی پردازش سیگنالاند و هیچگونه اعتبار بالینی یا هنجار تشخیصی
 * برای جمعیت فارسی زبان محسوب نمیشوند. امکان تنظیم آنها در یک مکان واحد
 * فراهم شده تا در آینده با تستروی واقعی بازبینی شوند.
 */
export type MptConfig = {
  /** مدتزمانی از آغاز ضبط که به عنوان پیشزمینه/noise floor در نظر گرفته میشود. */
  baselineMs: number;
  /** کمترین RMS مطلق برای پذیرش آغاز آواسازی. */
  onsetThresholdRms: number;
  /** آواسازی زمانی آغاز میشود که RMS حداقل this برابر نویز پیشزمینه شود. */
  onsetRatioOverNoise: number;
  /** آواسازی زمانی پایان مییابد که RMS کمتر از this برابر نویز پیشزمینه شود. */
  offsetRatioOverNoise: number;
  /** آغاز آواسازی باید حداقل این مدت پایدار بماند تا پذیرفته شود. */
  onsetConfirmMs: number;
  /** سکوت پایان باید حداقل این مدت ادامه یابد تا پایان آواسازی محسوب شود. */
  offsetConfirmMs: number;
  /** سکوت طولانیتر از این مقدار در میانه، کیفیت را نامعتبر میکند. */
  maxInternalSilenceMs: number;
  /** کوتاهتر از این مقدار به عنوان اندازهگیری معتبر پذیرفته نمیشود. */
  minDurationMs: number;
  /** سقف ایمن ضبط؛ پس از آن ضبط بهطور خودکار متوقف میشود. */
  maxDurationMs: number;
  /** پیکی که از آن به بعد نمونه اشباعشده تلقی میشود. */
  clippingPeak: number;
  /** حداکثر نسبت فریمهای اشباعشده قابل قبول. */
  maxClippedRatio: number;
  /** کمترین RMSی که سیگنال «قوی» محسوب میشود. */
  weakSignalRms: number;
  /** بالاتر از این RMS در pre-roll، نویز محیط زیاد تلقی میشود. */
  highNoiseRms: number;
  /** شمارش معکوس پیش از شروع اندازهگیری. */
  countdownMs: number;
  /** فاصله نمونهبرداری از AnalyserNode. */
  frameIntervalMs: number;
};

export const MPT_CONFIG: MptConfig = {
  baselineMs: 400,
  onsetThresholdRms: 0.008,
  onsetRatioOverNoise: 3,
  offsetRatioOverNoise: 1.8,
  onsetConfirmMs: 120,
  offsetConfirmMs: 450,
  maxInternalSilenceMs: 200,
  minDurationMs: 300,
  maxDurationMs: 60_000,
  clippingPeak: 0.98,
  maxClippedRatio: 0.05,
  weakSignalRms: 0.012,
  highNoiseRms: 0.06,
  countdownMs: 3_000,
  frameIntervalMs: 25,
};
