import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Vhi30Runner from "@/components/speech/Vhi30Runner";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "پرسشنامه شاخص ناتوانی صوتی (VHI-30)",
  description:
    "پرسشنامه خودگزارشی ۳۰ گویهای درباره تأثیر ادراکشده مشکلات صوتی بر زندگی روزمره، ویژگیهای جسمانی صدا و وضعیت هیجانی.",
  robots: { index: false },
};

export default async function Vhi30Page() {
  const assessment = await db.speechAssessment.findUnique({
    where: { slug: "vhi-30" },
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
        <span className="text-slate-700">پرسشنامه شاخص ناتوانی صوتی</span>
      </nav>

      <Vhi30Runner isLoggedIn={Boolean(user)} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
        <h2 className="font-bold text-slate-800">دربارهی این ابزار</h2>
        <p className="mt-2">
          VHI-30 یک پرسشنامه خودگزارشی است، نه یک آزمون اندازهگیری آکوستیکی. این صفحه هیچ مجوز میکروفونی درخواست نمیکند،
          صوتی ضبط نمیکند و نتیجه را بهعنوان تشریح پزشکی یا طبقهبندی شدت ارائه نمیدهد. نتایج پرسشنامه جدا از نتایج آزمونهای
          اندازهگیری صوت ذخیره میشوند.
        </p>
      </section>
    </div>
  );
}
