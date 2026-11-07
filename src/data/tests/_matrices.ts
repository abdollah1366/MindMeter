/**
 * ماتریس‌های پیشرونده‌ی مایندمتر (MPM)
 *
 * سؤال‌ها اختصاصی مایندمتر هستند و از روی «قاعده» ساخته می‌شوند؛ هیچ سؤالی از ماتریس‌های پیشرونده‌ی ریون
 * (Raven's Progressive Matrices، ناشر Pearson) کپی نشده است. فقط قالب کلی (ماتریس با یک خانه‌ی خالی و دشواری فزاینده)
 * مشابه است. پاسخ درست هر سؤال مستقیماً از قاعده‌ها به دست می‌آید و هر گزینه‌ی غلط دست‌کم یک قاعده را نقض می‌کند.
 */
import type { AnswerOption, Glyph, PsychTest, Question } from "@/lib/types";
import { toPersianDigits } from "@/lib/scoring";
import { hash, rng, shuffle, type Level } from "./_intelligence";

type Shape = Glyph["shape"];
type Fill = NonNullable<Glyph["fill"]>;
type InnerShape = NonNullable<Glyph["inner"]>["shape"];
type Rand = () => number;

const SHAPES: Shape[] = ["circle", "square", "triangle", "diamond", "star"];
const INNER: InnerShape[] = ["circle", "square", "triangle", "diamond"];
const FILLS: Fill[] = ["solid", "empty", "striped"];

/** سه مقدار متمایز تصادفی از یک فهرست */
const pick3 = <T,>(arr: T[], rand: Rand) => shuffle(arr, rand).slice(0, 3) as [T, T, T];
const int = (rand: Rand, n: number) => Math.floor(rand() * n);

/** کلید یکتای هر شکل برای مقایسه */
export const glyphKey = (x: Glyph) =>
  [x.shape, x.count ?? 1, x.fill ?? "solid", (x.rotate ?? 0) % 360, x.size ?? 0, x.inner?.shape ?? "-", x.inner?.fill ?? "-"].join("|");

type Attr = "shape" | "count" | "fill" | "size" | "rotate" | "inner" | "innerFill";

/** یک الگوی سؤال: اندازه‌ی ماتریس، تابع خانه‌ها و ویژگی‌هایی که در آن تغییر می‌کنند */
type Template = (rand: Rand) => { n: 2 | 3; cell: (r: number, c: number) => Glyph; vary: Attr[] };

/** گزینه‌های غلط: تغییر یک ویژگی (اول ویژگی‌هایی که در ماتریس تغییر می‌کنند)، سپس خانه‌های خود ماتریس، سپس دو ویژگی */
function variants(a: Glyph, attr: Attr): Glyph[] {
  const out: Glyph[] = [];
  const n = a.count ?? 1;
  switch (attr) {
    case "shape":
      for (const s of SHAPES) if (s !== a.shape && a.shape !== "arrow") out.push({ ...a, shape: s });
      break;
    case "count":
      if (!a.inner && a.shape !== "arrow") for (const d of [1, -1, 2, -2]) if (n + d >= 1 && n + d <= 4) out.push({ ...a, count: n + d });
      break;
    case "fill":
      for (const f of FILLS) if (f !== (a.fill ?? "solid") && !(a.shape === "arrow" && f === "striped")) out.push({ ...a, fill: f });
      break;
    case "size":
      if (a.size) for (const s of [1, 2, 3] as const) if (s !== a.size) out.push({ ...a, size: s });
      break;
    case "rotate":
      for (const d of [45, 90, 135, 180, 225, 270, 315]) out.push({ ...a, rotate: ((a.rotate ?? 0) + d) % 360 });
      break;
    case "inner":
      if (a.inner) for (const s of INNER) if (s !== a.inner.shape && s !== a.shape) out.push({ ...a, inner: { ...a.inner, shape: s } });
      break;
    case "innerFill":
      if (a.inner) out.push({ ...a, inner: { ...a.inner, fill: a.inner.fill === "empty" ? "solid" : "empty" } });
      break;
  }
  return out;
}

