export const AOS_DOMAINS = [
  { id: "A1", domain: "groping", label: "جستجوی حرکتی", description: "حرکات جستجوگر قبل از تولید واج" },
  { id: "A2", domain: "inconsistent", label: "خطاهای ناسازگار", description: "تغییر خطا در تکرارهای متوالی" },
  { id: "A3", domain: "initiation", label: "دشواری شروع", description: "دشواری در آغاز حرکات گفتاری" },
  { id: "A4", domain: "automatic", label: "گفتار خودکار", description: "تفاوت گفتار خودکار و ارادی" },
  { id: "A5", domain: "prosody", label: "پروزودی", description: "ریتم و تأکید غیرطبیعی" },
  { id: "A6", domain: "overall", label: "شدت کلی", description: "شدت کلی آپراکسی گفتار" },
] as const;

export const AOS_SCALE = [
  { score: 0, label: "طبیعی" },
  { score: 1, label: "خفیف" },
  { score: 2, label: "متوسط" },
  { score: 3, label: "شدید" },
  { score: 4, label: "بسیار شدید" },
] as const;

export type AosStoredResult = {
  key: "apraxia-of-speech";
  version: 1;
  ratings: { id: string; domain: string; label: string; score: number }[];
  overallSeverity: number;
  notes: string | null;
  evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" };
  assessedAt: string;
};
