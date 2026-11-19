import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SpeechMptRunner from "@/components/speech/SpeechMptRunner";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "آزمون حداکثر زمان آواسازی",
  description: "اندازهگیری مدت زمانی که میتوانید واکه /آ/ را بهصورت پیوسته و طبیعی آواسازی کنید.",
  robots: { index: false },
};

export default async function MptPage() {
  const assessment = await db.speechAssessment.findUnique({
    where: { slug: "mpt" },
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
        <span className="text-slate-700">آزمون حداکثر زمان آواسازی</span>
      </nav>

      <SpeechMptRunner isLoggedIn={Boolean(user)} />

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
        <h2 className="font-bold">دربارهی این آزمون</h2>
        <p className="mt-2">
          این ابزار یک اندازهگیری عملکردی ساده است. هیچ تشخیصی ارائه نمیشود و نتیجهی آن جایگزین ارزیابی متخصص
          گفتاردرمانی یا پزشک نیست. صدای شما در دستگاهتان پردازش میشود و هیچ فایل صوتی ذخیره یا به سرور ارسال نمیشود.
        </p>
      </section>
    </div>
  );
}
