import type { AudioFrame } from "./mpt-types";

export const FOIS_LEVELS = [
  { level: 1, label: "هیچ چیز از دهان دریافت نمی‌کند (NPO)" },
  { level: 2, label: "تغذیه لوله‌ای با کمی تلاش برای بلع" },
  { level: 3, label: "تغذیه لوله‌ای با ثبات در بلع" },
  { level: 4, label: "رژیم غذایی کامل با یک بافت (نرم/پوره)" },
  { level: 5, label: "رژیم غذایی کامل با چند بافت (نرم)" },
  { level: 6, label: "رژیم غذایی کامل با چند بافت (محدودیت کم)" },
  { level: 7, label: "رژیم غذایی کامل بدون محدودیت" },
] as const;

export type FoisStoredResult = {
  key: "fois";
  version: 1;
  level: number;
  notes: string | null;
  evaluator: { clinicianProfileId: string; clinicianUserId: string; kind: "PSYCHOLOGIST" | "PHYSICIAN" };
  assessedAt: string;
};
