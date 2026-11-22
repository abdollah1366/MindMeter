import type { AudioFrame } from "./mpt-types";

export const ARTICULATION_ERROR_TYPES = ["CORRECT", "SUBSTITUTION", "OMISSION", "DISTORTION", "ADDITION", "NOT_TESTED"] as const;
export type ArticulationErrorType = (typeof ARTICULATION_ERROR_TYPES)[number];

export const ARTICULATION_ERROR_LABELS: Record<ArticulationErrorType, string> = {
  CORRECT: "صحیح",
  SUBSTITUTION: "جایگزینی",
  OMISSION: "حذف",
  DISTORTION: "اعوجاج",
  ADDITION: "افزودن",
  NOT_TESTED: "ارزیابی نشد",
};

export type ArticulationItem = {
  id: string;
  phoneme: string;
  word: string;
  position: "INITIAL" | "MEDIAL" | "FINAL";
  result: ArticulationErrorType;
};

export const ARTICULATION_ITEMS: { id: string; phoneme: string; word: string; position: "INITIAL" | "MEDIAL" | "FINAL" }[] = [
  { id: "A1", phoneme: "پ", word: "پارو", position: "INITIAL" },
  { id: "A2", phoneme: "ب", word: "باران", position: "INITIAL" },
  { id: "A3", phoneme: "ت", word: "تاپ", position: "INITIAL" },
  { id: "A4", phoneme: "د", word: "دار", position: "INITIAL" },
  { id: "A5", phoneme: "ک", word: "کتاب", position: "INITIAL" },
  { id: "A6", phoneme: "گ", word: "گربه", position: "INITIAL" },
  { id: "A7", phoneme: "ف", word: "فیل", position: "INITIAL" },
  { id: "A8", phoneme: "و", word: "وانت", position: "INITIAL" },
  { id: "A9", phoneme: "س", word: "سیب", position: "INITIAL" },
  { id: "A10", phoneme: "ز", word: "زنبور", position: "INITIAL" },
  { id: "A11", phoneme: "ش", word: "شیر", position: "INITIAL" },
  { id: "A12", phoneme: "ژ", word: "ژاله", position: "INITIAL" },
  { id: "A13", phoneme: "خ", word: "خانه", position: "INITIAL" },
  { id: "A14", phoneme: "غ", word: "غذا", position: "INITIAL" },
  { id: "A15", phoneme: "ح", word: "حوض", position: "INITIAL" },
  { id: "A16", phoneme: "ه", word: "هوا", position: "INITIAL" },
  { id: "A17", phoneme: "م", word: "ماهی", position: "INITIAL" },
  { id: "A18", phoneme: "ن", word: "نان", position: "INITIAL" },
  { id: "A19", phoneme: "ل", word: "لیوان", position: "INITIAL" },
  { id: "A20", phoneme: "ر", word: "روز", position: "INITIAL" },
  { id: "A21", phoneme: "ی", word: "یاس", position: "INITIAL" },
];

export type ArticulationSummary = {
  totalItems: number;
  correctCount: number;
  incorrectCount: number;
  notTestedCount: number;
  errorCounts: Record<ArticulationErrorType, number>;
  percentCorrect: number | null;
};

export type ArticulationStoredResult = {
  key: "articulation";
  version: 1;
  items: ArticulationItem[];
  notes: string | null;
  summary: ArticulationSummary;
  evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" };
  assessedAt: string;
};
