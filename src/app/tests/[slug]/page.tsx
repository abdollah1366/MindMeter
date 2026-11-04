import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TestRunner from "@/components/TestRunner";
import TestCard from "@/components/TestCard";
import { getTest } from "@/data/tests";
import { getVisibleTest, getVisibleTests } from "@/lib/tests-service";
import { getCategory } from "@/data/categories";
import { toPersianDigits } from "@/lib/scoring";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const test = getTest((await params).slug);
  return test ? { title: test.title, description: test.shortDescription } : {};
}

export default async function TestPage({ params }: Props) {
  const test = await getVisibleTest((await params).slug);
  if (!test) notFound();
  const category = getCategory(test.category);
  const related = (await getVisibleTests()).filter((t) => t.category === test.category && t.slug !== test.slug).slice(0, 3);

  const pair = test.version ? getTest(test.version.pairSlug) : undefined;
  const facts = [
    { label: "نام بین‌المللی", value: test.code },
    { label: "تعداد سؤال", value: toPersianDigits(test.questions.length) },
    { label: "زمان تقریبی", value: `${toPersianDigits(test.estimatedMinutes)} دقیقه` },
    { label: "دسته‌بندی", value: category?.title ?? "-" },
    { label: "مناسب برای", value: test.audience ?? "همه" },
    { label: "هزینه", value: "رایگان" },
  ];

  return (
    <>
      <nav className="text-sm text-slate-400">
        <Link href="/" className="hover:text-brand-600">خانه</Link>
        {category && (
          <>
            {" / "}
            <Link href={`/categories/${category.slug}`} className="hover:text-brand-600">
              {category.title}
            </Link>
          </>
        )}
        {" / "}
        {test.title}
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <h1 className="text-2xl font-extrabold">{test.title}</h1>
          <p dir="ltr" className="mt-1 text-end text-xs text-slate-400">{test.englishTitle}</p>
          <p className="mt-3 leading-8 text-slate-600">{test.about}</p>
          {pair && (
            <Link href={`/tests/${pair.slug}`} className="mt-3 inline-block rounded-xl bg-calm-50 px-4 py-2 text-sm text-calm-700 hover:bg-calm-100">
              {pair.version?.kind === "short" ? "فرم کوتاه" : "فرم بلند"} این تست: {pair.code} ({toPersianDigits(pair.questions.length)} سؤال) ←
            </Link>
          )}
          <div className="mt-6">
            <TestRunner test={test} />
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
          <h2 className="font-bold">مشخصات تست</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {facts.map((f) => (
              <div key={f.label} className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">{f.label}</dt>
                <dd className="font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 space-y-2 text-xs leading-6 text-slate-500">
            <p dir="ltr" className="text-left">{test.source.citation}</p>
            <p>مجوز: {test.source.license}</p>
            {test.source.persianNote && <p className="text-amber-700">{test.source.persianNote}</p>}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-extrabold">تست‌های مرتبط</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((t) => (
              <TestCard key={t.slug} test={t} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
