/**
 * اعتبارسنجی سختگیرانه نتیجه ارزیابی کیفیت صوت پیش از ذخیره.
 *
 * فقط لیست سفیدی از فیلدهای عددی و متادیتا پذیرفته میشود. هیچ نمونه خام صوتی،
 * آدرس فایل یا فیلد ناشناختهای ذخیره نمیشود. تمام شاخصهای خلاصه در سرور دوباره
 * از روی تلاشها محاسبه و با مقادیر ارسالشده برابر میشوند؛ کوچکترین مغایرت
 * بهمنزله دستکاری، ورودی رد میشود.
 */
import { summarizeVoiceSamples } from "./voice-quality-analysis";
import { VOICE_QUALITY_CONFIG } from "./voice-quality-config";
import {
  VOICE_QUALITY_ISSUE_LABELS,
  VOICE_SAMPLE_KINDS,
  type VoicePoint,
  type VoiceQualityIssue,
  type VoiceQualityStoredResult,
  type VoiceQualitySummary,
  type VoiceSampleAttempt,
  type VoiceSampleKind,
  type VoiceSampleSummary,
  type VoiceUnmeasurable,
} from "./voice-quality-types";

const ISSUES = Object.keys(VOICE_QUALITY_ISSUE_LABELS) as VoiceQualityIssue[];
const MAX_MS = Math.max(...Object.values(VOICE_QUALITY_CONFIG.maxDurationMs));
const MAX_HZ = 1000;
const MAX_RMS = 10;
const MAX_DB = 60;
const MAX_PERCENT = 100;

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

function nullableNumber(value: unknown, min: number, max: number): number | null | undefined {
  if (value === null) return null;
  return numberIn(value, min, max) ? value : undefined;
}

function parseSeries(value: unknown, min: number, max: number): VoicePoint[] | null {
  if (!Array.isArray(value) || value.length > VOICE_QUALITY_CONFIG.maxSeriesPoints) return null;
  const points: VoicePoint[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || !hasOnlyKeys(raw, ["t", "v"])) return null;
    if (!numberIn(raw.t, 0, MAX_MS) || !numberIn(raw.v, min, max)) return null;
    points.push({ t: raw.t, v: raw.v });
  }
  return points;
}

function parseUnmeasurable(value: unknown): VoiceUnmeasurable[] | null {
  if (!Array.isArray(value) || value.length > 16) return null;
  const result: VoiceUnmeasurable[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || !hasOnlyKeys(raw, ["metric", "reason"])) return null;
    if (typeof raw.metric !== "string" || raw.metric.length > 120) return null;
    if (typeof raw.reason !== "string" || raw.reason.length > 200) return null;
    result.push({ metric: raw.metric, reason: raw.reason });
  }
  return result;
}

const ATTEMPT_KEYS = [
  "kind",
  "valid",
  "issues",
  "recordedMs",
  "voicedMs",
  "f0MeanHz",
  "f0StdHz",
  "f0SlopeHzPerSec",
  "amplitudeCv",
  "jitterPercent",
  "shimmerPercent",
  "hnrDb",
  "spectralCentroidHz",
  "highFrequencyRatio",
  "f0Series",
  "amplitudeSeries",
  "unmeasurable",
] as const;

