import type { Metadata } from "next";
import { summarize, inCategory } from "@/lib/test-summary";
import Link from "next/link";
import { notFound } from "next/navigation";
import TestCard from "@/components/TestCard";
import { categories, getCategory } from "@/data/categories";
import { getVisibleTests } from "@/lib/tests-service";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCategory((await params).slug);
  return c ? { title: `تست‌های ${c.title}`, description: c.description, alternates: { canonical: `/categories/${c.slug}` } } : {};
}

export default async function CategoryPage({ params }: Props) {
  const category = getCategory((await params).slug);
  if (!category) notFound();
  const list = (await getVisibleTests()).filter((t) => inCategory(t, category.slug));

  return (
    <>
      <nav className="text-sm text-slate-400">
        <Link href="/" className="hover:text-brand-600">خانه</Link> / {category.title}
      </nav>
      <div className="mt-4 flex items-center gap-4">
        <span className={`grid h-14 w-14 place-items-center rounded-2xl text-3xl ${category.color}`}>
          {category.icon}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">تست‌های {category.title}</h1>
          <p className="mt-1 text-slate-500">{category.description}</p>
        </div>
      </div>
      {list.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <TestCard key={t.slug} test={summarize(t)} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          تست‌های این دسته به‌زودی اضافه می‌شوند.
        </p>
      )}
    </>
  );
}
