import type { Metadata } from "next";
import { db } from "@/lib/db";
import { tests } from "@/data/tests";
import { AGE_BANDS, MIN_GROUP, SEX_GROUP_LABEL, bandLabel, participantSamples, stats } from "@/lib/norms";
import { toPersianDigits } from "@/lib/scoring";
import { addNorm, adoptParticipantNorm, deleteNorm } from "@/server/norms-admin";

export const metadata: Metadata = { title: "هنجارها" };

const fa = (n: number) => toPersianDigits(Math.round(n * 10) / 10);

export default async function AdminNorms({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const ability = tests.filter((t) => t.kind === "ability");
  const { test: slug = ability[0]?.slug } = await searchParams;
  const test = ability.find((t) => t.slug === slug) ?? ability[0];
  if (!test) return <p>تست توانایی‌ای وجود ندارد.</p>;

  const [samples, norms] = await Promise.all([
    participantSamples(test.slug),
    db.testNorm.findMany({ where: { testSlug: test.slug }, orderBy: [{ ageMin: "asc" }, { sex: "asc" }, { scaleKey: "asc" }] }),
  ]);
  const groups = AGE_BANDS.flatMap((band) =>
    (["ALL", "MALE", "FEMALE"] as const).map((sex) => {
      const rows = samples.filter((s) => s.age != null && s.age >= band[0] && s.age <= band[1] && (sex === "ALL" || s.sex === sex));
      return { band, sex, ...stats(rows.map((r) => r.scores.total ?? 0)) };
    }),
  ).filter((g) => g.n > 0);
  const scaleTitle = Object.fromEntries(test.scales.map((s) => [s.key, s.title]));

  return (
    <>
      <h1 className="text-2xl font-extrabold">هنجارهای تست‌های توانایی</h1>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        هر نتیجه با دو مرجع مقایسه می‌شود: «هنجار داخلی» که اینجا ثبت می‌شود (از پژوهش هنجاریابی یا از آمار شرکت‌کنندگان وقتی تعدادشان کافی شد)، و
        «شرکت‌کنندگان سایت» که خودکار و زنده محاسبه می‌شود. فقط نخستین نتیجه‌ی هر کاربر در هنجار شمرده می‌شود.
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        {ability.map((t) => (
          <a key={t.slug} href={`/admin/norms?test=${t.slug}`} className={`rounded-xl px-3 py-1.5 ${t.slug === test.slug ? "bg-brand-600 text-white" : "bg-white"}`}>
            {t.title} ({t.code})
          </a>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">آمار شرکت‌کنندگان (نمره‌ی کل)</h2>
        <p className="mt-1 text-xs text-slate-500">
          {toPersianDigits(samples.length)} نفر · گروه‌های دارای دست‌کم {toPersianDigits(MIN_GROUP)} نفر را می‌توان به‌عنوان هنجار داخلی ثبت کرد.
        </p>
        {groups.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">هنوز شرکت‌کننده‌ای با سن مشخص ثبت نشده است.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="p-2 text-start">گروه سنی</th>
                  <th className="p-2 text-start">جنس</th>
                  <th className="p-2 text-start">تعداد</th>
                  <th className="p-2 text-start">میانگین</th>
                  <th className="p-2 text-start">انحراف معیار</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={`${g.band[0]}-${g.sex}`} className="border-t border-slate-100">
                    <td className="p-2">{bandLabel(g.band)}</td>
                    <td className="p-2">{SEX_GROUP_LABEL[g.sex]}</td>
                    <td className={`p-2 ${g.n < MIN_GROUP ? "text-amber-600" : ""}`}>{toPersianDigits(g.n)}</td>
                    <td className="p-2">{fa(g.mean)}</td>
                    <td className="p-2">{fa(g.sd)}</td>
                    <td className="p-2 text-end">
                      {g.n >= MIN_GROUP && (
                        <form action={adoptParticipantNorm}>
                          <input type="hidden" name="testSlug" value={test.slug} />
                          <input type="hidden" name="sex" value={g.sex} />
                          <input type="hidden" name="ageMin" value={g.band[0]} />
                          <input type="hidden" name="ageMax" value={g.band[1]} />
                          <button className="rounded-lg bg-calm-600 px-3 py-1 text-xs text-white">ثبت به‌عنوان هنجار داخلی</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">هنجار داخلی ثبت‌شده ({toPersianDigits(norms.length)} ردیف)</h2>
        {norms.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">هنوز هنجار داخلی ثبت نشده است.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="p-2 text-start">مقیاس</th>
                  <th className="p-2 text-start">سن</th>
                  <th className="p-2 text-start">جنس</th>
                  <th className="p-2 text-start">میانگین</th>
                  <th className="p-2 text-start">انحراف معیار</th>
                  <th className="p-2 text-start">تعداد</th>
                  <th className="p-2 text-start">منبع</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {norms.map((n) => (
                  <tr key={n.id} className="border-t border-slate-100">
                    <td className="p-2">{scaleTitle[n.scaleKey] ?? n.scaleKey}</td>
                    <td className="p-2">{bandLabel([n.ageMin, n.ageMax])}</td>
                    <td className="p-2">{SEX_GROUP_LABEL[n.sex]}</td>
                    <td className="p-2">{fa(n.mean)}</td>
                    <td className="p-2">{fa(n.sd)}</td>
                    <td className="p-2">{toPersianDigits(n.n)}</td>
                    <td className="p-2 text-xs text-slate-500">{n.source}</td>
                    <td className="p-2">
                      <form action={deleteNorm}>
                        <input type="hidden" name="id" value={n.id} />
                        <button className="text-xs text-rose-600">حذف</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form action={addNorm} className="mt-6 grid gap-3 rounded-xl bg-surface p-4 text-sm sm:grid-cols-4">
          <p className="font-bold sm:col-span-4">افزودن ردیف هنجار از پژوهش هنجاریابی</p>
          <input type="hidden" name="testSlug" value={test.slug} />
          <label className="block">
            <span className="text-xs text-slate-500">مقیاس</span>
            <select name="scaleKey" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5">
              {test.scales.map((s) => (
                <option key={s.key} value={s.key}>{s.title}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">جنس</span>
            <select name="sex" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5">
              <option value="ALL">زنان و مردان</option>
              <option value="MALE">مردان</option>
              <option value="FEMALE">زنان</option>
            </select>
          </label>
          {[
            ["ageMin", "از سن"],
            ["ageMax", "تا سن"],
            ["mean", "میانگین"],
            ["sd", "انحراف معیار"],
            ["n", "تعداد نمونه"],
          ].map(([name, label]) => (
            <label key={name} className="block">
              <span className="text-xs text-slate-500">{label}</span>
              <input name={name} required={name !== "n"} inputMode="decimal" dir="ltr" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5" />
            </label>
          ))}
          <label className="block sm:col-span-4">
            <span className="text-xs text-slate-500">منبع (نام پژوهش، سال، محل)</span>
            <input name="source" required className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5" />
          </label>
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-white sm:col-span-1">افزودن</button>
        </form>
      </section>
    </>
  );
}
