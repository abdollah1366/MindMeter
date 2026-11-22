import {
  READING_ALOUD_DOMAINS,
  READING_ALOUD_PASSAGES,
  type ReadingAloudPerformance,
  type ReadingAloudStoredResult,
  type ReadingAloudSummary,
} from "./reading-aloud-types";

type PassageSeed = (typeof READING_ALOUD_PASSAGES)[number];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasOnlyKeys(v: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(v).every((key) => allowed.has(key));
}

function parseId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null;
}

function normalizeText(v: unknown, max: number): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const text = v.trim();
  if (!text) return null;
  return text.length <= max ? text : undefined;
}

function parsePassageId(v: unknown): PassageSeed | null {
  if (typeof v !== "string") return null;
  return READING_ALOUD_PASSAGES.find((passage) => passage.id === v) ?? null;
}

function parsePassageRef(v: unknown): PassageSeed | null {
  if (!isRecord(v)) return null;
  if (!hasOnlyKeys(v, ["id", "title", "wordCount"])) return null;
  const seed = parsePassageId(v.id);
  if (!seed) return null;
  if (v.title !== seed.title || v.wordCount !== seed.wordCount) return null;
  return seed;
}

function parseCount(v: unknown, max: number): number | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > max) return null;
  return v;
}

function parsePerformance(
  raw: unknown,
  passage: PassageSeed,
): ReadingAloudPerformance | null {
  if (!isRecord(raw)) return null;
  if (
    !hasOnlyKeys(raw, [
      "durationSeconds",
      "wordsRead",
      "misreadWords",
      "omissions",
      "additions",
      "selfCorrections",
    ])
  ) {
    return null;
  }
  const durationSeconds = parseCount(raw.durationSeconds, 3600);
  const wordsRead = parseCount(raw.wordsRead, passage.wordCount);
  const misreadWords = parseCount(raw.misreadWords, 100);
  const omissions = parseCount(raw.omissions, 100);
  const additions = parseCount(raw.additions, 100);
  const selfCorrections = parseCount(raw.selfCorrections, 100);
  if (
    durationSeconds === null ||
    durationSeconds < 1 ||
    wordsRead === null ||
    misreadWords === null ||
    omissions === null ||
    additions === null ||
    selfCorrections === null
  ) {
    return null;
  }
  if (misreadWords + omissions > wordsRead) return null;
  return {
    durationSeconds,
    wordsRead,
    misreadWords,
    omissions,
    additions,
    selfCorrections,
  };
}

type Rating = { id: string; domain: string; label: string; score: number };

function parseRatings(raw: unknown): Rating[] | null {
  if (!Array.isArray(raw) || raw.length !== READING_ALOUD_DOMAINS.length) return null;
  const ratings: Rating[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item)) return null;
    if (!hasOnlyKeys(item, ["id", "domain", "label", "score"])) return null;
    const seed = READING_ALOUD_DOMAINS.find((domain) => domain.id === item.id);
    if (!seed || seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (item.domain !== seed.domain || item.label !== seed.label) return null;
    const score = parseCount(item.score, 4);
    if (score === null) return null;
    ratings.push({ id: seed.id, domain: seed.domain, label: seed.label, score });
  }
  if (READING_ALOUD_DOMAINS.some((domain) => !seen.has(domain.id))) return null;
  ratings.sort(
    (a, b) =>
      READING_ALOUD_DOMAINS.findIndex((domain) => domain.id === a.id) -
      READING_ALOUD_DOMAINS.findIndex((domain) => domain.id === b.id),
  );
  return ratings;
}

function parseOverallSeverity(v: unknown): number | null {
  return parseCount(v, 4);
}

export function computeReadingAloudSummary(
  performance: ReadingAloudPerformance,
): ReadingAloudSummary {
  const errorCount = performance.misreadWords + performance.omissions + performance.additions;
  const wordsCorrect = Math.max(
    0,
    performance.wordsRead - performance.misreadWords - performance.omissions,
  );
  const accuracyPercent =
    performance.wordsRead > 0
      ? Math.round((wordsCorrect / performance.wordsRead) * 1000) / 10
      : 0;
  const wordsCorrectPerMinute =
    performance.durationSeconds > 0
      ? Math.round((wordsCorrect / performance.durationSeconds) * 60 * 10) / 10
      : 0;
  return { errorCount, wordsCorrect, accuracyPercent, wordsCorrectPerMinute };
}

