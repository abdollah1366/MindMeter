import type { PsychTest } from "@/lib/types";
import { inCategory } from "@/lib/test-summary";
import { loadLicensedTests } from "./licensed";
import phq9 from "./phq9";
import gad7 from "./gad7";
import dass21 from "./dass21";
import dass42 from "./dass42";
import k10 from "./k10";
import k6 from "./k6";
import who5 from "./who5";
import rses from "./rses";
import ipip50 from "./ipip50";
import miniIpip from "./mini-ipip";
import intelligenceShort from "./intelligence-short";
import intelligenceLong from "./intelligence-long";
import mcpiLong from "./mcpi-long";
import mcpiShort from "./mcpi-short";
import bipolar from "./bipolar";
import strengths from "./strengths";

/** تست‌های داخل کد. تست جدید را اینجا اضافه کنید. */
const builtIn: PsychTest[] = [phq9, gad7, dass21, dass42, k10, k6, who5, rses, ipip50, miniIpip, intelligenceShort, intelligenceLong, mcpiLong, mcpiShort, bipolar, strengths];

const licensed = loadLicensedTests(builtIn);
/** خطاهای بارگذاری پرسشنامه‌های مجوزدار (در پنل ادمین نمایش داده می‌شود) */
export const licensedLoadErrors = licensed.errors;

/** همه‌ی تست‌های سایت: تست‌های داخل کد + پرسشنامه‌های مجوزدار روی سرور */
export const tests: PsychTest[] = [...builtIn, ...licensed.tests];

export function getTest(slug: string) {
  return tests.find((t) => t.slug === slug);
}

export function getTestsByCategory(category: string) {
  return tests.filter((t) => inCategory(t, category));
}

export function getFeaturedTests() {
  return tests.filter((t) => t.featured);
}
