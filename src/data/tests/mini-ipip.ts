import type { PsychTest } from "@/lib/types";
import { IPIP_OPTIONS } from "./_shared";
import { BIG_FIVE_INSTRUCTIONS, bigFiveScales, buildQuestions } from "./_bigfive";

const miniIpip: PsychTest = {
  slug: "mini-ipip",
  code: "Mini-IPIP",
  title: "تست پنج عامل بزرگ شخصیت (فرم کوتاه ۲۰ سؤالی)",
  englishTitle: "Mini-IPIP (20 items)",
  shortDescription: "فرم کوتاه و معتبر تست پنج عامل شخصیت؛ برای هر عامل ۴ سؤال.",
  about:
    "Mini-IPIP نسخه‌ی کوتاه ۲۰ سؤالی IPIP-50 است. اعتبار آن در پژوهش‌های متعدد تأیید شده و برای ارزیابی سریع شخصیت مناسب است.",
  instructions: BIG_FIVE_INSTRUCTIONS,
  category: "personality",
  audience: "۱۶ سال به بالا",
  estimatedMinutes: 4,
  version: { kind: "short", pairSlug: "big-five-ipip-50" },
  options: IPIP_OPTIONS,
  questions: buildQuestions([
    "Am the life of the party.",
    "Sympathize with others' feelings.",
    "Get chores done right away.",
    "Have frequent mood swings.",
    "Have a vivid imagination.",
    "Don't talk a lot.",
    "Am not interested in other people's problems.",
    "Often forget to put things back in their proper place.",
    "Am relaxed most of the time.",
    "Am not interested in abstract ideas.",
    "Talk to a lot of different people at parties.",
    "Feel others' emotions.",
    "Like order.",
    "Get upset easily.",
    "Have difficulty understanding abstract ideas.",
    "Keep in the background.",
    "Am not really interested in others.",
    "Make a mess of things.",
    "Seldom feel blue.",
    "Do not have a good imagination.",
  ]),
  scales: bigFiveScales(4),
  source: {
    citation:
      "Donnellan MB, Oswald FL, Baird BM, Lucas RE. The Mini-IPIP scales: tiny-yet-effective measures of the Big Five factors of personality. Psychol Assess. 2006;18(2):192-203.",
    license: "مالکیت عمومی (Public Domain)؛ استفاده‌ی آزاد حتی تجاری",
    persianNote:
      "ترجمه‌ی کاری. بازه‌های «پایین/متوسط/بالا» بر اساس تقسیم سه‌گانه‌ی دامنه‌ی امتیاز است و هنجار جمعیت ایرانی نیست.",
  },
};

export default miniIpip;
