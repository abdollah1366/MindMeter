import Link from "next/link";
import type { Category } from "@/data/categories";
import { getTestsByCategory } from "@/data/tests";
import { toPersianDigits } from "@/lib/scoring";

export default function CategoryCard({ category }: { category: Category }) {
  const count = getTestsByCategory(category.slug).length;
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-500 hover:shadow-md"
    >
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${category.color}`}>
        {category.icon}
      </span>
      <div>
        <h3 className="font-bold">{category.title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{category.description}</p>
        <p className="mt-2 text-xs text-brand-600">{toPersianDigits(count)} تست</p>
      </div>
    </Link>
  );
}
