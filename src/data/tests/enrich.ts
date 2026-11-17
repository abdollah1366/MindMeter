import type { AnswerOption, PsychTest, ResultLevel, ResultRange, Scale } from "@/lib/types";
import {
  ENRICH_GROUPS,
  ENRICH_SCALES,
  TOTAL_ENRICH_ITEMS,
  type EnrichGroupKey,
  type EnrichScaleContent,
} from "../enrich-content";

const OPTIONS: AnswerOption[] = [
  { label: "کاملاً مخالفم", value: 1 },
  { label: "مخالفم", value: 2 },
  { label: "نظری ندارم", value: 3 },
  { label: "موافقم", value: 4 },
  { label: "کاملاً موافقم", value: 5 },
];

// For a satisfaction score, a low raw score is the concerning end of the
// spectrum. The ResultLevel values are therefore inverted compared with a
// symptom test: rose/red for ضعیف and emerald/green for عالی.
const LEVELS: { title: string; level: ResultLevel; note: string }[] = [
  {
    title: "ضعیف",
    level: "severe",
    note: "این حوزه نیاز به توجه فوری دارد. بهتر است با یک متخصص زوجدرمانی مشورت کنید.",
  },
  {
    title: "نیازمند توجه",
    level: "high",
    note: "در این حوزه نشانه های نارضایتی دیده می شود. گفتگوی صریح و تمرین راهکارها می تواند کمک کند.",
  },
  {
    title: "متوسط",
    level: "moderate",
    note: "وضعیت این حوزه قابل قبول است، اما جای بهبود وجود دارد.",
  },
  {
    title: "خوب",
    level: "mild",
    note: "در این حوزه تا حد خوبی هماهنگی وجود دارد.",
  },
  {
    title: "عالی",
    level: "normal",
    note: "این حوزه یکی از نقاط قوت رابطه شماست.",
  },
];

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
      description: `نمره «${title}» در سطح ${lv.title} است. ${lv.note}`,
    };
  });
}

function scaleOf(s: EnrichScaleContent): Scale {
  const n = s.items.length;
  return {
    key: s.key,
    title: s.title,
    code: s.code,
    description: s.description,
    group: s.group,
    results: bands(s.title, n, n * 5),
  };
}

function groupScale(key: EnrichGroupKey): Scale {
  const group = ENRICH_GROUPS.find((g) => g.key === key)!;
  const members = ENRICH_SCALES.filter((s) => s.group === key);
  const n = members.reduce((sum, s) => sum + s.items.length, 0);
  return {
    key: `group_${key}`,
    title: group.title,
    description: group.description,
    includes: members.map((s) => s.key),
    results: bands(group.title, n, n * 5),
  };
}

const overallScale: Scale = {
  key: "overall",
  title: "شاخص کلی رضایت زناشویی",
  description: "میانگین وزنشده تمام مؤلفه ها؛ تصویر کلی از کیفیت رابطه زوجی.",
  includes: ENRICH_SCALES.map((s) => s.key),
  results: bands("شاخص کلی رضایت زناشویی", TOTAL_ENRICH_ITEMS, TOTAL_ENRICH_ITEMS * 5),
};

const questions = ENRICH_SCALES.flatMap((s) =>
  s.items.map((text, i) => ({ id: `enrich_${s.key}_${i + 1}`, text, scale: s.key })),
);

const enrich: PsychTest = {
  slug: "enrich-marital",
  code: "EMSS",
  title: "تست رضایت زناشویی انریچ",
  englishTitle: "ENRICH Marital Satisfaction Scale",
  shortDescription: "ارزیابی ۱۱۶ سؤالی رضایت زناشویی در ۱۵ مؤلفه و ۴ حوزه با تفسیر کاملاً اختصاصی.",
  about:
    "رضایت زناشویی یک مؤلفه واحد نیست، بلکه حاصل تعامل عواطف، ارتباط، همکاری و ارزشهای مشترک است. " +
    "این آزمون ۱۱۶ سؤالی، وضعیت رابطه شما را در ۱۵ مؤلفه بررسی می کند و علاوه بر نمره کلی، " +
    "نقاط قوت و حوزه های نیازمند توجه را به تفکیک نشان می دهد. تفسیر نهایی شامل تحلیل هر مؤلفه، " +
    "ریشه های احتمالی، راهکارهای عملی، تمرینها و معرفی کتاب و فیلم است.",
  instructions:
    "به هر سؤال بر اساس احساس واقعی خود در رابطه کنونی تان پاسخ دهید، نه آنچه فکر می کنید باید پاسخ دهید. " +
    "اگر سؤالی در مورد شما صدق نمی کند (مثلاً درباره فرزند)، گزینه «نظری ندارم» را انتخاب کنید. " +
    "پاسخهای صادقانه، تفسیر دقیق تری را ممکن می سازد.",
  category: "relationships",
  featured: true,
  audience: "بزرگسالان و نوجوانان",
  estimatedMinutes: 20,
  options: OPTIONS,
  questions,
  scales: [
    ...ENRICH_SCALES.map(scaleOf),
    ...ENRICH_GROUPS.map((g) => groupScale(g.key)),
    overallScale,
  ],
  scaleGroups: ENRICH_GROUPS.map((g) => ({ key: g.key, title: g.title, description: g.description })),
  report: "enrich",
  resultNote: {
    title: "درباره تفسیر رضایت زناشویی",
    paragraphs: [
      "نتایج این آزمون تصویری از وضعیت رابطه در زمان پاسخگویی است و پیش بینی قطعی آینده رابطه نیست. " +
        "نمره پایین در یک مؤلفه به معنای شکست رابطه نیست، بلکه فرصتی برای تمرکز بر آن حوزه است.",
      "تفسیرها و پیشنهادها عمومی و آموزشی اند و جایگزین مشاوره یا زوجدرمانی حرفهای نیستند. " +
        "اگر در رابطه خود با خشونت، آزار یا ناامنی جدی مواجه هستید، با متخصص یا مراکز حمایتی تماس بگیرید.",
      "برای پیگیری، می توانید نمره های فعلی را یادداشت کنید و پس از چند هفته تمرین، دوباره آزمون را تکرار نمایید.",
    ],
  },
  source: {
    citation:
      "Olson, D. H. (2000). ENRICH Marital Satisfaction Scale. In J. Touliatos, B. F. Perlmutter & M. A. Straus (Eds.), Handbook of Family Measurement Techniques.",
    license:
      "محتوای این نسخه توسط مایندمتر بر اساس مفاهیم عمومی رضایت زناشویی تدوین شده و رونوشتی از پرسشنامه ENRICH یا هیچ اقتباس دیگری نیست. " +
      "استفاده بالینی از نسخه رسمی ENRICH نیازمند اخذ مجوز از ناشر آن است.",
    persianNote:
      "سؤالات و تفسیرهای فارسی این آزمون اختصاصی مایندمتر است و ساختاری ۵درجهای و ۱۵ مؤلفهای دارد.",
  },
};

export default enrich;
