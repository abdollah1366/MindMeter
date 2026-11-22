import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PictureNamingRunner from "@/components/speech/PictureNamingRunner";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "ارزیابی نامیدن تصاویر", description: "ارزیابی بالینی نامیدن تصاویر.", robots: { index: false } };

export default async function PictureNamingPage() {
  const assessment = await db.speechAssessment.findUnique({ where: { slug: "picture-naming" }, select: { published: true, status: true } });
  if (!assessment?.published || assessment.status !== "AVAILABLE") notFound();
  const user = await getCurrentUser();

  let patients: { id: string; name: string; age: number | null; sex: string | null }[] = [];
  if (user) {
    const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });
    if (profile?.status === "APPROVED") {
      const grants = await db.accessGrant.findMany({ where: { clinicianId: profile.id, revokedAt: null }, include: { patient: { select: { id: true, firstName: true, lastName: true, phone: true, birthDate: true, sex: true } } }, orderBy: { createdAt: "desc" } });
      const { displayName } = await import("@/lib/clinicians");
      const { ageFrom } = await import("@/lib/jalali");
      patients = grants.map(({ patient }) => ({ id: patient.id, name: displayName(patient), age: patient.birthDate ? ageFrom(patient.birthDate) : null, sex: patient.sex }));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <nav aria-label="مسیر" className="flex flex-wrap gap-2 text-sm text-slate-500">
        <Link href="/speech" className="hover:text-brand-600">ارزیابی گفتار و زبان</Link>
        <span aria-hidden>/</span>
        <span className="text-slate-700">ارزیابی نامیدن تصاویر</span>
      </nav>
      {!user ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
          <h2 className="text-lg font-extrabold text-slate-800">ثبت ارزیابی نیازمند ورود است</h2>
          <p className="mt-2">ثبت ارزیابی نامیدن تصاویر فقط برای متخصص تأییدشده و روی پرونده‌ی مراجعی انجام می‌شود که پرونده‌اش را با او به اشتراک گذاشته است.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/login?next=/speech/picture-naming" className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">ورود به حساب</Link>
            <Link href="/speech" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">بازگشت</Link>
          </div>
        </section>
      ) : patients.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
          <h2 className="text-lg font-extrabold text-slate-800">هنوز مراجعی پرونده‌اش را با شما به اشتراک نگذاشته است</h2>
          <p className="mt-2">برای ثبت ارزیابی، مراجع باید از صفحه‌ی پروفایل عمومی شما دسترسی پرونده را فعال کند.</p>
          <Link href="/panel" className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">بازگشت به پنل</Link>
        </section>
      ) : (
        <PictureNamingRunner patients={patients} />
      )}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
        <h2 className="font-bold text-slate-800">درباره‌ی این ابزار</h2>
        <p className="mt-2">این ابزار یک ثبت‌کننده‌ی ارزیابی بالینی است و به‌تنهایی جایگزین ارزیابی جامع گفتاردرمانی نیست.</p>
      </section>
    </div>
  );
}
