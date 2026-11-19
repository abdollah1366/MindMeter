/**
 * محتوای آزمون توجه و تمرکز d2 (تألیف مایندمتر).
 *
 * ساختار استاندارد: ۱۴ ردیف × ۴۷ محرک، ۲۰ ثانیه برای هر ردیف.
 * هدف فقط حرف «d» است که در مجموع دقیقاً دو خط کوتاه در بالا یا پایین داشته باشد.
 * حرف «p» هرگز هدف نیست، حتی اگر دو خط داشته باشد.
 *
 * همه‌ی محرک‌ها با seed قطعی ساخته می‌شوند تا مرورگر و سرور دقیقاً یک ردیف را
 * بازسازی کنند. seed در پاسخ‌ها ذخیره می‌شود و گزارش از روی آن دوباره ساخته می‌شود.
 */
import type { AnswerOption } from "@/lib/types";

export const D2_ROWS = 14;
export const D2_COLS = 47;
export const D2_ROW_SECONDS = 20;
export const D2_TOTAL_SECONDS = D2_ROWS * D2_ROW_SECONDS;
export const D2_TARGETS_PER_ROW = 6;

export const D2_PRACTICE_COLS = 15;
export const D2_PRACTICE_TARGETS = 2;

export type D2Cell = {
  letter: "d" | "p";
  /** تعداد خط‌های بالای حرف (۰ تا ۴) */
  top: number;
  /** تعداد خط‌های پایین حرف (۰ تا ۴) */
  bottom: number;
  /** هدف: d با دقیقاً دو خط در مجموع */
  target: boolean;
};

export type D2Row = {
  /** شماره‌ی ردیف؛ در ردیف تمرینی صفر است */
  index: number;
  cells: D2Cell[];
};

/** گزینه‌های داخلی هر ردیف: مقدار پاسخ برابر تعداد محرک پردازش‌شده (TN) است. */
export const D2_ROW_OPTIONS: AnswerOption[] = Array.from({ length: D2_COLS + 1 }, (_, value) => ({
  label: value === 0 ? "بدون پاسخ" : `${value} خانه`,
  value,
}));

/** PRNG قطعی (mulberry32)؛ همان seed همان توالی را می‌سازد. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCell(letter: "d" | "p", totalDashes: number, random: () => number): D2Cell {
  const top = Math.floor(random() * (totalDashes + 1));
  const bottom = totalDashes - top;
  return { letter, top, bottom, target: letter === "d" && totalDashes === 2 };
}

function buildRow(index: number, cols: number, targetCount: number, random: () => number): D2Row {
  const targetPositions = new Set<number>();
  while (targetPositions.size < targetCount) {
    targetPositions.add(Math.floor(random() * cols));
  }

  const cells: D2Cell[] = [];
  for (let col = 0; col < cols; col++) {
    if (targetPositions.has(col)) {
      cells.push(makeCell("d", 2, random));
      continue;
    }
    // غیرهدف: d با ۱، ۳ یا ۴ خط، یا p با ۱ تا ۴ خط
    const letter: "d" | "p" = random() < 0.55 ? "d" : "p";
    const totals = letter === "d" ? [1, 3, 4] : [1, 2, 3, 4];
    const total = totals[Math.floor(random() * totals.length)];
    cells.push(makeCell(letter, total, random));
  }

  return { index, cells };
}

/** ۱۴ ردیف اصلی آزمون؛ خروجی برای یک seed همیشه یکسان است. */
export function generateD2Rows(seed: number): D2Row[] {
  const random = seededRandom(seed);
  return Array.from({ length: D2_ROWS }, (_, i) => buildRow(i + 1, D2_COLS, D2_TARGETS_PER_ROW, random));
}

/** ردیف تمرینی کوتاه و بدون زمان با دو هدف مشخص. */
export function generateD2PracticeRow(seed: number): D2Row {
  const random = seededRandom((seed ^ 0x9e3779b9) >>> 0);
  return buildRow(0, D2_PRACTICE_COLS, D2_PRACTICE_TARGETS, random);
}

/** بررسی بیت شماره‌ی index در ماسک کلیک‌ها (بدون محدودیت ۳۲ بیتی). */
export function hasBit(mask: number, index: number): boolean {
  return Math.floor(mask / 2 ** index) % 2 === 1;
}

/** ساخت ماسک از اندیس خانه‌های کلیک‌شده. */
export function maskFromIndices(indices: Iterable<number>): number {
  let mask = 0;
  for (const index of indices) if (!hasBit(mask, index)) mask += 2 ** index;
  return mask;
}

