import { EAT10_ITEMS, EAT10_MAX_TOTAL, type Eat10StoredResult } from "./eat-10-types";
import { isEat10Complete, scoreEat10 } from "./eat-10-scoring";

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function hasOnlyKeys(v: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(v).every((k) => allowed.has(k));
}

export function parseEat10Payload(input: unknown): Eat10StoredResult | null {
  if (!isRecord(input)) return null;
  if (!hasOnlyKeys(input, ["key", "version", "answers", "totalScore", "completedAt"])) return null;
  if (input.key !== "eat-10" || input.version !== 1) return null;
  if (!Array.isArray(input.answers) || input.answers.length !== EAT10_ITEMS.length) return null;
  const answers: { id: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const raw of input.answers) {
    if (!isRecord(raw) || !hasOnlyKeys(raw, ["id", "score"])) return null;
    if (typeof raw.id !== "string" || !EAT10_ITEMS.some((i) => i.id === raw.id)) return null;
    if (seen.has(raw.id)) return null;
    seen.add(raw.id);
    if (typeof raw.score !== "number" || !Number.isInteger(raw.score) || raw.score < 0 || raw.score > 4) return null;
    answers.push({ id: raw.id, score: raw.score });
  }
  if (EAT10_ITEMS.some((i) => !seen.has(i.id))) return null;
  answers.sort((a, b) => EAT10_ITEMS.findIndex((i) => i.id === a.id) - EAT10_ITEMS.findIndex((i) => i.id === b.id));
  const map: Record<string, number> = {};
  for (const a of answers) map[a.id] = a.score;
  const expected = scoreEat10(map);
  if (input.totalScore !== expected) return null;
  if (typeof input.totalScore !== "number" || input.totalScore < 0 || input.totalScore > EAT10_MAX_TOTAL) return null;
  if (typeof input.completedAt !== "string") return null;
  const d = new Date(input.completedAt);
  if (!Number.isFinite(d.getTime())) return null;
  return { key: "eat-10", version: 1, answers, totalScore: expected, completedAt: d.toISOString() };
}

export function toEat10Payload(answers: Record<string, number>): Eat10StoredResult {
  const ordered = EAT10_ITEMS.map((item) => ({ id: item.id, score: answers[item.id] }));
  return { key: "eat-10", version: 1, answers: ordered, totalScore: scoreEat10(answers), completedAt: new Date().toISOString() };
}
