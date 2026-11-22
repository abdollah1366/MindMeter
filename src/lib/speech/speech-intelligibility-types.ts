export const SPEECH_INTELLIGIBILITY_CONTEXTS = [
  { id: "SI1", context: "تک‌واژه‌ها", description: "وضوح تولید واج‌ها در واژه‌های منفرد" },
  { id: "SI2", context: "جملات کوتاه", description: "وضوح گفتار در جملات کوتاه" },
  { id: "SI3", context: "گفتار پیوسته", description: "وضوح گفتار در گفت‌وگوی طبیعی" },
  { id: "SI4", context: "گفتار در نویز", description: "وضوح گفتار در محیط پرسروصدا" },
] as const;

export const SI_SCALE = [
  { score: 0, label: "کاملاً نامفهوم" },
  { score: 1, label: "بسیار کم‌فهم" },
  { score: 2, label: "تا حدی فهمیدنی" },
  { score: 3, label: "عمدتاً فهمیدنی" },
  { score: 4, label: "کاملاً فهمیدنی" },
] as const;

export type SpeechIntelligibilityStoredResult = {
  key: "speech-intelligibility";
  version: 1;
  ratings: { id: string; context: string; score: number }[];
  overallPercent: number | null;
  notes: string | null;
  evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" };
  assessedAt: string;
};
