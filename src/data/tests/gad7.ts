import type { PsychTest } from "@/lib/types";
import { FREQ_2W, q } from "./_shared";

const gad7: PsychTest = {
  slug: "gad-7",
  code: "GAD-7",
  title: "پرسشنامه‌ی اختلال اضطراب فراگیر",
  englishTitle: "Generalized Anxiety Disorder-7",
  shortDescription: "سنجش شدت اضطراب و نگرانی در دو هفته‌ی گذشته؛ ابزار استاندارد غربالگری اضطراب.",
  about:
    "GAD-7 ابزاری کوتاه و معتبر برای غربالگری اختلال اضطراب فراگیر و سنجش شدت اضطراب است. این تست در غربالگری اختلال پانیک، اضطراب اجتماعی و PTSD هم عملکرد مناسبی دارد.",
  instructions: "در دو هفته‌ی گذشته، چقدر با هر یک از مشکلات زیر آزار دیده‌اید؟",
  category: "mental-health",
  featured: true,
  audience: "بزرگسالان و نوجوانان",
  estimatedMinutes: 2,
  options: FREQ_2W,
  questions: [
    q(1, "احساس عصبی بودن، اضطراب یا تنش"),
    q(2, "ناتوانی در متوقف کردن یا کنترل نگرانی"),
    q(3, "نگرانی بیش از حد درباره‌ی مسائل مختلف"),
    q(4, "مشکل در آرام گرفتن"),
    q(5, "آن‌قدر بی‌قرار بودن که نشستن در یک جا سخت باشد"),
    q(6, "زود ناراحت یا تحریک‌پذیر شدن"),
    q(7, "احساس ترس، انگار اتفاق وحشتناکی ممکن است بیفتد"),
  ],
  scales: [
    {
      key: "total",
      title: "شدت اضطراب",
      results: [
        { min: 0, max: 4, level: "normal", title: "حداقل اضطراب", description: "اضطراب در حد قابل‌توجهی گزارش نشده است." },
        { min: 5, max: 9, level: "mild", title: "اضطراب خفیف", description: "سطح خفیفی از اضطراب وجود دارد. مهارت‌های مدیریت استرس و پایش وضعیت توصیه می‌شود." },
        { min: 10, max: 14, level: "moderate", title: "اضطراب متوسط", description: "اضطراب در حد متوسط است. ارزیابی بیشتر توسط متخصص سلامت روان توصیه می‌شود." },
        { min: 15, max: 21, level: "severe", title: "اضطراب شدید", description: "اضطراب شدید گزارش شده است. مراجعه به روانشناس یا روانپزشک توصیه می‌شود." },
      ],
    },
  ],
  source: {
    citation: "Spitzer RL, Kroenke K, Williams JBW, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092-1097.",
    license: "استفاده، ترجمه و توزیع بدون نیاز به مجوز (اعلام Pfizer)",
    persianNote: "ترجمه‌ی کاری؛ پیش از انتشار با نسخه‌ی فارسی هنجاریابی‌شده تطبیق داده شود.",
  },
};

export default gad7;
