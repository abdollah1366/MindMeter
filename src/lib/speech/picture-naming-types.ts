export const PICTURE_NAMING_ITEMS: { id: string; target: string; category: string }[] = [
  { id: "PN1", target: "سیب", category: "میوه" },
  { id: "PN2", target: "ماهی", category: "حیوان" },
  { id: "PN3", target: "کتاب", category: "اشیاء" },
  { id: "PN4", target: "ماشین", category: "وسایل نقلیه" },
  { id: "PN5", target: "گل", category: "گیاه" },
  { id: "PN6", target: "سگ", category: "حیوان" },
  { id: "PN7", target: "کفش", category: "پوشاک" },
  { id: "PN8", target: "ساعت", category: "اشیاء" },
  { id: "PN9", target: "پرنده", category: "حیوان" },
  { id: "PN10", target: "درخت", category: "گیاه" },
  { id: "PN11", target: "چتر", category: "اشیاء" },
  { id: "PN12", target: "کلاه", category: "پوشاک" },
  { id: "PN13", target: "گیتار", category: "اشیاء" },
  { id: "PN14", target: "قطار", category: "وسایل نقلیه" },
  { id: "PN15", target: "پروانه", category: "حیوان" },
  { id: "PN16", target: "کلید", category: "اشیاء" },
  { id: "PN17", target: "قاشق", category: "اشیاء" },
  { id: "PN18", target: "پنجره", category: "اشیاء" },
  { id: "PN19", target: "کوه", category: "طبیعت" },
  { id: "PN20", target: "رودخانه", category: "طبیعت" },
];

export const PICTURE_NAMING_RESULTS = ["CORRECT", "INCORRECT", "NO_RESPONSE", "NOT_TESTED"] as const;
export type PictureNamingResult = (typeof PICTURE_NAMING_RESULTS)[number];

export const PICTURE_NAMING_RESULT_LABELS: Record<PictureNamingResult, string> = {
  CORRECT: "صحیح",
  INCORRECT: "نادرست",
  NO_RESPONSE: "بدون پاسخ",
  NOT_TESTED: "ارزیابی نشد",
};

export type PictureNamingStoredResult = {
  key: "picture-naming";
  version: 1;
  items: { id: string; target: string; category: string; result: PictureNamingResult }[];
  notes: string | null;
  summary: { totalItems: number; correctCount: number; incorrectCount: number; noResponseCount: number; notTestedCount: number; percentCorrect: number | null };
  evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" };
  assessedAt: string;
};
