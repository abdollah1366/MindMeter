import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_TOPICS } from "@/data/support-topics";

export const metadata: Metadata = { title: "پشتیبانی و سوالات متداول" };

export default function SupportPage() {
  const total = SUPPORT_TOPICS.reduce((n, t) => n + t.frequentQuestions.length, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-l from-brand-50 to-calm-50 p-8">
        <p className="text-xs font-bold text-brand-700">مرکز پشتیبانی مایندمتر</p>
        <h1 className="mt-2 text-3xl font-extrabold">چگونه می توانیم کمک کنیم؟</h1>
        <p className="mt-3 max-w-2xl leading-8 text-slate-600">
          پرسشهای پرتکرار را بر اساس موضوع دستهبندی کردهایم. ابتدا پاسخ خود را در بخش مربوط بیابید؛
          اگر مشکل شما حل نشد، یک تیکت ثبت کنید تا تیم پشتیبانی آن را پیگیری نماید.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/tickets/new" className="rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700">
            ثبت تیکت جدید
          </Link>
          <Link href="/tickets" className="rounded-xl border border-brand-200 bg-white px-5 py-2.5 text-brand-700 hover:bg-brand-50">
            پیگیری تیکتهای من
          </Link>
        </div>
      </section>

      <nav data-testid="support-topics" className="grid gap-3 sm:grid-cols-3">
        {SUPPORT_TOPICS.map((t) => (
          <a
            key={t.key}
            href={`#${t.slug}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm"
          >
            <span className="text-2xl">{t.icon}</span>
            <h2 className="mt-2 font-extrabold text-slate-800">{t.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">{t.description}</p>
            <p className="mt-3 text-xs font-bold text-brand-700">
              {t.frequentQuestions.length} سؤال متداول ←
            </p>
          </a>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">سوالات متداول</h2>
        <p className="text-sm text-slate-500">{total} پرسش پرتکرار در {SUPPORT_TOPICS.length} موضوع</p>
      </div>

      {SUPPORT_TOPICS.map((t) => (
        <section key={t.key} id={t.slug} className="scroll-mt-24 space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold">
                <span>{t.icon}</span> {t.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">{t.hint}</p>
            </div>
            <Link
              href={`/tickets/new?topic=${t.key}`}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm text-brand-700 hover:bg-brand-50"
            >
              ثبت تیکت در این موضوع
            </Link>
          </div>

          <div data-testid={`faq-${t.key}`} className="space-y-2">
            {t.frequentQuestions.map((q) => (
              <details key={q.id} className="group rounded-xl border border-slate-200 bg-surface p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-800">
                  <span className="ms-2 text-brand-600">؟</span>
                  {q.question}
                </summary>
                <div className="mt-3 border-t border-slate-100 pt-3 text-sm leading-7 text-slate-600">
                  <p>{q.answer}</p>
                  <Link
                    href={`/tickets/new?topic=${t.key}&q=${encodeURIComponent(q.id)}`}
                    className="mt-3 inline-block text-xs font-bold text-brand-700 hover:underline"
                  >
                    پرسیدن همین سؤال به صورت تیکت ←
                  </Link>
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <p className="rounded-2xl bg-amber-50 p-5 text-sm leading-7 text-amber-800">
        در مواقع بحرانی و خطر جانی، تیکت پشتیبانی جایگزین کمک فوری نیست. با شمارههای ۱۲۳، ۱۴۸۰ یا ۱۱۵ تماس بگیرید.
      </p>
    </div>
  );
}
