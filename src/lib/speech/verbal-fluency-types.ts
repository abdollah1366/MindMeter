export const VERBAL_FLUENCY_CATEGORIES = ["حیوانات", "میوه‌ها", "اشیاء", "حرف (با حرف مشخص)"] as const;
export type VerbalFluencyCategory = (typeof VERBAL_FLUENCY_CATEGORIES)[number];

export const VERBAL_FLUENCY_DURATION_SEC = 60;

export type VerbalFluencyResult = {
  category: VerbalFluencyCategory;
  letter: string | null;
  durationSec: number;
  totalWords: number;
  uniqueWords: number;
  repetitions: number;
  intrusions: number;
  wordsPerMinute: number;
  wordList: string[];
  completedAt: Date;
};

export type VerbalFluencyStoredResult = {
  key: "verbal-fluency";
  version: 1;
  category: VerbalFluencyCategory;
  letter: string | null;
  durationSec: number;
  totalWords: number;
  uniqueWords: number;
  repetitions: number;
  intrusions: number;
  wordsPerMinute: number;
  wordList: string[];
  completedAt: string;
};
