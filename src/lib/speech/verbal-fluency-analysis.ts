import { VERBAL_FLUENCY_DURATION_SEC, type VerbalFluencyCategory } from "./verbal-fluency-types";

export type VerbalFluencyAnalysis = {
  totalWords: number;
  uniqueWords: number;
  repetitions: number;
  intrusions: number;
  wordsPerMinute: number;
  wordList: string[];
};

export function analyzeVerbalFluency(
  rawText: string,
  durationSec: number,
  validSet?: Set<string> | null,
): VerbalFluencyAnalysis {
  const tokens = rawText
    .split(/[\s,،;؛.。]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  let repetitions = 0;
  let intrusions = 0;
  const wordList: string[] = [];
  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (seen.has(normalized)) { repetitions++; continue; }
    seen.add(normalized);
    if (validSet && !validSet.has(normalized)) intrusions++;
    wordList.push(token);
  }
  const uniqueWords = wordList.length;
  const wordsPerMinute = durationSec > 0 ? Math.round((uniqueWords / durationSec) * 60) : 0;
  return { totalWords: tokens.length, uniqueWords, repetitions, intrusions, wordsPerMinute, wordList };
}
