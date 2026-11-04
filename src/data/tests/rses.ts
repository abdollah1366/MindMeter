import type { PsychTest } from "@/lib/types";
import { q } from "./_shared";

const rses: PsychTest = {
  slug: "rosenberg-self-esteem",
  code: "RSES",
  title: "مقیاس عزت نفس روزنبرگ",
  englishTitle: "Rosenberg Self-Esteem Scale",
  shortDescription: "پرکاربردترین ابزار جهانی برای سنجش عزت نفس کلی و نگرش فرد به خودش.",
  about:
    "مقیاس روزنبرگ از سال ۱۹۶۵ تاکنون در صدها پژوهش و ده‌ها کشور به کار رفته است. این مقیاس احساس کلی ارزشمندی و پذیرش خود را می‌سنجد.",
  instructions: "جمله‌های زیر درباره‌ی احساس کلی شما نسبت به خودتان است. میزان موافقت خود را با هر جمله مشخص کنید.",
  category: "personality",
  featured: true,
  audience: "نوجوانان و بزرگسالان",
  estimatedMinutes: 3,
  options: [
    { label: "کاملاً مخالفم", value: 0 },
    { label: "مخالفم", value: 1 },
    { label: "موافقم", value: 2 },
    { label: "کاملاً موافقم", value: 3 },
  ],
  questions: [
    q(1, "در مجموع از خودم راضی هستم."),
    q(2, "گاهی فکر می‌کنم اصلاً آدم خوبی نیستم.", undefined, true),
    q(3, "احساس می‌کنم ویژگی‌های خوب زیادی دارم."),
    q(4, "می‌توانم کارها را به خوبی بیشتر مردم انجام دهم."),
    q(5, "احساس می‌کنم چیز زیادی برای افتخار کردن ندارم.", undefined, true),
    q(6, "گاهی واقعاً احساس بی‌فایده بودن می‌کنم.", undefined, true),
    q(7, "احساس می‌کنم آدم ارزشمندی هستم، دست‌کم هم‌تراز با دیگران."),
    q(8, "ای کاش می‌توانستم برای خودم احترام بیشتری قائل باشم.", undefined, true),
    q(9, "روی هم رفته تمایل دارم خودم را آدمی شکست‌خورده بدانم.", undefined, true),
    q(10, "نگرش مثبتی نسبت به خودم دارم."),
  ],
  scales: [
    {
      key: "total",
      title: "عزت نفس",
      results: [
        { min: 0, max: 14, level: "high", title: "عزت نفس پایین", description: "ممکن است اغلب خودتان را دست‌کم بگیرید و نسبت به ارزش خود تردید داشته باشید. کار با یک روانشناس روی خودپنداره می‌تواند بسیار مفید باشد." },
        { min: 15, max: 25, level: "normal", title: "عزت نفس در محدوده‌ی طبیعی", description: "نگاه نسبتاً متعادل و سالمی به خودتان دارید." },
        { min: 26, max: 30, level: "normal", title: "عزت نفس بالا", description: "برای خودتان ارزش زیادی قائلید و نگرش مثبتی به خود دارید." },
      ],
    },
  ],
  source: {
    citation: "Rosenberg M. Society and the Adolescent Self-Image. Princeton, NJ: Princeton University Press; 1965.",
    license: "استفاده‌ی آزاد بدون نیاز به مجوز (اعلام دانشگاه مریلند)",
    persianNote: "ترجمه‌ی کاری؛ پیش از انتشار با نسخه‌ی فارسی هنجاریابی‌شده تطبیق داده شود.",
  },
};

export default rses;