/** اندیس خانه‌های کلیک‌شده از روی ماسک. */
export function indicesFromMask(mask: number, cols = D2_COLS): number[] {
  const out: number[] = [];
  for (let i = 0; i < cols; i++) if (hasBit(mask, i)) out.push(i);
  return out;
}

/** بزرگ‌ترین خانه‌ی کلیک‌شده؛ اگر هیچ خانه‌ای کلیک نشده باشد ۱-. */
export function highestSetBit(mask: number, cols = D2_COLS): number {
  for (let i = cols - 1; i >= 0; i--) if (hasBit(mask, i)) return i;
  return -1;
}

/** تعداد کل پردازش هر ردیف: آخرین خانه‌ی کلیک‌شده + ۱. */
export function tnFromMask(mask: number, cols = D2_COLS): number {
  const highest = highestSetBit(mask, cols);
  return highest < 0 ? 0 : highest + 1;
}

/** فهرست ۱۰ شاخص اصلی آزمون برای صفحه‌ی معرفی و گزارش. */
export const D2_INDEX_META = [
  {
    code: "TN",
    title: "تعداد کل پردازش",
    description: "تعداد محرک‌های بررسی‌شده در ۱۴ ردیف؛ نشان‌دهنده‌ی سرعت پیشروی و حجم فعالیت.",
  },
  {
    code: "TP",
    title: "پاسخ‌های صحیح",
    description: "تعداد نشانه‌های هدفی که درست شناسایی و انتخاب شده‌اند.",
  },
  {
    code: "E1",
    title: "خطای حذف",
    description: "تعداد نشانه‌های هدفی که در محدوده‌ی پردازش‌شده از قلم افتاده‌اند.",
  },
  {
    code: "E2",
    title: "خطای ارتکاب",
    description: "تعداد محرک‌های غیرهدفی که به‌اشتباه انتخاب شده‌اند.",
  },
  {
    code: "E",
    title: "مجموع خطاها",
    description: "مجموع خطاهای حذف و ارتکاب در تمام ردیف‌ها.",
  },
  {
    code: "TN-E",
    title: "کارکرد مؤثر",
    description: "تعداد محرک‌های پردازش‌شده منهای مجموع خطاها.",
  },
  {
    code: "CP",
    title: "نمره تمرکز",
    description: "پاسخ‌های صحیح منهای خطاهای ارتکاب؛ هماهنگی سرعت و دقت را نشان می‌دهد.",
  },
  {
    code: "FR",
    title: "نرخ نوسان",
    description: "تفاوت بیشترین و کمترین تعداد پردازش در ردیف‌ها؛ ثبات عملکرد را می‌سنجد.",
  },
  {
    code: "IPS",
    title: "سرعت پردازش",
    description: "تعداد محرک پردازش‌شده در هر ثانیه در کل ۲۸۰ ثانیه‌ی آزمون.",
  },
  {
    code: "ACC",
    title: "دقت",
    description: "نسبت پاسخ‌های صحیح به مجموع پاسخ‌های صحیح و خطاها.",
  },
] as const;

export const D2_FEATURES = [
  "اجرای آنلاین و رایگان",
  "ساختار استاندارد ۱۴ ردیفی",
  "زمان‌بندی ۲۰ ثانیه برای هر ردیف",
  "ثبت و تحلیل عملکرد هر ۱۴ ردیف",
  "محاسبه‌ی ۱۰ شاخص توجه و تمرکز",
  "گزارش تفسیری جامع فارسی و قابل چاپ",
] as const;

export const D2_TIPS = [
  "آزمون را در محیطی آرام، با نور مناسب و به‌دور از سروصدا انجام دهید.",
  "زمانی آزمون را شروع کنید که خسته یا خواب‌آلوده نیستید.",
  "از واضح بودن نمایشگر و آماده بودن دستگاه مطمئن شوید.",
  "فقط حرف d با دقیقاً دو خط کوتاه در مجموع هدف است؛ p هرگز هدف نیست.",
  "مرحله‌ی تمرینی را با دقت انجام دهید تا با نوع محرک‌ها آشنا شوید.",
  "سریع و دقیق پاسخ دهید؛ هم سرعت و هم دقت در نتیجه اثر دارند.",
  "آزمون را بدون وقفه و مستقل از کمک دیگران انجام دهید.",
] as const;
