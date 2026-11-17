/**
 * پرسشنامه‌ی طرحواره‌های ناسازگار یانگ (تألیف مایندمتر)
 * ۲۳۲ سؤال، ۱۸ طرحواره در ۵ حوزه؛ مقیاس پاسخگویی ۶درجه‌ای.
 * متن سؤالها و تفسیرها در `src/data/schema-content.ts` نگهداری می شود.
 */
import type { AnswerOption, PsychTest, Question, ResultLevel, ResultRange, Scale } from "@/lib/types";
import { SCHEMAS, SCHEMA_DOMAINS, type DomainKey, type SchemaContent } from "@/data/schema-content";

const OPTIONS: AnswerOption[] = [
  { label: "کاملاً مخالفم", value: 1 },
  { label: "مخالفم", value: 2 },
  { label: "تا حدی مخالفم", value: 3 },
  { label: "تا حدی موافقم", value: 4 },
  { label: "موافقم", value: 5 },
  { label: "کاملاً موافقم", value: 6 },
];

const LEVELS: { title: string; level: ResultLevel; note: string }[] = [
  { title: "پایین", level: "normal", note: "این الگو در شما ضعیف است و احتمالاً مشکلی ایجاد نمی کند." },
  { title: "خفیف", level: "mild", note: "نشانه‌های خفیفی از این الگو دیده می شود که معمولاً در شرایط استرسزا بروز می کند." },
  { title: "متوسط", level: "moderate", note: "این الگو تا حد قابل توجهی در شما فعال است و می تواند بر روابط و تصمیمها اثر بگذارد." },
  { title: "بالا", level: "high", note: "یکی از طرحواره‌های برجسته‌ی شماست؛ الگوی تکرارشوندهای در زندگی ایجاد می کند." },
  { title: "بسیار بالا", level: "severe", note: "این طرحواره به شدت فعال است و احتمالاً تأثیر گستردهای بر عملکرد و روابط شما دارد." },
];

/** پنج بازه‌ی پیوسته و بدون شکاف روی بازه‌ی امتیاز */
function bands(title: string, min: number, max: number): ResultRange[] {
  const width = (max - min + 1) / LEVELS.length;
  return LEVELS.map((lv, i) => {
    const from = i === 0 ? min : Math.round(min + i * width);
    const to = i === LEVELS.length - 1 ? max : Math.round(min + (i + 1) * width) - 1;
    return {
      min: from,
      max: to,
      title: lv.title,
      level: lv.level,
      description: `نمره‌ی «${title}» در سطح ${lv.title} است. ${lv.note}`,
    };
  });
}

function schemaScale(s: SchemaContent): Scale {
  const n = s.items.length;
  return {
    key: s.key,
    title: s.title,
    code: s.code,
    description: s.description,
    group: s.domain,
    results: bands(s.title, n, n * 6),
  };
}

function domainScale(key: DomainKey): Scale {
  const meta = SCHEMA_DOMAINS.find((d) => d.key === key)!;
  const members = SCHEMAS.filter((s) => s.domain === key);
  const n = members.reduce((sum, s) => sum + s.items.length, 0);
  return {
    key: `domain_${key}`,
    title: meta.title,
    description: meta.description,
    results: bands(meta.title, n, n * 6),
    includes: members.map((s) => s.key),
  };
}

const questions: Question[] = SCHEMAS.flatMap((s) =>
  s.items.map((text, i) => ({
    id: `ysq_${s.key}_${i + 1}`,
    text,
    scale: s.key,
  })),
);

const youngSchema: PsychTest = {
  slug: "young-schema",
  code: "YEMSQ",
  title: "تست طرحواره‌های ناسازگار یانگ",
  englishTitle: "Young Early Maladaptive Schema Questionnaire",
  shortDescription: "سنجش ۱۸ طرحواره ناسازگار در ۵ حوزه با تفسیر اختصاصی، ریشه‌ی تحولی، تمرین عملی و پیش بینی الگوهای شخصیتی.",
  about:
    "پرسشنامه‌ی ۲۳۲ سؤالی طرحواره‌های ناسازگار، الگوهای ذهنی پایداری را که از تجربههای اولیه‌ی زندگی شکل گرفته اند شناسایی می کند. " +
    "نتیجه شامل نمودار ۱۸ طرحواره و ۵ حوزه، تفسیر جداگانه‌ی هر طرحواره، ریشهی تحولی، راهکار و تمرین عملی و همچنین پیش بینی اکتشافی الگوهای شخصیتی است.",
  instructions:
    "هر عبارت را بر اساس اینکه در زندگی معمولی خود چقدر با شما مطابقت دارد، روی مقیاس ۶درجه‌ای ارزیابی کنید. " +
    "پاسخی درست یا غلط وجود ندارد؛ به اولین واکنش خود تکیه کنید و از پاسخ دادن بر اساس اینکه دوست دارید چه باشید پرهیز نمایید.",
  category: "personality",
  alsoIn: ["mental-health"],
  featured: true,
  audience: "نوجوانان و بزرگسالان",
  estimatedMinutes: 25,
  options: OPTIONS,
  questions,
  scales: [...SCHEMAS.map(schemaScale), ...SCHEMA_DOMAINS.map((d) => domainScale(d.key))],
  scaleGroups: SCHEMA_DOMAINS.map((d) => ({ key: d.key, title: d.title, description: d.description })),
  report: "schema",
  resultNote: {
    title: "درباره‌ی تفسیر این تست",
    paragraphs: [
      "این پرسشنامه یک ابزار خودگزارشی برای خودشناسی و غربالگری است. نتیجه‌ی آن تشخیص بالینی محسوب نمی شود و نمی تواند جای مصاحبه‌ی تخصصی را بگیرد.",
      "پیش بینی مربوط به اختلالات شخصیت تنها یک شاخص اکتشافی بر اساس الگوی نمرههاست و به معنای ابتلا به هیچ اختلالی نیست.",
      "اگر نمره‌ی طرحوارهای بالا یا بسیار بالا است، تمرینهای پیشنهادی را بهتر است زیر نظر روانشناس طرحواره درمان یا متخصص بالینی دنبال کنید.",
    ],
  },
  source: {
    citation:
      "Young, J. E., Klosko, J. S., & Weishaar, M. E. (2003). Schema Therapy: A Practitioner's Guide. Guilford Press. " +
      "چارچوب مفهومی ۱۸ طرحواره و ۵ حوزه برگرفته از این منبع است.",
    license:
      "متن سؤالها و تفسیرهای این نسخه تألیف مایندمتر و بر اساس تعاریف مفهومی طرحوارههاست و رونوشت پرسشنامه‌ی تجاری YSQ محسوب نمی شود. " +
      "استفاده از نسخه‌ی رسمی و دارای مجوز YSQ-S3 در محیط بالینی نیازمند تهیه‌ی مجوز از ناشر آن است.",
    persianNote: "نسخه‌ی حاضر برای خودگزارشی و خودشناسی طراحی شده و هنجارهای بومی منتشر شده‌ای برای آن وجود ندارد؛ نمرات بر اساس بازه‌ی پاسخگویی تفسیر می شوند.",
  },
};

export default youngSchema;
