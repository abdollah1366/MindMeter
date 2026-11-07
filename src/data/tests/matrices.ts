/**
 * چهار فرم ماتریس‌های پیشرونده‌ی مایندمتر (مدل ریون)؛ سؤال‌ها اختصاصی‌اند و از روی قاعده ساخته می‌شوند.
 * - MPM-C36: کودکان ۵ تا ۱۱ سال (مشابه CPM)
 * - MPM-S60: استاندارد، نوجوانان و بزرگسالان (مشابه SPM)
 * - MPM-A36: پیشرفته، عملکرد بالا (مشابه APM)
 * - MPM-2: فرم گسترده‌ی ۴ تا ۹۹ سال (مشابه RPM2)
 */
import type { PsychTest } from "@/lib/types";
import { MATRICES_NOTE, MATRICES_SOURCE, buildForm, formScales, type SetSpec } from "./_matrices";

const set = (key: string, title: string, description: string, templates: number[], options: number): SetSpec => ({ key, title, description, templates, options });

type FormSpec = Pick<PsychTest, "slug" | "code" | "title" | "englishTitle" | "shortDescription" | "about" | "audience" | "estimatedMinutes" | "featured"> & {
  sets: SetSpec[];
  alsoIn?: string[];
  instructions?: string;
};

function form(f: FormSpec): PsychTest {
  return {
    slug: f.slug,
    code: f.code,
    title: f.title,
    englishTitle: f.englishTitle,
    kind: "ability",
    shortDescription: f.shortDescription,
    about: f.about,
    instructions:
      f.instructions ??
      "در هر سؤال یک الگوی تصویری می‌بینید که یک خانه‌ی آن خالی است. قاعده‌ی ردیف‌ها و ستون‌ها را پیدا کنید و گزینه‌ای را که جای علامت سؤال را درست پر می‌کند انتخاب کنید. سؤال‌ها به‌تدریج سخت‌تر می‌شوند. اگر جواب را نمی‌دانید «نمی‌دانم» را بزنید؛ حدس زدن کمکی نمی‌کند.",
    category: "intelligence",
    alsoIn: f.alsoIn,
    featured: f.featured,
    audience: f.audience,
    estimatedMinutes: f.estimatedMinutes,
    options: [],
    questions: buildForm(f.code.toLowerCase(), f.sets),
    scales: formScales(f.sets),
    resultNote: MATRICES_NOTE,
    source: MATRICES_SOURCE,
  };
}

export const matricesChild = form({
  slug: "matrices-child",
  code: "MPM-C36",
  title: "تست هوش ماتریس‌های رنگی کودکان (مدل ریون کودک)",
  englishTitle: "MindMeter Progressive Matrices – Children (MPM-C36)",
  shortDescription: "۳۶ ماتریس رنگی و ساده برای کودکان ۵ تا ۱۱ سال؛ سنجش استدلال تصویری بدون نیاز به خواندن و نوشتن.",
  about:
    "این آزمون برای کودکان ۵ تا ۱۱ سال طراحی شده و مشابه ماتریس‌های رنگی ریون (CPM) سه بخش ۱۲ سؤالی دارد. در بخش اول الگوهای ۲×۲ ساده و در بخش‌های بعد الگوهای ۳×۳ می‌آیند. کودک فقط باید شکل درست را انتخاب کند و نیازی به خواندن ندارد. نتیجه با کودکان هم‌سن و هم‌جنس شرکت‌کننده در سایت مقایسه می‌شود. سؤال‌ها اختصاصی مایندمتر است و این آزمون نسخه‌ی رسمی ریون نیست.",
  instructions:
    "این تست را کنار کودک انجام دهید. در هر سؤال یک تصویر با یک خانه‌ی خالی (علامت سؤال) دیده می‌شود. از کودک بخواهید از میان شکل‌های پایین، شکلی را که جای خالی را درست پر می‌کند پیدا کند. خودتان جواب را نگویید و فقط اگر کودک خسته شد، کمی استراحت کنید.",
  audience: "کودکان ۵ تا ۱۱ سال (با همراهی والدین)",
  estimatedMinutes: 20,
  alsoIn: ["children"],
  sets: [
    set("A", "بخش A: تکمیل الگوهای ساده", "الگوهای ۲×۲ با یک یا دو قاعده", [1, 2], 6),
    set("AB", "بخش AB: الگوهای ترکیبی", "ترکیب شکل، تعداد و رنگ در الگوهای ۲×۲ و ۳×۳", [3, 4, 5], 6),
    set("B", "بخش B: استدلال قیاسی", "کشف رابطه‌ی ردیف‌ها و ستون‌ها در الگوهای ۳×۳", [6, 7, 8], 6),
  ],
});

