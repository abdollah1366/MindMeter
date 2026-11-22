import {
  EXPRESSIVE_LANGUAGE_DOMAINS,
  type ExpressiveLanguageStoredResult,
} from "./expressive-language-types";

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

type Rating = { id: string; domain: string; label: string; score: number };

function parseRatings(raw: unknown): Rating[] | null {
  if (!Array.isArray(raw) || raw.length !== EXPRESSIVE_LANGUAGE_DOMAINS.length) return null;
  const ratings: Rating[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item)) return null;
    if (!hasOnlyKeys(item, ["id", "domain", "label", "score"])) return null;
    const seed = EXPRESSIVE_LANGUAGE_DOMAINS.find((domain) => domain.id === item.id);
    if (!seed || seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (item.domain !== seed.domain || item.label !== seed.label) return null;
    if (
      typeof item.score !== "number" ||
      !Number.isInteger(item.score) ||
      item.score < 0 ||
      item.score > 4
    ) {
      return null;
    }
    ratings.push({
      id: seed.id,
      domain: seed.domain,
      label: seed.label,
      score: item.score,
    });
  }
  if (EXPRESSIVE_LANGUAGE_DOMAINS.some((domain) => !seen.has(domain.id))) return null;
  ratings.sort(
    (a, b) =>
      EXPRESSIVE_LANGUAGE_DOMAINS.findIndex((domain) => domain.id === a.id) -
      EXPRESSIVE_LANGUAGE_DOMAINS.findIndex((domain) => domain.id === b.id),
  );
  return ratings;
}

function parseOverallSeverity(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 4) return null;
  return v;
}

export function parseExpressiveLanguageInput(input: unknown): {
  patientId: string;
  ratings: Rating[];
  overallSeverity: number;
  notes: string | null;
} | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["patientId", "ratings", "overallSeverity", "notes", "status"])) {
    return null;
  }
  if (input.status !== "FINAL") return null;
  const patientId = parseId(input.patientId);
  if (!patientId) return null;
  const ratings = parseRatings(input.ratings);
  if (!ratings) return null;
  const overallSeverity = parseOverallSeverity(input.overallSeverity);
  if (overallSeverity === null) return null;
  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;
  return { patientId, ratings, overallSeverity, notes };
}

export function parseExpressiveLanguageStored(
  input: unknown,
): ExpressiveLanguageStoredResult | null {
  if (!isRecord(input)) return null;
  if (
    !hasOnlyKeys(input, [
      "key",
      "version",
      "ratings",
      "overallSeverity",
      "notes",
      "evaluator",
      "assessedAt",
    ])
  ) {
    return null;
  }
  if (input.key !== "expressive-language" || input.version !== 1) return null;
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
  return {
    key: "expressive-language",
    version: 1,
    ratings,
    overallSeverity,
    notes,
    evaluator: {
      clinicianProfileId: profileId,
      clinicianUserId: userId,
      kind: input.evaluator.kind,
    },
    assessedAt: assessedAt.toISOString(),
  };
}

export function buildExpressiveLanguageStored(
  input: {
    patientId: string;
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
): ExpressiveLanguageStoredResult {
  return {
    key: "expressive-language",
    version: 1,
    ratings: input.ratings,
    overallSeverity: input.overallSeverity,
    notes: input.notes,
    evaluator,
    assessedAt: assessedAt.toISOString(),
  };
}