function parseAttempt(value: unknown): VoiceSampleAttempt | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ATTEMPT_KEYS)) return null;
  if (!VOICE_SAMPLE_KINDS.includes(value.kind as VoiceSampleKind)) return null;
  if (typeof value.valid !== "boolean") return null;
  if (!Array.isArray(value.issues) || value.issues.length > ISSUES.length) return null;
  const issues: VoiceQualityIssue[] = [];
  for (const issue of value.issues) {
    if (typeof issue !== "string" || !ISSUES.includes(issue as VoiceQualityIssue)) return null;
    if (!issues.includes(issue as VoiceQualityIssue)) issues.push(issue as VoiceQualityIssue);
  }
  if (value.valid !== (issues.length === 0)) return null;
  if (!numberIn(value.recordedMs, 0, MAX_MS)) return null;

  const voicedMs = nullableNumber(value.voicedMs, 0, MAX_MS);
  const f0MeanHz = nullableNumber(value.f0MeanHz, 1, MAX_HZ);
  const f0StdHz = nullableNumber(value.f0StdHz, 0, MAX_HZ);
  const f0SlopeHzPerSec = nullableNumber(value.f0SlopeHzPerSec, -500, 500);
  const amplitudeCv = nullableNumber(value.amplitudeCv, 0, MAX_PERCENT);
  const jitterPercent = nullableNumber(value.jitterPercent, 0, MAX_PERCENT);
  const shimmerPercent = nullableNumber(value.shimmerPercent, 0, MAX_PERCENT);
  const hnrDb = nullableNumber(value.hnrDb, -MAX_DB, MAX_DB);
  const spectralCentroidHz = nullableNumber(value.spectralCentroidHz, 0, VOICE_QUALITY_CONFIG.maxSampleRate / 2);
  const highFrequencyRatio = nullableNumber(value.highFrequencyRatio, 0, 1);
  if (
    voicedMs === undefined ||
    f0MeanHz === undefined ||
    f0StdHz === undefined ||
    f0SlopeHzPerSec === undefined ||
    amplitudeCv === undefined ||
    jitterPercent === undefined ||
    shimmerPercent === undefined ||
    hnrDb === undefined ||
    spectralCentroidHz === undefined ||
    highFrequencyRatio === undefined
  ) {
    return null;
  }

  const f0Series = parseSeries(value.f0Series, 1, MAX_HZ);
  const amplitudeSeries = parseSeries(value.amplitudeSeries, 0, MAX_RMS);
  const unmeasurable = parseUnmeasurable(value.unmeasurable);
  if (!f0Series || !amplitudeSeries || !unmeasurable) return null;

  return {
    kind: value.kind as VoiceSampleKind,
    valid: value.valid,
    issues,
    recordedMs: value.recordedMs,
    voicedMs,
    f0MeanHz,
    f0StdHz,
    f0SlopeHzPerSec,
    amplitudeCv,
    jitterPercent,
    shimmerPercent,
    hnrDb,
    spectralCentroidHz,
    highFrequencyRatio,
    f0Series,
    amplitudeSeries,
    unmeasurable,
  };
}

const SAMPLE_KEYS = [
  "kind",
  "attempts",
  "validCount",
  "voicedMs",
  "f0MeanHz",
  "f0StdHz",
  "f0SlopeHzPerSec",
  "amplitudeCv",
  "jitterPercent",
  "shimmerPercent",
  "hnrDb",
  "spectralCentroidHz",
  "highFrequencyRatio",
  "f0Series",
  "amplitudeSeries",
] as const;

function parseSample(value: unknown): VoiceSampleSummary | null {
  if (!isRecord(value) || !hasOnlyKeys(value, SAMPLE_KEYS)) return null;
  if (!VOICE_SAMPLE_KINDS.includes(value.kind as VoiceSampleKind)) return null;
  if (!Array.isArray(value.attempts) || value.attempts.length > 3) return null;
  const attempts: VoiceSampleAttempt[] = [];
  for (const raw of value.attempts) {
    const attempt = parseAttempt(raw);
    if (!attempt || attempt.kind !== value.kind) return null;
    attempts.push(attempt);
  }
  if (!numberIn(value.validCount, 0, 3) || value.validCount !== attempts.filter((a) => a.valid).length) return null;

  const voicedMs = nullableNumber(value.voicedMs, 0, MAX_MS);
  const f0MeanHz = nullableNumber(value.f0MeanHz, 1, MAX_HZ);
  const f0StdHz = nullableNumber(value.f0StdHz, 0, MAX_HZ);
  const f0SlopeHzPerSec = nullableNumber(value.f0SlopeHzPerSec, -500, 500);
  const amplitudeCv = nullableNumber(value.amplitudeCv, 0, MAX_PERCENT);
  const jitterPercent = nullableNumber(value.jitterPercent, 0, MAX_PERCENT);
  const shimmerPercent = nullableNumber(value.shimmerPercent, 0, MAX_PERCENT);
  const hnrDb = nullableNumber(value.hnrDb, -MAX_DB, MAX_DB);
  const spectralCentroidHz = nullableNumber(value.spectralCentroidHz, 0, VOICE_QUALITY_CONFIG.maxSampleRate / 2);
  const highFrequencyRatio = nullableNumber(value.highFrequencyRatio, 0, 1);
  if (
    voicedMs === undefined ||
    f0MeanHz === undefined ||
    f0StdHz === undefined ||
    f0SlopeHzPerSec === undefined ||
    amplitudeCv === undefined ||
    jitterPercent === undefined ||
    shimmerPercent === undefined ||
    hnrDb === undefined ||
    spectralCentroidHz === undefined ||
    highFrequencyRatio === undefined
  ) {
    return null;
  }
  const f0Series = parseSeries(value.f0Series, 1, MAX_HZ);
  const amplitudeSeries = parseSeries(value.amplitudeSeries, 0, MAX_RMS);
  if (!f0Series || !amplitudeSeries) return null;

  return {
    kind: value.kind as VoiceSampleKind,
    attempts,
    validCount: value.validCount,
    voicedMs,
    f0MeanHz,
    f0StdHz,
    f0SlopeHzPerSec,
    amplitudeCv,
    jitterPercent,
    shimmerPercent,
    hnrDb,
    spectralCentroidHz,
    highFrequencyRatio,
    f0Series,
    amplitudeSeries,
  };
}

