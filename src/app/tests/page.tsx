import type { Metadata } from "next";
import TestsExplorer from "@/components/TestsExplorer";
import { getVisibleTests } from "@/lib/tests-service";
import { categories } from "@/data/categories";

export const metadata: Metadata = { title: "همه‌ی تست‌ها" };

type Props = { searchParams: Promise<{ q?: string; category?: string }> };

export default async function TestsPage({ searchParams }: Props) {
  const { q = "", category = "" } = await searchParams;
  const tests = await getVisibleTests();
  return (
    <>
      <h1 className="text-2xl font-extrabold">همه‌ی تست‌ها</h1>
      <p className="mt-2 mb-6 text-slate-500">تست مورد نظرتان را جستجو کنید یا بر اساس دسته‌بندی فیلتر کنید.</p>
      <TestsExplorer tests={tests} categories={categories} initialQuery={q} initialCategory={category} />
    </>
  );
}
