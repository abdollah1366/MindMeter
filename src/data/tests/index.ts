import type { PsychTest } from "@/lib/types";
import stress from "./stress";
import introversion from "./introversion";

/** همه‌ی تست‌های سایت. تست جدید را اینجا اضافه کنید. */
export const tests: PsychTest[] = [stress, introversion];

export function getTest(slug: string) {
  return tests.find((t) => t.slug === slug);
}
