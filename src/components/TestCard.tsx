import Link from "next/link";
import type { PsychTest } from "@/lib/types";
import { toPersianDigits } from "@/lib/scoring";
import { getCategory } from "@/data/categories";

export default function TestCard({ test }: { test: PsychTest }) {
  const category = getCategory(test.category);
  return (
    <Link
      href={`/tests/${test.slug}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <span className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${category?.color ?? "bg-slate-100"}`}>
          {category?.icon}
        </span>
        <span className="text-xs text-slate-500">{category?.title}</span>
      </div>
      <h3 className="mt-4 text-lg font-bold group-hover:text-brand-600">{test.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-7 text-slate-600">{test.shortDescription}</p>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>
          {toPersianDigits(test.questions.length)} سؤال · {toPersianDigits(test.estimatedMinutes)} دقیقه
        </span>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">رایگان</span>
      </div>
    </Link>
  );
}
