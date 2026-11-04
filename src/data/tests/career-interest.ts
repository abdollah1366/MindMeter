import type { PsychTest } from "@/lib/types";

// ⚠️ تست نمونه برای نمایش ساختار. سؤال‌ها و بازه‌ها را با محتوای معتبر علمی جایگزین کنید.
const careerInterest: PsychTest = {
  slug: "career-interest",
  title: "تست علاقه به کار گروهی",
  shortDescription: "ببینید محیط کاری تیمی برایتان مناسب‌تر است یا کار مستقل.",
  instructions: "هر جمله را بخوانید و مشخص کنید چقدر درباره‌ی شما صدق می‌کند.",
  category: "career",
  audience: "دانشجویان و جویندگان کار",
  estimatedMinutes: 2,
  options: [
    { label: "اصلاً", value: 0 },
    { label: "کمی", value: 1 },
    { label: "تا حدی", value: 2 },
    { label: "زیاد", value: 3 },
  ],
  questions: [
    { id: "q1", text: "از هم‌فکری با دیگران برای حل مسئله لذت می‌برم." },
    { id: "q2", text: "ترجیح می‌دهم مسئولیت کامل یک کار با خودم باشد.", reverse: true },
    { id: "q3", text: "جلسه‌های کاری برایم انرژی‌بخش است." },
    { id: "q4", text: "وقتی تنها کار می‌کنم تمرکز بیشتری دارم.", reverse: true },
    { id: "q5", text: "تقسیم کار و هماهنگی با تیم برایم آسان است." },
  ],
  results: [
    { min: 0, max: 5, title: "کار مستقل", description: "در محیط‌هایی که استقلال و تمرکز فردی دارند بهتر عمل می‌کنید." },
    { min: 6, max: 10, title: "انعطاف‌پذیر", description: "هم در کار تیمی و هم در کار مستقل می‌توانید موفق باشید." },
    { min: 11, max: 15, title: "کار تیمی", description: "در محیط‌های گروهی و پرتعامل شکوفا می‌شوید." },
  ],
};

export default careerInterest;