export function parseReadingAloudInput(input: unknown): {
  patientId: string;
  passage: PassageSeed;
  performance: ReadingAloudPerformance;
  ratings: Rating[];
  overallSeverity: number;
  notes: string | null;
} | null {
  if (!isRecord(input)) return null;
  if (
    !hasOnlyKeys(input, [
      "patientId",
      "passageId",
      "performance",
      "ratings",
      "overallSeverity",
      "notes",
      "status",
    ])
  ) {
    return null;
  }
  if (input.status !== "FINAL") return null;
  const patientId = parseId(input.patientId);
  if (!patientId) return null;
  const passage = parsePassageId(input.passageId);
  if (!passage) return null;
  const performance = parsePerformance(input.performance, passage);
  if (!performance) return null;
  const ratings = parseRatings(input.ratings);
  if (!ratings) return null;
  const overallSeverity = parseOverallSeverity(input.overallSeverity);
  if (overallSeverity === null) return null;
  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;
  return { patientId, passage, performance, ratings, overallSeverity, notes };
}

export function parseReadingAloudStored(input: unknown): ReadingAloudStoredResult | null {
  if (!isRecord(input)) return null;
  if (
    !hasOnlyKeys(input, [
      "key",
      "version",
      "passage",
      "performance",
      "ratings",
      "overallSeverity",
      "summary",
      "notes",
      "evaluator",
      "assessedAt",
    ])
  ) {
    return null;
  }
  if (input.key !== "reading-aloud" || input.version !== 1) return null;
  const passage = parsePassageRef(input.passage);
  if (!passage) return null;
  const performance = parsePerformance(input.performance, passage);
  if (!performance) return null;
  const ratings = parseRatings(input.ratings);
  if (!ratings) return null;
  const overallSeverity = parseOverallSeverity(input.overallSeverity);
  if (overallSeverity === null) return null;
  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;
  if (!isRecord(input.evaluator)) return null;
  if (!hasOnlyKeys(input.evaluator, ["clinicianProfileId", "clinicianUserId", "kind"])) {
    return null;
  }
  const profileId = parseId(input.evaluator.clinicianProfileId);
  const userId = parseId(input.evaluator.clinicianUserId);
  if (!profileId || !userId) return null;
  if (input.evaluator.kind !== "PSYCHOLOGIST" && input.evaluator.kind !== "PHYSICIAN") {
    return null;
  }
  if (typeof input.assessedAt !== "string") return null;
  const assessedAt = new Date(input.assessedAt);
  if (!Number.isFinite(assessedAt.getTime())) return null;

  // خلاصه همیشه از مشاهدات خام محاسبه میشود؛ مقدار ذخیرهشده مورد اعتماد نیست.
  const summary = computeReadingAloudSummary(performance);
  return {
    key: "reading-aloud",
    version: 1,
    passage: { id: passage.id, title: passage.title, wordCount: passage.wordCount },
    performance,
    ratings,
    overallSeverity,
    summary,
    notes,
    evaluator: {
      clinicianProfileId: profileId,
      clinicianUserId: userId,
      kind: input.evaluator.kind,
    },
    assessedAt: assessedAt.toISOString(),
  };
}

export function buildReadingAloudStored(
  input: {
    patientId: string;
    passage: PassageSeed;
    performance: ReadingAloudPerformance;
    ratings: Rating[];
    overallSeverity: number;
    notes: string | null;
  },
  evaluator: {
    clinicianProfileId: string;
    clinicianUserId: string;
    kind: "PSYCHOLOGIST" | "PHYSICIAN";
  },
  assessedAt: Date,
): ReadingAloudStoredResult {
  return {
    key: "reading-aloud",
    version: 1,
    passage: {
      id: input.passage.id,
      title: input.passage.title,
      wordCount: input.passage.wordCount,
    },
    performance: input.performance,
    ratings: input.ratings,
    overallSeverity: input.overallSeverity,
    summary: computeReadingAloudSummary(input.performance),
    notes: input.notes,
    evaluator,
    assessedAt: assessedAt.toISOString(),
  };
}
