import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleEditor from "@/components/ArticleEditor";
import { db } from "@/lib/db";
import { tests } from "@/data/tests";
import { deleteArticle } from "@/server/admin";

export const metadata = { title: "ویرایش مقاله" };

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await db.article.findUnique({ where: { id } });
  if (!a) notFound();
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">ویرایش مقاله</h1>
        {a.status === "PUBLISHED" && (
          <Link href={`/blog/${a.slug}`} className="text-sm text-brand-600 hover:underline">مشاهده در سایت ←</Link>
        )}
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <ArticleEditor
          article={{ id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt, body: a.body, status: a.status, relatedTest: a.relatedTest ?? "" }}
          tests={tests.map((t) => ({ slug: t.slug, label: `${t.code} – ${t.title}` }))}
        />
      </div>
      <form action={deleteArticle} className="mt-4">
        <input type="hidden" name="id" value={a.id} />
        <button className="text-sm text-rose-600 hover:underline">حذف این مقاله</button>
      </form>
    </>
  );
}
