import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { tests, licensedLoadErrors } from "@/data/tests";
import { getTestSettingsMap } from "@/lib/tests-service";
import { getCategory } from "@/data/categories";
import { toPersianDigits } from "@/lib/scoring";
import { updateTestSetting } from "@/server/admin";

export const metadata: Metadata = { title: "مدیریت تست‌ها" };

function Toggle({ slug, field, on }: { slug: string; field: "enabled" | "featured"; on: boolean }) {
  return (
    <form action={updateTestSetting}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={String(!on)} />
      <button
        aria-pressed={on}
        className={`relative h-6 w-11 rounded-full transition ${on ? "bg-brand-500" : "bg-slate-300"}`}
        title={on ? "روشن" : "خاموش"}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "right-0.5" : "right-5.5"}`} />
      </button>
    </form>
  );
}

export default async function AdminTests() {
  const [settings, counts] = await Promise.all([
    getTestSettingsMap(),
    db.testResult.groupBy({ by: ["testSlug"], _count: { _all: true } }),
  ]);
  const countOf = (slug: string) => counts.find((c) => c.testSlug === slug)?._count._all ?? 0;

  return (
    <>
      <h1 className="text-2xl font-extrabold">تست‌ها</h1>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        نمایش یا پنهان کردن تست‌ها و انتخاب تست‌های صفحه‌ی اصلی. محتوای سؤال‌ها در پوشه‌ی <code dir="ltr">src/data/tests</code> است.
        پرسشنامه‌های دارای مجوز تجاری را به شکل فایل JSON در پوشه‌ی <code dir="ltr">licensed-tests</code> روی سرور بگذارید (راهنما در
        همان پوشه)؛ این فایل‌ها در گیت منتشر نمی‌شوند.
      </p>
      {licensedLoadErrors.length > 0 && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-bold">این فایل‌های پرسشنامه‌ی مجوزدار بارگذاری نشدند:</p>
          <ul dir="ltr" className="mt-2 space-y-1 text-left font-mono text-xs">
            {licensedLoadErrors.map((f) => (
              <li key={f.file}>
                <b>{f.file}</b>: {f.errors.join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-slate-500">
            <tr>
              <th className="p-3 text-start">تست</th>
              <th className="p-3 text-start">دسته</th>
              <th className="p-3 text-start">سؤال</th>
              <th className="p-3 text-start">دفعات انجام</th>
              <th className="p-3 text-start">فعال</th>
              <th className="p-3 text-start">صفحه‌ی اصلی</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => {
              const s = settings.get(t.slug);
              const enabled = s?.enabled !== false;
              const featured = s?.featured ?? Boolean(t.featured);
              return (
                <tr key={t.slug} className={`border-t border-slate-100 ${enabled ? "" : "opacity-50"}`}>
                  <td className="p-3">
                    <Link href={`/tests/${t.slug}`} className="font-medium hover:text-brand-600">{t.code}</Link>
                    <p className="text-xs text-slate-500">{t.title}</p>
                    {t.restricted && (
                      <span className="mt-1 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700">
                        {t.licensed ? "مجوزدار · " : ""}فقط با لینک و ورود
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{getCategory(t.category)?.title}</td>
                  <td className="p-3">{toPersianDigits(t.questions.length)}</td>
                  <td className="p-3">{toPersianDigits(countOf(t.slug))}</td>
                  <td className="p-3"><Toggle slug={t.slug} field="enabled" on={enabled} /></td>
                  <td className="p-3"><Toggle slug={t.slug} field="featured" on={featured} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
