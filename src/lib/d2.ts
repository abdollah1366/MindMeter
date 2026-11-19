/**
 * محاسبه و تفسیر شاخص‌های آزمون توجه و تمرکز d2.
 *
 * داده‌ی خام هر ردیف در پاسخ‌ها ذخیره می‌شود:
 * - `d2_seed`: seed ساخت محرک‌ها
 * - `d2_click_<row>`: ماسک بیتی خانه‌های کلیک‌شده
 * - شناسه‌ی هر ردیف (`d2-row-<row>`): تعداد کل پردازش همان ردیف (TN)
 *
 * گزارش از روی seed، محرک‌ها را دوباره می‌سازد و با ماسک کلیک‌ها، TP/E1/E2
 * و ۱۰ شاخص استاندارد را محاسبه می‌کند.
 */
import {
  D2_COLS,
  D2_INDEX_META,
  D2_ROWS,
  D2_ROW_SECONDS,
  D2_TARGETS_PER_ROW,
  D2_TOTAL_SECONDS,
  generateD2Rows,
  indicesFromMask,
  tnFromMask,
} from "@/data/d2-content";
import type { Answers } from "./scoring";
import { toPersianDigits } from "./scoring";
import type { PsychTest, ResultLevel } from "./types";

export type D2RowResult = {
  row: number;
  tn: number;
  tp: number;
  e1: number;
  e2: number;
  e: number;
  cp: number;
  targets: number;
  clicked: number;
  accuracy: number;
};

export type D2Totals = {
  tn: number;
  tp: number;
  e1: number;
  e2: number;
  e: number;
  tnE: number;
  cp: number;
  fr: number;
  ips: number;
  acc: number;
  maxTn: number;
  minTn: number;
  meanTn: number;
};

export type D2Index = {
  key: string;
  code: string;
  title: string;
  value: number;
  display: string;
  unit: string;
  description: string;
  level: ResultLevel;
  /** برچسب اختصاصی همان شاخص (مثلاً «بسیار بالا» یا «خیلی کم») */
  band: string;
  note: string;
};

export type D2Match = {
  title: string;
  level: ResultLevel;
  label: string;
  note: string;
};

export type D2Report = {
  rows: D2RowResult[];
  totals: D2Totals;
  indices: D2Index[];
  overall: { level: ResultLevel; title: string; band?: string; paragraphs: string[] };
  sections: { title: string; paragraphs: string[] }[];
  academic: D2Match[];
  jobs: D2Match[];
  dailyLife: string[];
  plan: string[];
  theory: string[];
  bestRows: number[];
  weakRows: number[];
};

const RANK: Record<ResultLevel, number> = { normal: 0, mild: 1, moderate: 2, high: 3, severe: 4 };

const PERFORMANCE_NOTE: Record<ResultLevel, string> = {
  normal: "در محدوده‌ی مطلوب قرار دارد.",
  mild: "در محدوده‌ی متوسط قرار دارد و جای بهبود دارد.",
  moderate: "نیاز به توجه و تمرین دارد.",
  high: "پایین‌تر از سطح مورد انتظار است و بهتر است بیشتر بررسی شود.",
  severe: "به‌طور قابل توجهی پایین است و بررسی تخصصی را ضروری می‌کند.",
};

const ERROR_NOTE: Record<ResultLevel, string> = {
  normal: "در محدوده‌ی مطلوب و کم است.",
  mild: "در محدوده‌ی متوسط قرار دارد.",
  moderate: "نیاز به توجه دارد.",
  high: "بیشتر از حد مورد انتظار است و بهتر است بیشتر بررسی شود.",
  severe: "به‌طور قابل توجهی زیاد است و بررسی تخصصی را ضروری می‌کند.",
};

const STABILITY_NOTE: Record<ResultLevel, string> = {
  normal: "نسبتاً ثابت و منظم است.",
  mild: "در محدوده‌ی متوسط قرار دارد.",
  moderate: "نوسان قابل توجهی دارد.",
  high: "نوسان زیادی دارد و بهتر است بیشتر بررسی شود.",
  severe: "نوسان بسیار زیادی دارد.",
};

