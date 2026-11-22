import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import VerbalFluencyRunner from "@/components/speech/VerbalFluencyRunner";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "آزمون روانی کلامی", description: "سنجش تولید کلمات در یک دسته در ۶۰ ثانیه.", robots: { index: false } };

export default async function VerbalFluencyPage() {
  const assessment = await db.speechAssessment.findUnique({ where: { slug: "verbal-fluency" }, select: { published: true, status: true } });
  if (!assessment?.published || assessment.status !== "AVAILABLE") notFound();
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <nav aria-label="مسیر" className="flex flex-wrap gap-2 text-sm text-slate-500">
        <Link href="/speech" className="hover:text-brand-600">ارزیابی گفتار و زبان</Link>
        <span aria-hidden>/</span>
        <span className="text-slate-700">آزمون روانی کلامی</span>
      </nav>
      <VerbalFluencyRunner isLoggedIn={Boolean(user)} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
        <h2 className="font-bold text-slate-800">درباره‌ی این آزمون</h2>
        <p className="mt-2">این آزمون یک سنجه عملکردی است و تشخیص پزشکی نیست.</p>
      </section>
    </div>
  );
}
