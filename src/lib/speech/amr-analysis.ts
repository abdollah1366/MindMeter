/**
 * تحلیل AMR بر روی فریمهای RMS/peak.
 *
 * تشخیص هجا بر اساس قلههای انرژی صوت در بازه گفتار فعال انجام میشود. این روش
 * یک تقریب مهندسی است و در حضور نویز، لهجه، کیفیت پایین میکروفون یا گفتار
 * نامنظم میتواند دچار خطای شمارش شود. نتایج همواره باید همراه با امتیاز اطمینان
 * و امکان بازبینی دستی گزارش شوند.
 */
import { AMR_CONFIG, type AmrConfig } from "./amr-config";
import type { AudioFrame, MptQuality } from "./mpt-types";
import type { AmrSyllable, AmrTaskMetrics, AmrSummary, AmrTaskKey } from "./amr-types";

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], avg: number | null): number | null {
  if (values.length < 2 || avg === null) return null;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * تشخیص قلههای RMS بهعنوان شروع هجاها.
 * قله باید بالای آستانه، نقطه ماکسیمم محلی و با فاصله کافی از قله قبلی باشد.
 */
export function detectSyllables(
  frames: AudioFrame[],
  onsetIndex: number,
  offsetIndex: number | null,
  noiseFloorRms: number,
  config: AmrConfig = AMR_CONFIG,
): AmrSyllable[] {
  if (onsetIndex < 0 || frames.length === 0) return [];
  const start = Math.max(0, onsetIndex);
  const end = offsetIndex !== null && offsetIndex >= start ? offsetIndex : frames.length - 1;
  const slice = frames.slice(start, end + 1);
  if (slice.length < 3) return [];

  const threshold = Math.max(config.minSyllableRms, noiseFloorRms * config.syllableOnsetRatio);

  // ۱) شناسایی نقاط ماکسیمم محلی بالای آستانه
  const candidates: { t: number; rms: number }[] = [];
  for (let i = 1; i < slice.length - 1; i++) {
    const prev = slice[i - 1].rms;
    const curr = slice[i].rms;
    const next = slice[i + 1].rms;
    if (curr >= threshold && curr >= prev && curr >= next) {
      candidates.push({ t: slice[i].t, rms: curr });
    }
  }
  if (candidates.length === 0) return [];

  // ۲) ادغام قلههای نزدیک (minSyllableGapMs) و نگهداشتن قویترین
  const merged: { t: number; rms: number }[] = [];
  for (const candidate of candidates) {
    const last = merged[merged.length - 1];
    if (!last || candidate.t - last.t >= config.minSyllableGapMs) {
      merged.push({ ...candidate });
    } else if (candidate.rms > last.rms) {
      merged[merged.length - 1] = { ...candidate };
    }
  }

  return merged.map((peak) => ({
    t: Math.round(peak.t),
    peakRms: Number(peak.rms.toFixed(5)),
    confidence: clamp(peak.rms / Math.max(threshold, 1e-6), 0, 1),
  }));
}

export function analyzeAmrTask(
  frames: AudioFrame[],
  quality: MptQuality,
  onsetIndex: number,
  offsetIndex: number | null,
  task: AmrTaskMetrics["task"],
  label: AmrTaskMetrics["label"],
  attemptNumber: number,
  manualSyllableCount: number | null = null,
  config: AmrConfig = AMR_CONFIG,
): AmrTaskMetrics {
  const noiseFloorRms = quality.noiseFloorRms;
  const peakRms = quality.peakRms;
  const clippedRatio = quality.clippedRatio;

  const limitations: string[] = [
    "تشخیص هجا بر اساس قلههای انرژی صوت انجام شده و در حضور نویز، لهجه یا کیفیت پایین میکروفون میتواند دچار خطای شمارش شود.",
  ];

  if (onsetIndex < 0) {
    limitations.push("شروع گفتار قابل تشخیص نبود؛ نتیجه نامعتبر است.");
    return {
      task,
      label,
      detectedSyllableCount: 0,
      manualSyllableCount,
      syllableCount: manualSyllableCount ?? 0,
      ratePerSecond: null,
      meanIntervalMs: null,
      sdIntervalMs: null,
      cvPercent: null,
      activeDurationMs: null,
      pauseDurationMs: 0,
      pauseCount: 0,
      meanRms: null,
      rmsRange: null,
      clippedRatio,
      noiseFloorRms,
      peakRms,
      confidence: 0,
      confidenceLevel: "low",
      needsManualReview: true,
      limitations,
      quality,
      valid: false,
      onsetMs: null,
      offsetMs: null,
      attemptNumber,
    };
  }

  const onsetMs = Math.round(frames[onsetIndex]?.t ?? 0);
  const offsetMs =
    offsetIndex !== null && offsetIndex >= 0 ? Math.round(frames[offsetIndex]?.t ?? onsetMs) : null;
  const activeDurationMs = Math.max(0, (offsetMs ?? frames[frames.length - 1]?.t ?? onsetMs) - onsetMs);

  const syllables = detectSyllables(frames, onsetIndex, offsetIndex, noiseFloorRms, config);
  const detectedSyllableCount = syllables.length;
  const syllableCount = manualSyllableCount !== null ? manualSyllableCount : detectedSyllableCount;

  const intervals: number[] = [];
  for (let i = 1; i < syllables.length; i++) {
    intervals.push(syllables[i].t - syllables[i - 1].t);
  }
  const meanInterval = mean(intervals);
  const sdInterval = standardDeviation(intervals, meanInterval);
  const cvPercent = meanInterval && sdInterval !== null ? (sdInterval / meanInterval) * 100 : null;

  // مکثهای غیرمنتظره: فاصله بین هجاها بیش از آستانه
  let pauseCount = 0;
  let pauseDurationMs = 0;
  for (const interval of intervals) {
    if (interval >= config.unexpectedPauseMs) {
      pauseCount += 1;
      pauseDurationMs += interval;
    }
  }

  // شدت
  const start = Math.max(0, onsetIndex);
  const end = offsetIndex !== null && offsetIndex >= start ? offsetIndex : frames.length - 1;
  const activeFrames = frames.slice(start, end + 1);
  const rmsValues = activeFrames.map((frame) => frame.rms);
  const meanRms = mean(rmsValues);
  const rmsRange =
    rmsValues.length > 0 ? Math.max(...rmsValues) - Math.min(...rmsValues) : null;

  const activeDurationSec = activeDurationMs > 0 ? activeDurationMs / 1000 : null;
  const ratePerSecond =
    activeDurationSec && activeDurationSec > 0 && syllableCount > 0
      ? Number((syllableCount / activeDurationSec).toFixed(2))
      : null;

  // امتیاز اطمینان
  let confidence = 100;
  if (detectedSyllableCount < config.minSyllablesForValid) {
    confidence -= 40;
    limitations.push("تعداد هجاهای تشخیصدادهشده کم است؛ نتیجه ممکن است نامعتبر باشد.");
  }
  if (cvPercent !== null && cvPercent > config.highCvThresholdPercent) {
    confidence -= Math.min(30, cvPercent - config.highCvThresholdPercent);
    limitations.push("ریتم تکرار نامنظم بود (CV بالا).");
  }
  if (quality.issues.length > 0) {
    confidence -= quality.issues.length * 8;
    for (const issue of quality.issues) limitations.push(`مشکل کیفیت ضبط: ${issue}`);
  }
  if (noiseFloorRms > 0.06) {
    confidence -= 10;
    limitations.push("نویز محیط بالا بود.");
  }
  if (clippedRatio > 0.05) {
    confidence -= 15;
    limitations.push("اشباع صوت (clipping) مشاهده شد.");
  }
  if (detectedSyllableCount >= 2 && meanInterval !== null && meanInterval < 80) {
    confidence -= 20;
    limitations.push("فاصله بین هجاها بسیار کوتاه بود؛ احتمال شمارش اضافی.");
  }
  if (manualSyllableCount !== null) {
    limitations.push("تعداد هجا بهصورت دستی بازبینی شده است.");
  }
  confidence = clamp(Math.round(confidence), 0, 100);

  const confidenceLevel: AmrTaskMetrics["confidenceLevel"] =
    confidence >= 70 ? "high" : confidence >= config.manualReviewThreshold ? "medium" : "low";

  const needsManualReview =
    confidence < config.manualReviewThreshold ||
    detectedSyllableCount < config.minSyllablesForValid ||
    quality.issues.includes("CLIPPING") ||
    quality.issues.includes("NO_SIGNAL");

  // معتبر بودن بر اساس کیفیت و اطمینان؛ حتی با issues ممکن است قابل استفاده باشد اما نامعتبر علامتگذاری میشود.
  const finalValid = quality.issues.length === 0 && detectedSyllableCount >= config.minSyllablesForValid && confidence >= config.manualReviewThreshold;

  return {
    task,
    label,
    detectedSyllableCount,
    manualSyllableCount,
    syllableCount,
    ratePerSecond,
    meanIntervalMs: meanInterval !== null ? Math.round(meanInterval) : null,
    sdIntervalMs: sdInterval !== null ? Math.round(sdInterval) : null,
    cvPercent: cvPercent !== null ? Number(cvPercent.toFixed(1)) : null,
    activeDurationMs: activeDurationMs > 0 ? Math.round(activeDurationMs) : null,
    pauseDurationMs: Math.round(pauseDurationMs),
    pauseCount,
    meanRms: meanRms !== null ? Number(meanRms.toFixed(5)) : null,
    rmsRange: rmsRange !== null ? Number(rmsRange.toFixed(5)) : null,
    clippedRatio,
    noiseFloorRms,
    peakRms,
    confidence,
    confidenceLevel,
    needsManualReview,
    limitations,
    quality,
    valid: finalValid,
    onsetMs,
    offsetMs,
    attemptNumber,
  };
}

export function summarizeAmr(tasks: AmrTaskMetrics[]): AmrSummary {
  const lowestRateTask = tasks.reduce<AmrTaskKey | null>((acc, task) => {
    if (task.ratePerSecond === null) return acc;
    if (acc === null) return task.task;
    const accTask = tasks.find((t) => t.task === acc);
    if (!accTask || accTask.ratePerSecond === null || task.ratePerSecond < accTask.ratePerSecond) return task.task;
    return acc;
  }, null);

  const highestCvTask = tasks.reduce<AmrTaskKey | null>((acc, task) => {
    if (task.cvPercent === null) return acc;
    if (acc === null) return task.task;
    const accTask = tasks.find((t) => t.task === acc);
    if (!accTask || accTask.cvPercent === null || task.cvPercent > accTask.cvPercent) return task.task;
    return acc;
  }, null);

  const poorCount = tasks.filter((t) => t.confidenceLevel === "low" || !t.valid).length;
  const overallQuality: AmrSummary["overallQuality"] =
    poorCount >= 2 ? "poor" : poorCount === 1 ? "mixed" : "acceptable";

  return {
    tasks,
    lowestRateTask,
    highestCvTask,
    overallQuality,
    algorithmVersion: AMR_CONFIG.algorithmVersion,
  };
}
