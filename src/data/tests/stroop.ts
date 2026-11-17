/**
 * آزمون استروب فارسی (تألیف مایندمتر)
 * ۶۰ کارت اصلی: ۳۰ کارت رنگ واژه (کلاسیک) + ۳۰ کارت واژه هیجانی/خنثی.
 * ۳۰ کارت تمرینی (۱۵ در هر حالت) توسط اجرا کننده نمایش داده می شود و نمره ندارد.
 * وظیفه آزمودنی در هر دو حالت، نام گذاری رنگ جوهر و نادیده گرفتن معنای واژه است.
 */
import type { AnswerOption, PsychTest, Question, ResultRange, Scale } from "@/lib/types";
import { STROOP_OPTIONS, classicSpecs, emotionalSpecs } from "../stroop-content";

const MAIN = [...classicSpecs(30, "cm"), ...emotionalSpecs(30, "em")];

/**
 * بازه های پیوسته نمره دقت. نمره پایین بهعنوان سطح نگران کننده (severe)
 * و نمره بالا بهعنوان normal رنگبندی می شود، برعکس تستهای علائم بالینی.
 */
function accuracyBands(max: number): ResultRange[] {
  const cuts: { upTo: number; title: string; level: ResultRange["level"]; description: string }[] = [
    { upTo: Math.round(max * 0.5), title: "ضعیف", level: "severe", description: "دقت در شناسایی رنگ جوهر پایین است و تداخل معنای واژه زیاد بوده است." },
    { upTo: Math.round(max * 0.7), title: "پایین تر از میانگین", level: "high", description: "در برخی کارت ها معنای واژه بر نام گذاری رنگ اثر گذاشته است." },
    { upTo: Math.round(max * 0.83), title: "متوسط", level: "mild", description: "دقت در حد میانگین است و کنترل تداخل تا حدی برقرار است." },
    { upTo: Math.round(max * 0.93), title: "خوب", level: "normal", description: "بیشتر کارت ها را با دقت نام گذاری کرده اید و تداخل کمی دیده می شود." },
    { upTo: max, title: "عالی", level: "normal", description: "تقریباً تمام کارت ها به درستی پاسخ داده شده و کنترل تداخل قوی است." },
  ];
  let from = 0;
  return cuts.map((c) => {
    const range: ResultRange = { min: from, max: c.upTo, title: c.title, description: c.description, level: c.level };
    from = c.upTo + 1;
    return range;
  });
}

const CLASSIC_BANDS = accuracyBands(30);
const OVERALL_BANDS = accuracyBands(60);

const scales: Scale[] = [
  {
    key: "classic",
    title: "دقت رنگ واژه (کلاسیک)",
    code: "CLS",
    group: "classic",
    description: "تعداد کارت هایی که در آنها رنگ جوهر به درستی نام گذاری شده، در حالت رنگ واژه.",
    results: CLASSIC_BANDS,
  },
  {
    key: "emotional",
    title: "دقت واژه های هیجانی",
    code: "EMO",
    group: "emotional",
    description: "تعداد کارت هایی که در آنها رنگ جوهر به درستی نام گذاری شده، در حالت واژه های هیجانی و خنثی.",
    results: CLASSIC_BANDS,
  },
  {
    key: "overall",
    title: "دقت کلی",
    code: "ALL",
    group: "overall",
    description: "دقت در مجموع ۶۰ کارت اصلی.",
    includes: ["classic", "emotional"],
    results: OVERALL_BANDS,
  },
];

const questions: Question[] = MAIN.map((spec) => ({
  id: spec.id,
  text: `واژه «${spec.word}» با جوهر ${spec.ink}`,
  scale: spec.mode === "classic" ? "classic" : "emotional",
  options: STROOP_OPTIONS as AnswerOption[],
  answer: spec.answer,
  level: spec.level,
  stroop: {
    mode: spec.mode,
    word: spec.word,
    ink: spec.ink,
    inkHex: spec.inkHex,
    congruent: spec.congruent,
    emotional: spec.emotional,
  },
}));

const stroop: PsychTest = {
  slug: "stroop",
  code: "STROOP-FA",
  title: "آزمون استروب فارسی",
  englishTitle: "Persian Stroop Test",
  shortDescription: "سنجش توجه انتخابی، کنترل شناختی و میزان تداخل معنای واژه در نام گذاری رنگ، در دو حالت رنگ واژه و واژه هیجانی.",
  about:
    "در این آزمون یک واژه با رنگی متفاوت از معنای خود نمایش داده می شود و باید رنگ جوهر را نام ببرید، نه واژه را بخوانید. " +
    "دو حالت بررسی می شود: حالت کلاسیک که تداخل معنای نام رنگ ها را میسنجد، و حالت هیجانی که تأثیر واژه های هیجانی را در برابر واژه های خنثی بررسی میکند. " +
    "علاوه بر دقت، زمان واکنش شما نیز ثبت می شود تا میزان تداخل به صورت میلیثانیه قابل مقایسه باشد.",
  instructions:
    "رنگ جوهری را که واژه با آن نوشته شده انتخاب کنید و معنای واژه را نادیده بگیرید. " +
    "پاسخ ها را با کلیک یا کلید های ۱ تا ۴ وارد کنید. ابتدا ۱۵ کارت تمرینی در هر حالت نمایش داده می شود، سپس ۳۰ کارت اصلی همان حالت آغاز می شود. " +
    "سریع و دقیق پاسخ دهید؛ زمان واکنش شما ثبت می شود.",
  category: "intelligence",
  alsoIn: ["mental-health"],
  audience: "نوجوانان و بزرگسالان",
  estimatedMinutes: 6,
  options: STROOP_OPTIONS as AnswerOption[],
  questions,
  scales,
  scaleGroups: [
    { key: "classic", title: "حالت رنگ واژه" },
    { key: "emotional", title: "حالت واژه هیجانی" },
    { key: "overall", title: "دقت کلی" },
  ],
  kind: "ability",
  report: "stroop",
  source: {
    citation: "Stroop, J. R. (1935). Studies of interference in serial verbal reactions. Journal of Experimental Psychology, 18(6), 643-662.",
    license: "اقتباس و بومی سازی آزاد توسط مایندمتر. واژه ها، ترتیب محرک ها و تفسیر فارسی تألیف مایندمتر است و نسخه رسمی یا هنجار منتشرشده محسوب نمی شود.",
    persianNote: "محرک های فارسی بر اساس واژه های رایج در زبان فارسی ساخته شدهاند و فاقد هنجار رسمی برای جمعیت ایران هستند.",
  },
  resultNote: {
    title: "درباره این نتیجه",
    paragraphs: [
      "آزمون استروب یک ابزار پژوهشی و غربالگری برای بررسی توجه انتخابی و کنترل شناختی است، نه یک آزمون تشخیصی بالینی.",
      "نتیجه تحت تأثیر عواملی مانند خستگی، سطح هوشیاری در لحظه آزمون، تجربه با وظیفه و تفاوت های فردی در سرعت پردازش قرار میگیرد.",
      "برای تفسیر بالینی، نتیجه این آزمون را در کنار مصاحبه و سایر ارزیابیها توسط روانشناس یا روانپزشک بررسی کنید.",
    ],
  },
};

export default stroop;
