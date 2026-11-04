import type { PsychTest } from "@/lib/types";
import stress from "./stress";
import introversion from "./introversion";
import selfEsteem from "./self-esteem";
import careerInterest from "./career-interest";

/** همه‌ی تست‌های سایت. تست جدید را اینجا اضافه کنید. */
export const tests: PsychTest[] = [stress, introversion, selfEsteem, careerInterest];

export function getTest(slug: string) {
  return tests.find((t) => t.slug === slug);
}

export function getTestsByCategory(category: string) {
  return tests.filter((t) => t.category === category);
}

export function getFeaturedTests() {
  return tests.filter((t) => t.featured);
}
