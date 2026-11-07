import type { Metadata } from "next";
import TestsExplorer from "@/components/TestsExplorer";
import { getVisibleTests } from "@/lib/tests-service";
import { categories } from "@/data/categories";
import { summarize } from "@/lib/test-summary";
import { getSiteStats } from "@/lib/public-stats";
import { testPrices } from "@/lib/test-pricing";

export const metadata: Metadata = { title: "همه‌ی تست‌ها" };

type Props = { searchParams: Promise<{ q?: string; category?: string }> };

export default async function TestsPage({ searchParams }: Props) {
  const { q = "", category = "" } = await searchParams;
  const [tests, stats, prices] = await Promise.all([getVisibleTests(), getSiteStats(), testPrices()]);
  return (
    <>
      <h1 className="text-2xl font-extrabold">همه‌ی تست‌ها</h1>
      <p className="mt-2 mb-6 text-slate-500">تست مورد نظرتان را جستجو کنید یا بر اساس دسته‌بندی فیلتر کنید.</p>
      <TestsExplorer tests={tests.map((t) => summarize(t, stats.byTest[t.slug], prices[t.slug]))} categories={categories} initialQuery={q} initialCategory={category} />
    </>
  );
}