export const matricesStandard = form({
  slug: "matrices-standard",
  code: "MPM-S60",
  title: "تست هوش ماتریس‌های پیشرونده استاندارد (مدل ریون)",
  englishTitle: "MindMeter Progressive Matrices – Standard (MPM-S60)",
  shortDescription: "۶۰ ماتریس در ۵ بخش از ساده تا دشوار برای نوجوانان و بزرگسالان با عملکرد متوسط؛ مشابه ریون استاندارد (SPM).",
  about:
    "این آزمون مشابه ماتریس‌های پیشرونده‌ی استاندارد ریون (SPM) پنج بخش A تا E دارد و هر بخش ۱۲ ماتریس است که به‌تدریج سخت‌تر می‌شوند. ماتریس‌ها «استدلال سیال» یعنی توان کشف قاعده و حل مسئله‌های تازه را بدون وابستگی به زبان می‌سنجند. نتیجه با هم‌سن‌ها و هم‌جنس‌های شرکت‌کننده در سایت مقایسه می‌شود. سؤال‌ها اختصاصی مایندمتر است و این آزمون نسخه‌ی رسمی ریون نیست.",
  audience: "نوجوانان و بزرگسالان (۱۲ سال به بالا)",
  estimatedMinutes: 45,
  featured: true,
  sets: [
    set("A", "بخش A", "تکمیل الگوهای ساده", [1, 2, 3, 4], 6),
    set("B", "بخش B", "یک قاعده در ردیف یا ستون", [5, 6, 7, 8], 6),
    set("C", "بخش C", "پیشروی و الگوهای لاتین", [8, 9, 10, 11], 8),
    set("D", "بخش D", "ترکیب دو یا سه قاعده", [11, 12, 13, 14], 8),
    set("E", "بخش E", "قاعده‌های چندگانه و محاسباتی", [13, 14, 15, 16, 17, 18], 8),
  ],
});

export const matricesAdvanced = form({
  slug: "matrices-advanced",
  code: "MPM-A36",
  title: "تست هوش ماتریس‌های پیشرونده پیشرفته (مدل ریون)",
  englishTitle: "MindMeter Progressive Matrices – Advanced (MPM-A36)",
  shortDescription: "۳۶ ماتریس دشوار برای نوجوانان و بزرگسالان با عملکرد بالا؛ مشابه ریون پیشرفته (APM).",
  about:
    "این آزمون مشابه ماتریس‌های پیشرونده‌ی پیشرفته‌ی ریون (APM) برای افرادی است که در فرم استاندارد نمره‌ی بالا می‌گیرند؛ مثلاً دانشجویان، متقاضیان مشاغل تخصصی و افراد تیزهوش. سه بخش ۱۲ سؤالی دارد و همه‌ی سؤال‌ها به کشف هم‌زمان چند قاعده نیاز دارند. سؤال‌ها اختصاصی مایندمتر است و این آزمون نسخه‌ی رسمی ریون نیست.",
  audience: "نوجوانان و بزرگسالان با عملکرد بالا (۱۴ سال به بالا)",
  estimatedMinutes: 40,
  sets: [
    set("I", "بخش ۱", "دو و سه قاعده", [9, 10, 11, 12], 8),
    set("II", "بخش ۲", "شکل‌های تودرتو و اندازه", [12, 13, 14, 15], 8),
    set("III", "بخش ۳", "قاعده‌های محاسباتی و چهارگانه", [15, 16, 17, 18], 8),
  ],
});

export const matrices2 = form({
  slug: "matrices-2",
  code: "MPM-48",
  title: "تست هوش ماتریس‌های پیشرونده ۲ (مدل ریون ۲، ۴ تا ۹۹ سال)",
  englishTitle: "MindMeter Progressive Matrices 2 (MPM-48)",
  shortDescription: "۴۸ ماتریس از بسیار ساده تا بسیار دشوار برای همه‌ی سنین (۴ تا ۹۹ سال)؛ مشابه ریون ۲ (RPM2).",
  about:
    "این فرم مشابه ریون ۲ (Raven's 2) برای گستره‌ی سنی ۴ تا ۹۹ سال طراحی شده و ۴۸ ماتریس را در چهار بخش، از الگوهای بسیار ساده‌ی ۲×۲ تا ماتریس‌های چهارقاعده‌ای، پوشش می‌دهد. به همین دلیل هم برای کودکان و هم برای بزرگسالان با توانایی بالا مناسب است. نتیجه با هم‌سن‌ها و هم‌جنس‌های شرکت‌کننده در سایت مقایسه می‌شود. سؤال‌ها اختصاصی مایندمتر است و این آزمون نسخه‌ی رسمی ریون نیست.",
  audience: "۴ تا ۹۹ سال (کودکان با همراهی والدین)",
  estimatedMinutes: 35,
  alsoIn: ["children"],
  sets: [
    set("S1", "بخش ۱", "الگوهای بسیار ساده تا ساده", [1, 2, 3, 4, 5, 6], 6),
    set("S2", "بخش ۲", "یک و دو قاعده", [7, 8, 9, 10], 8),
    set("S3", "بخش ۳", "سه قاعده و شکل‌های تودرتو", [11, 12, 13, 14], 8),
    set("S4", "بخش ۴", "قاعده‌های محاسباتی و چهارگانه", [15, 16, 17, 18], 8),
  ],
});
