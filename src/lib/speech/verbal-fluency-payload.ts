import { VERBAL_FLUENCY_CATEGORIES, type VerbalFluencyStoredResult } from "./verbal-fluency-types";

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function hasOnlyKeys(v: Record<string, unknown>, keys: readonly string[]) { const a = new Set(keys); return Object.keys(v).every((k) => a.has(k)); }

export function parseVerbalFluencyPayload(input: unknown): VerbalFluencyStoredResult | null {
  if (!isRecord(input)) return null;
  const keys = ["key", "version", "category", "letter", "durationSec", "totalWords", "uniqueWords", "repetitions", "intrusions", "wordsPerMinute", "wordList", "completedAt"];
  if (!hasOnlyKeys(input, keys)) return null;
  if (input.key !== "verbal-fluency" || input.version !== 1) return null;
  if (!(VERBAL_FLUENCY_CATEGORIES as readonly string[]).includes(input.category as string)) return null;
  if (input.letter !== null && typeof input.letter !== "string") return null;
  if (typeof input.durationSec !== "number" || input.durationSec < 0 || input.durationSec > 300) return null;
  if (typeof input.totalWords !== "number" || input.totalWords < 0) return null;
  if (typeof input.uniqueWords !== "number" || input.uniqueWords < 0) return null;
  if (typeof input.repetitions !== "number" || input.repetitions < 0) return null;
  if (typeof input.intrusions !== "number" || input.intrusions < 0) return null;
  if (typeof input.wordsPerMinute !== "number" || input.wordsPerMinute < 0) return null;
  if (!Array.isArray(input.wordList) || !input.wordList.every((w) => typeof w === "string")) return null;
  if (typeof input.completedAt !== "string") return null;
  const d = new Date(input.completedAt);
  if (!Number.isFinite(d.getTime())) return null;
  return {
    key: "verbal-fluency", version: 1,
    category: input.category as VerbalFluencyStoredResult["category"],
    letter: input.letter as string | null,
    durationSec: input.durationSec as number,
    totalWords: input.totalWords as number,
    uniqueWords: input.uniqueWords as number,
    repetitions: input.repetitions as number,
    intrusions: input.intrusions as number,
    wordsPerMinute: input.wordsPerMinute as number,
    wordList: input.wordList as string[],
    completedAt: d.toISOString(),
  };
}

export function toVerbalFluencyPayload(input: Omit<VerbalFluencyStoredResult, "key" | "version">): VerbalFluencyStoredResult {
  return { key: "verbal-fluency", version: 1, ...input, completedAt: new Date(input.completedAt).toISOString() };
}
