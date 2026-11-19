/**
 * اعتبارسنجی سختگیرانه نتیجه تحلیل واکه پایدار پیش از ذخیره.
 *
 * امنیت: فقط لیست سفیدی از فیلدهای عددی/متادیتا پذیرفته میشود. هیچ نمونه خام،
 * آدرس فایل یا فیلد ناشناختهای ذخیره نمیشود. تمام شاخصهای قابل محاسبه در
 * سرور دوباره از روی تلاشها محاسبه و با مقادیر ارسالشده مقایسه میشوند.
 */
import { summarizeSustainedAttempts } from "./sustained-vowel-analysis";
import { SUSTAINED_VOWEL_CONFIG } from "./sustained-vowel-config";
import type {
  AmplitudeStats,
  F0Point,
  F0Stats,
  SustainedVowelAttempt,
  SustainedVowelIssue,
  SustainedVowelQuality,
  SustainedVowelStoredResult,
  SustainedVowelSummary,
} from "./sustained-vowel-types";

const ISSUES: readonly SustainedVowelIssue[] = [
  "NO_SIGNAL",
  "WEAK_SIGNAL",
  "HIGH_NOISE",
  "CLIPPING",
  "LONG_INTERNAL_SILENCE",
  "TOO_SHORT",
  "NO_STABLE_SEGMENT",
  "F0_UNRELIABLE",
  "INVALID_SAMPLE_RATE",
  "TRUNCATED",
];

const MAX_MS = SUSTAINED_VOWEL_CONFIG.maxDurationMs;
const MAX_HZ = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function numberIn(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function nullableNumber(value: unknown, min: number, max: number): number | null {
  if (value === null) return null;
  return numberIn(value, min, max) ? value : NaN;
}

function parseSeries(value: unknown): F0Point[] | null {
  if (!Array.isArray(value) || value.length > SUSTAINED_VOWEL_CONFIG.maxSeriesPoints) return null;
  const points: F0Point[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || !hasOnlyKeys(raw, ["t", "hz"])) return null;
    if (!numberIn(raw.t, 0, MAX_MS) || !numberIn(raw.hz, 1, MAX_HZ)) return null;
    points.push({ t: raw.t, hz: raw.hz });
  }
  return points;
}

/** null = مقدار معتبر «ناموجود»؛ undefined = ورودی نامعتبر. */
function parseF0(value: unknown): F0Stats | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  if (!hasOnlyKeys(value, ["meanHz", "minHz", "maxHz", "stdHz", "slopeHzPerSec", "series"])) return undefined;
  if (
    !numberIn(value.meanHz, 1, MAX_HZ) ||
    !numberIn(value.minHz, 1, MAX_HZ) ||
    !numberIn(value.maxHz, 1, MAX_HZ) ||
    !numberIn(value.stdHz, 0, MAX_HZ) ||
    !numberIn(value.slopeHzPerSec, -500, 500)
  ) {
    return undefined;
  }
  if (value.minHz > value.meanHz || value.meanHz > value.maxHz) return undefined;
  const series = parseSeries(value.series);
  if (!series) return undefined;
  return {
    meanHz: value.meanHz,
    minHz: value.minHz,
    maxHz: value.maxHz,
    stdHz: value.stdHz,
    slopeHzPerSec: value.slopeHzPerSec,
    series,
  };
}

function parseAmplitude(value: unknown): AmplitudeStats | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || !hasOnlyKeys(value, ["meanRms", "stdRms", "cv", "peakRms"])) return undefined;
  if (
    !numberIn(value.meanRms, 0, 10) ||
    !numberIn(value.stdRms, 0, 10) ||
    !numberIn(value.cv, 0, 100) ||
    !numberIn(value.peakRms, 0, 10)
  ) {
    return undefined;
  }
  return {
    meanRms: value.meanRms,
    stdRms: value.stdRms,
    cv: value.cv,
    peakRms: value.peakRms,
  };
}

function parseQuality(value: unknown): SustainedVowelQuality | null {
  if (!isRecord(value)) return null;
  if (
    !hasOnlyKeys(value, [
      "noiseFloorRms",
      "snrDb",
      "clippedRatio",
      "internalSilenceMs",
      "voicedRatio",
      "sampleRateValid",
    ])
  ) {
    return null;
  }
  if (!numberIn(value.noiseFloorRms, 0, 10) || !numberIn(value.clippedRatio, 0, 1)) return null;
  if (!numberIn(value.internalSilenceMs, 0, MAX_MS) || !numberIn(value.voicedRatio, 0, 1)) return null;
  if (typeof value.sampleRateValid !== "boolean") return null;
  const snrDb = nullableNumber(value.snrDb, -60, 60);
  if (Number.isNaN(snrDb)) return null;
  return {
    noiseFloorRms: value.noiseFloorRms,
    snrDb,
    clippedRatio: value.clippedRatio,
    internalSilenceMs: value.internalSilenceMs,
    voicedRatio: value.voicedRatio,
    sampleRateValid: value.sampleRateValid,
  };
}

