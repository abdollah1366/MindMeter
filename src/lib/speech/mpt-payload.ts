/**
 * اعتبارسنجی دقیق نتیجه MPT پیش از ذخیره.
 * جنبه امنیتی مهم: فقط یک لیست سفید از فیلدهای عددی/متادیتا پذیرفته میشود.
 * هر فیلد اضافی (مثلاً صوت خام، آدرس فایل یا داده دلخواه) میتواند ذخیره نشود.
 */
import { MPT_CONFIG } from "./mpt-config";
import type { MptAttempt, MptQuality, MptQualityIssue, MptStopReason, MptStoredResult, MptSummary } from "./mpt-types";

const STOP_REASONS: readonly MptStopReason[] = ["OFFSET", "MANUAL", "CAP", "NO_ONSET"];
const ISSUES: readonly MptQualityIssue[] = [
  "NO_SIGNAL",
  "WEAK_SIGNAL",
  "HIGH_NOISE",
  "CLIPPING",
  "LONG_INTERNAL_SILENCE",
  "TOO_SHORT",
  "TRUNCATED",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isFiniteNumber(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function parseQuality(value: unknown): MptQuality | null {
  if (!isRecord(value)) return null;
  if (
    !hasOnlyKeys(value, [
      "ok",
      "issues",
      "noiseFloorRms",
      "peakRms",
      "clippedRatio",
      "internalSilenceMs",
    ])
  ) {
    return null;
  }
  if (typeof value.ok !== "boolean") return null;
  if (!Array.isArray(value.issues) || value.issues.length > ISSUES.length) return null;
  if (!value.issues.every((issue) => typeof issue === "string" && ISSUES.includes(issue as MptQualityIssue))) {
    return null;
  }
  if (!isFiniteNumber(value.noiseFloorRms, 0, 10)) return null;
  if (!isFiniteNumber(value.peakRms, 0, 10)) return null;
  if (!isFiniteNumber(value.clippedRatio, 0, 1)) return null;
  if (!isFiniteNumber(value.internalSilenceMs, 0, MPT_CONFIG.maxDurationMs)) return null;

  return {
    ok: value.ok,
    issues: [...new Set(value.issues)] as MptQualityIssue[],
    noiseFloorRms: value.noiseFloorRms,
    peakRms: value.peakRms,
    clippedRatio: value.clippedRatio,
    internalSilenceMs: value.internalSilenceMs,
  };
}

function parseAttempt(value: unknown): MptAttempt | null {
  if (!isRecord(value)) return null;
  if (!hasOnlyKeys(value, ["valid", "durationMs", "onsetMs", "offsetMs", "stopReason", "quality"])) return null;
  if (typeof value.valid !== "boolean") return null;
  if (value.durationMs !== null && !isFiniteNumber(value.durationMs, 0, MPT_CONFIG.maxDurationMs)) return null;
  if (value.onsetMs !== null && !isFiniteNumber(value.onsetMs, 0, MPT_CONFIG.maxDurationMs)) return null;
  if (value.offsetMs !== null && !isFiniteNumber(value.offsetMs, 0, MPT_CONFIG.maxDurationMs)) return null;
  if (typeof value.stopReason !== "string" || !STOP_REASONS.includes(value.stopReason as MptStopReason)) return null;
  const quality = parseQuality(value.quality);
  if (!quality) return null;

  return {
    valid: value.valid,
    durationMs: value.durationMs as number | null,
    onsetMs: value.onsetMs as number | null,
    offsetMs: value.offsetMs as number | null,
    stopReason: value.stopReason as MptStopReason,
    quality,
  };
}

/** بررسی مجدد محاسبهها در سرور، چون ورودی قابل دستکاری است. */
function recompute(attempts: MptAttempt[]) {
  const durations = attempts
    .filter((attempt) => attempt.valid && typeof attempt.durationMs === "number")
    .map((attempt) => attempt.durationMs as number);
  return {
    validCount: durations.length,
    bestMs: durations.length ? Math.max(...durations) : null,
    averageMs: durations.length
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null,
  };
}

export function parseMptPayload(input: unknown): MptStoredResult | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["key", "version", "attempts", "validCount", "bestMs", "averageMs"])) return null;
  if (input.key !== "mpt" || input.version !== 1) return null;
  if (!Array.isArray(input.attempts) || input.attempts.length < 1 || input.attempts.length > 3) return null;

  const attempts: MptAttempt[] = [];
  for (const raw of input.attempts) {
    const attempt = parseAttempt(raw);
    if (!attempt) return null;
    attempts.push(attempt);
  }

  const expected = recompute(attempts);
  if (
    input.validCount !== expected.validCount ||
    input.bestMs !== expected.bestMs ||
    input.averageMs !== expected.averageMs
  ) {
    return null;
  }

  return { key: "mpt", version: 1, attempts, validCount: expected.validCount, bestMs: expected.bestMs, averageMs: expected.averageMs };
}

export function toMptPayload(summary: MptSummary): MptStoredResult {
  return { key: "mpt", version: 1, ...summary };
}
