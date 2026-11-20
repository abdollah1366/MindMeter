/**
 * انواع مربوط به آزمون نرخ حرکت تناوبی (AMR).
 * هیچ نمونه صوتی خامی نگهداری نمیشود؛ تنها شاخصها و برچسبهای کیفیت.
 *
 * AMR صرفاً یک سنجه عملکردی است و تشخیص قطعی دیزآرتری، آپراکسی یا شدت
 * بیماری پارکینسون را انجام نمیدهد.
 */
import type { AudioFrame, MptQuality, MptQualityIssue } from "./mpt-types";

export type AmrTaskKey = "pa" | "ta" | "ka";
export type AmrTaskLabel = "/pa/" | "/ta/" | "/ka/";

export const AMR_TASKS: { key: AmrTaskKey; label: AmrTaskLabel; prompt: string }[] = [
  { key: "pa", label: "/pa/", prompt: "هجای /pa/ را پیوسته و با ریتم منظم تکرار کنید." },
  { key: "ta", label: "/ta/", prompt: "هجای /ta/ را پیوسته و با ریتم منظم تکرار کنید." },
  { key: "ka", label: "/ka/", prompt: "هجای /ka/ را پیوسته و با ریتم منظم تکرار کنید." },
];

export type AmrSyllable = { t: number; peakRms: number; confidence: number };

export type AmrTaskMetrics = {
  task: AmrTaskKey;
  label: AmrTaskLabel;
  /** تعداد هجاهای تشخیصدادهشده بهصورت خودکار. */
  detectedSyllableCount: number;
  /** تعداد هجاهای واردشده دستی (null اگر استفاده نشده). */
  manualSyllableCount: number | null;
  /** تعداد هجاهای معتبر نهایی (دستی یا خودکار). */
  syllableCount: number;
  /** نرخ تکرار هجا در ثانیه: syllableCount / activeDurationSec. */
  ratePerSecond: number | null;
  /** میانگین فاصله زمانی بین شروع هجاها (ms). */
  meanIntervalMs: number | null;
  /** انحراف معیار فاصله زمانی (ms). */
  sdIntervalMs: number | null;
  /** ضریب تغییرات فاصله زمانی (درصد). */
  cvPercent: number | null;
  /** مدت گفتار فعال (ms). */
  activeDurationMs: number | null;
  /** مدت مکثها (ms). */
  pauseDurationMs: number;
  /** تعداد مکثهای غیرمنتظره. */
  pauseCount: number;
  /** میانگین شدت RMS در بازه گفتار. */
  meanRms: number | null;
  /** دامنه تغییرات شدت (max-min). */
  rmsRange: number | null;
  /** نسبت فریمهای اشباعشده. */
  clippedRatio: number;
  /** سطح نویز پیشزمینه. */
  noiseFloorRms: number;
  /** بالاترین RMS. */
  peakRms: number;
  /** امتیاز اطمینان الگوریتم (۰ تا ۱۰۰). */
  confidence: number;
  /** سطح اطمینان. */
  confidenceLevel: "high" | "medium" | "low";
  /** آیا نتیجه نیازمند بررسی دستی است. */
  needsManualReview: boolean;
  /** محدودیتهای الگوریتم برای این ضبط. */
  limitations: string[];
  /** کیفیت ضبط. */
  quality: MptQuality;
  /** آیا ضبط معتبر است. */
  valid: boolean;
  /** زمان شروع/پایان گفتار (ms نسبی). */
  onsetMs: number | null;
  offsetMs: number | null;
  /** تعداد تلاشهای انجامشده. */
  attemptNumber: number;
};

export type AmrAttempt = {
  task: AmrTaskKey;
  label: AmrTaskLabel;
  frames: AudioFrame[];
  result: AmrTaskMetrics;
  manualOverride: boolean;
};

export type AmrSummary = {
  tasks: AmrTaskMetrics[];
  /** تکلیف با کمترین نرخ تکرار. */
  lowestRateTask: AmrTaskKey | null;
  /** تکلیف با بیشترین تغییرپذیری زمانی. */
  highestCvTask: AmrTaskKey | null;
  /** کیفیت کلی دادهها. */
  overallQuality: "acceptable" | "mixed" | "poor";
  /** نسخه الگوریتم. */
  algorithmVersion: string;
};

export type AmrStoredResult = AmrSummary & {
  key: "amr";
  version: 1;
  completedAt: string;
};
