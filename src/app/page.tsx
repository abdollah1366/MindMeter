import Link from "next/link";
import TestCard from "@/components/TestCard";
import CategoryCard from "@/components/CategoryCard";
import SearchBox from "@/components/SearchBox";
import { categories } from "@/data/categories";
import { getFeaturedVisibleTests, getVisibleTests } from "@/lib/tests-service";
import { listPublishedArticles } from "@/lib/articles";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";

const steps = [
  { title: "انتخاب تست", text: "از میان دسته‌بندی‌ها، تست مورد نظرتان را پیدا کنید." },
  { title: "پاسخ به سؤال‌ها", text: "با آرامش و صادقانه به سؤال‌ها پاسخ دهید." },
  { title: "دریافت گزارش", text: "نتیجه را فوراً ببینید، در پرونده ذخیره کنید و گزارش رسمی چاپ کنید." },
];

export default async function HomePage() {
  const [tests, featured, articles] = await Promise.all([
    getVisibleTests(),
    getFeaturedVisibleTests(),
    listPublishedArticles(4),
  ]);
  return (
    <div className="space-y-16">
      {/* معرفی */}
      <section className="rounded-3xl bg-gradient-to-bl from-brand-600 via-brand-700 to-calm-700 px-6 py-14 text-white sm:px-12">
        <h1 className="text-3xl font-extrabold leading-relaxed sm:text-4xl">
          خودت را بهتر بشناس
        </h1>
        <p className="mt-4 max-w-2xl leading-8 text-brand-100">
          مایندمتر مجموعه‌ای از تست‌های استاندارد و معتبر بین‌المللی روانشناسی به زبان فارسی است؛ با نتیجه‌ی
          فوری، پرونده‌ی شخصی و گزارش قابل چاپ برای ارائه به روانشناس یا پزشک.
        </p>
        <div className="mt-8">
          <SearchBox />
        </div>
        <div className="mt-8 flex gap-8 text-sm text-brand-100">
          <span>
            <b className="block text-2xl text-white">{toPersianDigits(tests.length)}</b> تست استاندارد
          </span>
          <span>
            <b className="block text-2xl text-white">{toPersianDigits(categories.length)}</b> دسته‌بندی
          </span>
          <span>
            <b className="block text-2xl text-white">گزارش</b> قابل چاپ
          </span>
        </div>
      </section>

      {/* دسته‌بندی‌ها */}
      <section id="categories" className="scroll-mt-24">
        <h2 className="text-2xl font-extrabold">دسته‌بندی تست‌ها</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <CategoryCard key={c.slug} category={c} count={tests.filter((t) => t.category === c.slug).length} />
          ))}
        </div>
      </section>

      {/* تست‌های پرطرفدار */}
      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold">تست‌های پرطرفدار</h2>
          <Link href="/tests" className="text-sm text-brand-600 hover:underline">
            مشاهده‌ی همه ←
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((t) => (
            <TestCard key={t.slug} test={t} />
          ))}
        </div>
      </section>

      {/* مراحل */}
      <section>
        <h2 className="text-2xl font-extrabold">چطور کار می‌کند؟</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-calm-50 font-bold text-calm-600">
                {toPersianDigits(i + 1)}
              </span>
              <h3 className="mt-4 font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* مقالات */}
      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold">تازه‌ترین مقالات</h2>
          <Link href="/blog" className="text-sm text-brand-600 hover:underline">
            همه‌ی مقالات ←
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-500"
            >
              <p className="text-xs text-slate-400">{a.publishedAt && formatJalali(a.publishedAt)}</p>
              <h3 className="mt-2 font-bold">{a.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">{a.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
