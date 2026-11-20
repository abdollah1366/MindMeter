/**
 * تعریف اولیه‌ی دسته‌بندی‌ها و آزمون‌های ماژول «ارزیابی گفتار و زبان».
 *
 * این فایل منبع داده‌ی seed است و عمداً از رابط کاربری جدا نگه داشته شده است.
 * صفحه‌ی /speech داده را از دیتابیس می‌خواند تا فعال‌سازی هر آزمون در آینده
 * بدون تغییر سایر آزمون‌ها ممکن باشد.
 *
 * فقط آزمون MPT فعال شده است؛ بقیه با وضعیت COMING_SOON باقی میمانند.
 */
import type { SpeechAssessmentType, SpeechStatus } from "../lib/speech";

export type SpeechCategorySeed = {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  icon: string;
  color: string;
  order: number;
};

export type SpeechAssessmentSeed = {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  assessmentType: SpeechAssessmentType;
  method: string;
  status: SpeechStatus;
  published: boolean;
  order: number;
  categorySlug: string;
  /** ابزار استاندارد بیرونی؛ پیش از فعال‌سازی نیازمند بررسی حقوقی/مجوز است. */
  requiresRightsReview: boolean;
  rightsNote?: string;
  /** کلید پیاده‌سازی آینده؛ فعلاً خالی است. */
  implementationKey?: string;
  /** مسیر صفحه‌ی اجرای آینده؛ تا زمان فعال‌شدن خالی می‌ماند. */
  implementationPath?: string;
  /** فراداده‌ی آینده به صورت JSON string (دستورالعمل، معیار ورود، گزارش و ...). */
  metadata?: string;
};

const RIGHTS_NOTE = "ابزار استاندارد بیرونی؛ استفاده، ترجمه و انطباق فرهنگی نیازمند بررسی حقوقی و مجوز است.";

export const speechCategories: SpeechCategorySeed[] = [
  {
    slug: "voice",
    title: "ارزیابی صوت",
    titleEn: "Voice Assessment",
    description: "ارزیابی کیفیت، پایداری و کارکرد صوت و شناسایی نشانه‌های اختلال صوتی.",
    icon: "🎙️",
    color: "bg-rose-100",
    order: 1,
  },
  {
    slug: "speech-production",
    title: "ارزیابی تولید گفتار",
    titleEn: "Speech Production",
    description: "بررسی تلفظ، وضوح گفتار و مهارت‌های حرکتی تولید گفتار.",
    icon: "🗣️",
    color: "bg-sky-100",
    order: 2,
  },
  {
    slug: "fluency",
    title: "ارزیابی لکنت و روانی گفتار",
    titleEn: "Fluency Assessment",
    description: "سنجش روانی گفتار، شدت لکنت و تأثیر آن بر زندگی روزمره.",
    icon: "🌊",
    color: "bg-amber-100",
    order: 3,
  },
  {
    slug: "language",
    title: "ارزیابی زبان و ارتباط",
    titleEn: "Language Assessment",
    description: "ارزیابی درک، بیان، واژه‌یابی و مهارت‌های ارتباطی.",
    icon: "💬",
    color: "bg-violet-100",
    order: 4,
  },
  {
    slug: "neuro-speech",
    title: "ارزیابی نورولوژیک گفتار",
    titleEn: "Neurological Speech Assessment",
    description: "بررسی اختلالات گفتاری مرتبط با بیماری‌های عصبی و حرکتی.",
    icon: "🧠",
    color: "bg-emerald-100",
    order: 5,
  },
  {
    slug: "swallowing",
    title: "ارزیابی بلع",
    titleEn: "Swallowing Assessment",
    description: "غربالگری و ارزیابی عملکرد بلع و دریافت خوراکی.",
    icon: "🍽️",
    color: "bg-orange-100",
    order: 6,
  },
];

