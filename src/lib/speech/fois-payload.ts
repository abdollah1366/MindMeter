import { FOIS_LEVELS, type FoisStoredResult } from "./fois-types";

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function hasOnlyKeys(v: Record<string, unknown>, keys: readonly string[]) { const allowed = new Set(keys); return Object.keys(v).every((k) => allowed.has(k)); }
function parseId(v: unknown): string | null { if (typeof v !== "string") return null; return /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null; }
function normalizeText(v: unknown, max: number): string | null | undefined {
  if (v === null) return null; if (typeof v !== "string") return undefined;
  const t = v.trim(); if (!t) return null; return t.length <= max ? t : undefined;
}

export function parseFoisInput(input: unknown): { patientId: string; level: number; notes: string | null } | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["patientId", "level", "notes", "status"])) return null;
  if (input.status !== "FINAL") return null;
  const patientId = parseId(input.patientId);
  if (!patientId) return null;
  if (typeof input.level !== "number" || !Number.isInteger(input.level) || input.level < 1 || input.level > 7) return null;
  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;
  return { patientId, level: input.level, notes };
}

export function parseFoisStored(input: unknown): FoisStoredResult | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["key", "version", "level", "notes", "evaluator", "assessedAt"])) return null;
  if (input.key !== "fois" || input.version !== 1) return null;
  if (typeof input.level !== "number" || !Number.isInteger(input.level) || input.level < 1 || input.level > 7) return null;
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
  return { key: "fois", version: 1, level: input.level, notes, evaluator: { clinicianProfileId: profileId, clinicianUserId: userId, kind: input.evaluator.kind as "PSYCHOLOGIST" | "PHYSICIAN" }, assessedAt: d.toISOString() };
}

export function buildFoisStored(input: { patientId: string; level: number; notes: string | null }, evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" }, assessedAt: Date): FoisStoredResult {
  return { key: "fois", version: 1, level: input.level, notes: input.notes, evaluator, assessedAt: assessedAt.toISOString() };
}