const ALL_ATTRS: Attr[] = ["shape", "count", "fill", "size", "rotate", "inner", "innerFill"];

function buildOptions(cells: (Glyph | null)[], answer: Glyph, vary: Attr[], optionCount: number, rand: Rand) {
  const ak = glyphKey(answer);
  const seen = new Set([ak]);
  const chosen: Glyph[] = [];
  const take = (list: Glyph[]) => {
    for (const d of shuffle(list, rand)) {
      if (chosen.length >= optionCount - 1) return;
      const k = glyphKey(d);
      if (seen.has(k)) continue;
      seen.add(k);
      chosen.push(d);
    }
  };
  // ۱) یک ویژگیِ متغیر عوض شود (نزدیک‌ترین گزینه‌های غلط)، از هر ویژگی حداکثر دو مورد
  for (const attr of shuffle(vary, rand)) take(shuffle(variants(answer, attr), rand).slice(0, 2));
  // ۲) خانه‌های دیگر ماتریس (پاسخ‌های «کپی»)
  take(cells.filter((c): c is Glyph => !!c));
  // ۳) دو ویژگی عوض شود
  const singles = vary.flatMap((a) => variants(answer, a));
  take(singles.flatMap((s) => vary.flatMap((a) => variants(s, a))));
  // ۴) ویژگی‌های ثابت
  take(ALL_ATTRS.filter((a) => !vary.includes(a)).flatMap((a) => variants(answer, a)));
  return chosen;
}

const MATRIX_TEXT = "کدام گزینه جای علامت سؤال را پر می‌کند؟";

function makeItem(id: string, scale: string, level: Level, template: Template, optionCount: number, seed = id): Question {
  const rand = rng(hash(seed));
  const { n, cell, vary } = template(rand);
  const cells = Array.from({ length: n * n }, (_, i) => (i === n * n - 1 ? null : cell(Math.floor(i / n), i % n)));
  const answer = cell(n - 1, n - 1);
  const distractors = buildOptions(cells, answer, vary, optionCount, rand);
  const options = shuffle([answer, ...distractors], rand);
  return {
    id,
    scale,
    level,
    text: MATRIX_TEXT,
    figure: { kind: "matrix", cells },
    options: options.map((figure, i): AnswerOption => ({ label: toPersianDigits(i + 1), value: i, figure })),
    answer: options.findIndex((o) => glyphKey(o) === glyphKey(answer)),
  };
}

const gl = (shape: Shape, count = 1, fill: Fill = "solid", extra: Partial<Glyph> = {}): Glyph => ({ shape, count, fill, ...extra });

/**
 * ۱۸ سطح قاعده، از ساده به دشوار.
 * لاتین = هر مقدار یک بار در هر ردیف و ستون (توزیع سه‌تایی).
 */
