export const CLINICAL_SWALLOWING_DOMAINS = [
  { id: "S1", domain: "oral_phase", label: "فاز دهانی", description: "آماده‌سازی و کنترل بولوس در دهان" },
  { id: "S2", domain: "pharyngeal_phase", label: "فاز حلقی", description: "انتقال بولوس و محافظت راه هوایی" },
  { id: "S3", domain: "aspiration_risk", label: "خطر آسپیراسیون", description: "احتمال ورود مواد به راه هوایی" },
  { id: "S4", domain: "diet_modification", label: "اصلاح رژیم", description: "نیاز به تغییر بافت غذا/مایع" },
  { id: "S5", domain: "positioning", label: "وضعیت بدن", description: "نیاز به وضعیت خاص هنگام بلع" },
  { id: "S6", domain: "overall", label: "شدت کلی", description: "شدت کلی اختلال بلع" },
] as const;

export const CLINICAL_SWALLOWING_SCALE = [
  { score: 0, label: "طبیعی" },
  { score: 1, label: "خفیف" },
  { score: 2, label: "متوسط" },
  { score: 3, label: "شدید" },
  { score: 4, label: "بسیار شدید" },
] as const;

export type ClinicalSwallowingStoredResult = {
  key: "clinical-swallowing";
  version: 1;
  ratings: { id: string; domain: string; label: string; score: number }[];
  overallSeverity: number;
  notes: string | null;
  evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" };
  assessedAt: string;
};
