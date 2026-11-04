import type { PsychTest } from "@/lib/types";
import { q } from "./_shared";
import { KESSLER_INSTRUCTIONS, KESSLER_SOURCE } from "./_kessler";

const k6: PsychTest = {
  slug: "k6",
  code: "K6",
  title: "مقیاس پریشانی روانشناختی کسلر (فرم ۶ سؤالی)",
  englishTitle: "Kessler Psychological Distress Scale (K6)",
  shortDescription: "فرم کوتاه ۶ سؤالی کسلر برای غربالگری سریع پریشانی روانی جدی.",
  about:
    "K6 فرم کوتاه K10 است. امتیاز ۱۳ یا بیشتر در آن نشانه‌ی احتمال پریشانی روانی جدی است و برای غربالگری سریع کاربرد دارد.",
  instructions: KESSLER_INSTRUCTIONS,
  category: "mental-health",
  audience: "بزرگسالان",
  estimatedMinutes: 2,
  version: { kind: "short", pairSlug: "k10" },
  options: [
    { label: "هیچ وقت", value: 0 },
    { label: "به‌ندرت", value: 1 },
    { label: "گاهی اوقات", value: 2 },
    { label: "بیشتر اوقات", value: 3 },
    { label: "همیشه", value: 4 },
  ],
  questions: [
    q(1, "چند وقت یک‌بار احساس عصبی بودن کرده‌اید؟"),
    q(2, "چند وقت یک‌بار احساس ناامیدی کرده‌اید؟"),
    q(3, "چند وقت یک‌بار احساس بی‌قراری یا ناآرامی کرده‌اید؟"),
    q(4, "چند وقت یک‌بار آن‌قدر افسرده بوده‌اید که هیچ چیز نمی‌توانست شادتان کند؟"),
    q(5, "چند وقت یک‌بار احساس کرده‌اید که انجام هر کاری برایتان سخت و پرزحمت است؟"),
    q(6, "چند وقت یک‌بار احساس بی‌ارزشی کرده‌اید؟"),
  ],
  scales: [
    {
      key: "total",
      title: "پریشانی روانشناختی",
      results: [
        { min: 0, max: 4, level: "normal", title: "پریشانی کم", description: "نشانه‌ای از پریشانی قابل‌توجه دیده نمی‌شود." },
        { min: 5, max: 12, level: "moderate", title: "پریشانی متوسط", description: "سطحی از پریشانی وجود دارد که ممکن است به حمایت یا مشاوره نیاز داشته باشد." },
        { min: 13, max: 24, level: "severe", title: "احتمال پریشانی روانی جدی", description: "امتیاز شما در محدوده‌ی پریشانی جدی است. ارزیابی توسط متخصص سلامت روان توصیه می‌شود." },
      ],
    },
  ],
  source: KESSLER_SOURCE,
};

export default k6;
