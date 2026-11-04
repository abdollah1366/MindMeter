import type { Metadata } from "next";

export const metadata: Metadata = { title: "درباره ما" };

export default function AboutPage() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 leading-8 shadow-sm">
      <h1 className="text-2xl font-bold">درباره مایندمتر</h1>
      <p className="mt-4 text-slate-600">
        مایندمتر با هدف آشنایی بیشتر افراد با ویژگی‌های روانی و شخصیتی خود ساخته شده است. نتایج تست‌ها
        صرفاً جنبه‌ی آگاهی‌بخشی دارند و جایگزین ارزیابی تخصصی روانشناس یا روانپزشک نیستند.
      </p>
    </article>
  );
}
