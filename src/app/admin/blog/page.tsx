import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatJalali } from "@/lib/jalali";

export const metadata: Metadata = { title: "مدیریت وبلاگ" };

export default async function AdminBlog() {
  const articles = await db.article.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">وبلاگ</h1>
        <Link href="/admin/blog/new" className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white">+ مقاله‌ی جدید</Link>
      </div>
      <ul className="mt-5 space-y-2">
        {articles.map((a) => (
          <li key={a.id}>
            <Link href={`/admin/blog/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-400">
              <span className="font-medium">{a.title}</span>
              <span className="flex items-center gap-3 text-xs text-slate-500">
                <span className={`rounded-full px-2.5 py-0.5 ${a.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100"}`}>
                  {a.status === "PUBLISHED" ? "منتشرشده" : "پیش‌نویس"}
                </span>
                ویرایش: {formatJalali(a.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
        {articles.length === 0 && <p className="text-sm text-slate-500">مقاله‌ای وجود ندارد.</p>}
      </ul>
    </>
  );
}
