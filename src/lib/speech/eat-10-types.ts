import type { AudioFrame } from "./mpt-types";

export const EAT10_ITEMS: { id: string; text: string }[] = [
  { id: "E1", text: "مشکل بلعم باعث کاهش وزن من شده است." },
  { id: "E2", text: "مشکل بلعم باعث می‌شود کمتر برای غذا خوردن بیرون بروم." },
  { id: "E3", text: "نوشیدن مایعات برایم تلاش اضافی می‌برد." },
  { id: "E4", text: "خوردن غذاهای جامد برایم تلاش اضافی می‌برد." },
  { id: "E5", text: "بلعیدن قرص‌ها برایم تلاش اضافی می‌برد." },
  { id: "E6", text: "بلع برایم دردناک است." },
  { id: "E7", text: "لذت خوردن غذا به‌خاطر مشکل بلعم کاهش یافته است." },
  { id: "E8", text: "هنگام بلع، غذا در گلویم گیر می‌کند." },
  { id: "E9", text: "هنگام غذا خوردن سرفه می‌کنم." },
  { id: "E10", text: "بلع برایم استرس‌زا است." },
];

export const EAT10_SCALE = [
  { label: "بدون مشکل", score: 0 },
  { label: "مشکل خفیف", score: 1 },
  { label: "مشکل متوسط", score: 2 },
  { label: "مشکل شدید", score: 3 },
  { label: "مشکل خیلی شدید", score: 4 },
] as const;

export const EAT10_MAX_TOTAL = 40;
export const EAT10_ITEM_COUNT = 10;
export const EAT10_CUTOFF = 3; // >= 3 suggests dysphagia

export type Eat10Answers = Record<string, number>;

export type Eat10Result = {
  totalScore: number;
  completedAt: Date;
};

export type Eat10StoredResult = {
  key: "eat-10";
  version: 1;
  answers: { id: string; score: number }[];
  totalScore: number;
  completedAt: string;
};
