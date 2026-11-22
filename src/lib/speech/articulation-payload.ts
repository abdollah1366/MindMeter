import { ARTICULATION_ERROR_TYPES, ARTICULATION_ITEMS, type ArticulationErrorType, type ArticulationItem, type ArticulationStoredResult, type ArticulationSummary } from "./articulation-types";

const INPUT_KEYS = ["patientId", "items", "notes", "status"] as const;
const STORED_KEYS = ["key", "version", "items", "notes", "summary", "evaluator", "assessedAt"] as const;
const ITEM_KEYS = ["id", "phoneme", "word", "position", "result"] as const;
const EVALUATOR_KEYS = ["clinicianProfileId", "clinicianUserId", "kind"] as const;

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function hasOnlyKeys(v: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(v).every((k) => allowed.has(k));
}
function parseId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null;
}
function normalizeText(v: unknown, max: number): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return null;
  return t.length <= max ? t : undefined;
}

export function computeArticulationSummary(items: ArticulationItem[]): ArticulationSummary {
  const errorCounts: Record<ArticulationErrorType, number> = {
    CORRECT: 0, SUBSTITUTION: 0, OMISSION: 0, DISTORTION: 0, ADDITION: 0, NOT_TESTED: 0,
  };
  for (const item of items) errorCounts[item.result]++;
  const totalItems = items.length;
  const correctCount = errorCounts.CORRECT;
  const notTestedCount = errorCounts.NOT_TESTED;
  const incorrectCount = totalItems - correctCount - notTestedCount;
  const testedCount = totalItems - notTestedCount;
  const percentCorrect = testedCount > 0 ? Math.round((correctCount / testedCount) * 100) : null;
  return { totalItems, correctCount, incorrectCount, notTestedCount, errorCounts, percentCorrect };
}

export function parseArticulationInput(input: unknown): { patientId: string; items: ArticulationItem[]; notes: string | null } | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, INPUT_KEYS)) return null;
  if (input.status !== "FINAL") return null;
  const patientId = parseId(input.patientId);
  if (!patientId) return null;
  if (!Array.isArray(input.items) || input.items.length !== ARTICULATION_ITEMS.length) return null;

  const items: ArticulationItem[] = [];
  const seen = new Set<string>();
  for (const raw of input.items) {
    if (!isRecord(raw)) return null;
    if (!hasOnlyKeys(raw, ITEM_KEYS)) return null;
    const seed = ARTICULATION_ITEMS.find((s) => s.id === raw.id);
    if (!seed) return null;
    if (seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (typeof raw.phoneme !== "string" || raw.phoneme !== seed.phoneme) return null;
    if (typeof raw.word !== "string" || raw.word !== seed.word) return null;
    if (raw.position !== seed.position) return null;
    if (!(ARTICULATION_ERROR_TYPES as readonly string[]).includes(raw.result as string)) return null;
    items.push({ id: seed.id, phoneme: seed.phoneme, word: seed.word, position: seed.position, result: raw.result as ArticulationErrorType });
  }
  if (ARTICULATION_ITEMS.some((s) => !seen.has(s.id))) return null;
  items.sort((a, b) => ARTICULATION_ITEMS.findIndex((s) => s.id === a.id) - ARTICULATION_ITEMS.findIndex((s) => s.id === b.id));

  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;

  return { patientId, items, notes };
}

export function parseArticulationStored(input: unknown): ArticulationStoredResult | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, STORED_KEYS)) return null;
  if (input.key !== "articulation" || input.version !== 1) return null;

  if (!Array.isArray(input.items) || input.items.length !== ARTICULATION_ITEMS.length) return null;
  const items: ArticulationItem[] = [];
  const seen = new Set<string>();
  for (const raw of input.items) {
    if (!isRecord(raw)) return null;
    if (!hasOnlyKeys(raw, ITEM_KEYS)) return null;
    const seed = ARTICULATION_ITEMS.find((s) => s.id === raw.id);
    if (!seed) return null;
    if (seen.has(seed.id)) return null;
    seen.add(seed.id);
    if (raw.phoneme !== seed.phoneme || raw.word !== seed.word || raw.position !== seed.position) return null;
    if (!(ARTICULATION_ERROR_TYPES as readonly string[]).includes(raw.result as string)) return null;
    items.push({ id: seed.id, phoneme: seed.phoneme, word: seed.word, position: seed.position, result: raw.result as ArticulationErrorType });
  }
  if (ARTICULATION_ITEMS.some((s) => !seen.has(s.id))) return null;
  items.sort((a, b) => ARTICULATION_ITEMS.findIndex((s) => s.id === a.id) - ARTICULATION_ITEMS.findIndex((s) => s.id === b.id));

  const notes = normalizeText(input.notes, 2000);
  if (notes === undefined) return null;

  if (!isRecord(input.summary)) return null;
  // recompute summary to avoid tampering
  const summary = computeArticulationSummary(items);

  if (!isRecord(input.evaluator)) return null;
  if (!hasOnlyKeys(input.evaluator, EVALUATOR_KEYS)) return null;
  const profileId = parseId(input.evaluator.clinicianProfileId);
  const userId = parseId(input.evaluator.clinicianUserId);
  if (!profileId || !userId) return null;
  if (input.evaluator.kind !== "PSYCHOLOGIST" && input.evaluator.kind !== "PHYSICIAN") return null;

  if (typeof input.assessedAt !== "string") return null;
  const assessedAt = new Date(input.assessedAt);
  if (!Number.isFinite(assessedAt.getTime())) return null;

  return {
    key: "articulation",
    version: 1,
    items,
    notes,
    summary,
    evaluator: { clinicianProfileId: profileId, clinicianUserId: userId, kind: input.evaluator.kind as "PSYCHOLOGIST" | "PHYSICIAN" },
    assessedAt: assessedAt.toISOString(),
  };
}

export function buildArticulationStored(
  input: { patientId: string; items: ArticulationItem[]; notes: string | null },
  evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" },
  assessedAt: Date,
): ArticulationStoredResult {
  return {
    key: "articulation",
    version: 1,
    items: input.items,
    notes: input.notes,
    summary: computeArticulationSummary(input.items),
    evaluator,
    assessedAt: assessedAt.toISOString(),
  };
}