export const TEMPLATES: Template[] = [
  // ۱: ۲×۲ — هر ردیف یک شکل، تکرار
  (r) => {
    const [a, b] = pick3(SHAPES, r);
    const f = FILLS[int(r, 2)];
    return { n: 2, cell: (row) => gl(row ? b : a, 1, f), vary: ["shape"] };
  },
  // ۲: ۲×۲ — شکل در ردیف، پُری در ستون
  (r) => {
    const [a, b] = pick3(SHAPES, r);
    const [f0, f1] = pick3(FILLS, r);
    return { n: 2, cell: (row, col) => gl(row ? b : a, 1, col ? f1 : f0), vary: ["shape", "fill"] };
  },
  // ۳: ۲×۲ — شکل در ستون، تعداد در ردیف
  (r) => {
    const [a, b] = pick3(SHAPES, r);
    const n0 = 1 + int(r, 2);
    return { n: 2, cell: (row, col) => gl(col ? b : a, row ? n0 + 1 : n0, "solid"), vary: ["shape", "count"] };
  },
  // ۴: ۳×۳ — ردیف‌های یکسان
  (r) => {
    const s = pick3(SHAPES, r);
    const f = pick3(FILLS, r);
    return { n: 3, cell: (row) => gl(s[row], 1, f[row]), vary: ["shape", "fill"] };
  },
  // ۵: تعداد افزایشی در ردیف، شکل ثابت در ردیف
  (r) => {
    const s = pick3(SHAPES, r);
    const f = FILLS[int(r, 3)];
    return { n: 3, cell: (row, col) => gl(s[row], col + 1, f), vary: ["shape", "count"] };
  },
  // ۶: شکل در ستون، پُری در ردیف
  (r) => {
    const s = pick3(SHAPES, r);
    const f = pick3(FILLS, r);
    const k = 1 + int(r, 2);
    return { n: 3, cell: (row, col) => gl(s[col], k, f[row]), vary: ["shape", "fill"] };
  },
  // ۷: تعداد کاهشی، شکل در ردیف، پُری در ستون
  (r) => {
    const s = pick3(SHAPES, r);
    const f = pick3(FILLS, r);
    return { n: 3, cell: (row, col) => gl(s[row], 3 - col, f[col]), vary: ["shape", "count", "fill"] };
  },
  // ۸: شکل لاتین
  (r) => {
    const s = pick3(SHAPES, r);
    const f = FILLS[int(r, 3)];
    const k = 1 + int(r, 2);
    return { n: 3, cell: (row, col) => gl(s[(row + col) % 3], k, f), vary: ["shape"] };
  },
  // ۹: شکل لاتین + تعداد افزایشی
  (r) => {
    const s = pick3(SHAPES, r);
    const f = FILLS[int(r, 3)];
    return { n: 3, cell: (row, col) => gl(s[(row + col) % 3], col + 1, f), vary: ["shape", "count"] };
  },
  // ۱۰: چرخش پیکان با گام ثابت
  (r) => {
    const step = [45, 90][int(r, 2)];
    const start = 45 * int(r, 8);
    const f: Fill = int(r, 2) ? "empty" : "solid";
    return { n: 3, cell: (row, col) => gl("arrow", 1, f, { rotate: (start + (row * 3 + col) * step) % 360 }), vary: ["rotate"] };
  },
  // ۱۱: شکل لاتین + پُری لاتین با جایگشت دیگر
  (r) => {
    const s = pick3(SHAPES, r);
    const f = pick3(FILLS, r);
    const k = 1 + int(r, 3);
    return { n: 3, cell: (row, col) => gl(s[(row + col) % 3], k, f[(row + 2 * col) % 3]), vary: ["shape", "fill"] };
  },
  // ۱۲: سه قاعده‌ی لاتین (شکل، تعداد، پُری)
  (r) => {
    const s = pick3(SHAPES, r);
    const f = pick3(FILLS, r);
    const o = int(r, 3);
    return { n: 3, cell: (row, col) => gl(s[(row + col) % 3], ((2 * row + col + o) % 3) + 1, f[(row + 2 * col + o) % 3]), vary: ["shape", "count", "fill"] };
  },
  // ۱۳: شکل بیرونی لاتین + شکل درونی لاتین + پُری در ردیف
  (r) => {
    const s = pick3(["circle", "square", "diamond", "star"] as Shape[], r);
    const inn = pick3(INNER, r);
    const f = pick3(["solid", "empty", "striped"] as Fill[], r);
    return {
      n: 3,
      cell: (row, col) => gl(s[(row + col) % 3], 1, f[row], { size: 3, inner: { shape: inn[(row + 2 * col) % 3], fill: "solid" } }),
      vary: ["shape", "inner", "fill"],
    };
  },
  // ۱۴: اندازه‌ی افزایشی + شکل لاتین + پُری در ستون
  (r) => {
    const s = pick3(SHAPES, r);
    const f = pick3(FILLS, r);
    const dir = int(r, 2);
    return { n: 3, cell: (row, col) => gl(s[(row + 2 * col) % 3], 1, f[col], { size: (dir ? 3 - col : col + 1) as 1 | 2 | 3 }), vary: ["shape", "fill", "size"] };
  },
  // ۱۵: جمع تعداد (ستون سوم = اول + دوم) + شکل لاتین + پُری لاتین
  (r) => {
    const s = pick3(SHAPES, r);
    const f = pick3(FILLS, r);
    const pairs = shuffle([[1, 1], [1, 2], [2, 1], [1, 3], [2, 2], [3, 1]], r).slice(0, 3);
    return {
      n: 3,
      cell: (row, col) => gl(s[(row + col) % 3], col === 2 ? pairs[row][0] + pairs[row][1] : pairs[row][col], f[(2 * row + col) % 3]),
      vary: ["shape", "count", "fill"],
    };
  },
  // ۱۶: تفریق تعداد (ستون سوم = اول − دوم) + شکل درونی لاتین + پُری بیرونی لاتین
  (r) => {
    const s = pick3(SHAPES, r);
    const f = pick3(FILLS, r);
    const pairs = shuffle([[4, 1], [4, 2], [3, 1], [4, 3], [3, 2]], r).slice(0, 3);
    return {
      n: 3,
      cell: (row, col) => gl(s[(row + 2 * col) % 3], col === 2 ? pairs[row][0] - pairs[row][1] : pairs[row][col], f[(row + col) % 3]),
      vary: ["shape", "count", "fill"],
    };
  },
  // ۱۷: چرخش با گام متفاوت در هر ردیف + پُری متناوب + اندازه در ستون
  (r) => {
    const steps = shuffle([45, 90, 135], r);
    const start = 45 * int(r, 8);
    return {
      n: 3,
      cell: (row, col) => gl("arrow", 1, (row + col) % 2 ? "empty" : "solid", { rotate: (start + col * steps[row]) % 360, size: (col + 1) as 1 | 2 | 3 }),
      vary: ["rotate", "fill", "size"],
    };
  },
  // ۱۸: چهار قاعده: شکل بیرونی، شکل درونی، پُری درونی و اندازه
  (r) => {
    const s = pick3(["circle", "square", "diamond", "star"] as Shape[], r);
    const inn = pick3(INNER, r);
    const outerFill: Fill = (["empty", "striped"] as Fill[])[int(r, 2)];
    const sizes = shuffle([1, 2, 3] as const, r);
    return {
      n: 3,
      cell: (row, col) =>
        gl(s[(row + col) % 3], 1, outerFill, {
          size: sizes[(2 * row + col) % 3],
          inner: { shape: inn[(row + 2 * col) % 3], fill: (row + col) % 2 ? "empty" : "solid" },
        }),
      vary: ["shape", "inner", "innerFill", "size"],
    };
  },
];

