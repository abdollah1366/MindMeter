import { PICTURE_NAMING_ITEMS, PICTURE_NAMING_RESULTS, type PictureNamingResult, type PictureNamingStoredResult } from "./picture-naming-types";

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function hasOnlyKeys(v: Record<string, unknown>, keys: readonly string[]) { const a = new Set(keys); return Object.keys(v).every((k) => a.has(k)); }
function parseId(v: unknown): string | null { if (typeof v !== "string") return null; return /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null; }
function normalizeText(v: unknown, max: number): string | null | undefined {
  if (v === null) return null; if (typeof v !== "string") return undefined;
  const t = v.trim(); if (!t) return null; return t.length <= max ? t : undefined;
}

function computeSummary(items: { id: string; target: string; category: string; result: PictureNamingResult }[]) {
  const totalItems = items.length;
  const correctCount = items.filter((i) => i.result === "CORRECT").length;
  const incorrectCount = items.filter((i) => i.result === "INCORRECT").length;
  const noResponseCount = items.filter((i) => i.result === "NO_RESPONSE").length;
  const notTestedCount = items.filter((i) => i.result === "NOT_TESTED").length;
  const testedCount = totalItems - notTestedCount;
  const percentCorrect = testedCount > 0 ? Math.round((correctCount / testedCount) * 100) : null;
  return { totalItems, correctCount, incorrectCount, noResponseCount, notTestedCount, percentCorrect };
}

export function parsePictureNamingInput(input: unknown): { patientId: string; items: { id: string; target: string; category: string; result: PictureNamingResult }[]; notes: string | null } | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["patientId", "items", "notes", "status"])) return null;
  if (input.status !== "FINAL") return null;
  const patientId = parseId(input.patientId);
  if (!patientId) return null;
  if (!Array.isArray(input.items) || input.items.length !== PICTURE_NAMING_ITEMS.length) return null;
  const items: { id: string; target: string; category: string; result: PictureNamingResult }[] = [];
  const seen = new Set<string>();
  for (const raw of input.items) {
    if (!isRecord(raw)) return null;
    if (!hasOnlyKeys(raw, ["id", "target", "category", "result"])) return null;
    const seed = PICTURE_NAMING_ITEMS.find((s) => s.id === raw.id);
    if (!seed) return null;
    if (seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (raw.target !== seed.target || raw.category !== seed.category) return null;
    if (!(PICTURE_NAMING_RESULTS as readonly string[]).includes(raw.result as string)) return null;
    items.push({ id: seed.id, target: seed.target, category: seed.category, result: raw.result as PictureNamingResult });
  }
  if (PICTURE_NAMING_ITEMS.some((s) => !seen.has(s.id))) return null;
  items.sort((a, b) => PICTURE_NAMING_ITEMS.findIndex((s) => s.id === a.id) - PICTURE_NAMING_ITEMS.findIndex((s) => s.id === b.id));
  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;
  return { patientId, items, notes };
}

export function parsePictureNamingStored(input: unknown): PictureNamingStoredResult | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["key", "version", "items", "notes", "summary", "evaluator", "assessedAt"])) return null;
  if (input.key !== "picture-naming" || input.version !== 1) return null;
  if (!Array.isArray(input.items) || input.items.length !== PICTURE_NAMING_ITEMS.length) return null;
  const items: { id: string; target: string; category: string; result: PictureNamingResult }[] = [];
  const seen = new Set<string>();
  for (const raw of input.items) {
    if (!isRecord(raw)) return null;
    if (!hasOnlyKeys(raw, ["id", "target", "category", "result"])) return null;
    const seed = PICTURE_NAMING_ITEMS.find((s) => s.id === raw.id);
    if (!seed) return null;
    if (seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (raw.target !== seed.target || raw.category !== seed.category) return null;
    if (!(PICTURE_NAMING_RESULTS as readonly string[]).includes(raw.result as string)) return null;
    items.push({ id: seed.id, target: seed.target, category: seed.category, result: raw.result as PictureNamingResult });
  }
  if (PICTURE_NAMING_ITEMS.some((s) => !seen.has(s.id))) return null;
  items.sort((a, b) => PICTURE_NAMING_ITEMS.findIndex((s) => s.id === a.id) - PICTURE_NAMING_ITEMS.findIndex((s) => s.id === b.id));
  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;
  if (!isRecord(input.summary)) return null;
  const summary = computeSummary(items);
  if (!isRecord(input.evaluator)) return null;
  if (!hasOnlyKeys(input.evaluator, ["clinicianProfileId", "clinicianUserId", "kind"])) return null;
  const profileId = parseId(input.evaluator.clinicianProfileId);
  const userId = parseId(input.evaluator.clinicianUserId);
  if (!profileId || !userId) return null;
  if (input.evaluator.kind !== "PSYCHOLOGIST" && input.evaluator.kind !== "PHYSICIAN") return null;
  if (typeof input.assessedAt !== "string") return null;
  const d = new Date(input.assessedAt);
  if (!Number.isFinite(d.getTime())) return null;
  return { key: "picture-naming", version: 1, items, notes, summary, evaluator: { clinicianProfileId: profileId, clinicianUserId: userId, kind: input.evaluator.kind as "PSYCHOLOGIST" | "PHYSICIAN" }, assessedAt: d.toISOString() };
}

export function buildPictureNamingStored(input: { patientId: string; items: { id: string; target: string; category: string; result: PictureNamingResult }[]; notes: string | null }, evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" }, assessedAt: Date): PictureNamingStoredResult {
  return { key: "picture-naming", version: 1, items: input.items, notes: input.notes, summary: computeSummary(input.items), evaluator, assessedAt: assessedAt.toISOString() };
}
