/**
 * ساختار داده‌ی یک تست روانشناسی.
 * برای اضافه کردن تست جدید یک فایل در `src/data/tests/` بسازید
 * و آن را در `src/data/tests/index.ts` ثبت کنید.
 */

export type AnswerOption = {
  /** متنی که به کاربر نشان داده می‌شود */
  label: string;
  /** امتیاز این گزینه (پیش از ضریب مقیاس) */
  value: number;
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
