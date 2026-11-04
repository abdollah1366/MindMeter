import type { PsychTest } from "@/lib/types";
import { q } from "./_shared";

const who5: PsychTest = {
  slug: "who-5",
  code: "WHO-5",
  title: "شاخص بهزیستی سازمان جهانی بهداشت",
  englishTitle: "WHO-5 Well-Being Index",
  shortDescription: "سنجش کوتاه احساس سرزندگی و بهزیستی روانی در دو هفته‌ی گذشته.",
  about:
    "WHO-5 یکی از پرکاربردترین ابزارهای سنجش بهزیستی ذهنی است. امتیاز آن از ۰ تا ۱۰۰ گزارش می‌شود. امتیاز ۵۰ یا کمتر نشانه‌ی بهزیستی پایین است و غربالگری افسردگی را توصیه می‌کند.",
  instructions: "برای هر یک از جمله‌های زیر، گزینه‌ای را انتخاب کنید که به احساس شما در دو هفته‌ی گذشته نزدیک‌تر است.",
  category: "mental-health",
  featured: true,
  audience: "۹ سال به بالا",
  estimatedMinutes: 1,
  options: [
    { label: "هیچ وقت", value: 0 },
    { label: "گاهی اوقات", value: 1 },
    { label: "کمتر از نیمی از اوقات", value: 2 },
    { label: "بیش از نیمی از اوقات", value: 3 },
    { label: "بیشتر اوقات", value: 4 },
    { label: "همیشه", value: 5 },
  ],
  questions: [
    q(1, "احساس شادی و سرحالی داشته‌ام."),
    q(2, "احساس آرامش و آسودگی داشته‌ام."),
    q(3, "احساس فعال بودن و پرانرژی بودن داشته‌ام."),
    q(4, "صبح‌ها با احساس سرحالی و استراحت کافی بیدار شده‌ام."),
    q(5, "زندگی روزمره‌ام پر از چیزهایی بوده که برایم جالب است."),
  ],
  scales: [
    {
      key: "total",
      title: "بهزیستی روانی (از ۱۰۰)",
      multiplier: 4,
      results: [
        { min: 0, max: 28, level: "severe", title: "بهزیستی بسیار پایین", description: "امتیاز شما با احتمال افسردگی همراه است. انجام تست PHQ-9 و مشورت با متخصص توصیه می‌شود." },
        { min: 29, max: 50, level: "moderate", title: "بهزیستی پایین", description: "احساس سرزندگی شما پایین‌تر از حد مطلوب است. انجام تست PHQ-9 برای بررسی بیشتر توصیه می‌شود." },
        { min: 51, max: 100, level: "normal", title: "بهزیستی خوب", description: "احساس سرزندگی و بهزیستی شما در محدوده‌ی مناسب است." },
      ],
    },
  ],
  source: {
    citation: "Topp CW, Østergaard SD, Søndergaard S, Bech P. The WHO-5 Well-Being Index: a systematic review of the literature. Psychother Psychosom. 2015;84(3):167-176.",
    license: "رایگان (WHO / مرکز روانپزشکی شمال زلاند)؛ برای استفاده‌ی تجاری شرایط مجوز بررسی شود",
    persianNote: "ترجمه‌ی کاری؛ پیش از انتشار با نسخه‌ی فارسی رسمی WHO-5 تطبیق داده شود.",
  },
};

export default who5;
