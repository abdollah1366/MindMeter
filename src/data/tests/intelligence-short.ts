import type { PsychTest } from "@/lib/types";
import { INTELLIGENCE_SOURCE, WECHSLER_NOTE, choice, domainScales, g, matrixItem, seriesItem, totalScale } from "./_intelligence";

/**
 * تست هوش کوتاه مایندمتر (MMI-24)
 * ۸ سؤال در هر بخش، از ساده به دشوار. فرم بلند: intelligence-long.ts
 */
const intelligenceShort: PsychTest = {
  slug: "intelligence-short",
  code: "MMI-24",
  title: "تست هوش کوتاه مایندمتر",
  englishTitle: "MindMeter Intelligence Test – Short Form (MMI-24)",
  kind: "ability",
  version: { kind: "short", pairSlug: "intelligence-long" },
  shortDescription: "سنجش ۲۰ دقیقه‌ای توان استدلال تصویری، عددی و کلامی، با مقایسه با هم‌سن‌ها و راهنمای ارجاع برای آزمون وکسلر.",
  about:
    "این تست ۲۴ سؤال در سه بخش دارد: ماتریس‌های تصویری (کشف الگو)، دنباله‌های عددی و استدلال کلامی (قیاس، دسته‌بندی، منطق و ضرب‌المثل). سؤال‌ها در سه سطح ساده، متوسط و دشوار هستند. نتیجه‌ی شما با شرکت‌کنندگان هم‌سن و هم‌جنس مقایسه می‌شود. این تست جایگزین آزمون رسمی هوش مثل وکسلر نیست؛ برای دقت بیشتر فرم بلند (۱۰۸ سؤال) را انجام دهید.",
  instructions: "برای هر سؤال گزینه‌ی درست را انتخاب کنید. اگر جواب را نمی‌دانید، «نمی‌دانم» را بزنید.",
  category: "intelligence",
  featured: true,
  audience: "۱۶ سال به بالا",
  estimatedMinutes: 20,
  options: [],
  questions: [
    // ── ماتریس‌ها ──
    matrixItem(
      "s-m1",
      "easy",
      [g("circle", 1), g("circle", 2), g("circle", 3), g("square", 1), g("square", 2), g("square", 3), g("triangle", 1), g("triangle", 2), null],
      [g("triangle", 2), g("triangle", 3), g("square", 3), g("triangle", 3, "empty")],
      1,
    ),
    matrixItem(
      "s-m2",
      "easy",
      [
        g("circle", 1, "solid"), g("square", 1, "solid"), g("triangle", 1, "solid"),
        g("circle", 1, "empty"), g("square", 1, "empty"), g("triangle", 1, "empty"),
        g("circle", 1, "striped"), g("square", 1, "striped"), null,
      ],
      [g("triangle", 1, "solid"), g("square", 1, "striped"), g("triangle", 1, "striped"), g("circle", 1, "striped")],
      2,
    ),
    matrixItem(
      "s-m3",
      "easy",
      [g("circle", 1), g("square", 2), g("triangle", 3), g("square", 2), g("triangle", 3), g("circle", 1), g("triangle", 3), g("circle", 1), null],
      [g("square", 3), g("triangle", 2), g("circle", 1), g("square", 2)],
      3,
    ),
    matrixItem(
      "s-m4",
      "medium",
      [g("circle", 1), g("circle", 2), g("circle", 3), g("square", 2), g("square", 1), g("square", 3), g("diamond", 1), g("diamond", 3), null],
      [g("diamond", 4), g("diamond", 3), g("square", 4), g("diamond", 2)],
      0,
    ),
    matrixItem(
      "s-m5",
      "medium",
      [
        g("arrow", 1, "solid", 0), g("arrow", 1, "solid", 90), g("arrow", 1, "solid", 180),
        g("arrow", 1, "solid", 90), g("arrow", 1, "solid", 180), g("arrow", 1, "solid", 270),
        g("arrow", 1, "solid", 180), g("arrow", 1, "solid", 270), null,
      ],
      [g("arrow", 1, "solid", 90), g("arrow", 1, "solid", 180), g("arrow", 1, "solid", 270), g("arrow", 1, "solid", 0)],
      3,
    ),
    matrixItem(
      "s-m6",
      "medium",
      [
        g("circle", 1, "solid"), g("square", 2, "empty"), g("triangle", 3, "striped"),
        g("square", 1, "striped"), g("triangle", 2, "solid"), g("circle", 3, "empty"),
        g("triangle", 1, "empty"), g("circle", 2, "striped"), null,
      ],
      [g("square", 3, "empty"), g("square", 3, "solid"), g("square", 2, "solid"), g("triangle", 3, "solid"), g("circle", 3, "solid")],
      1,
    ),
    matrixItem(
      "s-m7",
      "hard",
      [
        g("arrow", 1, "empty", 0), g("arrow", 1, "empty", 45), g("arrow", 1, "empty", 90),
        g("arrow", 1, "empty", 0), g("arrow", 1, "empty", 90), g("arrow", 1, "empty", 180),
        g("arrow", 1, "empty", 0), g("arrow", 1, "empty", 135), null,
      ],
      [g("arrow", 1, "empty", 180), g("arrow", 1, "empty", 225), g("arrow", 1, "empty", 270), g("arrow", 1, "empty", 90)],
      2,
    ),
    matrixItem(
      "s-m8",
      "hard",
      [
        g("circle", 1, "solid"), g("square", 2, "empty"), g("triangle", 3, "striped"),
        g("triangle", 3, "empty"), g("circle", 1, "striped"), g("square", 2, "solid"),
        g("square", 2, "striped"), g("triangle", 3, "solid"), null,
      ],
      [g("circle", 1, "solid"), g("circle", 3, "empty"), g("square", 1, "empty"), g("circle", 1, "empty"), g("circle", 2, "striped")],
      3,
    ),

    // ── دنباله‌های عددی ──
    seriesItem("s-n1", "easy", [2, 4, 6, 8], 10, [12, 9, 16]),
    seriesItem("s-n2", "easy", [3, 6, 12, 24], 48, [36, 30, 27]),
    seriesItem("s-n3", "easy", [20, 17, 14, 11], 8, [9, 7, 10]),
    seriesItem("s-n4", "medium", [1, 4, 9, 16, 25], 36, [30, 35, 49]),
    seriesItem("s-n5", "medium", [2, 3, 5, 8, 12], 17, [16, 18, 15]),
    seriesItem("s-n6", "medium", [1, 1, 2, 3, 5, 8], 13, [11, 12, 16]),
    seriesItem("s-n7", "hard", [5, 10, 8, 16, 14], 28, [12, 18, 32]),
    seriesItem("s-n8", "hard", [2, 6, 7, 21, 22], 66, [23, 44, 63]),

    // ── استدلال کلامی ──
    choice("s-v1", "verbal", "easy", "«گرم» به «سرد» مثل «بالا» به ...؟", ["بلند", "پایین", "آسمان", "کوه"], 1),
    choice("s-v2", "verbal", "easy", "«پرنده» به «لانه» مثل «زنبور» به ...؟", ["گل", "عسل", "کندو", "باغ"], 2),
    choice("s-v3", "verbal", "easy", "کدام واژه با بقیه هم‌گروه نیست؟", ["سیب", "پرتقال", "هویج", "انگور"], 2),
    choice("s-v4", "verbal", "medium", "«نویسنده» به «کتاب» مثل «آهنگساز» به ...؟", ["ساز", "قطعه‌ی موسیقی", "خواننده", "کنسرت"], 1),
    choice("s-v5", "verbal", "medium", "کدام واژه با بقیه هم‌گروه نیست؟", ["ثروت", "صداقت", "مهربانی", "شجاعت"], 0),
    choice("s-v6", "verbal", "medium",
      "علی از رضا بلندتر است. رضا از مینا بلندتر است. مینا از سارا بلندتر است. کوتاه‌ترین نفر کیست؟",
      ["سارا", "مینا", "رضا", "نمی‌توان گفت"],
      0,
    ),
    choice("s-v7", "verbal", "hard",
      "«همه‌ی گل‌ها گیاه هستند. بعضی گیاهان خار دارند.» بر اساس این دو جمله، کدام گزینه قطعاً درست است؟",
      ["بعضی گل‌ها خار دارند.", "همه‌ی گل‌ها خار دارند.", "هیچ گلی خار ندارد.", "هیچ‌کدام از این جمله‌ها قطعاً درست نیست."],
      3,
    ),
    choice("s-v8", "verbal", "hard",
      "معنای ضرب‌المثل «آب که از سر گذشت، چه یک نی چه صد نی» به کدام گزینه نزدیک‌تر است؟",
      [
        "باید پیش از رسیدن خطر چاره‌اندیشی کرد.",
        "وقتی آسیب از حدی گذشت، کمی بیشتر یا کمتر شدنش تفاوتی ندارد.",
        "صبر و حوصله کلید موفقیت است.",
        "کار هر کس را باید به خودش سپرد.",
      ],
      1,
    ),
  ],
  scales: [totalScale(24), ...domainScales(8)],
  resultNote: WECHSLER_NOTE,
  source: INTELLIGENCE_SOURCE,
};

export default intelligenceShort;