function parseAttempt(value: unknown): SustainedVowelAttempt | null {
  if (!isRecord(value)) return null;
  if (
    !hasOnlyKeys(value, [
      "valid",
      "issues",
      "recordedMs",
      "stableMs",
      "onsetMs",
      "offsetMs",
      "stableStartMs",
      "stableEndMs",
      "f0",
      "amplitude",
      "quality",
    ])
  ) {
    return null;
  }
  if (typeof value.valid !== "boolean") return null;
  if (!numberIn(value.recordedMs, 0, MAX_MS) || !numberIn(value.stableMs, 0, MAX_MS)) return null;
  if (value.stableMs > value.recordedMs + 1) return null;

  const nullableMs = (input: unknown): number | null => {
    if (input === null) return null;
    return numberIn(input, 0, MAX_MS) ? input : NaN;
  };
  const onsetMs = nullableMs(value.onsetMs);
  const offsetMs = nullableMs(value.offsetMs);
  const stableStartMs = nullableMs(value.stableStartMs);
  const stableEndMs = nullableMs(value.stableEndMs);
  if ([onsetMs, offsetMs, stableStartMs, stableEndMs].some((item) => Number.isNaN(item))) return null;

  if (!Array.isArray(value.issues) || value.issues.length > ISSUES.length) return null;
  if (!value.issues.every((issue) => typeof issue === "string" && ISSUES.includes(issue as SustainedVowelIssue))) {
    return null;
  }
  const issues = [...new Set(value.issues)] as SustainedVowelIssue[];
  // تلاشی که مشکل کیفیتی دارد نمیتواند «معتبر» علامتگذاری شده باشد.
  if (value.valid !== (issues.length === 0)) return null;

  const f0 = parseF0(value.f0);
  const amplitude = parseAmplitude(value.amplitude);
  const quality = parseQuality(value.quality);
  if (f0 === undefined || amplitude === undefined || !quality) return null;

  return {
    valid: value.valid,
    issues,
    recordedMs: value.recordedMs,
    stableMs: value.stableMs,
    onsetMs,
    offsetMs,
    stableStartMs,
    stableEndMs,
    f0,
    amplitude,
    quality,
  };
}

function sameSummary(left: SustainedVowelSummary, right: SustainedVowelSummary): boolean {
  return (
    left.validCount === right.validCount &&
    left.f0MeanHz === right.f0MeanHz &&
    left.f0StdHz === right.f0StdHz &&
    left.amplitudeCv === right.amplitudeCv &&
    left.stableMs === right.stableMs
  );
}

/** ورودی مرورگر قابل دستکاری است؛ خلاصه حتماً در سرور دوباره محاسبه میشود. */
export function parseSustainedVowelPayload(input: unknown): SustainedVowelStoredResult | null {
  if (!isRecord(input)) return null;
  if (
    !hasOnlyKeys(input, [
      "key",
      "version",
      "attempts",
      "validCount",
      "f0MeanHz",
      "f0StdHz",
      "amplitudeCv",
      "stableMs",
    ])
  ) {
    return null;
  }
  if (input.key !== "sustained-vowel" || input.version !== 1) return null;
  if (!Array.isArray(input.attempts) || input.attempts.length < 1 || input.attempts.length > 3) return null;

  const attempts: SustainedVowelAttempt[] = [];
  for (const raw of input.attempts) {
    const attempt = parseAttempt(raw);
    if (!attempt) return null;
    attempts.push(attempt);
  }

  const summary = summarizeSustainedAttempts(attempts);
  const claimed: SustainedVowelSummary = {
    attempts,
    validCount: input.validCount as number,
    f0MeanHz: nullableNumber(input.f0MeanHz, 1, MAX_HZ),
    f0StdHz: nullableNumber(input.f0StdHz, 0, MAX_HZ),
    amplitudeCv: nullableNumber(input.amplitudeCv, 0, 100),
    stableMs: nullableNumber(input.stableMs, 0, MAX_MS),
  };
  if (
    [claimed.f0MeanHz, claimed.f0StdHz, claimed.amplitudeCv, claimed.stableMs].some((value) =>
      Number.isNaN(value),
    )
  ) {
    return null;
  }
  if (!sameSummary(summary, claimed)) return null;

  return { key: "sustained-vowel", version: 1, ...summary };
}

export function toSustainedVowelPayload(summary: SustainedVowelSummary): SustainedVowelStoredResult {
  return { key: "sustained-vowel", version: 1, ...summary };
}
