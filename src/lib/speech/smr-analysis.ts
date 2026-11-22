import { SMR_CONFIG, type SmrConfig } from "./smr-config";
import { detectSyllables } from "./amr-analysis";
import type { AudioFrame, MptQuality } from "./mpt-types";
import type { SmrTaskMetrics } from "./smr-types";

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function sd(values: number[], avg: number | null): number | null {
  if (values.length < 2 || avg === null) return null;
  return Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length);
}
function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function analyzeSmrTask(
  frames: AudioFrame[],
  quality: MptQuality,
  onsetIndex: number,
  offsetIndex: number | null,
  attemptNumber: number,
  manualSyllableCount: number | null = null,
  config: SmrConfig = SMR_CONFIG,
): SmrTaskMetrics {
  const limitations: string[] = [
    "تشخیص هجا بر اساس قلههای انرژی صوت انجام شده و در حضور نویز یا کیفیت پایین میکروفون ممکن است دچار خطای شمارش شود.",
  ];

  if (onsetIndex < 0) {
    limitations.push("شروع گفتار قابل تشخیص نبود؛ نتیجه نامعتبر است.");
    return {
      detectedSyllableCount: 0, manualSyllableCount, syllableCount: manualSyllableCount ?? 0, cycleCount: 0,
      ratePerSecond: null, meanIntervalMs: null, sdIntervalMs: null, cvPercent: null, activeDurationMs: null,
      pauseCount: 0, pauseDurationMs: 0, clippedRatio: quality.clippedRatio, noiseFloorRms: quality.noiseFloorRms,
      peakRms: quality.peakRms, confidence: 0, confidenceLevel: "low", needsManualReview: true, limitations, quality,
      valid: false, onsetMs: null, offsetMs: null, attemptNumber,
    };
  }

  const onsetMs = Math.round(frames[onsetIndex]?.t ?? 0);
  const offsetMs = offsetIndex !== null && offsetIndex >= 0 ? Math.round(frames[offsetIndex]?.t ?? onsetMs) : null;
  const activeDurationMs = Math.max(0, (offsetMs ?? frames[frames.length - 1]?.t ?? onsetMs) - onsetMs);

  const syllables = detectSyllables(frames, onsetIndex, offsetIndex, quality.noiseFloorRms, {
    minSyllableGapMs: config.minSyllableGapMs,
    syllableOnsetRatio: config.syllableOnsetRatio,
    minSyllableRms: config.minSyllableRms,
    unexpectedPauseMs: config.unexpectedPauseMs,
    minSyllablesForValid: config.minSyllablesForValid,
    highCvThresholdPercent: config.highCvThresholdPercent,
    manualReviewThreshold: config.manualReviewThreshold,
    algorithmVersion: config.algorithmVersion,
    targetDurationMs: config.targetDurationMs,
  });

  const detectedSyllableCount = syllables.length;
  const syllableCount = manualSyllableCount !== null ? manualSyllableCount : detectedSyllableCount;
  const cycleCount = Math.floor(syllableCount / 3);

  const intervals: number[] = [];
  for (let i = 1; i < syllables.length; i++) intervals.push(syllables[i].t - syllables[i - 1].t);
  const meanInterval = mean(intervals);
  const sdInterval = sd(intervals, meanInterval);
  const cvPercent = meanInterval && sdInterval !== null ? (sdInterval / meanInterval) * 100 : null;

  let pauseCount = 0, pauseDurationMs = 0;
  for (const iv of intervals) {
    if (iv >= config.unexpectedPauseMs) { pauseCount++; pauseDurationMs += iv; }
  }

  const start = Math.max(0, onsetIndex);
  const end = offsetIndex !== null && offsetIndex >= start ? offsetIndex : frames.length - 1;
  const activeFrames = frames.slice(start, end + 1);
  const rmsVals = activeFrames.map((f) => f.rms);
  const meanRms = mean(rmsVals);
  const rmsRange = rmsVals.length > 0 ? Math.max(...rmsVals) - Math.min(...rmsVals) : null;

  const activeSec = activeDurationMs > 0 ? activeDurationMs / 1000 : null;
  const ratePerSecond = activeSec && activeSec > 0 && cycleCount > 0
    ? Number((cycleCount / activeSec).toFixed(2))
    : null;

  let confidence = 100;
  if (detectedSyllableCount < config.minSyllablesForValid) { confidence -= 40; limitations.push("تعداد هجاهای تشخیصدادهشده کم است."); }
  if (cvPercent !== null && cvPercent > config.highCvThresholdPercent) {
    confidence -= Math.min(30, cvPercent - config.highCvThresholdPercent);
    limitations.push("ریتم تکرار نامنظم بود (CV بالا).");
  }
  if (quality.issues.length > 0) { confidence -= quality.issues.length * 8; for (const i of quality.issues) limitations.push(`مشکل کیفیت: ${i}`); }
  if (quality.noiseFloorRms > 0.06) { confidence -= 10; limitations.push("نویز محیط بالا بود."); }
  if (quality.clippedRatio > 0.05) { confidence -= 15; limitations.push("اشباع صوت (clipping) مشاهده شد."); }
  if (manualSyllableCount !== null) limitations.push("تعداد هجا بهصورت دستی بازبینی شده است.");
  confidence = clamp(Math.round(confidence), 0, 100);

  const confidenceLevel = confidence >= 70 ? "high" : confidence >= config.manualReviewThreshold ? "medium" : "low";
  const needsManualReview = confidence < config.manualReviewThreshold || detectedSyllableCount < config.minSyllablesForValid || quality.issues.includes("CLIPPING") || quality.issues.includes("NO_SIGNAL");
  const valid = quality.issues.length === 0 && detectedSyllableCount >= config.minSyllablesForValid && confidence >= config.manualReviewThreshold;

  return {
    detectedSyllableCount, manualSyllableCount, syllableCount, cycleCount, ratePerSecond,
    meanIntervalMs: meanInterval !== null ? Math.round(meanInterval) : null,
    sdIntervalMs: sdInterval !== null ? Math.round(sdInterval) : null,
    cvPercent: cvPercent !== null ? Number(cvPercent.toFixed(1)) : null,
    activeDurationMs: activeDurationMs > 0 ? Math.round(activeDurationMs) : null,
    pauseCount, pauseDurationMs: Math.round(pauseDurationMs),
    clippedRatio: quality.clippedRatio, noiseFloorRms: quality.noiseFloorRms, peakRms: quality.peakRms,
    confidence, confidenceLevel, needsManualReview, limitations, quality, valid, onsetMs, offsetMs, attemptNumber,
  };
}

export function summarizeSmr(task: SmrTaskMetrics): { task: SmrTaskMetrics; overallQuality: "acceptable" | "mixed" | "poor"; algorithmVersion: string } {
  const poorCount = (task.confidenceLevel === "low" || !task.valid) ? 1 : 0;
  const overallQuality = poorCount >= 1 ? (task.confidenceLevel === "low" ? "poor" : "mixed") : "acceptable";
  return { task, overallQuality, algorithmVersion: SMR_CONFIG.algorithmVersion };
}
