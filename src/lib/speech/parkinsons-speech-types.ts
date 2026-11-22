export const PARKINSON_DOMAINS = [
  { id: "P1", domain: "monopitch", label: "تک‌گامی صوت", description: "کاهش تغییرات فرکانس صوت" },
  { id: "P2", domain: "monoloudness", label: "تک‌بلندی", description: "کاهش تغییرات شدت صوت" },
  { id: "P3", domain: "reduced_stress", label: "کاهش تأکید", description: "کاهش تأکید و ریتم طبیعی" },
  { id: "P4", domain: "imprecise_consonants", label: "تلفظ نادقیق", description: "تلفظ نادقیق واج‌ها" },
  { id: "P5", domain: "inappropriate_silences", label: "مکث‌های نامناسب", description: "مکث‌های غیرمنتظره در گفتار" },
  { id: "P6", domain: "harsh_voice", label: "خشونت صوت", description: "خشونت یا زبری صوت" },
  { id: "P7", domain: "breathy_voice", label: "نفس‌آلودگی", description: "نفس‌آلودگی صوت" },
  { id: "P8", domain: "intelligibility", label: "وضوح", description: "میزان فهمیدنی بودن گفتار" },
] as const;

export const PARKINSON_SCALE = [
  { score: 0, label: "طبیعی" },
  { score: 1, label: "خفیف" },
  { score: 2, label: "متوسط" },
  { score: 3, label: "شدید" },
  { score: 4, label: "بسیار شدید" },
] as const;

export type ParkinsonStoredResult = {
  key: "parkinsons-speech";
  version: 1;
  ratings: { id: string; domain: string; label: string; score: number }[];
  overallSeverity: number;
  notes: string | null;
  evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" };
  assessedAt: string;
};
