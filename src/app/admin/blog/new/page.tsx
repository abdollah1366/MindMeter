import ArticleEditor from "@/components/ArticleEditor";
import { tests } from "@/data/tests";

export const metadata = { title: "مقاله‌ی جدید" };

export default function NewArticle() {
  return (
    <>
      <h1 className="mb-5 text-2xl font-extrabold">مقاله‌ی جدید</h1>
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <ArticleEditor
          article={{ title: "", slug: "", excerpt: "", body: "", status: "DRAFT", relatedTest: "" }}
          tests={tests.map((t) => ({ slug: t.slug, label: `${t.code} – ${t.title}` }))}
        />
      </div>
    </>
  );
}
