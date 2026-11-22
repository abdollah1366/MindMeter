export const DYSARTHRIA_DOMAINS = [
  { id: "D1", domain: "respiration", label: "تنفس", description: "کفایت تنفسی برای گفتار" },
  { id: "D2", domain: "phonation", label: "آواسازی", description: "کیفیت و قدرت صوت" },
  { id: "D3", domain: "resonance", label: "رزونانس", description: "تعادل رزونانس دهانی-بینی" },
  { id: "D4", domain: "articulation", label: "تلفظ", description: "صحت تولید واج‌ها" },
  { id: "D5", domain: "prosody", label: "پروزودی", description: "ریتم، تأکید و آهنگ گفتار" },
  { id: "D6", domain: "intelligibility", label: "وضوح", description: "میزان فهمیدنی بودن گفتار" },
] as const;

export const DYSARTHRIA_SCALE = [
  { score: 0, label: "طبیعی" },
  { score: 1, label: "خفیف" },
  { score: 2, label: "متوسط" },
  { score: 3, label: "شدید" },
  { score: 4, label: "بسیار شدید" },
] as const;

export const DYSARTHRIA_SEVERITY_LABELS = ["طبیعی", "خفیف", "متوسط", "شدید", "بسیار شدید"] as const;

export type DysarthriaStoredResult = {
  key: "dysarthria";
  version: 1;
  ratings: { id: string; domain: string; label: string; score: number }[];
  overallSeverity: number;
  notes: string | null;
  evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" };
  assessedAt: string;
};
