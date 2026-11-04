"use client";

import { useActionState } from "react";
import { saveArticle, type ArticleState } from "@/server/admin";

type Article = { id?: string; title: string; slug: string; excerpt: string; body: string; status: string; relatedTest: string };

const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-brand-500";

export default function ArticleEditor({ article, tests }: { article: Article; tests: { slug: string; label: string }[] }) {
  const [state, action, pending] = useActionState<ArticleState, FormData>(saveArticle, {});
  return (
    <form action={action} className="grid gap-4">
      {article.id && <input type="hidden" name="id" value={article.id} />}
      <label>
        <span className="text-sm text-slate-600">عنوان</span>
        <input name="title" required defaultValue={article.title} className={input} />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className="text-sm text-slate-600">نامک (آدرس)</span>
          <input name="slug" required dir="ltr" defaultValue={article.slug} placeholder="what-is-anxiety" className={input} />
        </label>
        <label>
          <span className="text-sm text-slate-600">تست مرتبط</span>
          <select name="relatedTest" defaultValue={article.relatedTest} className={input}>
            <option value="">بدون تست مرتبط</option>
            {tests.map((t) => (
              <option key={t.slug} value={t.slug}>{t.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm text-slate-600">وضعیت</span>
          <select name="status" defaultValue={article.status} className={input}>
            <option value="DRAFT">پیش‌نویس</option>
            <option value="PUBLISHED">منتشرشده</option>
          </select>
        </label>
      </div>
      <label>
        <span className="text-sm text-slate-600">خلاصه (برای فهرست مقالات و موتورهای جستجو)</span>
        <textarea name="excerpt" required rows={2} defaultValue={article.excerpt} className={input} />
      </label>
      <label>
        <span className="text-sm text-slate-600">متن مقاله</span>
        <span className="block text-xs text-slate-400">پاراگراف‌ها را با یک خط خالی جدا کنید. خطی که با «## » شروع شود تیتر و خطوطی که با «- » شروع شوند فهرست هستند.</span>
        <textarea name="body" required rows={18} defaultValue={article.body} className={input + " leading-8"} />
      </label>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div>
        <button disabled={pending} className="rounded-xl bg-brand-600 px-8 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
          {pending ? "در حال ذخیره…" : "ذخیره"}
        </button>
      </div>
    </form>
  );
}
