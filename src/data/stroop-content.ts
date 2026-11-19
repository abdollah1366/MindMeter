/**
 * محتوای آزمون استروب فارسی (تألیف مایندمتر).
 *
 * تمام محرک ها بهصورت قطعی (deterministic) ساخته می شوند تا سرور و مرورگر
 * دقیقاً همان ترتیب را نمایش دهند و نتیجهی ذخیرشده قابل بازسازی باشد.
 * این فایل فقط حاوی داده است و وابستگی سمتسرور ندارد.
 */

export type StroopColor = { key: string; hex: string; value: number };

/** چهار رنگ پاسخ. زرد با تیرگی متوسط انتخاب شده تا هم زرد دیده شود و روی زمینهی روشن خوانا بماند. */
export const STROOP_COLORS: StroopColor[] = [
  { key: "قرمز", hex: "#dc2626", value: 1 },
  { key: "آبی", hex: "#2563eb", value: 2 },
  { key: "سبز", hex: "#15803d", value: 3 },
  { key: "زرد", hex: "#eab308", value: 4 },
];

/** گزینههای چهارگانه که هم در اجرا و هم در اعتبارسنجی تست استفاده می شوند. */
export const STROOP_OPTIONS = STROOP_COLORS.map((c) => ({ label: c.key, value: c.value }));

/**
 * رنگ جوهر را از نام رنگ میگیرد تا کارت های ذخیرهشده در دیتابیس هم با پالت جدید
 * مطابقت داشته باشند و نیازی به بهروزرسانی دیتا نباشد.
 */
export function stroopInkHex(ink: string, fallback: string): string {
  return STROOP_COLORS.find((c) => c.key === ink)?.hex ?? fallback;
}

/** واژه های هیجانی منفی در بخش دوم آزمون. */
export const STROOP_EMOTIONAL_WORDS = [
  "خون",
  "مرگ",
  "ترس",
  "درد",
  "تنهایی",
  "شکست",
  "خشم",
  "گریه",
  "بیماری",
  "نفرت",
  "اضطراب",
  "جنگ",
];

/** واژه های خنثی و ملموس بهعنوان زمینهی مقایسه در بخش هیجانی. */
export const STROOP_NEUTRAL_WORDS = [
  "کتاب",
  "میز",
  "صندلی",
  "درخت",
  "پنجره",
  "مداد",
  "کاغذ",
  "خانه",
  "دوچرخه",
  "فنجان",
  "کفش",
  "ساعت",
];

export type StroopMode = "classic" | "emotional";

/** مشخصات یک محرک استروب. پاسخ درست همیشه «رنگ جوهر» است. */
export type StroopSpec = {
  id: string;
  word: string;
  ink: string;
  inkHex: string;
  answer: number;
  level: "easy" | "medium" | "hard";
  mode: StroopMode;
  /** فقط در حالت کلاسیک: آیا معنای واژه با رنگ جوهر برابر است */
  congruent?: boolean;
  /** فقط در حالت هیجانی: آیا واژه هیجانی است (در برابر خنثی) */
  emotional?: boolean;
};

/**
 * محرک های حالت کلاسیک رنگ واژه.
 * یکسوم کارتها همنخوان (congruent) و بقیه ناهمنخوان (incongruent)اند.
 * در کارت ناهمنخوان رنگ جوهر با جابجایی ۲ یا ۳ رنگ متفاوت می شود تا همان رنگ نباشد.
 */
export function classicSpecs(count: number, prefix: string): StroopSpec[] {
  const out: StroopSpec[] = [];
  for (let i = 0; i < count; i++) {
    const wordColor = STROOP_COLORS[i % STROOP_COLORS.length];
    const congruent = i % 3 === 0;
    const inkIndex = congruent ? i % STROOP_COLORS.length : (i % STROOP_COLORS.length + 1 + (i % 3)) % STROOP_COLORS.length;
    const ink = STROOP_COLORS[inkIndex];
    out.push({
      id: `${prefix}${i + 1}`,
      word: wordColor.key,
      ink: ink.key,
      inkHex: ink.hex,
      answer: ink.value,
      level: congruent ? "easy" : "hard",
      mode: "classic",
      congruent,
    });
  }
  return out;
}

/** محرک های حالت هیجانی: نیمی واژه هیجانی و نیمی خنثی، با رنگ جوهر متغیر. */
export function emotionalSpecs(count: number, prefix: string): StroopSpec[] {
  const out: StroopSpec[] = [];
  for (let i = 0; i < count; i++) {
    const emotional = i % 2 === 0;
    const list = emotional ? STROOP_EMOTIONAL_WORDS : STROOP_NEUTRAL_WORDS;
    const word = list[Math.floor(i / 2) % list.length];
    const ink = STROOP_COLORS[(i + 2) % STROOP_COLORS.length];
    out.push({
      id: `${prefix}${i + 1}`,
      word,
      ink: ink.key,
      inkHex: ink.hex,
      answer: ink.value,
      level: emotional ? "hard" : "easy",
      mode: "emotional",
      emotional,
    });
  }
  return out;
}

/** ۱۵ کارت تمرینی کلاسیک + ۱۵ کارت تمرینی هیجانی (بدون نمرهدهی). */
export const STROOP_PRACTICE: StroopSpec[] = [
  ...classicSpecs(15, "pc"),
  ...emotionalSpecs(15, "pe"),
];
