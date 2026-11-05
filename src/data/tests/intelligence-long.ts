import type { PsychTest } from "@/lib/types";
import { INTELLIGENCE_SOURCE, WECHSLER_NOTE, buildMatrices, buildSeries, buildVerbal, domainScales, totalScale } from "./_intelligence";

/**
 * تست هوش بلند مایندمتر (MMI-108)
 * ۳۶ ماتریس، ۳۶ دنباله‌ی عددی و ۳۶ سؤال کلامی؛ هر بخش ۱۲ ساده، ۱۲ متوسط و ۱۲ دشوار.
 * ماتریس‌ها و دنباله‌ها از روی قاعده ساخته می‌شوند (src/data/tests/_intelligence.ts).
 */
const questions = [...buildMatrices("l-m"), ...buildSeries("l-n"), ...buildVerbal("l-v")];

const intelligenceLong: PsychTest = {
  slug: "intelligence-long",
  code: "MMI-108",
  title: "تست هوش بلند مایندمتر",
  englishTitle: "MindMeter Intelligence Test – Long Form (MMI-108)",
  kind: "ability",
  version: { kind: "long", pairSlug: "intelligence-short" },
  shortDescription: "۱۰۸ سؤال در سه سطح ساده، متوسط و دشوار برای سنجش دقیق‌تر استدلال تصویری، عددی و کلامی، با مقایسه با هم‌سن‌ها.",
  about:
    "فرم بلند تست هوش مایندمتر سه بخش ۳۶ سؤالی دارد: ماتریس‌های تصویری، دنباله‌های عددی و استدلال کلامی (قیاس، دسته‌بندی، واژگان، منطق و ضرب‌المثل). در هر بخش ۱۲ سؤال ساده، ۱۲ متوسط و ۱۲ دشوار وجود دارد. به دلیل تعداد بیشتر سؤال، نتیجه‌ی آن از فرم کوتاه دقیق‌تر است. پیشرفت شما در مرورگر ذخیره می‌شود و می‌توانید بعداً ادامه دهید. این تست جایگزین آزمون رسمی هوش مثل وکسلر نیست.",
  instructions: "برای هر سؤال گزینه‌ی درست را انتخاب کنید. اگر جواب را نمی‌دانید، «نمی‌دانم» را بزنید.",
  category: "intelligence",
  featured: false,
  audience: "۱۶ سال به بالا",
  estimatedMinutes: 60,
  options: [],
  questions,
  scales: [totalScale(108), ...domainScales(36)],
  resultNote: WECHSLER_NOTE,
  source: INTELLIGENCE_SOURCE,
};

export default intelligenceLong;
