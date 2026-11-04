import Link from "next/link";
import type { PsychTest } from "@/lib/types";
import { toPersianDigits } from "@/lib/scoring";

export default function TestCard({ test }: { test: PsychTest }) {
  return (
    <Link
      href={`/tests/${test.slug}`}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
    >
      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
        {test.category}
      </span>
      <h2 className="mt-3 text-lg font-bold">{test.title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{test.shortDescription}</p>
      <p className="mt-4 text-xs text-slate-500">
        {toPersianDigits(test.questions.length)} سؤال · حدود {toPersianDigits(test.estimatedMinutes)}{" "}
        دقیقه
      </p>
    </Link>
  );
}
