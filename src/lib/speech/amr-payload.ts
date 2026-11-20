import type { AmrStoredResult, AmrSummary, AmrTaskMetrics } from "./amr-types";

export type AmrInputTask = {
  task: AmrTaskMetrics["task"];
  label: AmrTaskMetrics["label"];
  detectedSyllableCount: number;
  manualSyllableCount: number | null;
  syllableCount: number;
  ratePerSecond: number | null;
  meanIntervalMs: number | null;
  sdIntervalMs: number | null;
  cvPercent: number | null;
  activeDurationMs: number | null;
  pauseDurationMs: number;
  pauseCount: number;
  meanRms: number | null;
  rmsRange: number | null;
  clippedRatio: number;
  noiseFloorRms: number;
  peakRms: number;
  confidence: number;
  confidenceLevel: AmrTaskMetrics["confidenceLevel"];
  needsManualReview: boolean;
  limitations: string[];
  quality: AmrTaskMetrics["quality"];
  valid: boolean;
  onsetMs: number | null;
  offsetMs: number | null;
  attemptNumber: number;
};

export type AmrInput = {
  tasks: AmrInputTask[];
  lowestRateTask: AmrSummary["lowestRateTask"];
  highestCvTask: AmrSummary["highestCvTask"];
  overallQuality: AmrSummary["overallQuality"];
  algorithmVersion: string;
  completedAt: string;
};

