import Link from "next/link";
import TestCard from "@/components/TestCard";
import CategoryCard from "@/components/CategoryCard";
import SearchBox from "@/components/SearchBox";
import { categories } from "@/data/categories";
import { getFeaturedTests, tests } from "@/data/tests";
import { articles } from "@/data/articles";
import { toPersianDigits } from "@/lib/scoring";

const steps = [
  { title: "انتخاب تست", text: "از میان دسته‌بندی‌ها، تست مورد نظرتان را پیدا کنید." },
  { title: "پاسخ به سؤال‌ها", text: "با آرامش و صادقانه به سؤال‌ها پاسخ دهید." },
  { title: "دریافت نتیجه", text: "بلافاصله گزارش و تفسیر نتیجه را ببینید." },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* معرفی */}
      <section className="rounded-3xl bg-gradient-to-bl from-brand-600 to-brand-700 px-6 py-14 text-white sm:px-12">
        <h1 className="text-3xl font-extrabold leading-relaxed sm:text-4xl">
          خودت را بهتر بشناس
        </h1>
        <p className="mt-4 max-w-2xl leading-8 text-brand-100">
          مایندمتر مجموعه‌ای از تست‌های روانشناسی آنلاین به زبان فارسی است؛ از شخصیت و سلامت روان تا
          شغل و روابط. تست بزن، نتیجه بگیر و مسیر رشدت را پیدا کن.
        </p>
        <div className="mt-8">
          <SearchBox />
        </div>
        <div className="mt-8 flex gap-8 text-sm text-brand-100">
          <span>
            <b className="block text-2xl text-white">{toPersianDigits(tests.length)}+</b> تست
          </span>
          <span>
            <b className="block text-2xl text-white">{toPersianDigits(categories.length)}</b> دسته‌بندی
          </span>
          <span>
            <b className="block text-2xl text-white">رایگان</b> نتیجه‌ی فوری
          </span>
        </div>
      </section>

      {/* دسته‌بندی‌ها */}
      <section id="categories" className="scroll-mt-24">
        <h2 className="text-2xl font-extrabold">دسته‌بندی تست‌ها</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <CategoryCard key={c.slug} category={c} />
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
          {getFeaturedTests().map((t) => (
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
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 font-bold text-brand-600">
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
          {articles.slice(0, 4).map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-500"
            >
              <p className="text-xs text-slate-400">{a.date}</p>
              <h3 className="mt-2 font-bold">{a.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">{a.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
