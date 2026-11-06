"use client";

import { useMemo, useState } from "react";
import { inCategory, type TestSummary } from "@/lib/test-summary";
import type { Category } from "@/data/categories";
import TestCard from "./TestCard";

type Props = {
  tests: TestSummary[];
  categories: Category[];
  initialQuery?: string;
  initialCategory?: string;
};

export default function TestsExplorer({ tests, categories, initialQuery = "", initialCategory = "" }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);

  const filtered = useMemo(() => {
    const q = query.trim();
    return tests.filter(
      (t) =>
        (!category || inCategory(t, category)) &&
        (!q || t.title.includes(q) || t.shortDescription.includes(q)),
    );
  }, [tests, query, category]);

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm transition ${
      active ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white hover:border-brand-500"
    }`;

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="جستجو در تست‌ها…"
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-brand-500"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={chip(!category)} onClick={() => setCategory("")}>
          همه
        </button>
        {categories.map((c) => (
          <button key={c.slug} className={chip(category === c.slug)} onClick={() => setCategory(c.slug)}>
            {c.icon} {c.title}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TestCard key={t.slug} test={t} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-slate-500">تستی با این مشخصات پیدا نشد.</p>
      )}
    </>
  );
}