const OVERALL_TITLE: Record<ResultLevel, string> = {
  normal: "تمرکز و توجه در محدوده‌ی مطلوب",
  mild: "تمرکز و توجه در محدوده‌ی متوسط",
  moderate: "تمرکز و توجه نیازمند بهبود",
  high: "تمرکز و توجه پایین‌تر از سطح مورد انتظار",
  severe: "تمرکز و توجه به‌طور قابل توجهی پایین",
};

const fa = (value: number | string) => toPersianDigits(value);
const faList = (values: number[]) => values.map((value) => fa(value)).join("، ");

function worst(levels: ResultLevel[]): ResultLevel {
  return levels.reduce<ResultLevel>((worstLevel, level) => (RANK[level] > RANK[worstLevel] ? level : worstLevel), "normal");
}

function higherBetter(
  value: number,
  cuts: { min: number; level: ResultLevel; title: string }[],
): { level: ResultLevel; title: string } {
  for (const cut of cuts) if (value >= cut.min) return { level: cut.level, title: cut.title };
  return { level: "severe", title: "پایین" };
}

function lowerBetter(
  value: number,
  cuts: { max: number; level: ResultLevel; title: string }[],
): { level: ResultLevel; title: string } {
  for (const cut of cuts) if (value <= cut.max) return { level: cut.level, title: cut.title };
  return { level: "severe", title: "بسیار زیاد" };
}

const SPEED_CUTS = [
  { min: 0.8, level: "normal" as const, title: "بسیار بالا" },
  { min: 0.65, level: "normal" as const, title: "بالا" },
  { min: 0.5, level: "mild" as const, title: "متوسط" },
  { min: 0.35, level: "high" as const, title: "پایین‌تر از میانگین" },
  { min: 0, level: "severe" as const, title: "پایین" },
];

const TP_CUTS = [
  { min: 0.9, level: "normal" as const, title: "بسیار خوب" },
  { min: 0.75, level: "normal" as const, title: "خوب" },
  { min: 0.6, level: "mild" as const, title: "متوسط" },
  { min: 0.4, level: "high" as const, title: "پایین‌تر از میانگین" },
  { min: 0, level: "severe" as const, title: "پایین" },
];

const EFFICIENCY_CUTS = [
  { min: 0.92, level: "normal" as const, title: "بسیار خوب" },
  { min: 0.85, level: "normal" as const, title: "خوب" },
  { min: 0.75, level: "mild" as const, title: "متوسط" },
  { min: 0.6, level: "high" as const, title: "پایین‌تر از میانگین" },
  { min: 0, level: "severe" as const, title: "پایین" },
];

const CP_CUTS = [
  { min: 0.8, level: "normal" as const, title: "بسیار قوی" },
  { min: 0.65, level: "normal" as const, title: "قوی" },
  { min: 0.5, level: "mild" as const, title: "متوسط" },
  { min: 0.35, level: "high" as const, title: "پایین‌تر از میانگین" },
  { min: 0, level: "severe" as const, title: "ضعیف" },
];

const ACC_CUTS = [
  { min: 95, level: "normal" as const, title: "عالی" },
  { min: 90, level: "normal" as const, title: "خوب" },
  { min: 80, level: "mild" as const, title: "متوسط" },
  { min: 70, level: "high" as const, title: "پایین‌تر از میانگین" },
  { min: 0, level: "severe" as const, title: "ضعیف" },
];

