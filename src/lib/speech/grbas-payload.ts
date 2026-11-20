/**
 * اعتبارسنجی سخت‌گیرانه‌ی ارزیابی GRBAS.
 *
 * ورودی مرورگر قابل دستکاری است. دو مرحله اعتبارسنجی وجود دارد:
 *   1) parseGrbasInput: فقط داده‌های مجاز ارزیاب (مراجع، پنج امتیاز، منبع نمونه
 *      و توضیحات) را می‌پذیرد. هر فیلد هویتی مانند شناسه‌ی ارزیاب، نقش یا زمان
 *      ارزیابی از ورودی رد می‌شود؛ این مقادیر فقط در سرور ساخته می‌شوند.
 *   2) parseGrbasStored: شکل کامل داده‌ی ذخیره‌شده را برای خواندن دوباره بررسی
 *      می‌کند.
 *
 * هیچ نمره‌ی کلی، برچسب شدت یا فیلد آکوستیکی در payload وجود ندارد.
 */
import {
  GRBAS_COMPONENT_KEYS,
  GRBAS_EVALUATOR_KINDS,
  GRBAS_SAMPLE_SOURCES,
  type GrbasEvaluatorKind,
  type GrbasSampleSource,
  type GrbasScores,
  type GrbasStatus,
} from "./grbas-types";
import { isGrbasScore } from "./grbas-scoring";

export type GrbasEvaluator = {
  clinicianProfileId: string;
  clinicianUserId: string;
  kind: GrbasEvaluatorKind;
};

/** داده‌ی قابل قبول از مرورگر؛ هویت ارزیاب در آن نیست. */
export type GrbasInput = {
  patientId: string;
  scores: GrbasScores;
  sampleSource: GrbasSampleSource;
  sampleNote: string | null;
  notes: string | null;
};

export type GrbasStoredResult = {
  key: "grbas";
  version: 1;
  scores: GrbasScores;
  sampleSource: GrbasSampleSource;
  sampleNote: string | null;
  notes: string | null;
  status: GrbasStatus;
  evaluator: GrbasEvaluator;
  assessedAt: string;
};

const INPUT_KEYS = ["patientId", "scores", "sampleSource", "sampleNote", "notes", "status"] as const;
const STORED_KEYS = [
  "key",
  "version",
  "scores",
  "sampleSource",
  "sampleNote",
  "notes",
  "status",
  "evaluator",
  "assessedAt",
] as const;
const EVALUATOR_KEYS = ["clinicianProfileId", "clinicianUserId", "kind"] as const;

export const GRBAS_MAX_SAMPLE_NOTE_LENGTH = 300;
export const GRBAS_MAX_NOTES_LENGTH = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function parseId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^[A-Za-z0-9_-]{8,64}$/.test(value) ? value : null;
}

/** خروجی undefined یعنی نامعتبر؛ null یعنی خالی. */
function normalizeText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length <= maxLength ? trimmed : undefined;
}

function parseScores(value: unknown): GrbasScores | null {
  if (!isRecord(value)) return null;
  if (!hasOnlyKeys(value, GRBAS_COMPONENT_KEYS)) return null;
  for (const key of GRBAS_COMPONENT_KEYS) {
    if (!isGrbasScore(value[key])) return null;
  }
  return {
    G: value.G as number,
    R: value.R as number,
    B: value.B as number,
    A: value.A as number,
    S: value.S as number,
  };
}

function isSampleSource(value: unknown): value is GrbasSampleSource {
  return typeof value === "string" && (GRBAS_SAMPLE_SOURCES as readonly string[]).includes(value);
}

function isEvaluatorKind(value: unknown): value is GrbasEvaluatorKind {
  return typeof value === "string" && (GRBAS_EVALUATOR_KINDS as readonly string[]).includes(value);
}

function parseEvaluator(value: unknown): GrbasEvaluator | null {
  if (!isRecord(value)) return null;
  if (!hasOnlyKeys(value, EVALUATOR_KEYS)) return null;
  const clinicianProfileId = parseId(value.clinicianProfileId);
  const clinicianUserId = parseId(value.clinicianUserId);
  if (!clinicianProfileId || !clinicianUserId) return null;
  if (!isEvaluatorKind(value.kind)) return null;
  return { clinicianProfileId, clinicianUserId, kind: value.kind };
}

function parseAssessedAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  return date.toISOString() === value ? value : null;
}

/**
 * اعتبارسنجی داده‌ی ارسال‌شده از مرورگر.
 * فیلدهای هویتی (evaluator، clinicianId، assessedAt، userId) مجاز نیستند و
 * باعث رد کل ورودی می‌شوند.
 */
export function parseGrbasInput(input: unknown): GrbasInput | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, INPUT_KEYS)) return null;
  if (input.status !== "FINAL") return null;

  const patientId = parseId(input.patientId);
  if (!patientId) return null;

  const scores = parseScores(input.scores);
  if (!scores) return null;

  if (!isSampleSource(input.sampleSource)) return null;

  const sampleNote = normalizeText(input.sampleNote, GRBAS_MAX_SAMPLE_NOTE_LENGTH);
  if (sampleNote === undefined) return null;
  // اگر منبع نمونه «سایر» است، توضیح آن الزامی است تا منبع مبهم نماند.
  if (input.sampleSource === "OTHER" && !sampleNote) return null;

  const notes = normalizeText(input.notes, GRBAS_MAX_NOTES_LENGTH);
  if (notes === undefined) return null;

  return {
    patientId,
    scores,
    sampleSource: input.sampleSource,
    sampleNote,
    notes,
  };
}

/**
 * اعتبارسنجی داده‌ی ذخیره‌شده. هر فیلد ناشناخته یا ناقص کل رکورد را نامعتبر
 * می‌کند تا داده‌ی دستکاری‌شده در گزارش نمایش داده نشود.
 */
export function parseGrbasStored(input: unknown): GrbasStoredResult | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, STORED_KEYS)) return null;
  if (input.key !== "grbas" || input.version !== 1) return null;
  if (input.status !== "FINAL") return null;

  const scores = parseScores(input.scores);
  if (!scores) return null;

  if (!isSampleSource(input.sampleSource)) return null;

  const sampleNote = normalizeText(input.sampleNote, GRBAS_MAX_SAMPLE_NOTE_LENGTH);
  if (sampleNote === undefined) return null;
  if (input.sampleSource === "OTHER" && !sampleNote) return null;

  const notes = normalizeText(input.notes, GRBAS_MAX_NOTES_LENGTH);
  if (notes === undefined) return null;

  const evaluator = parseEvaluator(input.evaluator);
  if (!evaluator) return null;

  const assessedAt = parseAssessedAt(input.assessedAt);
  if (!assessedAt) return null;

  return {
    key: "grbas",
    version: 1,
    scores,
    sampleSource: input.sampleSource,
    sampleNote,
    notes,
    status: "FINAL",
    evaluator,
    assessedAt,
  };
}

/**
 * ساخت payload نهایی در سرور. هویت ارزیاب و زمان ارزیابی فقط از آرگومان‌های
 * سمت سرور گرفته می‌شوند، نه از ورودی مرورگر.
 */
export function buildGrbasStored(
  input: GrbasInput,
  evaluator: GrbasEvaluator,
  assessedAt: Date,
): GrbasStoredResult {
  return {
    key: "grbas",
    version: 1,
    scores: input.scores,
    sampleSource: input.sampleSource,
    sampleNote: input.sampleNote,
    notes: input.notes,
    status: "FINAL",
    evaluator,
    assessedAt: assessedAt.toISOString(),
  };
}
