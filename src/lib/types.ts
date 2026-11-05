/**
 * ساختار داده‌ی یک تست روانشناسی.
 * برای اضافه کردن تست جدید یک فایل در `src/data/tests/` بسازید
 * و آن را در `src/data/tests/index.ts` ثبت کنید.
 */

/** یک خانه‌ی تصویری (برای سؤال‌های ماتریس): چند شکل یکسان */
export type Glyph = {
  shape: "circle" | "square" | "triangle" | "diamond" | "star" | "arrow";
  /** تعداد شکل‌ها در خانه (۱ تا ۴) */
  count?: number;
  fill?: "solid" | "empty" | "striped";
  /** چرخش به درجه (ساعتگرد) */
  rotate?: number;
};

/** ماتریس ۳×۳ که خانه‌ی آخرش (null) باید پیدا شود */
export type MatrixFigure = { kind: "matrix"; cells: (Glyph | null)[] };

export type AnswerOption = {
  /** متنی که به کاربر نشان داده می‌شود */
  label: string;
  /** امتیاز این گزینه (پیش از ضریب مقیاس)؛ در سؤال‌های توانایی، شماره‌ی گزینه */
  value: number;
  /** تصویر گزینه (برای سؤال‌های ماتریس) */
  figure?: Glyph;
};

export type Question = {
  id: string;
  text: string;
  /** کلید مقیاسی که این سؤال به آن تعلق دارد؛ پیش‌فرض: اولین مقیاس */
  scale?: string;
  /** اگر true باشد امتیاز این سؤال معکوس محاسبه می‌شود */
  reverse?: boolean;
  /** گزینه‌های اختصاصی این سؤال؛ اگر نباشد از `options` تست استفاده می‌شود */
  options?: AnswerOption[];
  /** تصویر سؤال (ماتریس) */
  figure?: MatrixFigure;
  /**
   * سؤال توانایی با یک پاسخ درست: مقدار گزینه‌ی درست.
   * پاسخ درست ۱ امتیاز و پاسخ نادرست ۰ امتیاز دارد.
   */
  answer?: number;
  /** سطح دشواری (در آزمون‌های توانایی) */
  level?: "easy" | "medium" | "hard";
  /** هشدار ایمنی: اگر مقدار پاسخ >= minValue بود پیام نشان داده می‌شود */
  alert?: { minValue: number; message: string };
};

export type ResultLevel = "normal" | "mild" | "moderate" | "high" | "severe";

export type ResultRange = {
  /** حداقل امتیاز نهایی (پس از ضریب)، شامل */
  min: number;
  /** حداکثر امتیاز نهایی، شامل */
  max: number;
  title: string;
  description: string;
  /** سطح شدت برای رنگ‌بندی گزارش */
  level?: ResultLevel;
};

export type Scale = {
  key: string;
  title: string;
  description?: string;
  /** ضریب امتیاز خام (مثلاً ۲ برای DASS-21 یا ۴ برای WHO-5) */
  multiplier?: number;
  /** مقیاس ترکیبی: جمع سؤال‌های این مقیاس‌ها (مثلاً نمره‌ی کل) */
  includes?: string[];
  results: ResultRange[];
};

export type TestSource = {
  /** ارجاع علمی اصلی */
  citation: string;
  /** وضعیت مجوز استفاده */
  license: string;
  /** توضیح درباره‌ی نسخه‌ی فارسی */
  persianNote?: string;
};

export type PsychTest = {
  /** شناسه‌ی یکتا که در آدرس صفحه استفاده می‌شود: /tests/<slug> */
  slug: string;
  /** نام اختصاری بین‌المللی، مثلاً PHQ-9 */
  code: string;
  title: string;
  /** نام انگلیسی کامل */
  englishTitle: string;
  shortDescription: string;
  /** توضیح درباره‌ی تست */
  about: string;
  /** راهنمای پاسخ‌دهی که پیش از شروع نشان داده می‌شود */
  instructions: string;
  /** شناسه‌ی دسته‌بندی از `src/data/categories.ts` */
  category: string;
  featured?: boolean;
  audience: string;
  estimatedMinutes: number;
  /** اگر تست نسخه‌ی کوتاه/بلند دارد */
  version?: { kind: "short" | "long"; pairSlug: string };
  /** گزینه‌های پیش‌فرض برای همه‌ی سؤال‌ها */
  options: AnswerOption[];
  questions: Question[];
  /** مقیاس‌ها؛ تست تک‌بعدی یک مقیاس دارد */
  scales: Scale[];
  source: TestSource;
  /** «ability» برای آزمون‌های توانایی با پاسخ درست و نادرست؛ پیش‌فرض: پرسشنامه */
  kind?: "questionnaire" | "ability";
  /** توضیح تکمیلی که بعد از نتیجه و در گزارش نشان داده می‌شود (مثلاً راهنمای ارجاع) */
  resultNote?: { title: string; paragraphs: string[] };
};

export type ScaleScore = {
  key: string;
  title: string;
  raw: number;
  score: number;
  min: number;
  max: number;
  result?: ResultRange;
};

export type TestAlert = { questionId: string; message: string };
