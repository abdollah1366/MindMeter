import { SSI4_CONCOMITANTS, type Ssi4StoredResult } from "./ssi-4-types";

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function hasOnlyKeys(v: Record<string, unknown>, keys: readonly string[]) { const a = new Set(keys); return Object.keys(v).every((k) => a.has(k)); }
function parseId(v: unknown): string | null { if (typeof v !== "string") return null; return /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null; }
function normalizeText(v: unknown, max: number): string | null | undefined {
  if (v === null) return null; if (typeof v !== "string") return undefined;
  const t = v.trim(); if (!t) return null; return t.length <= max ? t : undefined;
}

export function parseSsi4Input(input: unknown): { patientId: string; frequencyPercent: number; longestDurationSec: number; concomitants: { id: string; label: string; score: number }[]; overallSeverity: number; notes: string | null } | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["patientId", "frequencyPercent", "longestDurationSec", "concomitants", "overallSeverity", "notes", "status"])) return null;
  if (input.status !== "FINAL") return null;
  const patientId = parseId(input.patientId);
  if (!patientId) return null;
  if (typeof input.frequencyPercent !== "number" || !Number.isInteger(input.frequencyPercent) || input.frequencyPercent < 0 || input.frequencyPercent > 100) return null;
  if (typeof input.longestDurationSec !== "number" || input.longestDurationSec < 0 || input.longestDurationSec > 60) return null;
  if (!Array.isArray(input.concomitants) || input.concomitants.length !== SSI4_CONCOMITANTS.length) return null;
  const concomitants: { id: string; label: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const raw of input.concomitants) {
    if (!isRecord(raw)) return null;
    if (!hasOnlyKeys(raw, ["id", "label", "score"])) return null;
    const seed = SSI4_CONCOMITANTS.find((s) => s.id === raw.id);
    if (!seed) return null;
    if (seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (raw.label !== seed.label) return null;
    if (typeof raw.score !== "number" || !Number.isInteger(raw.score) || raw.score < 0 || raw.score > 5) return null;
    concomitants.push({ id: seed.id, label: seed.label, score: raw.score });
  }
  if (SSI4_CONCOMITANTS.some((s) => !seen.has(s.id))) return null;
  concomitants.sort((a, b) => SSI4_CONCOMITANTS.findIndex((s) => s.id === a.id) - SSI4_CONCOMITANTS.findIndex((s) => s.id === b.id));
  if (typeof input.overallSeverity !== "number" || !Number.isInteger(input.overallSeverity) || input.overallSeverity < 1 || input.overallSeverity > 5) return null;
  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;
  return { patientId, frequencyPercent: input.frequencyPercent, longestDurationSec: input.longestDurationSec, concomitants, overallSeverity: input.overallSeverity, notes };
}

export function parseSsi4Stored(input: unknown): Ssi4StoredResult | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["key", "version", "frequencyPercent", "longestDurationSec", "concomitants", "totalScore", "severity", "notes", "evaluator", "assessedAt"])) return null;
  if (input.key !== "ssi-4" || input.version !== 1) return null;
  if (typeof input.frequencyPercent !== "number" || input.frequencyPercent < 0 || input.frequencyPercent > 100) return null;
  if (typeof input.longestDurationSec !== "number" || input.longestDurationSec < 0) return null;
  if (!Array.isArray(input.concomitants) || input.concomitants.length !== SSI4_CONCOMITANTS.length) return null;
  const concomitants: { id: string; label: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const raw of input.concomitants) {
    if (!isRecord(raw)) return null;
    if (!hasOnlyKeys(raw, ["id", "label", "score"])) return null;
    const seed = SSI4_CONCOMITANTS.find((s) => s.id === raw.id);
    if (!seed) return null;
    if (seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (raw.label !== seed.label) return null;
    if (typeof raw.score !== "number" || !Number.isInteger(raw.score) || raw.score < 0 || raw.score > 5) return null;
    concomitants.push({ id: seed.id, label: seed.label, score: raw.score });
  }
  if (SSI4_CONCOMITANTS.some((s) => !seen.has(s.id))) return null;
  concomitants.sort((a, b) => SSI4_CONCOMITANTS.findIndex((s) => s.id === a.id) - SSI4_CONCOMITANTS.findIndex((s) => s.id === b.id));
  if (typeof input.totalScore !== "number") return null;
  if (!["VERY_MILD", "MILD", "MODERATE", "SEVERE", "VERY_SEVERE"].includes(input.severity as string)) return null;
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
    key: "ssi-4", version: 1,
    frequencyPercent: input.frequencyPercent as number,
    longestDurationSec: input.longestDurationSec as number,
    concomitants,
    totalScore: input.totalScore as number,
    severity: input.severity as Ssi4StoredResult["severity"],
    notes,
    evaluator: { clinicianProfileId: profileId, clinicianUserId: userId, kind: input.evaluator.kind as "PSYCHOLOGIST" | "PHYSICIAN" },
    assessedAt: d.toISOString(),
  };
}

export function buildSsi4Stored(input: { patientId: string; frequencyPercent: number; longestDurationSec: number; concomitants: { id: string; label: string; score: number }[]; overallSeverity: number; notes: string | null }, evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" }, assessedAt: Date): Ssi4StoredResult {
  const severityMap: Ssi4StoredResult["severity"][] = ["VERY_MILD", "MILD", "MODERATE", "SEVERE", "VERY_SEVERE"];
  return {
    key: "ssi-4", version: 1,
    frequencyPercent: input.frequencyPercent,
    longestDurationSec: input.longestDurationSec,
    concomitants: input.concomitants,
    totalScore: input.overallSeverity,
    severity: severityMap[input.overallSeverity - 1],
    notes: input.notes,
    evaluator,
    assessedAt: assessedAt.toISOString(),
  };
}
