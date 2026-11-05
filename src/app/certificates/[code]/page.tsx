import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import { normalizeCertificateCode } from "@/lib/academy";
import PrintButton from "@/components/PrintButton";

export const metadata: Metadata = { title: "گواهی پایان دوره", robots: { index: false } };

type Props = { params: Promise<{ code: string }> };

export default async function CertificatePage({ params }: Props) {
  const code = normalizeCertificateCode(decodeURIComponent((await params).code));
  const cert = code ? await db.certificate.findUnique({ where: { code }, include: { course: { select: { slug: true } } } }) : null;
  if (!cert) notFound();
  const user = await getCurrentUser();
  const owner = user?.id === cert.userId;
  const revoked = Boolean(cert.revokedAt);
  // کد ملی فقط به صاحب گواهی نشان داده می‌شود؛ در استعلام عمومی چهار رقم آخر
  const nid = cert.nationalId ? (owner ? toPersianDigits(cert.nationalId) : `******${toPersianDigits(cert.nationalId.slice(-4))}`) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <style>{`@media print { @page { size: A4 landscape; margin: 8mm; } }`}</style>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className={`rounded-2xl px-4 py-2 text-sm ${revoked ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          {revoked ? "✗ این گواهی باطل شده است." : "✓ این گواهی معتبر است و توسط مایندمتر صادر شده است."}
        </div>
        {owner && !revoked && <PrintButton />}
      </div>

      <article className={`print-area relative overflow-hidden rounded-3xl border-[10px] border-double border-brand-200 bg-white p-10 text-center shadow-sm ${revoked ? "opacity-50" : ""}`}>
        <svg viewBox="0 0 400 200" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" preserveAspectRatio="none" aria-hidden>
          <circle cx="380" cy="10" r="90" fill="#31958b" />
          <circle cx="20" cy="195" r="80" fill="#8a78e0" />
        </svg>
        <div className="relative">
          <p className="text-2xl font-black text-brand-700">آکادمی مایندمتر</p>
          <p className="text-xs text-slate-400" dir="ltr">www.MindMeter.ir</p>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-calm-700">گواهی پایان دوره</h1>
          <p className="mt-8 text-slate-500">بدین‌وسیله گواهی می‌شود</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">{cert.fullName}</p>
          {nid && <p className="mt-1 text-sm text-slate-500">کد ملی {nid}</p>}
          <p className="mt-6 leading-9 text-slate-600">
            دوره‌ی آموزشی <b className="text-ink">«{cert.courseTitle}»</b> را به مدت {toPersianDigits(cert.hours)} ساعت آموزشی
            {cert.score != null && <> با نمره‌ی {toPersianDigits(cert.score)} از ۱۰۰</>} با موفقیت به پایان رسانده است.
          </p>
          <div className="mt-10 grid grid-cols-3 items-end gap-6 text-sm">
            <div>
              <p className="font-bold">{cert.instructorName}</p>
              <p className="mt-1 border-t border-dashed border-slate-300 pt-1 text-xs text-slate-400">مدرس دوره</p>
            </div>
            <div>
              <p className="font-mono text-base font-bold tracking-widest" dir="ltr">{cert.code}</p>
              <p className="mt-1 border-t border-dashed border-slate-300 pt-1 text-xs text-slate-400">کد استعلام</p>
            </div>
            <div>
              <p className="font-bold">{formatJalali(cert.issuedAt)}</p>
              <p className="mt-1 border-t border-dashed border-slate-300 pt-1 text-xs text-slate-400">تاریخ صدور</p>
            </div>
          </div>
          <p className="mt-8 text-[11px] text-slate-400">
            برای استعلام، کد بالا را در <span dir="ltr">www.MindMeter.ir/certificates</span> وارد کنید. این گواهی آموزشی است و مجوز درمانگری یا پروانه‌ی حرفه‌ای محسوب نمی‌شود.
          </p>
        </div>
      </article>

      <div className="no-print mt-5 text-center text-sm">
        <Link href={`/academy/${cert.course.slug}`} className="text-brand-700 hover:underline">صفحه‌ی دوره</Link>
      </div>
    </div>
  );
}
