import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AmrRunner from "@/components/speech/AmrRunner";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "آزمون نرخ حرکت تناوبی (AMR)",
  description: "سنجش توانایی تکرار سریع و پیوسته هجاهای /pa/، /ta/ و /ka/ برای بررسی ریتم و نظم گفتار.",
  robots: { index: false },
};

export default async function AmrPage() {
  const assessment = await db.speechAssessment.findUnique({
    where: { slug: "amr" },
    select: { published: true, status: true },
  });
  if (!assessment?.published || assessment.status !== "AVAILABLE") notFound();

  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <nav aria-label="مسیر" className="flex flex-wrap gap-2 text-sm text-slate-500">
        <Link href="/speech" className="hover:text-brand-600">
          ارزیابی گفتار و زبان
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-700">آزمون نرخ حرکت تناوبی</span>
      </nav>

      <AmrRunner isLoggedIn={Boolean(user)} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
        <h2 className="font-bold text-slate-800">درباره‌ی این آزمون</h2>
        <p className="mt-2">
          AMR یک سنجه عملکردی است، نه یک آزمون اندازهگیری آکوستیکی کامل. این صفحه مجوز میکروفون را فقط در زمان
          ضبط درخواست میکند و هیچ فایل صوتی خامی ذخیره یا ارسال نمیکند. تشخیص هجا بر اساس قلههای انرژی صوت
          انجام میشود و در حضور نویز، لهجه یا کیفیت پایین میکروفون ممکن است دچار خطای شمارش شود. نتیجه به‌تنهایی
          برای تشخیص پزشکی کافی نیست.
        </p>
      </section>
    </div>
  );
}
