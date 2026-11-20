/**
 * انواع و متن‌های نمایشی مقیاس ادراکی GRBAS.
 *
 * این فایل هیچ محاسبه‌ی خودکاری انجام نمی‌دهد و به داده‌ی آکوستیکی وابسته نیست.
 * GRBAS یک مقیاس درجه‌بندی شنیداری‑ادراکی است که فقط توسط ارزیاب آموزش‌دیده
 * هیچ مؤلفه‌ای از روی تحلیل آکوستیکی صوت ساخته نمی‌شود و نمره‌ی کلی
 * نمی‌شود و هیچ نمره‌ی کلی از جمع پنج مؤلفه محاسبه نمی‌گردد.
 *
 * توضیحات فارسی این فایل برای راهنمایی رابط کاربری نوشته شده‌اند و تعریف رسمی،
 * ترجمه‌ی اعتبارسنجی‌شده یا نسخه‌ی فارسی استاندارد مقیاس نیستند.
 */

export const GRBAS_COMPONENT_KEYS = ["G", "R", "B", "A", "S"] as const;
export type GrbasComponentKey = (typeof GRBAS_COMPONENT_KEYS)[number];

/** امتیاز هر مؤلفه مستقل و در بازه‌ی ۰ تا ۳ است. */
export type GrbasScores = Record<GrbasComponentKey, number>;

export type GrbasComponent = {
  key: GrbasComponentKey;
  title: string;
  titleEn: string;
  description: string;
  /** توضیح کوتاه هر سطح برای رابط کاربری؛ تعریف رسمی مقیاس نیست. */
  levels: readonly [string, string, string, string];
};

export const GRBAS_COMPONENTS: readonly GrbasComponent[] = [
  {
    key: "G",
    title: "درجه‌ی کلی اختلال",
    titleEn: "Grade",
    description: "درجه‌ی کلی انحراف کیفیت صوت نسبت به صدای بهنجار.",
    levels: ["بدون انحراف قابل ادراک", "انحراف خفیف", "انحراف متوسط", "انحراف شدید"],
  },
  {
    key: "R",
    title: "زبری صوت",
    titleEn: "Roughness",
    description: "میزان خشونت یا ناهمواری ادراکی صدا.",
    levels: ["بدون زبری قابل ادراک", "زبری خفیف", "زبری متوسط", "زبری شدید"],
  },
  {
    key: "B",
    title: "نفس‌آلودگی صوت",
    titleEn: "Breathiness",
    description: "میزان شنیده‌شدن جریان هوا در صدا.",
    levels: ["بدون نفس‌آلودگی قابل ادراک", "نفس‌آلودگی خفیف", "نفس‌آلودگی متوسط", "نفس‌آلودگی شدید"],
  },
  {
    key: "A",
    title: "ضعف یا بی‌حالی صوت",
    titleEn: "Asthenia",
    description: "میزان ضعف، سستی یا کم‌توانی ادراکی صدا.",
    levels: ["بدون ضعف قابل ادراک", "ضعف خفیف", "ضعف متوسط", "ضعف شدید"],
  },
  {
    key: "S",
    title: "فشار یا تلاش صوتی",
    titleEn: "Strain",
    description: "میزان فشار یا تلاشی که در تولید صدا شنیده می‌شود.",
    levels: ["بدون فشار قابل ادراک", "فشار خفیف", "فشار متوسط", "فشار شدید"],
  },
];

export const GRBAS_MIN_SCORE = 0;
export const GRBAS_MAX_SCORE = 3;
export const GRBAS_FORM_VERSION = 1;

/** منبع نمونه‌ی شنیداری که ارزیاب بر اساس آن درجه‌بندی کرده است. */
export const GRBAS_SAMPLE_SOURCES = [
  "IN_PERSON",
  "PATIENT_FILE",
  "EXTERNAL_RECORDING",
  "OTHER",
] as const;
export type GrbasSampleSource = (typeof GRBAS_SAMPLE_SOURCES)[number];

export const GRBAS_SAMPLE_SOURCE_LABELS: Record<GrbasSampleSource, string> = {
  IN_PERSON: "ارزیابی حضوری نمونه‌ی گفتار",
  PATIENT_FILE: "نمونه‌ی صوتی موجود در پرونده‌ی مراجع",
  EXTERNAL_RECORDING: "نمونه‌ی ضبط‌شده بیرون از سامانه",
  OTHER: "سایر منابع (با توضیح ارزیاب)",
};

/** نوع حرفه‌ی ارزیاب؛ از پروفایل تأییدشده‌ی متخصص خوانده می‌شود. */
export const GRBAS_EVALUATOR_KINDS = ["PSYCHOLOGIST", "PHYSICIAN"] as const;
export type GrbasEvaluatorKind = (typeof GRBAS_EVALUATOR_KINDS)[number];

export const GRBAS_EVALUATOR_KIND_LABELS: Record<GrbasEvaluatorKind, string> = {
  PSYCHOLOGIST: "روان‌شناس",
  PHYSICIAN: "پزشک",
};

/** وضعیت ذخیره؛ در این نسخه فقط ارزیابی کامل و نهایی ذخیره می‌شود. */
export type GrbasStatus = "FINAL";

export const GRBAS_UI_NOTE =
  "توضیحات فارسی این صفحه برای راهنمایی در رابط کاربری نوشته شده‌اند و تعریف رسمی، ترجمه‌ی اعتبارسنجی‌شده یا نسخه‌ی فارسی استاندارد مقیاس نیستند.";

export const GRBAS_CLINICAL_NOTE =
  "این ارزیابی ادراکی است و به‌تنهایی جایگزین ارزیابی جامع بالینی، تشخیص پزشکی یا توصیه‌ی درمانی نمی‌شود.";

export const GRBAS_NO_AUDIO_NOTE =
  "در این نسخه هیچ فایل صوتی در سامانه بارگذاری یا ذخیره نمی‌شود؛ فقط منبع نمونه و امتیازهای ثبت‌شده نگه‌داری می‌شوند.";

export const GRBAS_NO_TOTAL_NOTE =
  "پنج مؤلفه مستقل‌اند و جمع یا میانگین آن‌ها به‌عنوان نمره‌ی کلی محاسبه نمی‌شود.";
