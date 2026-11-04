import type { PsychTest } from "@/lib/types";
import { IPIP_OPTIONS } from "./_shared";
import { BIG_FIVE_INSTRUCTIONS, ITEMS, bigFiveScales, buildQuestions } from "./_bigfive";

const ipip50: PsychTest = {
  slug: "big-five-ipip-50",
  code: "IPIP-50",
  title: "تست پنج عامل بزرگ شخصیت (فرم ۵۰ سؤالی)",
  englishTitle: "IPIP Big-Five Factor Markers (50 items)",
  shortDescription: "سنجش پنج بعد اصلی شخصیت: برون‌گرایی، توافق‌پذیری، وجدان‌مندی، روان‌رنجوری و گشودگی.",
  about:
    "مدل پنج عامل بزرگ معتبرترین مدل علمی شخصیت است. این فرم از مجموعه‌ی بین‌المللی IPIP (گلدبرگ) است و برای هر عامل ۱۰ سؤال دارد.",
  instructions: BIG_FIVE_INSTRUCTIONS,
  category: "personality",
  featured: true,
  audience: "۱۶ سال به بالا",
  estimatedMinutes: 10,
  version: { kind: "long", pairSlug: "mini-ipip" },
  options: IPIP_OPTIONS,
  // ترتیب استاندارد ۵۰ سؤال IPIP
  questions: buildQuestions(Object.keys(ITEMS)),
  scales: bigFiveScales(10),
  source: {
    citation:
      "Goldberg LR. The development of markers for the Big-Five factor structure. Psychol Assess. 1992;4(1):26-42. / International Personality Item Pool (ipip.ori.org).",
    license: "مالکیت عمومی (Public Domain)؛ استفاده‌ی آزاد حتی تجاری",
    persianNote:
      "ترجمه‌ی کاری. بازه‌های «پایین/متوسط/بالا» بر اساس تقسیم سه‌گانه‌ی دامنه‌ی امتیاز است و هنجار جمعیت ایرانی نیست.",
  },
};

export default ipip50;
