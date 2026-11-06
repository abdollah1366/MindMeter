import type { PsychTest } from "./types";

/** اطلاعات لازم برای کارت تست؛ سؤال‌ها به مرورگر فرستاده نمی‌شوند */
export type TestSummary = Pick<PsychTest, "slug" | "code" | "title" | "shortDescription" | "category" | "alsoIn" | "estimatedMinutes" | "version"> & {
  questionCount: number;
};

export function summarize(t: PsychTest): TestSummary {
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
  };
}

export function inCategory(t: { category: string; alsoIn?: string[] }, category: string) {
  return t.category === category || (t.alsoIn ?? []).includes(category);
}
