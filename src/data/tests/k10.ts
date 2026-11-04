import type { PsychTest } from "@/lib/types";
import { q } from "./_shared";
import { KESSLER_INSTRUCTIONS, KESSLER_SOURCE } from "./_kessler";

const k10: PsychTest = {
  slug: "k10",
  code: "K10",
  title: "مقیاس پریشانی روانشناختی کسلر (فرم ۱۰ سؤالی)",
  englishTitle: "Kessler Psychological Distress Scale (K10)",
  shortDescription: "سنجش میزان پریشانی روانی (اضطراب و افسردگی) در یک ماه گذشته.",
  about:
    "K10 ابزاری جهانی برای سنجش پریشانی روانشناختی غیراختصاصی است و در پیمایش‌های سلامت ملی بسیاری از کشورها به کار می‌رود.",
  instructions: KESSLER_INSTRUCTIONS,
  category: "mental-health",
  audience: "بزرگسالان",
  estimatedMinutes: 3,
  version: { kind: "long", pairSlug: "k6" },
  options: [
    { label: "هیچ وقت", value: 1 },
    { label: "به‌ندرت", value: 2 },
    { label: "گاهی اوقات", value: 3 },
    { label: "بیشتر اوقات", value: 4 },
    { label: "همیشه", value: 5 },
  ],
  questions: [
    q(1, "چند وقت یک‌بار بدون دلیل موجه احساس خستگی کرده‌اید؟"),
    q(2, "چند وقت یک‌بار احساس عصبی بودن کرده‌اید؟"),
    q(3, "چند وقت یک‌بار آن‌قدر عصبی بوده‌اید که هیچ چیز نمی‌توانست آرامتان کند؟"),
    q(4, "چند وقت یک‌بار احساس ناامیدی کرده‌اید؟"),
    q(5, "چند وقت یک‌بار احساس بی‌قراری یا ناآرامی کرده‌اید؟"),
    q(6, "چند وقت یک‌بار آن‌قدر بی‌قرار بوده‌اید که نمی‌توانستید آرام بنشینید؟"),
    q(7, "چند وقت یک‌بار احساس افسردگی کرده‌اید؟"),
    q(8, "چند وقت یک‌بار احساس کرده‌اید که انجام هر کاری برایتان سخت و پرزحمت است؟"),
    q(9, "چند وقت یک‌بار آن‌قدر غمگین بوده‌اید که هیچ چیز نمی‌توانست شادتان کند؟"),
    q(10, "چند وقت یک‌بار احساس بی‌ارزشی کرده‌اید؟"),
  ],
  scales: [
    {
      key: "total",
      title: "پریشانی روانشناختی",
      results: [
        { min: 10, max: 15, level: "normal", title: "پریشانی کم", description: "احتمالاً حال روانی شما در وضعیت مناسبی است." },
        { min: 16, max: 21, level: "mild", title: "پریشانی متوسط", description: "سطحی از پریشانی وجود دارد. مراقبت از خود و پایش وضعیت توصیه می‌شود." },
        { min: 22, max: 29, level: "high", title: "پریشانی زیاد", description: "پریشانی قابل‌توجه است. مشورت با متخصص سلامت روان توصیه می‌شود." },
        { min: 30, max: 50, level: "severe", title: "پریشانی بسیار زیاد", description: "پریشانی شدید است. لطفاً هر چه زودتر با روانشناس یا روانپزشک مشورت کنید." },
      ],
    },
  ],
  source: KESSLER_SOURCE,
};

export default k10;
