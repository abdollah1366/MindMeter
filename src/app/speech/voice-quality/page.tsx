import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import VoiceQualityRunner from "@/components/speech/VoiceQualityRunner";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "ارزیابی کیفیت صوت",
  description:
    "بررسی توصیفی ویژگیهای قابل اندازهگیری سیگنال صوت با استفاده از واکه پایدار، گفتار پیوسته و گفتار آزاد.",
  robots: { index: false },
};

export default async function VoiceQualityPage() {
  const assessment = await db.speechAssessment.findUnique({
    where: { slug: "voice-quality-assessment" },
    select: { published: true, status: true },
  });
  if (!assessment?.published || assessment.status !== "AVAILABLE") notFound();
  const user = await getCurrentUser();

  return (
    <main dir="rtl" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="مسیر" className="mb-5 flex flex-wrap gap-2 text-xs text-slate-500">
        <Link href="/speech" className="hover:text-brand-600">
          ارزیابیهای گفتار و زبان
        </Link>
        <span>/</span>
        <span className="text-slate-700">ارزیابی کیفیت صوت</span>
      </nav>

      <VoiceQualityRunner isLoggedIn={Boolean(user)} />

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-7 text-amber-900">
        <h2 className="text-sm font-bold">دربارهی این آزمون</h2>
        <p className="mt-1">
          این آزمون فقط ویژگیهای فیزیکی قابل اندازهگیری سیگنال صوت را توصیف میکند. نتایج آن معادل نمره ادراکی
          متخصص، ابزار تشخیصی یا برچسب «طبیعی» و «غیرطبیعی» نیست و جایگزین مراجعه به متخصص گفتاردرمانی نمیشود.
        </p>
      </section>
    </main>
  );
}
