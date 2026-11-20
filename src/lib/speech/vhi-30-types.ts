/**
 * انواع مربوط به پرسشنامه شاخص ناتوانی صوتی (VHI-30).
 *
 * این ابزار یک پرسشنامه خودگزارشی است: نه اندازهگیری آکوستیکی است، نه مجوز
 * میکروفون میخواهد و نه صوتی ضبط میکند. نتایج آن باید جدا از نتایج آزمونهای
 * اندازهگیری صوت نگه داشته شوند.
 *
 * متن تأییدشدهی فارسی VHI-30 در پروژه موجود نیست. به همین دلیل وضعیت متون
 * صریحاً «ناموجود» ثبت میشود و تا تأمین منبع معتبر، هیچ تفسیر بالینی، برچسب
 * شدت یا آستانه تشخیصی ارائه نمیشود.
 */

export type VhiDomain = "functional" | "physical" | "emotional";

export const VHI_DOMAINS: readonly VhiDomain[] = ["functional", "physical", "emotional"];

export const VHI_DOMAIN_LABELS: Record<VhiDomain, string> = {
  functional: "عملکردی",
  physical: "جسمانی",
  emotional: "هیجانی",
};

/** وضعیت متن گویه؛ تا وارد شدن منبع معتبر، تمام گویهها MISSINGاند. */
export type VhiWordingStatus = "MISSING" | "AVAILABLE";

export type VHIQuestion = {
  /** شناسه پایدار گویه: F1..F10، P1..P10، E1..E10. */
  id: string;
  domain: VhiDomain;
  text: string;
  /** ترتیب ۱ تا ۳۰ در پرسشنامه. */
  order: number;
  wordingStatus: VhiWordingStatus;
};

export type VHIAnswer = {
  questionId: string;
  /** نمرهای از ۰ تا ۴. */
  score: number;
};

/** نتیجهای که در رابط کاربری نمایش داده میشود. */
export type VHIResult = {
  functionalScore: number;
  physicalScore: number;
  emotionalScore: number;
  totalScore: number;
  completedAt: Date;
};

/** بخش قابل ذخیره نتیجه (زمان ذخیره توسط پایگاه داده ثبت میشود). */
export type Vhi30Scores = Omit<VHIResult, "completedAt">;

/** مقیاس پنج گزینهای؛ ترتیب همان ترتیب نمایش در رابط کاربری است. */
export const VHI_RESPONSE_SCALE = [
  { label: "هرگز", score: 0 },
  { label: "تقریباً هرگز", score: 1 },
  { label: "گاهی اوقات", score: 2 },
  { label: "تقریباً همیشه", score: 3 },
  { label: "همیشه", score: 4 },
] as const;

export const VHI_MIN_SCORE = 0;
export const VHI_MAX_ITEM_SCORE = 4;
export const VHI_MAX_DOMAIN_SCORE = 40;
export const VHI_MAX_TOTAL_SCORE = 120;
export const VHI_ITEM_COUNT = 30;

/**
 * تا زمانی که متون دقیق و منبع معتبرشان تأیید نشده، تفسیر بالینی فعال نمیشود.
 * هیچ کد مسیر دیگری نباید این مقدار را بهطور خودکار true کند.
 */
export const VHI_WORDING_VALIDATED = false;

export const VHI_MISSING_WORDING_TEXT =
  "متن تأییدشدهی فارسی این گویه در دسترس نیست و باید پیش از استفاده بالینی از منبع معتبر وارد شود.";

export const VHI_VALIDATION_NOTICE =
  "متون تأییدشدهی فارسی VHI-30 در پروژه موجود نیستند. ساختار پرسشنامه و محاسبه نمرهها آماده است، " +
  "اما تا وارد شدن متون معتبر و بررسی روش نمرهگذاری، نتیجه فقط برای آشنایی با ساختار ابزار است " +
  "و نباید بهعنوان نتیجه بالینی مورد استناد قرار گیرد.";

export const VHI_RESULT_EXPLANATION =
  "این امتیاز، میزان تأثیر ادراک‌شده مشکلات صوتی بر عملکرد روزمره، ویژگی‌های جسمانی صدا و وضعیت هیجانی را نشان میدهد. " +
  "تفسیر بالینی باید با توجه به شرایط فرد و ارزیابی متخصص انجام شود.";

export const VHI_NEUTRAL_NOTE =
  "این پرسشنامه تشخیص پزشکی نیست، هیچ آستانه یا برچسب شدتی ارائه نمیکند و جایگزین ارزیابی متخصص نمیشود. " +
  "نمره بالاتر به معنای تأثیر ادراکشده بیشتر روی زندگی روزمره است.";