const METRIC_KEYS = [
  "voicedMs",
  "f0MeanHz",
  "f0StdHz",
  "f0SlopeHzPerSec",
  "amplitudeCv",
  "jitterPercent",
  "shimmerPercent",
  "hnrDb",
  "spectralCentroidHz",
  "highFrequencyRatio",
] as const;

function sameSeries(a: VoicePoint[], b: VoicePoint[]): boolean {
  return a.length === b.length && a.every((point, index) => point.t === b[index].t && point.v === b[index].v);
}

function sameSummary(a: VoiceQualitySummary, b: VoiceQualitySummary): boolean {
  if (a.validSampleCount !== b.validSampleCount || a.samples.length !== b.samples.length) return false;
  for (let i = 0; i < a.samples.length; i++) {
    const left = a.samples[i];
    const right = b.samples[i];
    if (left.kind !== right.kind || left.validCount !== right.validCount) return false;
    if (left.attempts.length !== right.attempts.length) return false;
    for (const metric of METRIC_KEYS) {
      if (left[metric] !== right[metric]) return false;
    }
    if (!sameSeries(left.f0Series, right.f0Series)) return false;
    if (!sameSeries(left.amplitudeSeries, right.amplitudeSeries)) return false;
  }
  return true;
}

/** ورودی نامعتبر `null` برمیگرداند؛ تنها مسیر ذخیره همین تابع است. */
export function parseVoiceQualityPayload(input: unknown): VoiceQualityStoredResult | null {
  if (!isRecord(input)) return null;
  if (
    !hasOnlyKeys(input, ["key", "version", "samples", "validSampleCount"]) ||
    input.key !== "voice-quality" ||
    input.version !== 1 ||
    !Array.isArray(input.samples) ||
    input.samples.length !== VOICE_SAMPLE_KINDS.length
  ) {
    return null;
  }
  const samples: VoiceSampleSummary[] = [];
  for (let i = 0; i < VOICE_SAMPLE_KINDS.length; i++) {
    const sample = parseSample(input.samples[i]);
    if (!sample || sample.kind !== VOICE_SAMPLE_KINDS[i]) return null;
    samples.push(sample);
  }
  if (
    !numberIn(input.validSampleCount, 1, VOICE_SAMPLE_KINDS.length) ||
    input.validSampleCount !== samples.filter((sample) => sample.validCount > 0).length
  ) {
    return null;
  }

  const summary: VoiceQualitySummary = { samples, validSampleCount: input.validSampleCount };
  const recomputed = summarizeVoiceSamples(samples.flatMap((sample) => sample.attempts));
  if (!sameSummary(summary, recomputed)) return null;

  return { key: "voice-quality", version: 1, ...summary };
}

export function toVoiceQualityPayload(summary: VoiceQualitySummary): VoiceQualityStoredResult {
  return { key: "voice-quality", version: 1, ...summary };
}