export function buildD2Report(test: PsychTest, answers: Answers): D2Report {
  const seed =
    typeof answers.d2_seed === "number" && Number.isFinite(answers.d2_seed) ? answers.d2_seed : 1;
  const generated = generateD2Rows(seed);

  const rows: D2RowResult[] = generated.map((row, index) => {
    const clickKey = `d2_click_${index + 1}`;
    const rowHasClicks = typeof answers[clickKey] === "number" && Number.isFinite(answers[clickKey]);
    const mask = rowHasClicks ? answers[clickKey] : 0;
    const clicked = rowHasClicks ? indicesFromMask(mask, D2_COLS) : [];
    const clickedSet = new Set(clicked);
    const questionId = test.questions[index]?.id;
    const storedTn = questionId && typeof answers[questionId] === "number" ? answers[questionId] : 0;
    const tn = rowHasClicks ? tnFromMask(mask, D2_COLS) : storedTn;

    const tp = rowHasClicks ? clicked.filter((cellIndex) => row.cells[cellIndex]?.target).length : 0;
    const e2 = rowHasClicks
      ? clicked.filter((cellIndex) => row.cells[cellIndex] && !row.cells[cellIndex].target).length
      : 0;
    const e1 = rowHasClicks
      ? row.cells.slice(0, tn).filter((cell, cellIndex) => cell.target && !clickedSet.has(cellIndex)).length
      : 0;
    const e = e1 + e2;
    const cp = tp - e2;
    const targets = row.cells.filter((cell) => cell.target).length;
    const accuracy = tp + e > 0 ? Math.round((tp / (tp + e)) * 100) : 0;

    return { row: index + 1, tn, tp, e1, e2, e, cp, targets, clicked: clicked.length, accuracy };
  });

  const tn = rows.reduce((sum, row) => sum + row.tn, 0);
  const tp = rows.reduce((sum, row) => sum + row.tp, 0);
  const e1 = rows.reduce((sum, row) => sum + row.e1, 0);
  const e2 = rows.reduce((sum, row) => sum + row.e2, 0);
  const e = e1 + e2;
  const tnE = tn - e;
  const cp = tp - e2;
  const maxTn = rows.reduce((max, row) => Math.max(max, row.tn), 0);
  const minTn = rows.length ? Math.min(...rows.map((row) => row.tn)) : 0;
  const fr = maxTn - minTn;
  const meanTn = rows.length ? tn / rows.length : 0;
  const ips = tn / D2_TOTAL_SECONDS;
  const acc = tp + e > 0 ? (tp / (tp + e)) * 100 : 0;

  const tnLevel = higherBetter(tn / (D2_ROWS * D2_COLS), SPEED_CUTS);
  const ipsLevel = higherBetter(ips / (D2_COLS / D2_ROW_SECONDS), SPEED_CUTS);
  const tpLevel = higherBetter(tp / (D2_TARGETS_PER_ROW * D2_ROWS), TP_CUTS);
  const tnELevel = higherBetter(tn > 0 ? tnE / tn : 0, EFFICIENCY_CUTS);
  // CP با حداکثر هدف‌های ممکن سنجیده می‌شود، نه با TN؛ چون فقط ۶ محرک از ۴۷ محرک هر ردیف هدف است
  const cpLevel = higherBetter(tn > 0 ? cp / (D2_TARGETS_PER_ROW * D2_ROWS) : 0, CP_CUTS);
  const accLevel = higherBetter(acc, ACC_CUTS);

  const e1Rate = tn > 0 ? e1 / tn : 0;
  const e2Rate = tn > 0 ? e2 / tn : 0;
  const eRate = tn > 0 ? e / tn : 0;
  const frRatio = meanTn > 0 ? fr / meanTn : 0;

  const e1Level = lowerBetter(e1Rate, [
    { max: 0.02, level: "normal", title: "خیلی کم" },
    { max: 0.05, level: "normal", title: "کم" },
    { max: 0.1, level: "mild", title: "متوسط" },
    { max: 0.18, level: "high", title: "زیاد" },
    { max: Infinity, level: "severe", title: "بسیار زیاد" },
  ]);
  const e2Level = lowerBetter(e2Rate, [
    { max: 0.01, level: "normal", title: "خیلی کم" },
    { max: 0.03, level: "normal", title: "کم" },
    { max: 0.06, level: "mild", title: "متوسط" },
    { max: 0.12, level: "high", title: "زیاد" },
    { max: Infinity, level: "severe", title: "بسیار زیاد" },
  ]);
  const eLevel = lowerBetter(eRate, [
    { max: 0.03, level: "normal", title: "خیلی کم" },
    { max: 0.07, level: "normal", title: "کم" },
    { max: 0.12, level: "mild", title: "متوسط" },
    { max: 0.2, level: "high", title: "زیاد" },
    { max: Infinity, level: "severe", title: "بسیار زیاد" },
  ]);
  const frLevel =
    tn === 0
      ? { level: "severe" as const, title: "قابل ارزیابی نیست" }
      : lowerBetter(frRatio, [
          { max: 0.2, level: "normal", title: "بسیار ثابت" },
          { max: 0.35, level: "normal", title: "نسبتاً ثابت" },
          { max: 0.5, level: "mild", title: "متوسط" },
          { max: 0.7, level: "high", title: "نوسان زیاد" },
          { max: Infinity, level: "severe", title: "نوسان بسیار زیاد" },
        ]);

  const noData = tn === 0;
  let overallLevel: ResultLevel = noData ? "mild" : worst([cpLevel.level, accLevel.level]);
  if (!noData && tn < D2_ROWS * D2_COLS * 0.2 && RANK[overallLevel] < RANK.high) overallLevel = "high";

  const meta = (code: string) => D2_INDEX_META.find((item) => item.code === code)!;

  const indices: D2Index[] = [
    {
      key: "tn",
      code: "TN",
      title: meta("TN").title,
      value: tn,
      display: fa(tn),
      unit: "خانه",
      description: meta("TN").description,
      level: tnLevel.level,
      band: tnLevel.title,
      note: `حجم پردازش شما ${PERFORMANCE_NOTE[tnLevel.level]}`,
    },
    {
      key: "tp",
      code: "TP",
      title: meta("TP").title,
      value: tp,
      display: fa(tp),
      unit: "نشانه",
      description: meta("TP").description,
      level: tpLevel.level,
      band: tpLevel.title,
      note: `تعداد پاسخ‌های صحیح شما ${PERFORMANCE_NOTE[tpLevel.level]}`,
    },
    {
      key: "e1",
      code: "E1",
      title: meta("E1").title,
      value: e1,
      display: fa(e1),
      unit: "خطا",
      description: meta("E1").description,
      level: e1Level.level,
      band: e1Level.title,
      note: `میزان خطای حذف شما ${ERROR_NOTE[e1Level.level]}`,
    },
    {
      key: "e2",
      code: "E2",
      title: meta("E2").title,
      value: e2,
      display: fa(e2),
      unit: "خطا",
      description: meta("E2").description,
      level: e2Level.level,
      band: e2Level.title,
      note: `میزان خطای ارتکاب شما ${ERROR_NOTE[e2Level.level]}`,
    },
    {
      key: "e",
      code: "E",
      title: meta("E").title,
      value: e,
      display: fa(e),
      unit: "خطا",
      description: meta("E").description,
      level: eLevel.level,
      band: eLevel.title,
      note: `مجموع خطاهای شما ${ERROR_NOTE[eLevel.level]}`,
    },
    {
      key: "tn-e",
      code: "TN-E",
      title: meta("TN-E").title,
      value: tnE,
      display: fa(tnE),
      unit: "امتیاز",
      description: meta("TN-E").description,
      level: tnELevel.level,
      band: tnELevel.title,
      note: `کارکرد مؤثر شما ${PERFORMANCE_NOTE[tnELevel.level]}`,
    },
    {
      key: "cp",
      code: "CP",
      title: meta("CP").title,
      value: cp,
      display: fa(cp),
      unit: "امتیاز",
      description: meta("CP").description,
      level: cpLevel.level,
      band: cpLevel.title,
      note: `نمره‌ی تمرکز شما ${PERFORMANCE_NOTE[cpLevel.level]}`,
    },
    {
      key: "fr",
      code: "FR",
      title: meta("FR").title,
      value: fr,
      display: fa(fr),
      unit: "خانه",
      description: meta("FR").description,
      level: frLevel.level,
      band: frLevel.title,
      note:
        tn === 0
          ? "برای ارزیابی ثبات عملکرد، داده‌ی کافی ثبت نشده است."
          : `ثبات عملکرد شما در ردیف‌ها ${STABILITY_NOTE[frLevel.level]}`,
    },
    {
      key: "ips",
      code: "IPS",
      title: meta("IPS").title,
      value: ips,
      display: fa(ips.toFixed(2)),
      unit: "محرک در ثانیه",
      description: meta("IPS").description,
      level: ipsLevel.level,
      band: ipsLevel.title,
      note: `سرعت پردازش شما ${PERFORMANCE_NOTE[ipsLevel.level]}`,
    },
    {
      key: "acc",
      code: "ACC",
      title: meta("ACC").title,
      value: acc,
      display: `${fa(Math.round(acc))}٪`,
      unit: "درصد",
      description: meta("ACC").description,
      level: accLevel.level,
      band: accLevel.title,
      note: `دقت پاسخ‌دهی شما ${PERFORMANCE_NOTE[accLevel.level]}`,
    },
  ];

  const overallParagraphs = noData
    ? [
        "در این اجرا هیچ پاسخی ثبت نشد؛ بنابراین داده‌ی کافی برای محاسبه‌ی معنادار شاخص‌های توجه و تمرکز وجود ندارد.",
        "این وضعیت می‌تواند ناشی از رها کردن آزمون، مشکل فنی یا عدم آشنایی با نحوه‌ی علامت‌گذاری باشد و به‌تنهایی درباره‌ی تمرکز شما چیزی نمی‌گوید.",
        "لطفاً آزمون را در محیطی آرام و بدون حواس‌پرتی دوباره انجام دهید و در هر ردیف روی هدف‌ها کلیک کنید.",
      ]
    : [
        `در این اجرا نمره‌ی تمرکز (CP) شما ${fa(cp)} و دقت پاسخ‌دهی ${fa(Math.round(acc))} درصد بود. در مجموع ${fa(tn)} محرک را پردازش کردید و ${fa(tp)} پاسخ صحیح ثبت شد.`,
        `خطاهای شما شامل ${fa(e1)} خطای حذف و ${fa(e2)} خطای ارتکاب بود. ${
          frLevel.level === "normal" ? "ثبات عملکرد شما در ردیف‌ها مناسب بود." : "نوسان عملکرد شما در ردیف‌ها قابل توجه بود."
        }`,
        "این نتیجه یک ارزیابی توصیفی از عملکرد توجه در لحظه‌ی آزمون است و تحت تأثیر خستگی، انگیزه، محیط و آشنایی با تکلیف قرار می‌گیرد.",
      ];

  const activeRows = rows.filter((row) => row.tn > 0);
  const bestRows = [...activeRows].sort((a, b) => b.cp - a.cp || b.tn - a.tn).slice(0, 2).map((row) => row.row);
  // بهترین ردیف‌ها از فهرست ضعیف‌ترین‌ها کنار گذاشته می‌شوند تا یک ردیف هم‌زمان در هر دو فهرست نیاید
  const weakRows = [...activeRows]
    .filter((row) => !bestRows.includes(row.row))
    .sort((a, b) => a.cp - b.cp || a.tn - b.tn)
    .slice(0, 2)
    .map((row) => row.row);
  const firstHalfTn = rows.slice(0, 7).reduce((sum, row) => sum + row.tn, 0);
  const secondHalfTn = rows.slice(7).reduce((sum, row) => sum + row.tn, 0);
  const fatigue = firstHalfTn > 0 && secondHalfTn < firstHalfTn * 0.8;
  const warmup = firstHalfTn > 0 && secondHalfTn > firstHalfTn * 1.15;

  const rowParagraphs = [
    bestRows.length
      ? `بهترین عملکرد شما در ردیف‌های ${faList(bestRows)} بود؛ در این ردیف‌ها تعادل بهتری بین سرعت و دقت دیده شد.`
      : "برای مقایسه‌ی ردیف‌ها، داده‌ی کافی ثبت نشده است.",
    weakRows.length
      ? `ردیف‌های ${faList(weakRows)} کمترین نمره‌ی تمرکز را داشتند؛ بررسی این ردیف‌ها می‌تواند نقطه‌ی شروع تمرین باشد.`
      : "",
    fatigue
      ? "حجم پردازش در نیمه‌ی دوم آزمون کاهش محسوسی داشت؛ این الگو می‌تواند نشانه‌ی خستگی یا افت توجه پایدار باشد."
      : warmup
        ? "حجم پردازش در نیمه‌ی دوم آزمون افزایش یافت؛ این الگو می‌تواند نشانه‌ی گرم‌شدن و آشنایی تدریجی با تکلیف باشد."
        : "حجم پردازش در نیمه‌ی اول و دوم نسبتاً پایدار بود.",
    tn === 0
      ? "برای ارزیابی نوسان عملکرد، داده‌ی کافی ثبت نشده است."
      : `نرخ نوسان (FR) شما ${fa(fr)} خانه بود. ${STABILITY_NOTE[frLevel.level]}`,
  ].filter(Boolean);

  const idx = (key: string) => indices.find((item) => item.key === key)!;

  const sections = [
    { title: "۱. خلاصه‌ی عملکرد", paragraphs: overallParagraphs },
    {
      title: "۲. سرعت و حجم پردازش (TN و IPS)",
      paragraphs: [
        idx("tn").note,
        idx("ips").note,
        "TN نشان می‌دهد در مدت آزمون چند محرک را بررسی کرده‌اید و IPS همین حجم را به ازای هر ثانیه بیان می‌کند. سرعت بالا تنها زمانی ارزشمند است که با دقت همراه باشد.",
      ],
    },
    {
      title: "۳. دقت و پاسخ‌های صحیح (TP و ACC)",
      paragraphs: [
        idx("tp").note,
        idx("acc").note,
        "TP تعداد هدف‌هایی است که درست انتخاب کرده‌اید و ACC نسبت پاسخ‌های صحیح به مجموع پاسخ‌های درست و خطاهاست. این دو شاخص با هم کیفیت پاسخ‌دهی را نشان می‌دهند.",
      ],
    },
    {
      title: "۴. خطاهای حذف (E1)",
      paragraphs: [
        idx("e1").note,
        "خطای حذف وقتی رخ می‌دهد که یک هدف در محدوده‌ی پردازش‌شده دیده نشود. این خطا بیشتر با افت توجه، شتاب‌زدگی در اسکن یا نادیده‌گرفتن جزئیات مرتبط است.",
      ],
    },
    {
      title: "۵. خطاهای ارتکاب (E2)",
      paragraphs: [
        idx("e2").note,
        "خطای ارتکاب وقتی رخ می‌دهد که یک محرک غیرهدف انتخاب شود. این خطا بیشتر با کنترل پاسخ، تمایز محرک و مهار پاسخ‌های تکانشی مرتبط است.",
      ],
    },
    {
      title: "۶. مجموع خطاها و کارکرد مؤثر (E و TN-E)",
      paragraphs: [
        idx("e").note,
        idx("tn-e").note,
        "E مجموع خطاهای حذف و ارتکاب است و TN-E نشان می‌دهد از حجم پردازش شما چه مقدار به عملکرد مؤثر تبدیل شده است.",
      ],
    },
    {
      title: "۷. نمره‌ی تمرکز (CP)",
      paragraphs: [
        idx("cp").note,
        "CP از تعداد پاسخ‌های صحیح منهای خطاهای ارتکاب به دست می‌آید. این شاخص هم پاسخ‌های صحیح و هم خطاهای ارتکاب را هم‌زمان در نظر می‌گیرد و یکی از اصلی‌ترین شاخص‌های تمرکز در آزمون d2 است.",
      ],
    },
    {
      title: "۸. نوسان عملکرد (FR)",
      paragraphs: [
        idx("fr").note,
        "FR تفاوت بیشترین و کمترین تعداد پردازش در ردیف‌هاست. FR پایین‌تر یعنی سرعت و توجه شما در طول آزمون ثابت‌تر بوده است.",
      ],
    },
    { title: "۹. الگوی ردیف‌ها و ثبات توجه", paragraphs: rowParagraphs },
    {
      title: "۱۰. جمع‌بندی و پیشنهادهای کاربردی",
      paragraphs: [
        overallParagraphs[0],
        "برای بهبود تمرکز، تمرین‌های اسکن دیداری زمان‌دار، کاهش حواس‌پرتی و تقسیم کارهای طولانی به بازه‌های کوتاه پیشنهاد می‌شود. اگر نگرانی درباره‌ی توجه یا علائم ADHD دارید، این نتیجه را با روان‌شناس یا روان‌پزشک در میان بگذارید.",
        "این گزارش جایگزین تشخیص بالینی نیست و تفسیر نهایی باید در کنار مصاحبه، سابقه و سایر ابزارهای ارزیابی انجام شود.",
      ],
    },
  ];

  const cpMax = D2_TARGETS_PER_ROW * D2_ROWS;
  const fit = (tn > 0 ? Math.max(0, cp) / cpMax : 0) * 0.5 + (acc / 100) * 0.3 + (1 - Math.min(frRatio, 1)) * 0.2;
  const fitMatch = (title: string, note: string): D2Match => {
    const level: ResultLevel = fit >= 0.7 ? "normal" : fit >= 0.55 ? "mild" : fit >= 0.4 ? "high" : "severe";
    const label =
      fit >= 0.85 ? "تناسب بالا" : fit >= 0.7 ? "تناسب خوب" : fit >= 0.55 ? "تناسب متوسط" : fit >= 0.4 ? "نیازمند تقویت" : "تناسب پایین";
    return { title, level, label, note };
  };

  const academic = [
    fitMatch("ریاضی و علوم پایه", "نیاز به تمرکز پایدار در حل مسئله و دقت در جزئیات محاسبات."),
    fitMatch("زبان و ادبیات", "نیاز به توجه پایدار در خواندن متن، پیگیری جمله‌ها و دقت در جزئیات زبانی."),
    fitMatch("علوم انسانی و اجتماعی", "نیاز به توجه به جزئیات، کنترل پاسخ و پیگیری اطلاعات در بازه‌های طولانی."),
    fitMatch("هنر و طراحی", "نیاز به توجه انتخابی، سرعت ادراکی و تشخیص جزئیات بصری."),
    fitMatch("فنی و مهندسی", "نیاز به دقت، تمرکز و پیگیری جزئیات فنی در تکالیف زمان‌دار."),
    fitMatch("مدیریت و کارآفرینی", "نیاز به سرعت تصمیم‌گیری همراه با کنترل خطا و توجه به جزئیات."),
  ];

  const jobs = [
    fitMatch("کارهای دفتری و داده‌پردازی", "دقت در داده‌ها، بررسی مستندات و کنترل خطا در تکالیف تکراری."),
    fitMatch("مشاغل تحلیلی و پژوهشی", "تمرکز طولانی، پیگیری جزئیات و کنترل خطا در تحلیل اطلاعات."),
    fitMatch("مشاغل هنری و خلاق", "توجه انتخابی، سرعت ادراکی و انعطاف در پردازش محرک‌های بصری."),
    fitMatch("مشاغل خدماتی و ارتباطی", "توجه به جزئیات، کنترل پاسخ و حفظ تمرکز در تعامل‌های متعدد."),
    fitMatch("مشاغل فنی و صنعتی", "دقت و سرعت در تشخیص محرک‌ها و کنترل خطا در محیط‌های زمان‌دار."),
  ];

  const dailyLife = [
    "در کارهایی مانند خواندن متن‌های طولانی، بررسی صورت‌حساب، رانندگی در مسیرهای شلوغ یا کار با رایانه، کیفیت توجه شما نقش مستقیم دارد.",
    e2Rate > 0.06
      ? "خطای ارتکاب شما بالاتر از حد معمول بود؛ در موقعیت‌هایی که پاسخ سریع اهمیت دارد، یک مکث کوتاه قبل از اقدام می‌تواند به کاهش خطا کمک کند."
      : "کنترل پاسخ شما در این اجرا نسبتاً مناسب بود؛ حفظ همین تعادل بین سرعت و دقت را در کارهای روزمره ادامه دهید.",
    frLevel.level === "normal"
      ? "ثبات نسبی عملکرد شما نشان می‌دهد در کارهای طولانی‌تر هم می‌توانید تمرکز خود را حفظ کنید."
      : "نوسان عملکرد بالا نشان می‌دهد تمرکز شما در طول زمان یکنواخت نیست؛ تقسیم کارهای طولانی به بازه‌های کوتاه‌تر و استراحت‌های برنامه‌ریزی‌شده می‌تواند کمک کند.",
    tnLevel.level === "normal" || tnLevel.level === "mild"
      ? "سرعت پردازش شما در محدوده‌ی قابل قبول است؛ برای بهبود بیشتر، دقت را فدای سرعت نکنید."
      : "سرعت پردازش شما پایین‌تر از حد مورد انتظار بود؛ تمرین‌های زمان‌دار و کاهش عوامل حواس‌پرتی می‌تواند به افزایش تدریجی سرعت کمک کند.",
  ];

  const plan = [
    "روزانه ۱۰ تا ۱۵ دقیقه تمرین اسکن دیداری انجام دهید: ردیف‌هایی از حروف d و p بسازید و فقط d با دو خط را علامت بزنید.",
    "قبل از شروع کارهای طولانی، محیط را از حواس‌پرتی پاک کنید و گوشی را در حالت بی‌صدا بگذارید.",
    "در کارهای حساس، ابتدا دقت را در اولویت قرار دهید و بعد سرعت را افزایش دهید.",
    "کارهای طولانی را به بازه‌های ۲۰ تا ۳۰ دقیقه‌ای تقسیم کنید و بین آن‌ها ۳ تا ۵ دقیقه استراحت کنید.",
    "اگر خطای ارتکاب شما بالا بود، تمرین «مکث یک‌ثانیه‌ای قبل از پاسخ» را انجام دهید.",
    "اگر نگرانی درباره‌ی توجه، تمرکز یا علائم ADHD دارید، این نتیجه را با روان‌شناس یا روان‌پزشک در میان بگذارید.",
  ];

  const theory = [
    "آزمون d2 توجه انتخابی را در شرایط محدودیت زمانی می‌سنجد: فرد باید از میان محرک‌های مشابه، هدف‌های مشخص را پیدا کند و هم‌زمان سرعت و دقت خود را حفظ کند.",
    "TN حجم پردازش، TP دقت شناسایی، E1 و E2 نوع خطاها، CP هماهنگی سرعت و دقت، FR ثبات عملکرد در ردیف‌ها و IPS سرعت پردازش را توصیف می‌کنند.",
    "هیچ‌یک از این شاخص‌ها به‌تنهایی تشخیص بالینی نیستند؛ تفسیر نهایی باید در کنار مصاحبه، سابقه و سایر ابزارهای ارزیابی انجام شود.",
  ];

  return {
    rows,
    totals: { tn, tp, e1, e2, e, tnE, cp, fr, ips, acc, maxTn, minTn, meanTn },
    indices,
    overall: {
      level: overallLevel,
      title: noData ? "داده‌ی کافی برای ارزیابی تمرکز ثبت نشد" : OVERALL_TITLE[overallLevel],
      band: noData ? "داده ناکافی" : undefined,
      paragraphs: overallParagraphs,
    },
    sections,
    academic,
    jobs,
    dailyLife,
    plan,
    theory,
    bestRows,
    weakRows,
  };
}

/** برچسب کوتاه نتیجه‌ی d2 برای فهرست نتایج و پرونده‌ی مراجع */
export function d2HeadlineChip(
  test: PsychTest,
  answers: Answers,
): { key: string; text: string; level: ResultLevel } {
  const report = buildD2Report(test, answers);
  const cp = report.indices.find((item) => item.key === "cp");
  return {
    key: "d2",
    text: cp ? `تمرکز: ${cp.band} · CP ${cp.display}` : report.overall.title,
    level: report.overall.level,
  };
}
