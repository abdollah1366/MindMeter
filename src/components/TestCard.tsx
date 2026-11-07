import Link from "next/link";
import { faCount, type TestSummary } from "@/lib/test-summary";
import { toPersianDigits } from "@/lib/scoring";
import { getCategory } from "@/data/categories";

export default function TestCard({ test }: { test: TestSummary }) {
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
        <span dir="ltr" className="ms-auto rounded-md bg-calm-50 px-2 py-0.5 font-mono text-xs text-calm-700">{test.code}</span>
      </div>
      <h3 className="mt-4 text-lg font-bold group-hover:text-brand-600">{test.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-7 text-slate-600">{test.shortDescription}</p>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>
          {toPersianDigits(test.questionCount)} سؤال · {toPersianDigits(test.estimatedMinutes)} دقیقه
          {test.taken ? <> · <span data-testid="taken">{faCount(test.taken)} بار انجام شده</span></> : null}
        </span>
        <span className="flex shrink-0 gap-1">
          {test.version && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{test.version.kind === "short" ? "فرم کوتاه" : "فرم بلند"}</span>
          )}
          {test.price ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700" data-testid="price">
              {faCount(test.price)} تومان
            </span>
          ) : (
            !test.version && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">رایگان</span>
          )}
        </span>
      </div>
    </Link>
  );
}
