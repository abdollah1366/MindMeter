import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, getArticle } from "@/data/articles";
import { getTest } from "@/data/tests";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = getArticle((await params).slug);
  return a ? { title: a.title, description: a.excerpt } : {};
}

export default async function ArticlePage({ params }: Props) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const test = article.relatedTest ? getTest(article.relatedTest) : undefined;

  return (
    <article className="mx-auto max-w-3xl">
      <nav className="text-sm text-slate-400">
        <Link href="/blog" className="hover:text-brand-600">مقالات</Link> / {article.title}
      </nav>
      <h1 className="mt-4 text-3xl font-extrabold leading-relaxed">{article.title}</h1>
      <p className="mt-2 text-sm text-slate-400">{article.date}</p>
      <div className="mt-6 space-y-5 leading-9 text-slate-700">
        {article.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {test && (
        <Link
          href={`/tests/${test.slug}`}
          className="mt-10 block rounded-2xl bg-brand-50 p-6 hover:bg-brand-100"
        >
          <p className="text-sm text-brand-700">تست مرتبط</p>
          <p className="mt-1 text-lg font-bold">{test.title} ←</p>
        </Link>
      )}
    </article>
  );
}
