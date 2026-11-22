import { AOS_DOMAINS, type AosStoredResult } from "./apraxia-of-speech-types";

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function hasOnlyKeys(v: Record<string, unknown>, keys: readonly string[]) { const a = new Set(keys); return Object.keys(v).every((k) => a.has(k)); }
function parseId(v: unknown): string | null { if (typeof v !== "string") return null; return /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null; }
function normalizeText(v: unknown, max: number): string | null | undefined {
  if (v === null) return null; if (typeof v !== "string") return undefined;
  const t = v.trim(); if (!t) return null; return t.length <= max ? t : undefined;
}

export function parseAosInput(input: unknown): { patientId: string; ratings: { id: string; domain: string; label: string; score: number }[]; overallSeverity: number; notes: string | null } | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["patientId", "ratings", "overallSeverity", "notes", "status"])) return null;
  if (input.status !== "FINAL") return null;
  const patientId = parseId(input.patientId);
  if (!patientId) return null;
  if (!Array.isArray(input.ratings) || input.ratings.length !== AOS_DOMAINS.length) return null;
  const ratings: { id: string; domain: string; label: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const raw of input.ratings) {
    if (!isRecord(raw)) return null;
    if (!hasOnlyKeys(raw, ["id", "domain", "label", "score"])) return null;
    const seed = AOS_DOMAINS.find((s) => s.id === raw.id);
    if (!seed) return null;
    if (seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (raw.domain !== seed.domain || raw.label !== seed.label) return null;
    if (typeof raw.score !== "number" || !Number.isInteger(raw.score) || raw.score < 0 || raw.score > 4) return null;
    ratings.push({ id: seed.id, domain: seed.domain, label: seed.label, score: raw.score });
  }
  if (AOS_DOMAINS.some((s) => !seen.has(s.id))) return null;
  ratings.sort((a, b) => AOS_DOMAINS.findIndex((s) => s.id === a.id) - AOS_DOMAINS.findIndex((s) => s.id === b.id));
  if (typeof input.overallSeverity !== "number" || !Number.isInteger(input.overallSeverity) || input.overallSeverity < 0 || input.overallSeverity > 4) return null;
  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;
  return { patientId, ratings, overallSeverity: input.overallSeverity, notes };
}

export function parseAosStored(input: unknown): AosStoredResult | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["key", "version", "ratings", "overallSeverity", "notes", "evaluator", "assessedAt"])) return null;
  if (input.key !== "apraxia-of-speech" || input.version !== 1) return null;
  if (!Array.isArray(input.ratings) || input.ratings.length !== AOS_DOMAINS.length) return null;
  const ratings: { id: string; domain: string; label: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const raw of input.ratings) {
    if (!isRecord(raw)) return null;
    if (!hasOnlyKeys(raw, ["id", "domain", "label", "score"])) return null;
    const seed = AOS_DOMAINS.find((s) => s.id === raw.id);
    if (!seed) return null;
    if (seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (raw.domain !== seed.domain || raw.label !== seed.label) return null;
    if (typeof raw.score !== "number" || !Number.isInteger(raw.score) || raw.score < 0 || raw.score > 4) return null;
    ratings.push({ id: seed.id, domain: seed.domain, label: seed.label, score: raw.score });
  }
  if (AOS_DOMAINS.some((s) => !seen.has(s.id))) return null;
  ratings.sort((a, b) => AOS_DOMAINS.findIndex((s) => s.id === a.id) - AOS_DOMAINS.findIndex((s) => s.id === b.id));
  if (typeof input.overallSeverity !== "number" || !Number.isInteger(input.overallSeverity) || input.overallSeverity < 0 || input.overallSeverity > 4) return null;
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
  return { key: "apraxia-of-speech", version: 1, ratings, overallSeverity: input.overallSeverity, notes, evaluator: { clinicianProfileId: profileId, clinicianUserId: userId, kind: input.evaluator.kind as "PSYCHOLOGIST" | "PHYSICIAN" }, assessedAt: d.toISOString() };
}

export function buildAosStored(input: { patientId: string; ratings: { id: string; domain: string; label: string; score: number }[]; overallSeverity: number; notes: string | null }, evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" }, assessedAt: Date): AosStoredResult {
  return { key: "apraxia-of-speech", version: 1, ratings: input.ratings, overallSeverity: input.overallSeverity, notes: input.notes, evaluator, assessedAt: assessedAt.toISOString() };
}
