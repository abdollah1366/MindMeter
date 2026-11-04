import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/data/articles";

export const metadata: Metadata = { title: "مقالات" };

export default function BlogPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">مقالات روانشناسی</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {articles.map((a) => (
          <Link key={a.slug} href={`/blog/${a.slug}`} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-500">
            <p className="text-xs text-slate-400">{a.date}</p>
            <h2 className="mt-2 font-bold">{a.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">{a.excerpt}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
