import type { Scale } from "@/lib/types";

/** نقاط برش استاندارد DASS (بر اساس امتیاز نسخه‌ی ۴۲ سؤالی) */
export function dassScales(multiplier: number): Scale[] {
  return [
    {
      key: "depression",
      title: "افسردگی",
      description: "خلق پایین، ناامیدی، بی‌ارزشی و فقدان لذت",
      multiplier,
      results: [
        { min: 0, max: 9, level: "normal", title: "عادی", description: "در محدوده‌ی عادی است." },
        { min: 10, max: 13, level: "mild", title: "خفیف", description: "نشانه‌های خفیف افسردگی." },
        { min: 14, max: 20, level: "moderate", title: "متوسط", description: "نشانه‌های متوسط افسردگی؛ مشورت با متخصص توصیه می‌شود." },
        { min: 21, max: 27, level: "high", title: "شدید", description: "نشانه‌های شدید افسردگی؛ مراجعه به متخصص توصیه می‌شود." },
        { min: 28, max: 42, level: "severe", title: "بسیار شدید", description: "نشانه‌های بسیار شدید افسردگی؛ لطفاً هر چه زودتر با متخصص مشورت کنید." },
      ],
    },
    {
      key: "anxiety",
      title: "اضطراب",
      description: "برانگیختگی بدنی، ترس موقعیتی و تجربه‌ی ذهنی اضطراب",
      multiplier,
      results: [
        { min: 0, max: 7, level: "normal", title: "عادی", description: "در محدوده‌ی عادی است." },
        { min: 8, max: 9, level: "mild", title: "خفیف", description: "نشانه‌های خفیف اضطراب." },
        { min: 10, max: 14, level: "moderate", title: "متوسط", description: "نشانه‌های متوسط اضطراب؛ مشورت با متخصص توصیه می‌شود." },
        { min: 15, max: 19, level: "high", title: "شدید", description: "نشانه‌های شدید اضطراب؛ مراجعه به متخصص توصیه می‌شود." },
        { min: 20, max: 42, level: "severe", title: "بسیار شدید", description: "نشانه‌های بسیار شدید اضطراب؛ لطفاً هر چه زودتر با متخصص مشورت کنید." },
      ],
    },
    {
      key: "stress",
      title: "استرس",
      description: "تنش مزمن، دشواری در آرام شدن، تحریک‌پذیری و بی‌صبری",
      multiplier,
      results: [
        { min: 0, max: 14, level: "normal", title: "عادی", description: "در محدوده‌ی عادی است." },
        { min: 15, max: 18, level: "mild", title: "خفیف", description: "نشانه‌های خفیف استرس." },
        { min: 19, max: 25, level: "moderate", title: "متوسط", description: "نشانه‌های متوسط استرس؛ آموزش مدیریت استرس توصیه می‌شود." },
        { min: 26, max: 33, level: "high", title: "شدید", description: "نشانه‌های شدید استرس؛ مراجعه به متخصص توصیه می‌شود." },
        { min: 34, max: 42, level: "severe", title: "بسیار شدید", description: "نشانه‌های بسیار شدید استرس؛ لطفاً با متخصص مشورت کنید." },
      ],
    },
  ];
}

export const DASS_SOURCE = {
  citation:
    "Lovibond SH, Lovibond PF. Manual for the Depression Anxiety Stress Scales. 2nd ed. Sydney: Psychology Foundation; 1995.",
  license: "مالکیت عمومی؛ استفاده و ترجمه‌ی آزاد (اعلام دانشگاه نیو ساوت ولز)",
  persianNote:
    "نسخه‌ی فارسی DASS در ایران هنجاریابی شده است (صاحبی و همکاران، ۱۳۸۴). ترجمه‌ی فعلی کاری است و باید با آن تطبیق داده شود.",
};
