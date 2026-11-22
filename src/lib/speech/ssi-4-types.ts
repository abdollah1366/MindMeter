export const SSI4_CONCOMITANTS = [
  { id: "C1", label: "صداهای مزاحم (مثل کلیک، خمیازه)", description: "صداهای غیرگفتاری همراه با لکنت" },
  { id: "C2", label: "گریماس صورت", description: "تغییرات غیرارادی در عضلات صورت" },
  { id: "C3", label: "حرکات سر", description: "حرکات غیرارادی سر هنگام لکنت" },
  { id: "C4", label: "حرکات اندام‌ها", description: "حرکات غیرارادی دست/پا هنگام لکنت" },
] as const;

export type Ssi4StoredResult = {
  key: "ssi-4";
  version: 1;
  frequencyPercent: number;
  longestDurationSec: number;
  concomitants: { id: string; label: string; score: number }[];
  totalScore: number;
  severity: "VERY_MILD" | "MILD" | "MODERATE" | "SEVERE" | "VERY_SEVERE";
  notes: string | null;
  evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" };
  assessedAt: string;
};

export const SSI4_SEVERITY_LABELS: Record<Ssi4StoredResult["severity"], string> = {
  VERY_MILD: "بسیار خفیف",
  MILD: "خفیف",
  MODERATE: "متوسط",
  SEVERE: "شدید",
  VERY_SEVERE: "بسیار شدید",
};
