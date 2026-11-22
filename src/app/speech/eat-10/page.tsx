import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Eat10Runner from "@/components/speech/Eat10Runner";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "پرسشنامه ارزیابی بلع (EAT-10)",
  description: "پرسشنامه خودگزارشی ۱۰ گویه‌ای برای سنجش مشکلات بلع.",
  robots: { index: false },
};

export default async function Eat10Page() {
  const assessment = await db.speechAssessment.findUnique({ where: { slug: "eat-10" }, select: { published: true, status: true } });
  if (!assessment?.published || assessment.status !== "AVAILABLE") notFound();
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <nav aria-label="مسیر" className="flex flex-wrap gap-2 text-sm text-slate-500">
        <Link href="/speech" className="hover:text-brand-600">ارزیابی گفتار و زبان</Link>
        <span aria-hidden>/</span>
        <span className="text-slate-700">پرسشنامه EAT-10</span>
      </nav>
      <Eat10Runner isLoggedIn={Boolean(user)} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
        <h2 className="font-bold text-slate-800">درباره‌ی این ابزار</h2>
        <p className="mt-2">این پرسشنامه تشخیص پزشکی نیست و جایگزین ارزیابی بالینی نمی‌شود. نمره ۳ یا بیشتر نشانه‌ی احتمالی اختلال بلع است.</p>
      </section>
    </div>
  );
}