/** سطح دشواری الگو (۱ تا ۱۸) */
export const levelOf = (t: number): Level => (t <= 7 ? "easy" : t <= 12 ? "medium" : "hard");

export type SetSpec = { key: string; title: string; description: string; templates: number[]; options: number };

/** سؤال‌های یک فرم: هر بخش ۱۲ سؤال از الگوهای مشخص‌شده، به ترتیب دشواری */
export function buildForm(prefix: string, sets: SetSpec[]): Question[] {
  const stems = new Set<string>();
  return sets.flatMap((set) => {
    const per = 12 / set.templates.length;
    return set.templates.flatMap((t, ti) =>
      Array.from({ length: per }, (_, k) => {
        const id = `${prefix}-${set.key}${ti * per + k + 1}`;
        // اگر همین ماتریس قبلاً در فرم آمده، با بذر دیگری دوباره ساخته شود
        for (let attempt = 0; ; attempt++) {
          const q = makeItem(id, set.key, levelOf(t), TEMPLATES[t - 1], set.options, attempt ? `${id}#${attempt}` : id);
          const stem = JSON.stringify(q.figure);
          if (!stems.has(stem) || attempt > 20) {
            stems.add(stem);
            return q;
          }
        }
      }),
    );
  });
}

function percentResults(n: number, texts: [string, string, string, string]) {
  const p = (x: number) => Math.round(n * x);
  return [
    { min: 0, max: p(0.3), title: "ضعیف", description: texts[0] },
    { min: p(0.3) + 1, max: p(0.6), title: "متوسط", description: texts[1] },
    { min: p(0.6) + 1, max: p(0.85), title: "خوب", description: texts[2] },
    { min: p(0.85) + 1, max: n, title: "بسیار خوب", description: texts[3] },
  ];
}

