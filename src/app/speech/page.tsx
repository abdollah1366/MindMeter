import type { Metadata } from "next";
import SpeechAssessmentCard from "@/components/SpeechAssessmentCard";
import { getSpeechCatalog } from "@/lib/speech-service";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "ارزیابی گفتار و زبان",
  description: "مجموعه‌ای از آزمون‌های ارزیابی صوت، گفتار، زبان و مهارت‌های ارتباطی.",
};

export default async function SpeechPage() {
  const categories = await getSpeechCatalog();
  const totalAssessments = categories.reduce((sum, category) => sum + category.assessments.length, 0);

  return (
    <div className="space-y-10">
      <header className="rounded-3xl bg-gradient-to-bl from-brand-600 via-brand-700 to-calm-700 px-6 py-10 text-white sm:px-10">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">ماژول در حال توسعه</span>
          <span className="rounded-full bg-white/15 px-3 py-1">{toPersianDigits(totalAssessments)} آزمون</span>
          <span className="rounded-full bg-white/15 px-3 py-1">{toPersianDigits(categories.length)} دسته‌بندی</span>
        </div>
        <h1 className="mt-5 text-3xl font-extrabold leading-relaxed sm:text-4xl">ارزیابی گفتار و زبان</h1>
        <p className="mt-3 max-w-3xl leading-8 text-brand-100">
          مجموعه‌ای از آزمون‌های ارزیابی صوت، گفتار، زبان و مهارت‌های ارتباطی.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-brand-100/90">
          این صفحه فهرست و معرفی ماژول است. فعلاً آزمون‌های فعال با نشان «فعال» قابل اجرا هستند و سایر موارد با نشان «به‌زودی»
          نمایش داده می‌شوند.
        </p>
      </header>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          فهرست ارزیابی‌های گفتار و زبان هنوز آماده نشده است.
        </div>
      ) : (
        <>
          <nav aria-label="دسته‌بندی‌های ارزیابی گفتار و زبان" className="-mx-4 overflow-x-auto px-4 pb-2">
            <ul className="flex min-w-max gap-3">
              {categories.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#${category.slug}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-brand-500 hover:shadow-sm"
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${category.color}`}>
                      {category.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-800">{category.title}</span>
                      <span dir="ltr" className="block text-right text-[11px] text-slate-400">
                        {category.titleEn}
                      </span>
                    </span>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                      {toPersianDigits(category.assessments.length)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            {categories.map((category) => (
              <section key={category.id} id={category.slug} className="scroll-mt-24">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${category.color}`}>
                      {category.icon}
                    </span>
                    <div>
                      <h2 className="text-xl font-extrabold">{category.title}</h2>
                      <p dir="ltr" className="mt-0.5 text-right text-xs text-slate-400">
                        {category.titleEn}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
                    {toPersianDigits(category.assessments.length)} آزمون
                  </span>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">{category.description}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {category.assessments.map((assessment) => (
                    <SpeechAssessmentCard key={assessment.id} assessment={assessment} category={category} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <h2 className="font-bold text-amber-900">درباره‌ی این فهرست</h2>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-amber-900/80">
          <li>
            این صفحه فقط فهرست و معرفی آزمون‌ها است؛ تنها آزمون حداکثر زمان آواسازی قابل اجرا است و سایر موارد فقط معرفیاند، نتیجهای
            تولید نمیکنند.
          </li>
          <li>
            اطلاعات این صفحه جایگزین ارزیابی، تشخیص یا توصیه‌ی متخصص گفتاردرمانی و پزشک نیست.
          </li>
          <li>
            برخی ابزارهای استاندارد بیرونی پیش از فعال‌سازی نیازمند بررسی حقوقی، مجوز استفاده، ترجمه و انطباق
            فرهنگی هستند.
          </li>
          <li>
            هیچ ادعایی درباره‌ی اعتبار بالینی نسخه‌ی فارسی این آزمون‌ها مطرح نمی‌شود؛ اعتبارسنجی هر ابزار پیش از
            انتشار بررسی خواهد شد.
          </li>
        </ul>
      </section>
    </div>
  );
}
