import type { SmrStoredResult, SmrSummary, SmrTaskMetrics } from "./smr-types";

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function hasOnlyKeys(v: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(v).every((k) => allowed.has(k));
}
function isIntRange(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}
function isNumOrNull(v: unknown): v is number | null { return v === null || (typeof v === "number" && Number.isFinite(v)); }
function isStrArr(v: unknown): v is string[] { return Array.isArray(v) && v.every((x) => typeof x === "string"); }

function parseQuality(v: unknown): SmrTaskMetrics["quality"] | null {
  if (!isRecord(v)) return null;
  if (!hasOnlyKeys(v, ["ok","issues","noiseFloorRms","peakRms","clippedRatio","internalSilenceMs"])) return null;
  if (typeof v.ok !== "boolean") return null;
  if (!Array.isArray(v.issues) || !v.issues.every((x) => typeof x === "string")) return null;
  if (typeof v.noiseFloorRms !== "number" || typeof v.peakRms !== "number" || typeof v.clippedRatio !== "number" || typeof v.internalSilenceMs !== "number") return null;
  return v as SmrTaskMetrics["quality"];
}

function parseTask(v: unknown): SmrTaskMetrics | null {
  if (!isRecord(v)) return null;
  const keys = ["detectedSyllableCount","manualSyllableCount","syllableCount","cycleCount","ratePerSecond","meanIntervalMs","sdIntervalMs","cvPercent","activeDurationMs","pauseCount","pauseDurationMs","clippedRatio","noiseFloorRms","peakRms","confidence","confidenceLevel","needsManualReview","limitations","quality","valid","onsetMs","offsetMs","attemptNumber"];
  if (!hasOnlyKeys(v, keys)) return null;
  if (!isIntRange(v.detectedSyllableCount, 0, 500)) return null;
  if (v.manualSyllableCount !== null && !isIntRange(v.manualSyllableCount, 0, 500)) return null;
  if (!isIntRange(v.syllableCount, 0, 500)) return null;
  if (!isIntRange(v.cycleCount, 0, 500)) return null;
  if (!isNumOrNull(v.ratePerSecond)) return null;
  if (!isNumOrNull(v.meanIntervalMs)) return null;
  if (!isNumOrNull(v.sdIntervalMs)) return null;
  if (!isNumOrNull(v.cvPercent)) return null;
  if (!isNumOrNull(v.activeDurationMs)) return null;
  if (!isIntRange(v.pauseCount, 0, 500)) return null;
  if (typeof v.pauseDurationMs !== "number") return null;
  if (typeof v.clippedRatio !== "number") return null;
  if (typeof v.noiseFloorRms !== "number") return null;
  if (typeof v.peakRms !== "number") return null;
  if (!isIntRange(v.confidence, 0, 100)) return null;
  if (v.confidenceLevel !== "high" && v.confidenceLevel !== "medium" && v.confidenceLevel !== "low") return null;
  if (typeof v.needsManualReview !== "boolean") return null;
  if (!isStrArr(v.limitations)) return null;
  const q = parseQuality(v.quality);
  if (!q) return null;
  if (typeof v.valid !== "boolean") return null;
  if (!isNumOrNull(v.onsetMs)) return null;
  if (!isNumOrNull(v.offsetMs)) return null;
  if (!isIntRange(v.attemptNumber, 1, 10)) return null;
  return v as unknown as SmrTaskMetrics;
}

export function parseSmrPayload(input: unknown): SmrStoredResult | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["key","version","task","overallQuality","algorithmVersion","completedAt"])) return null;
  if (input.key !== "smr" || input.version !== 1) return null;
  const task = parseTask(input.task);
  if (!task) return null;
  if (input.overallQuality !== "acceptable" && input.overallQuality !== "mixed" && input.overallQuality !== "poor") return null;
  if (typeof input.algorithmVersion !== "string" || !input.algorithmVersion) return null;
  if (typeof input.completedAt !== "string") return null;
  const d = new Date(input.completedAt);
  if (!Number.isFinite(d.getTime())) return null;
  return {
    key: "smr", version: 1, task,
    overallQuality: input.overallQuality as SmrStoredResult["overallQuality"],
    algorithmVersion: input.algorithmVersion as string,
    completedAt: d.toISOString(),
  };
}

export function toSmrPayload(input: { task: SmrTaskMetrics; overallQuality: SmrStoredResult["overallQuality"]; algorithmVersion: string; completedAt: string }): SmrStoredResult {
  return {
    key: "smr", version: 1, task: input.task,
    overallQuality: input.overallQuality,
    algorithmVersion: input.algorithmVersion,
    completedAt: new Date(input.completedAt).toISOString(),
  };
}