export function formScales(sets: SetSpec[]): PsychTest["scales"] {
  const total = sets.length * 12;
  return [
    {
      key: "total",
      title: "نمره‌ی کل",
      description: `تعداد پاسخ‌های درست (از ${toPersianDigits(total)}). «نمی‌دانم» صفر حساب می‌شود.`,
      includes: sets.map((s) => s.key),
      results: percentResults(total, [
        "تعداد پاسخ‌های درست کم است. خستگی، اضطراب، عجله یا ناآشنایی با این نوع سؤال می‌تواند علت باشد؛ در زمانی دیگر با تمرکز دوباره آزمون دهید. اگر نتیجه تکرار شد یا در یادگیری و حل مسئله دشواری می‌بینید، ارزیابی کامل توسط روانشناس توصیه می‌شود.",
        "بخش قابل توجهی از ماتریس‌ها را درست حل کرده‌اید. عملکرد شما در سطح‌های دشواری و مقایسه با هم‌سن‌ها را ببینید.",
        "بیشتر ماتریس‌ها را درست حل کرده‌اید؛ نشانه‌ی توان خوب در استدلال انتزاعی و کشف قاعده.",
        "تقریباً همه‌ی ماتریس‌ها را درست حل کرده‌اید؛ نشانه‌ی استدلال سیال بسیار قوی.",
      ]),
    },
    ...sets.map((s) => ({
      key: s.key,
      title: s.title,
      description: s.description,
      results: percentResults(12, [
        "در این بخش به بیشتر سؤال‌ها پاسخ درست نداده‌اید.",
        "بخشی از سؤال‌های این بخش را درست حل کرده‌اید.",
        "بیشتر سؤال‌های این بخش را درست حل کرده‌اید.",
        "تقریباً همه‌ی سؤال‌های این بخش را درست حل کرده‌اید.",
      ]),
    })),
  ];
}

export const MATRICES_SOURCE: PsychTest["source"] = {
  citation:
    "سؤال‌های اختصاصی مایندمتر که از روی قاعده ساخته می‌شوند. قالب کلی (ماتریس‌های پیشرونده‌ی غیرکلامی) از کار Raven (1938) و ICAR Matrix Reasoning (Condon & Revelle, 2014) الهام گرفته است.",
  license:
    "هیچ سؤالی از ماتریس‌های پیشرونده‌ی ریون (Raven's Progressive Matrices، ناشر Pearson) استفاده نشده و این آزمون نسخه‌ی رسمی ریون نیست.",
  persianNote: "هنجار این آزمون از نتایج شرکت‌کنندگان سایت (بر اساس سن و جنس) ساخته می‌شود و با افزایش شرکت‌کنندگان دقیق‌تر می‌شود؛ تا آن زمان نمره‌ی هوشبهر اعلام نمی‌شود.",
};

export const MATRICES_NOTE: PsychTest["resultNote"] = {
  title: "درباره‌ی این نتیجه",
  paragraphs: [
    "ماتریس‌های پیشرونده «استدلال سیال» یعنی توان کشف قاعده و حل مسئله‌های تازه را بدون وابستگی به زبان و دانش می‌سنجند. این تست نسخه‌ی رسمی ریون نیست و نتیجه‌ی آن برای تصمیم‌های رسمی (مثل ورود به مدارس استعدادهای درخشان یا تشخیص بالینی) کافی نیست.",
    "برای ارزیابی رسمی، آزمون استاندارد هوش (مثل وکسلر یا ریون رسمی) را از روانشناس دارای مجوز بخواهید.",
  ],
};
