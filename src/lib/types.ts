/**
 * ساختار داده‌ی یک تست روانشناسی.
 * برای اضافه کردن تست جدید کافی است یک فایل در `src/data/tests/` بسازید
 * و آن را در `src/data/tests/index.ts` ثبت کنید.
 */

export type AnswerOption = {
  /** متنی که به کاربر نشان داده می‌شود */
  label: string;
  /** امتیاز این گزینه */
  value: number;
};

export type Question = {
  id: string;
  text: string;
  /** اگر true باشد امتیاز این سؤال معکوس محاسبه می‌شود */
  reverse?: boolean;
  /** گزینه‌های اختصاصی این سؤال؛ اگر نباشد از `options` تست استفاده می‌شود */
  options?: AnswerOption[];
};

export type ResultRange = {
  /** حداقل امتیاز (شامل) */
  min: number;
  /** حداکثر امتیاز (شامل) */
  max: number;
  title: string;
  description: string;
};

export type PsychTest = {
  /** شناسه‌ی یکتا که در آدرس صفحه استفاده می‌شود: /tests/<slug> */
  slug: string;
  title: string;
  shortDescription: string;
  /** توضیح کامل‌تر و راهنمای پاسخ‌دهی */
  instructions: string;
  /** شناسه‌ی دسته‌بندی از `src/data/categories.ts` */
  category: string;
  /** اگر true باشد در بخش «تست‌های پرطرفدار» صفحه‌ی اصلی نمایش داده می‌شود */
  featured?: boolean;
  /** گروه سنی یا مخاطب، مثلاً «بزرگسالان» */
  audience?: string;
  /** منبع یا توضیح علمی تست (برای نمایش در صفحه‌ی معرفی) */
  source?: string;
  /** زمان تقریبی به دقیقه */
  estimatedMinutes: number;
  /** گزینه‌های پیش‌فرض برای همه‌ی سؤال‌ها */
  options: AnswerOption[];
  questions: Question[];
  results: ResultRange[];
};
