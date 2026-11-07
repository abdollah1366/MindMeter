import type { PsychTest } from "./types";

/** اطلاعات لازم برای کارت تست؛ سؤال‌ها به مرورگر فرستاده نمی‌شوند */
export type TestSummary = Pick<PsychTest, "slug" | "code" | "title" | "shortDescription" | "category" | "alsoIn" | "estimatedMinutes" | "version"> & {
  questionCount: number;
  /** تعداد دفعات انجام (آمار عمومی) */
  taken?: number;
  /** قیمت به تومان (۰ یا خالی = رایگان) */
  price?: number;
};

export function summarize(t: PsychTest, taken?: number, price?: number): TestSummary {
  return {
    slug: t.slug,
    code: t.code,
    title: t.title,
    shortDescription: t.shortDescription,
    category: t.category,
    alsoIn: t.alsoIn,
    estimatedMinutes: t.estimatedMinutes,
    version: t.version,
    questionCount: t.questions.length,
    ...(taken ? { taken } : {}),
    ...(price ? { price } : {}),
  };
}

export function inCategory(t: { category: string; alsoIn?: string[] }, category: string) {
  return t.category === category || (t.alsoIn ?? []).includes(category);
}

/** عدد با جداکننده‌ی هزارگان و رقم فارسی، مثلاً ۱٬۲۳۴ */
export function faCount(n: number) {
  return n.toLocaleString("fa-IR");
}
