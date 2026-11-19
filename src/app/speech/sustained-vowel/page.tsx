import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SustainedVowelRunner from "@/components/speech/SustainedVowelRunner";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "تحلیل آکوستیکی واکه پایدار",
  description: "بررسی ویژگیهای آکوستیکی واکه پایدار در بازه پایدار سیگنال صوتی.",
  robots: { index: false },
};

export default async function SustainedVowelPage() {
  const assessment = await db.speechAssessment.findUnique({
    where: { slug: "sustained-vowel-analysis" },
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
        <span className="text-slate-700">تحلیل آکوستیکی واکه پایدار</span>
      </nav>

      <SustainedVowelRunner isLoggedIn={Boolean(user)} />

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
        <h2 className="font-bold">دربارهی این آزمون</h2>
        <p className="mt-2">
          این ابزار ویژگیهای قابل اندازهگیری سیگنال صوتی را توصیف میکند و تشخیص پزشکی ارائه نمیدهد. پردازش صوت در
          دستگاه شما انجام میشود و هیچ فایل صوتی ذخیره یا به سرور ارسال نمیشود. مقادیر نامعتبر بهصورت نامشخص نمایش
          داده میشوند و جایگزین ساختگی ندارند.
        </p>
      </section>
    </div>
  );
}