const TASK_KEYS = ["pa", "ta", "ka"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseQuality(value: unknown): AmrTaskMetrics["quality"] | null {
  if (!isRecord(value)) return null;
  if (!hasOnlyKeys(value, ["ok", "issues", "noiseFloorRms", "peakRms", "clippedRatio", "internalSilenceMs"])) return null;
  if (typeof value.ok !== "boolean") return null;
  if (!Array.isArray(value.issues)) return null;
  if (!value.issues.every((item) => typeof item === "string")) return null;
  if (typeof value.noiseFloorRms !== "number") return null;
  if (typeof value.peakRms !== "number") return null;
  if (typeof value.clippedRatio !== "number") return null;
  if (typeof value.internalSilenceMs !== "number") return null;
  return value as AmrTaskMetrics["quality"];
}

function parseTask(value: unknown): AmrInputTask | null {
  if (!isRecord(value)) return null;
  const keys = [
    "task", "label", "detectedSyllableCount", "manualSyllableCount", "syllableCount",
    "ratePerSecond", "meanIntervalMs", "sdIntervalMs", "cvPercent", "activeDurationMs",
    "pauseDurationMs", "pauseCount", "meanRms", "rmsRange", "clippedRatio", "noiseFloorRms",
    "peakRms", "confidence", "confidenceLevel", "needsManualReview", "limitations",
    "quality", "valid", "onsetMs", "offsetMs", "attemptNumber",
  ];
  if (!hasOnlyKeys(value, keys)) return null;
  if (value.task !== "pa" && value.task !== "ta" && value.task !== "ka") return null;
  if (typeof value.label !== "string") return null;
  if (!isIntegerInRange(value.detectedSyllableCount, 0, 500)) return null;
  if (value.manualSyllableCount !== null && !isIntegerInRange(value.manualSyllableCount, 0, 500)) return null;
  if (!isIntegerInRange(value.syllableCount, 0, 500)) return null;
  if (!isNumberOrNull(value.ratePerSecond)) return null;
  if (!isNumberOrNull(value.meanIntervalMs)) return null;
  if (!isNumberOrNull(value.sdIntervalMs)) return null;
  if (!isNumberOrNull(value.cvPercent)) return null;
  if (!isNumberOrNull(value.activeDurationMs)) return null;
  if (typeof value.pauseDurationMs !== "number") return null;
  if (!isIntegerInRange(value.pauseCount, 0, 500)) return null;
  if (!isNumberOrNull(value.meanRms)) return null;
  if (!isNumberOrNull(value.rmsRange)) return null;
  if (typeof value.clippedRatio !== "number") return null;
  if (typeof value.noiseFloorRms !== "number") return null;
  if (typeof value.peakRms !== "number") return null;
  if (!isIntegerInRange(value.confidence, 0, 100)) return null;
  if (value.confidenceLevel !== "high" && value.confidenceLevel !== "medium" && value.confidenceLevel !== "low") return null;
  if (typeof value.needsManualReview !== "boolean") return null;
  if (!isStringArray(value.limitations)) return null;
  const quality = parseQuality(value.quality);
  if (!quality) return null;
  if (typeof value.valid !== "boolean") return null;
  if (!isNumberOrNull(value.onsetMs)) return null;
  if (!isNumberOrNull(value.offsetMs)) return null;
  if (!isIntegerInRange(value.attemptNumber, 1, 10)) return null;

  return {
    task: value.task as AmrInputTask["task"],
    label: value.label as AmrInputTask["label"],
    detectedSyllableCount: value.detectedSyllableCount as number,
    manualSyllableCount: value.manualSyllableCount as number | null,
    syllableCount: value.syllableCount as number,
    ratePerSecond: value.ratePerSecond as number | null,
    meanIntervalMs: value.meanIntervalMs as number | null,
    sdIntervalMs: value.sdIntervalMs as number | null,
    cvPercent: value.cvPercent as number | null,
    activeDurationMs: value.activeDurationMs as number | null,
    pauseDurationMs: value.pauseDurationMs as number,
    pauseCount: value.pauseCount as number,
    meanRms: value.meanRms as number | null,
    rmsRange: value.rmsRange as number | null,
    clippedRatio: value.clippedRatio as number,
    noiseFloorRms: value.noiseFloorRms as number,
    peakRms: value.peakRms as number,
    confidence: value.confidence as number,
    confidenceLevel: value.confidenceLevel as AmrInputTask["confidenceLevel"],
    needsManualReview: value.needsManualReview as boolean,
    limitations: value.limitations as string[],
    quality,
    valid: value.valid as boolean,
    onsetMs: value.onsetMs as number | null,
    offsetMs: value.offsetMs as number | null,
    attemptNumber: value.attemptNumber as number,
  };
}

export function parseAmrPayload(input: unknown): AmrStoredResult | null {
  if (!isRecord(input)) return null;
  const keys = ["key", "version", "tasks", "lowestRateTask", "highestCvTask", "overallQuality", "algorithmVersion", "completedAt"];
  if (!hasOnlyKeys(input, keys)) return null;
  if (input.key !== "amr" || input.version !== 1) return null;
  if (!Array.isArray(input.tasks) || input.tasks.length !== 3) return null;

  const tasks: AmrInputTask[] = [];
  const seen = new Set<string>();
  for (const raw of input.tasks) {
    const task = parseTask(raw);
    if (!task) return null;
    if (seen.has(task.task)) return null;
    seen.add(task.task);
    tasks.push(task);
  }
  if (!TASK_KEYS.every((key) => seen.has(key))) return null;
  // ثابت نگهداشتن ترتیب pa, ta, ka
  tasks.sort((a, b) => TASK_KEYS.indexOf(a.task) - TASK_KEYS.indexOf(b.task));

  const lowestRateTask = input.lowestRateTask;
  if (lowestRateTask !== null && lowestRateTask !== "pa" && lowestRateTask !== "ta" && lowestRateTask !== "ka") return null;
  const highestCvTask = input.highestCvTask;
  if (highestCvTask !== null && highestCvTask !== "pa" && highestCvTask !== "ta" && highestCvTask !== "ka") return null;
  if (input.overallQuality !== "acceptable" && input.overallQuality !== "mixed" && input.overallQuality !== "poor") return null;
  if (typeof input.algorithmVersion !== "string" || !input.algorithmVersion) return null;
  if (typeof input.completedAt !== "string") return null;
  const completedAt = new Date(input.completedAt);
  if (!Number.isFinite(completedAt.getTime())) return null;

  return {
    key: "amr",
    version: 1,
    tasks: tasks as AmrStoredResult["tasks"],
    lowestRateTask: lowestRateTask as AmrStoredResult["lowestRateTask"],
    highestCvTask: highestCvTask as AmrStoredResult["highestCvTask"],
    overallQuality: input.overallQuality as AmrStoredResult["overallQuality"],
    algorithmVersion: input.algorithmVersion as string,
    completedAt: completedAt.toISOString(),
  };
}

export function toAmrPayload(input: AmrInput): AmrStoredResult {
  return {
    key: "amr",
    version: 1,
    tasks: input.tasks as AmrStoredResult["tasks"],
    lowestRateTask: input.lowestRateTask,
    highestCvTask: input.highestCvTask,
    overallQuality: input.overallQuality,
    algorithmVersion: input.algorithmVersion,
    completedAt: new Date(input.completedAt).toISOString(),
  };
}
