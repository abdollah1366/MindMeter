import type { PsychTest } from "@/lib/types";

// ⚠️ تست نمونه برای نمایش ساختار. سؤال‌ها و بازه‌ها را با محتوای معتبر علمی جایگزین کنید.
const introversion: PsychTest = {
  slug: "introversion",
  title: "تست درون‌گرایی / برون‌گرایی",
  shortDescription: "ببینید بیشتر به سمت درون‌گرایی تمایل دارید یا برون‌گرایی.",
  instructions: "میزان موافقت خود با هر جمله را مشخص کنید.",
  category: "personality",
  featured: true,
  audience: "بزرگسالان",
  estimatedMinutes: 2,
  options: [
    { label: "کاملاً مخالفم", value: 1 },
    { label: "مخالفم", value: 2 },
    { label: "نظری ندارم", value: 3 },
    { label: "موافقم", value: 4 },
    { label: "کاملاً موافقم", value: 5 },
  ],
  questions: [
    { id: "q1", text: "در جمع‌های شلوغ انرژی می‌گیرم." },
    { id: "q2", text: "ترجیح می‌دهم آخر هفته را در خلوت بگذرانم.", reverse: true },
    { id: "q3", text: "به‌راحتی با افراد جدید سر صحبت را باز می‌کنم." },
    { id: "q4", text: "قبل از حرف زدن معمولاً زیاد فکر می‌کنم.", reverse: true },
    { id: "q5", text: "دوست دارم مرکز توجه باشم." },
  ],
  results: [
    {
      min: 5,
      max: 12,
      title: "درون‌گرا",
      description: "از تنهایی و جمع‌های کوچک انرژی می‌گیرید و اهل تأمل هستید.",
    },
    {
      min: 13,
      max: 18,
      title: "میانه‌رو (Ambivert)",
      description: "بسته به موقعیت، هم ویژگی‌های درون‌گرایی و هم برون‌گرایی را نشان می‌دهید.",
    },
    {
      min: 19,
      max: 25,
      title: "برون‌گرا",
      description: "از تعامل با دیگران انرژی می‌گیرید و در جمع احساس راحتی می‌کنید.",
    },
  ],
};

export default introversion;