export const speechAssessments: SpeechAssessmentSeed[] = [
  // ─────────────── ارزیابی صوت ───────────────
  {
    slug: "mpt",
    title: "آزمون حداکثر زمان آواسازی",
    titleEn: "Maximum Phonation Time (MPT)",
    description: "اندازه‌گیری مدت زمان تولید پیوسته‌ی واکه برای بررسی پایداری و کارایی صوت.",
    assessmentType: "PERFORMANCE_MEASURE",
    method: "ضبط نمونه‌ی واکه‌ی کشیده و اندازه‌گیری مدت زمان آواسازی.",
    status: "AVAILABLE",
    published: true,
    order: 1,
    categorySlug: "voice",
    requiresRightsReview: false,
    implementationKey: "mpt",
    implementationPath: "/speech/mpt",
  },
  {
    slug: "sustained-vowel-analysis",
    title: "تحلیل واکه پایدار",
    titleEn: "Sustained Vowel Analysis",
    description: "تحلیل ویژگی‌های آکوستیکی واکه‌ی کشیده برای بررسی کیفیت و ثبات صوت.",
    assessmentType: "PERFORMANCE_MEASURE",
    method: "نمونه‌ی واکه‌ی پایدار و تحلیل پارامترهای آکوستیکی.",
    status: "AVAILABLE",
    published: true,
    order: 2,
    categorySlug: "voice",
    requiresRightsReview: false,
    implementationKey: "sustained-vowel",
    implementationPath: "/speech/sustained-vowel",
  },
  {
    slug: "voice-quality-assessment",
    title: "ارزیابی کیفیت صوت",
    titleEn: "Voice Quality Assessment",
    description: "بررسی ویژگی‌های قابل اندازه‌ی سیگنال صوت و ارائه توصیف‌های آکوستیکی از کیفیت صوت.",
    assessmentType: "PERFORMANCE_MEASURE",
    method: "ضبط سه نمونه صوتی و تحلیل شاخص‌های فرکانس، دامنه و طیف.",
    status: "AVAILABLE",
    published: true,
    order: 3,
    categorySlug: "voice",
    requiresRightsReview: false,
    implementationKey: "voice-quality",
    implementationPath: "/speech/voice-quality",
  },
  {
    slug: "vhi-30",
    title: "پرسش‌نامه شاخص ناتوانی صوتی",
    titleEn: "Vocal Handicap Index (VHI-30)",
    description: "پرسش‌نامه‌ی خودگزارشی برای سنجش تأثیر اختلال صوت بر زندگی روزمره.",
    assessmentType: "STANDARDIZED_QUESTIONNAIRE",
    method: "پرسش‌نامه‌ی خودگزارشی ۳۰ گویه‌ای.",
    // ساختار و محاسبه نمره آماده است؛ متون تأییدشده فارسی هنوز وارد نشده‌اند.
    // آزمون برای نمایش ساختار فعال شده، اما گزارش هیچ تفسیر بالینی ارائه نمی‌دهد.
    status: "AVAILABLE",
    published: true,
    order: 4,
    categorySlug: "voice",
    requiresRightsReview: true,
    rightsNote: RIGHTS_NOTE,
    implementationKey: "vhi-30",
    implementationPath: "/speech/vhi-30",
  },
  {
    slug: "grbas",
    title: "مقیاس ارزیابی کیفیت صوت GRBAS",
    titleEn: "GRBAS Scale",
    description: "مقیاس ادراکی برای درجه‌بندی کیفیت صوت در پنج بُعد.",
    assessmentType: "STANDARDIZED_SCALE",
    method: "درجه‌بندی شنیداری‑ادراکی توسط ارزیاب آموزش‌دیده.",
    status: "AVAILABLE",
    published: true,
    order: 5,
    categorySlug: "voice",
    requiresRightsReview: true,
    rightsNote: "مقیاس استاندارد بیرونی؛ توضیحات فارسی این سامانه تعریف رسمی یا ترجمه‌ی اعتبارسنجی‌شده نیست.",
    implementationKey: "grbas",
    implementationPath: "/speech/grbas",
  },

  // ─────────────── ارزیابی تولید گفتار ───────────────
  {
    slug: "amr",
    title: "آزمون نرخ حرکت تناوبی",
    titleEn: "Alternating Motion Rate (AMR)",
    description: "سنجش سرعت و نظم تکرار متناوب هجاهای /pa/، /ta/ و /ka/ برای بررسی کنترل حرکتی گفتار.",
    assessmentType: "PERFORMANCE_MEASURE",
    method: "ضبط سه تکلیف مستقل و تحلیل نرخ تکرار، ریتم و کیفیت گفتار.",
    status: "AVAILABLE",
    published: true,
    order: 1,
    categorySlug: "speech-production",
    requiresRightsReview: false,
    implementationKey: "amr",
    implementationPath: "/speech/amr",
  },
  {
    slug: "smr",
    title: "آزمون توالی حرکات گفتاری (پاتاکا)",
    titleEn: "Sequential Motion Rate (SMR)",
    description: "ارزیابی تولید توالی هجاهای پاتاکا و هماهنگی حرکات گفتاری.",
    assessmentType: "PERFORMANCE_MEASURE",
    method: "تکرار توالی /پاتاکا/ و ثبت نرخ و دقت.",
    status: "COMING_SOON",
    published: true,
    order: 2,
    categorySlug: "speech-production",
    requiresRightsReview: false,
  },
  {
    slug: "articulation",
    title: "ارزیابی تلفظ و تولید واج‌ها",
    titleEn: "Articulation Assessment",
    description: "بررسی صحت تولید واج‌ها و شناسایی خطاهای تلفظی.",
    assessmentType: "CLINICAL_ASSESSMENT",
    method: "ارزیابی تولید واج‌ها در واژه و گفتار پیوسته.",
    status: "COMING_SOON",
    published: true,
    order: 3,
    categorySlug: "speech-production",
    requiresRightsReview: false,
  },
  {
    slug: "speech-intelligibility",
    title: "ارزیابی وضوح و قابلیت فهم گفتار",
    titleEn: "Speech Intelligibility Assessment",
    description: "سنجش میزان قابل فهم بودن گفتار برای شنونده.",
    assessmentType: "CLINICAL_ASSESSMENT",
    method: "ارزیابی شنونده از وضوح واژه‌ها و گفتار.",
    status: "COMING_SOON",
    published: true,
    order: 4,
    categorySlug: "speech-production",
    requiresRightsReview: false,
  },
  {
    slug: "reading-aloud",
    title: "آزمون خواندن متن با صدای بلند",
    titleEn: "Reading Aloud Assessment",
    description: "بررسی دقت، روانی و وضوح خواندن متن با صدای بلند.",
    assessmentType: "CLINICAL_TASK",
    method: "خواندن متن و ارزیابی دقت و روانی.",
    status: "COMING_SOON",
    published: true,
    order: 5,
    categorySlug: "speech-production",
    requiresRightsReview: false,
  },

  // ─────────────── ارزیابی لکنت و روانی گفتار ───────────────
  {
    slug: "ssi-4",
    title: "ارزیابی شدت لکنت",
    titleEn: "Stuttering Severity Assessment (SSI-4)",
    description: "ابزار استاندارد درجه‌بندی شدت لکنت بر پایه‌ی فراوانی، مدت و ویژگی‌های همراه.",
    assessmentType: "STANDARDIZED_SCALE",
    method: "تحلیل نمونه‌ی گفتار و درجه‌بندی شدت.",
    status: "COMING_SOON",
    published: true,
    order: 1,
    categorySlug: "fluency",
    requiresRightsReview: true,
    rightsNote: RIGHTS_NOTE,
  },
  {
    slug: "speech-fluency",
    title: "ارزیابی روانی گفتار",
    titleEn: "Speech Fluency Assessment",
    description: "بررسی روانی، سرعت و وقفه‌های گفتار در گفتار پیوسته.",
    assessmentType: "CLINICAL_ASSESSMENT",
    method: "تحلیل نمونه‌ی گفتار برای نرخ، وقفه و تکرار.",
    status: "COMING_SOON",
    published: true,
    order: 2,
    categorySlug: "fluency",
    requiresRightsReview: false,
  },
  {
    slug: "oases",
    title: "ارزیابی تأثیر لکنت بر زندگی روزمره",
    titleEn: "Stuttering Impact Assessment (OASES)",
    description: "پرسش‌نامه‌ی خودگزارشی برای سنجش تأثیر لکنت بر ابعاد مختلف زندگی.",
    assessmentType: "STANDARDIZED_QUESTIONNAIRE",
    method: "پرسش‌نامه‌ی خودگزارشی.",
    status: "COMING_SOON",
    published: true,
    order: 3,
    categorySlug: "fluency",
    requiresRightsReview: true,
    rightsNote: RIGHTS_NOTE,
  },

  // ─────────────── ارزیابی زبان و ارتباط ───────────────
  {
    slug: "expressive-language",
    title: "ارزیابی زبان بیانی",
    titleEn: "Expressive Language Assessment",
    description: "بررسی توانایی بیان، واژه‌یابی و ساخت جمله.",
    assessmentType: "CLINICAL_ASSESSMENT",
    method: "تکالیف بیان شفاهی و توصیف.",
    status: "COMING_SOON",
    published: true,
    order: 1,
    categorySlug: "language",
    requiresRightsReview: false,
  },
  {
    slug: "receptive-language",
    title: "ارزیابی زبان دریافتی",
    titleEn: "Receptive Language Assessment",
    description: "بررسی درک شنیداری واژه‌ها، جمله‌ها و دستور زبان.",
    assessmentType: "CLINICAL_ASSESSMENT",
    method: "تکالیف درک شنیداری و مطابقت.",
    status: "COMING_SOON",
    published: true,
    order: 2,
    categorySlug: "language",
    requiresRightsReview: false,
  },
  {
    slug: "verbal-fluency",
    title: "آزمون روانی کلامی",
    titleEn: "Verbal Fluency Test",
    description: "سنجش توانایی تولید سریع واژه‌ها در مقوله‌های معنایی یا آوایی.",
    assessmentType: "CLINICAL_TASK",
    method: "نام‌بردن واژه در بازه‌ی زمانی محدود.",
    status: "COMING_SOON",
    published: true,
    order: 3,
    categorySlug: "language",
    requiresRightsReview: false,
  },
  {
    slug: "picture-naming",
    title: "آزمون نامیدن تصاویر",
    titleEn: "Picture Naming Assessment",
    description: "بررسی دسترسی به واژگان و نامیدن اشیا.",
    assessmentType: "CLINICAL_TASK",
    method: "نامیدن تصاویر و ثبت دقت و زمان پاسخ.",
    status: "COMING_SOON",
    published: true,
    order: 4,
    categorySlug: "language",
    requiresRightsReview: false,
  },

  // ─────────────── ارزیابی نورولوژیک گفتار ───────────────
  {
    slug: "dysarthria",
    title: "ارزیابی دیزآرتری",
    titleEn: "Dysarthria Assessment",
    description: "بررسی اختلالات تولید گفتار ناشی از ضعف یا عدم هماهنگی عضلات گفتاری.",
    assessmentType: "CLINICAL_ASSESSMENT",
    method: "ارزیابی حرکتی‑گفتاری و تحلیل وضوح.",
    status: "COMING_SOON",
    published: true,
    order: 1,
    categorySlug: "neuro-speech",
    requiresRightsReview: false,
  },
  {
    slug: "apraxia-of-speech",
    title: "ارزیابی آپراکسی گفتار",
    titleEn: "Apraxia of Speech Assessment",
    description: "بررسی دشواری برنامه‌ریزی حرکتی گفتار در نبود ضعف عضلانی اولیه.",
    assessmentType: "CLINICAL_ASSESSMENT",
    method: "تکالیف تولید مکرر و توالی حرکات گفتاری.",
    status: "COMING_SOON",
    published: true,
    order: 2,
    categorySlug: "neuro-speech",
    requiresRightsReview: false,
  },
  {
    slug: "parkinsons-speech",
    title: "ارزیابی گفتار در بیماری پارکینسون",
    titleEn: "Parkinson's Speech Assessment",
    description: "بررسی ویژگی‌های گفتار مرتبط با بیماری پارکینسون مانند شدت صدا و روانی.",
    assessmentType: "CLINICAL_ASSESSMENT",
    method: "ارزیابی نمونه‌ی گفتار و پارامترهای صوتی‑حرکتی.",
    status: "COMING_SOON",
    published: true,
    order: 3,
    categorySlug: "neuro-speech",
    requiresRightsReview: false,
  },

  // ─────────────── ارزیابی بلع ───────────────
  {
    slug: "eat-10",
    title: "پرسش‌نامه غربالگری اختلال بلع",
    titleEn: "EAT-10",
    description: "پرسش‌نامه‌ی غربالگری خودگزارشی برای نشانه‌های اختلال بلع.",
    assessmentType: "STANDARDIZED_QUESTIONNAIRE",
    method: "پرسش‌نامه‌ی ۱۰ گویه‌ای خودگزارشی.",
    status: "COMING_SOON",
    published: true,
    order: 1,
    categorySlug: "swallowing",
    requiresRightsReview: true,
    rightsNote: RIGHTS_NOTE,
  },
  {
    slug: "fois",
    title: "مقیاس عملکرد دریافت خوراکی",
    titleEn: "Functional Oral Intake Scale (FOIS)",
    description: "مقیاس درجه‌بندی سطح دریافت خوراکی و وابستگی به تغذیه‌ی غیرخوراکی.",
    assessmentType: "STANDARDIZED_SCALE",
    method: "درجه‌بندی بالینی سطح دریافت خوراکی.",
    status: "COMING_SOON",
    published: true,
    order: 2,
    categorySlug: "swallowing",
    requiresRightsReview: true,
    rightsNote: "مقیاس استاندارد بیرونی؛ استفاده و انطباق آن نیازمند بررسی حقوقی و پیاده‌سازی تخصصی است.",
  },
  {
    slug: "clinical-swallowing",
    title: "ارزیابی بالینی بلع",
    titleEn: "Clinical Swallowing Assessment",
    description: "ارزیابی بالینی عملکرد بلع شامل بررسی ساختار، حرکت و ایمنی بلع.",
    assessmentType: "CLINICAL_ASSESSMENT",
    method: "ارزیابی بالینی توسط متخصص.",
    status: "COMING_SOON",
    published: true,
    order: 3,
    categorySlug: "swallowing",
    requiresRightsReview: false,
  },
];
