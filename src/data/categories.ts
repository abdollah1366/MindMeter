export type Category = {
  slug: string;
  title: string;
  description: string;
  /** یک ایموجی ساده به عنوان آیکون؛ بعداً می‌توانید با SVG جایگزین کنید */
  icon: string;
  /** کلاس رنگ پس‌زمینه‌ی آیکون (Tailwind) */
  color: string;
};

export const categories: Category[] = [
  {
    slug: "personality",
    title: "شخصیت",
    description: "ویژگی‌ها، سبک رفتار و تیپ شخصیتی خود را بشناسید.",
    icon: "🧩",
    color: "bg-violet-100",
  },
  {
    slug: "mental-health",
    title: "سلامت روان",
    description: "استرس، اضطراب، خلق و حال روانی خود را ارزیابی کنید.",
    icon: "🌿",
    color: "bg-emerald-100",
  },
  {
    slug: "intelligence",
    title: "هوش و توانایی",
    description: "توانایی‌های شناختی، حافظه و تمرکز خود را بسنجید.",
    icon: "💡",
    color: "bg-amber-100",
  },
  {
    slug: "career",
    title: "شغل و تحصیل",
    description: "رغبت شغلی و مسیر تحصیلی مناسب خود را پیدا کنید.",
    icon: "🎯",
    color: "bg-sky-100",
  },
  {
    slug: "relationships",
    title: "خانواده و روابط",
    description: "کیفیت روابط، ازدواج و سبک دلبستگی خود را بررسی کنید.",
    icon: "🤝",
    color: "bg-rose-100",
  },
  {
    slug: "children",
    title: "کودک و نوجوان",
    description: "تست‌هایی برای والدین درباره‌ی رشد و رفتار فرزندان.",
    icon: "🧸",
    color: "bg-orange-100",
  },
];

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}
