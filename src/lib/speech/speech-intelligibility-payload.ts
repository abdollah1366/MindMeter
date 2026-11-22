import { SPEECH_INTELLIGIBILITY_CONTEXTS, type SpeechIntelligibilityStoredResult } from "./speech-intelligibility-types";

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function hasOnlyKeys(v: Record<string, unknown>, keys: readonly string[]) { const a = new Set(keys); return Object.keys(v).every((k) => a.has(k)); }
function parseId(v: unknown): string | null { if (typeof v !== "string") return null; return /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null; }
function normalizeText(v: unknown, max: number): string | null | undefined {
  if (v === null) return null; if (typeof v !== "string") return undefined;
  const t = v.trim(); if (!t) return null; return t.length <= max ? t : undefined;
}

export function parseSpeechIntelligibilityInput(input: unknown): { patientId: string; ratings: { id: string; context: string; score: number }[]; overallPercent: number | null; notes: string | null } | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["patientId", "ratings", "overallPercent", "notes", "status"])) return null;
  if (input.status !== "FINAL") return null;
  const patientId = parseId(input.patientId);
  if (!patientId) return null;
  if (!Array.isArray(input.ratings) || input.ratings.length !== SPEECH_INTELLIGIBILITY_CONTEXTS.length) return null;
  const ratings: { id: string; context: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const raw of input.ratings) {
    if (!isRecord(raw)) return null;
    if (!hasOnlyKeys(raw, ["id", "context", "score"])) return null;
    const seed = SPEECH_INTELLIGIBILITY_CONTEXTS.find((s) => s.id === raw.id);
    if (!seed) return null;
    if (seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (raw.context !== seed.context) return null;
    if (typeof raw.score !== "number" || !Number.isInteger(raw.score) || raw.score < 0 || raw.score > 4) return null;
    ratings.push({ id: seed.id, context: seed.context, score: raw.score });
  }
  if (SPEECH_INTELLIGIBILITY_CONTEXTS.some((s) => !seen.has(s.id))) return null;
  ratings.sort((a, b) => SPEECH_INTELLIGIBILITY_CONTEXTS.findIndex((s) => s.id === a.id) - SPEECH_INTELLIGIBILITY_CONTEXTS.findIndex((s) => s.id === b.id));

  let overallPercent: number | null = null;
  if (input.overallPercent !== null) {
    if (typeof input.overallPercent !== "number" || !Number.isInteger(input.overallPercent) || input.overallPercent < 0 || input.overallPercent > 100) return null;
    overallPercent = input.overallPercent;
  }
  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;
  return { patientId, ratings, overallPercent, notes };
}

export function parseSpeechIntelligibilityStored(input: unknown): SpeechIntelligibilityStoredResult | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["key", "version", "ratings", "overallPercent", "notes", "evaluator", "assessedAt"])) return null;
  if (input.key !== "speech-intelligibility" || input.version !== 1) return null;
  if (!Array.isArray(input.ratings) || input.ratings.length !== SPEECH_INTELLIGIBILITY_CONTEXTS.length) return null;
  const ratings: { id: string; context: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const raw of input.ratings) {
    if (!isRecord(raw)) return null;
    if (!hasOnlyKeys(raw, ["id", "context", "score"])) return null;
    const seed = SPEECH_INTELLIGIBILITY_CONTEXTS.find((s) => s.id === raw.id);
    if (!seed) return null;
    if (seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (raw.context !== seed.context) return null;
    if (typeof raw.score !== "number" || !Number.isInteger(raw.score) || raw.score < 0 || raw.score > 4) return null;
    ratings.push({ id: seed.id, context: seed.context, score: raw.score });
  }
  if (SPEECH_INTELLIGIBILITY_CONTEXTS.some((s) => !seen.has(s.id))) return null;
  ratings.sort((a, b) => SPEECH_INTELLIGIBILITY_CONTEXTS.findIndex((s) => s.id === a.id) - SPEECH_INTELLIGIBILITY_CONTEXTS.findIndex((s) => s.id === b.id));

  let overallPercent: number | null = null;
  if (input.overallPercent !== null) {
    if (typeof input.overallPercent !== "number" || !Number.isInteger(input.overallPercent) || input.overallPercent < 0 || input.overallPercent > 100) return null;
    overallPercent = input.overallPercent;
  }
  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;

  if (!isRecord(input.evaluator)) return null;
  if (!hasOnlyKeys(input.evaluator, ["clinicianProfileId", "clinicianUserId", "kind"])) return null;
  const profileId = parseId(input.evaluator.clinicianProfileId);
  const userId = parseId(input.evaluator.clinicianUserId);
  if (!profileId || !userId) return null;
  if (input.evaluator.kind !== "PSYCHOLOGIST" && input.evaluator.kind !== "PHYSICIAN") return null;
  if (typeof input.assessedAt !== "string") return null;
  const d = new Date(input.assessedAt);
  if (!Number.isFinite(d.getTime())) return null;

  return {
    key: "speech-intelligibility", version: 1, ratings, overallPercent, notes,
    evaluator: { clinicianProfileId: profileId, clinicianUserId: userId, kind: input.evaluator.kind as "PSYCHOLOGIST" | "PHYSICIAN" },
    assessedAt: d.toISOString(),
  };
}

export function buildSpeechIntelligibilityStored(input: { patientId: string; ratings: { id: string; context: string; score: number }[]; overallPercent: number | null; notes: string | null }, evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" }, assessedAt: Date): SpeechIntelligibilityStoredResult {
  return { key: "speech-intelligibility", version: 1, ratings: input.ratings, overallPercent: input.overallPercent, notes: input.notes, evaluator, assessedAt: assessedAt.toISOString() };
}
