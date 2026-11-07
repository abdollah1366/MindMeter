import type { Metadata } from "next";
import { summarize, inCategory } from "@/lib/test-summary";
import Link from "next/link";
import { notFound } from "next/navigation";
import TestRunner from "@/components/TestRunner";
import TestCard from "@/components/TestCard";
import { getTest } from "@/data/tests";
import { getVisibleTest, getVisibleTests } from "@/lib/tests-service";
import { getCategory } from "@/data/categories";
import { toPersianDigits } from "@/lib/scoring";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/site";
import { getCurrentUser } from "@/lib/auth/session";
import { availablePurchase } from "@/lib/test-pricing";
import { buyTest } from "@/server/test-purchase";
import { getSiteStats } from "@/lib/public-stats";
import { testPrices } from "@/lib/test-pricing";
import { faCount } from "@/lib/test-summary";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const test = getTest((await params).slug);
  if (!test) return {};
  const url = `/tests/${test.slug}`;
  return {
    title: test.title,
    description: test.shortDescription,
    alternates: { canonical: url },
    ...(test.restricted ? { robots: { index: false, follow: false } } : {}),
    openGraph: { type: "article", title: test.title, description: test.shortDescription, url },
  };
}

export default async function TestPage({ params }: Props) {
  const test = await getVisibleTest((await params).slug);
  if (!test) notFound();
  const category = getCategory(test.category);
  const related = (await getVisibleTests()).filter((t) => t.slug !== test.slug && (inCategory(t, test.category) || inCategory(test, t.category))).slice(0, 3);

  const [stats, prices] = await Promise.all([getSiteStats(), testPrices()]);
  const price = prices[test.slug] ?? 0;
  const taken = stats.byTest[test.slug] ?? 0;
  const pair = test.version ? getTest(test.version.pairSlug) : undefined;
  const user = test.restricted || price > 0 ? await getCurrentUser() : null;
  const purchase = price > 0 && user ? await availablePurchase(user.id, test.slug) : null;
  const facts = [
    { label: "نام بین‌المللی", value: test.code },
    { label: "تعداد سؤال", value: toPersianDigits(test.questions.length) },
    { label: "زمان تقریبی", value: `${toPersianDigits(test.estimatedMinutes)} دقیقه` },
    { label: "دسته‌بندی", value: category?.title ?? "-" },
    { label: "تعداد انجام", value: taken ? `${faCount(taken)} بار` : "اولین نفر باشید" },
    { label: "مناسب برای", value: test.audience ?? "همه" },
    { label: "هزینه", value: price > 0 ? `${faCount(price)} تومان` : test.licensed ? "طبق تعرفه‌ی متخصص" : "رایگان" },
  ];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: test.title,
        description: test.shortDescription,
        url: absoluteUrl(`/tests/${test.slug}`),
        inLanguage: "fa",
        isAccessibleForFree: price === 0,
        timeRequired: `PT${test.estimatedMinutes}M`,
        about: { "@type": "Thing", name: `${test.englishTitle} (${test.code})` },
        publisher: { "@type": "Organization", name: "مایندمتر", url: absoluteUrl("/") },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "خانه", item: absoluteUrl("/") },
          ...(category ? [{ "@type": "ListItem", position: 2, name: category.title, item: absoluteUrl(`/categories/${category.slug}`) }] : []),
          { "@type": "ListItem", position: category ? 3 : 2, name: test.title, item: absoluteUrl(`/tests/${test.slug}`) },
        ],
      },
    ],
  };

  return (
    <>
      <JsonLd data={ld} />
      <nav className="text-sm text-slate-400">
        <Link href="/" className="hover:text-brand-600">خانه</Link>
        {category && (
          <>
            {" / "}
            <Link href={`/categories/${category.slug}`} className="hover:text-brand-600">
              {category.title}
            </Link>
          </>
        )}
        {" / "}
        {test.title}
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <h1 className="text-2xl font-extrabold">{test.title}</h1>
          <p dir="ltr" className="mt-1 text-end text-xs text-slate-400">{test.englishTitle}</p>
          <p className="mt-3 leading-8 text-slate-600">{test.about}</p>
          {pair && (
            <Link href={`/tests/${pair.slug}`} className="mt-3 inline-block rounded-xl bg-calm-50 px-4 py-2 text-sm text-calm-700 hover:bg-calm-100">
              {pair.version?.kind === "short" ? "فرم کوتاه" : "فرم بلند"} این تست: {pair.code} ({toPersianDigits(pair.questions.length)} سؤال) ←
            </Link>
          )}
          <div className="mt-6">
            {test.restricted && !user ? (
              <div className="rounded-2xl border border-calm-200 bg-calm-50 p-6 text-center">
                <p className="font-bold text-calm-700">این آزمون فقط برای مراجعان ثبت‌نام‌شده قابل اجراست.</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  این پرسشنامه با مجوز ناشر و زیر نظر متخصص اجرا می‌شود. برای شروع وارد حساب خود شوید.
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(`/tests/${test.slug}`)}`}
                  className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700"
                >
                  ورود و شروع آزمون
                </Link>
              </div>
            ) : price > 0 && !purchase ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center" data-testid="paywall">
                <p className="text-sm text-amber-800">هزینه‌ی هر بار اجرای این آزمون</p>
                <p className="mt-1 text-2xl font-extrabold text-amber-900">{faCount(price)} تومان</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  پس از پرداخت، آزمون را انجام می‌دهید و نتیجه‌ی کامل در پرونده‌ی شما ذخیره می‌شود و گزارش قابل چاپ دارد.
                </p>
                {user ? (
                  <form action={buyTest} className="mt-4">
                    <input type="hidden" name="slug" value={test.slug} />
                    <button className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700">پرداخت و شروع آزمون</button>
                  </form>
                ) : (
                  <Link
                    href={`/login?next=${encodeURIComponent(`/tests/${test.slug}`)}`}
                    className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700"
                  >
                    ورود و پرداخت
                  </Link>
                )}
              </div>
            ) : (
              <>
                {purchase && (
                  <p className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800" data-testid="paid-note">
                    پرداخت شما ثبت شده است. نتیجه‌ی این اجرا در پرونده‌تان ذخیره می‌شود.
                  </p>
                )}
                <TestRunner test={test} />
              </>
            )}
          </div>
          {test.scaleGroups && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold">این آزمون چه چیزهایی را می‌سنجد؟</h2>
              <p className="mt-1 text-sm text-slate-500">
                {toPersianDigits(test.scales.filter((s) => test.scaleGroups!.some((g) => g.key === s.group)).length)} مقیاس در{" "}
                {toPersianDigits(test.scaleGroups.length)} بخش:
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {test.scaleGroups.map((g) => (
                  <div key={g.key}>
                    <h3 className="text-sm font-bold text-brand-700">{g.title}</h3>
                    {g.description && <p className="text-xs leading-6 text-slate-500">{g.description}</p>}
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {test.scales
                        .filter((s) => s.group === g.key)
                        .map((s) => (
                          <li key={s.key} className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700" title={s.description}>
                            {s.title}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
          <h2 className="font-bold">مشخصات تست</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {facts.map((f) => (
              <div key={f.label} className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">{f.label}</dt>
                <dd className="font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 space-y-2 text-xs leading-6 text-slate-500">
            <p dir="ltr" className="text-left">{test.source.citation}</p>
            <p>مجوز: {test.source.license}</p>
            {test.source.persianNote && <p className="text-amber-700">{test.source.persianNote}</p>}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-extrabold">تست‌های مرتبط</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((t) => (
              <TestCard key={t.slug} test={summarize(t, stats.byTest[t.slug], prices[t.slug])} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
